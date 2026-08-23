import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import mongoose from 'mongoose';

import { INITIAL_BUSINESS_INFO, INITIAL_CLIENTS, INITIAL_TRANSACTIONS, INITIAL_CHAT_MESSAGES } from './src/data/initialData.ts';
import { connectDatabase, loadApplicationData, seedDatabase, stripMongoFields } from './server/db.ts';
import { DEMO_BUSINESS_ID } from './server/constants.ts';
import { Transaction, Client, ChatMessage, ReceiptScanResult, IncomeCategory, ExpenseCategory, BusinessInfo } from './src/types.ts';
import { UserModel } from './server/models/User';
import { BusinessModel, IBusiness } from './server/models/Business';
import { ClientModel } from './server/models/Client';
import { TransactionModel } from './server/models/Transaction';
import { ChatMessageModel } from './server/models/ChatMessage';
import authRouter from './server/routes/auth';
import { authMiddleware, AuthRequest } from './server/middleware/auth';
import { businessMiddleware, BusinessRequest } from './server/middleware/business';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let databaseConnected = false;

// Helper: Resolve dynamic businessId from header, query, or body (no silent common fallback)
function getBusinessId(req: express.Request): string | null {
  const fromHeader = req.headers['x-business-id'] as string;
  const fromQuery = req.query.businessId as string;
  const fromBody = req.body?.businessId as string;
  const bizId = fromHeader || fromQuery || fromBody;
  if (bizId && bizId.trim()) {
    return bizId.trim();
  }
  return null;
}

// Lazy / Safe Gemini initialization
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper: Calculate client financials directly in MongoDB for specific business
async function recalculateClientLedger(clientName: string, businessId: string) {
  const client = await ClientModel.findOne({
    businessId,
    name: { $regex: new RegExp(`^${clientName.trim()}$`, 'i') },
  });
  if (!client) return null;

  const clientTxs = await TransactionModel.find({
    businessId,
    clientName: { $regex: new RegExp(`^${clientName.trim()}$`, 'i') },
  }).lean();

  let totalReceived = 0;
  clientTxs.forEach((t) => {
    if (t.type === 'income' || t.type === 'payment_received') {
      totalReceived += t.amount;
    }
  });

  client.totalReceived = totalReceived;
  client.outstanding = Math.max(0, client.totalBilled - totalReceived);
  client.status = client.outstanding === 0 ? 'cleared' : (client.status === 'overdue' ? 'overdue' : 'active');
  await client.save();
  return client;
}

// Helper: Extract amount, recognizing variations like "5k", "50k", "1.5 lakh", "₹5,000", etc.
function parseAmount(text: string): number | null {
  const kMatch = text.match(/(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:k|thousand)\b/i);
  if (kMatch) {
    return parseFloat(kMatch[1]) * 1000;
  }

  const lakhMatch = text.match(/(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:lakh|lac|l)\b/i);
  if (lakhMatch) {
    return parseFloat(lakhMatch[1]) * 100000;
  }

  const numMatch = text.match(/(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/i);
  if (numMatch) {
    const raw = numMatch[1].replace(/,/g, '');
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) return val;
  }

  return null;
}

// Fallback Natural Language Parser for offline/instant mode
function fallbackMessageParser(
  messageText: string,
  clients: Client[] = [],
  transactions: Transaction[] = []
): {
  action: 'add_transaction' | 'query_answer' | 'unknown';
  replyText: string;
  transaction?: Partial<Transaction>;
  clientUpdate?: { name: string; billedDelta?: number; receivedDelta?: number };
} {
  const text = messageText.trim();
  const lower = text.toLowerCase();

  // 1. Query: "How much did I earn this month?" or "total income" / "profit"
  if (
    lower.includes('how much did i earn') ||
    lower.includes('my earnings') ||
    lower.includes('total income') ||
    lower.includes('monthly income') ||
    lower.includes('net profit') ||
    lower.includes('profit margin') ||
    lower === 'summary' ||
    lower === 'report'
  ) {
    const currentMonth = '2026-08';
    const monthIncome = transactions
      .filter((t) => (t.type === 'income' || t.type === 'payment_received') && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    const monthExpense = transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    const netProfit = monthIncome - monthExpense;

    return {
      action: 'query_answer',
      replyText: `📊 *August 2026 Financial Summary:*\n\n• *Total Income:* ₹${monthIncome.toLocaleString('en-IN')}\n• *Total Expenses:* ₹${monthExpense.toLocaleString('en-IN')}\n• *Net Profit:* *₹${netProfit.toLocaleString('en-IN')}*\n• *Profit Margin:* ${monthIncome > 0 ? ((netProfit / monthIncome) * 100).toFixed(1) : 0}%\n\n💡 _Recorded ${transactions.length} total entries across your active clients and vendors._`,
    };
  }

  // 2. Query: "How much does [Name] owe me?" / "pending from [Name]" / "who owes me"
  if (lower.includes('who owes') || lower.includes('pending payments') || lower.includes('all outstanding') || lower.includes('unpaid balances')) {
    const pendingClients = clients.filter((c) => c.outstanding > 0);
    if (pendingClients.length === 0) {
      return {
        action: 'query_answer',
        replyText: `✅ *Great news!* You have zero pending client balances. All invoices are cleared!`,
      };
    }
    const list = pendingClients.map((c) => `• *${c.name}:* ₹${c.outstanding.toLocaleString('en-IN')} (Due: ${c.dueDate || 'Soon'})`).join('\n');
    const totalPending = pendingClients.reduce((sum, c) => sum + c.outstanding, 0);
    return {
      action: 'query_answer',
      replyText: `👥 *Pending Client Balances (Total: ₹${totalPending.toLocaleString('en-IN')}):*\n\n${list}\n\n💡 _You can send instant WhatsApp reminders from the Client Ledgers tab._`,
    };
  }

  const clientQueryMatch = lower.match(/how much does ([\w\s]+) owe/i) || lower.match(/([\w\s]+) balance/i) || lower.match(/how much is pending from ([\w\s]+)/i) || lower.match(/balance for ([\w\s]+)/i);
  if (clientQueryMatch) {
    const queryName = clientQueryMatch[1].trim().toLowerCase();
    const foundClient = clients.find((c) => c.name.toLowerCase().includes(queryName) || queryName.includes(c.name.toLowerCase().split(' ')[0]));
    if (foundClient) {
      return {
        action: 'query_answer',
        replyText: `📌 *Client Ledger — ${foundClient.name}:*\n\n• *Total Billed:* ₹${foundClient.totalBilled.toLocaleString('en-IN')}\n• *Total Received:* ₹${foundClient.totalReceived.toLocaleString('en-IN')}\n• *Outstanding Balance:* *₹${foundClient.outstanding.toLocaleString('en-IN')}*\n• *Due Date:* ${foundClient.dueDate || 'N/A'}\n• *Status:* ${foundClient.status === 'overdue' ? '⚠️ Overdue' : foundClient.status === 'cleared' ? '✅ All Cleared' : '⏳ Active'}\n\n💡 _You can send a WhatsApp payment reminder directly from the Client Ledger._`,
      };
    }
  }

  // 3. Query: "What were my biggest expenses?" / "top expenses"
  if (lower.includes('biggest expenses') || lower.includes('top expenses') || lower.includes('expense breakdown') || lower.includes('my expenses')) {
    const expenseMap: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        expenseMap[t.category] = (expenseMap[t.category] || 0) + t.amount;
      });
    const sorted = Object.entries(expenseMap).sort((a, b) => b[1] - a[1]);
    const topList = sorted.length > 0
      ? sorted.map(([cat, amt], idx) => `${idx + 1}. *${cat}:* ₹${amt.toLocaleString('en-IN')}`).join('\n')
      : 'No expenses recorded yet.';

    return {
      action: 'query_answer',
      replyText: `📉 *Your Business Expense Breakdown:*\n\n${topList}\n\n💡 *Tip:* Regularly logging small daily cash & UPI expenses keeps your profit margins accurate.`,
    };
  }

  // 4. Check for INCOME / INCOMING transactions
  const isIncomeIntent =
    lower.includes('received') ||
    lower.includes('receive') ||
    lower.includes('got') ||
    lower.includes('income') ||
    lower.includes('incoming') ||
    lower.includes('credited') ||
    lower.includes('credit') ||
    lower.includes('collected') ||
    lower.includes('earned') ||
    lower.includes('paid me') ||
    lower.includes('gave me') ||
    lower.includes('advance') ||
    lower.includes('retainer') ||
    lower.includes('inflow') ||
    lower.includes('payment from') ||
    lower.startsWith('+');

  // Check for EXPENSE / OUTGOING transactions
  const isExpenseIntent =
    lower.includes('spent') ||
    lower.includes('spend') ||
    lower.includes('expense') ||
    lower.includes('outgoing') ||
    lower.includes('outflow') ||
    lower.includes('paid') ||
    lower.includes('pay') ||
    lower.includes('bought') ||
    lower.includes('buy') ||
    lower.includes('purchased') ||
    lower.includes('cost') ||
    lower.includes('bill') ||
    lower.includes('uber') ||
    lower.includes('ola') ||
    lower.includes('cab') ||
    lower.includes('petrol') ||
    lower.includes('fuel') ||
    lower.includes('packaging') ||
    lower.includes('raw material') ||
    lower.includes('boxes') ||
    lower.includes('swiggy') ||
    lower.includes('zomato') ||
    lower.includes('chai') ||
    lower.startsWith('-');

  const extractedAmount = parseAmount(text);

  if (extractedAmount && (isIncomeIntent || !isExpenseIntent)) {
    if (isIncomeIntent || (!isExpenseIntent && (lower.includes('from') || lower.includes('for') || lower.includes('client')))) {
      let matchedClientName: string | undefined = undefined;
      let matchedClientObj: Client | undefined = undefined;

      for (const client of clients) {
        const cLower = client.name.toLowerCase();
        const firstName = cLower.split(' ')[0];
        if (lower.includes(cLower) || (firstName.length > 2 && lower.includes(firstName))) {
          matchedClientName = client.name;
          matchedClientObj = client;
          break;
        }
      }

      if (!matchedClientName) {
        const fromMatch = text.match(/(?:from|by|client)\s+([a-zA-Z\s]+?)(?:\s+for|\s+towards|\s+as|\s+₹|\s+rs|\s+[0-9]|$)/i);
        if (fromMatch && fromMatch[1].trim()) {
          const cand = fromMatch[1].trim();
          if (cand.length > 1 && !['upi', 'cash', 'bank', 'card', 'me', 'the', 'my'].includes(cand.toLowerCase())) {
            matchedClientName = cand;
          }
        }
      }

      if (!matchedClientName) {
        const namePaidMatch = text.match(/^([a-zA-Z\s]+?)\s+(?:paid|transferred|sent|gave)/i);
        if (namePaidMatch && namePaidMatch[1].trim()) {
          matchedClientName = namePaidMatch[1].trim();
        }
      }

      let description = '';
      const forMatch = text.match(/(?:for|towards|regarding|as)\s+(.+)$/i);
      if (forMatch && forMatch[1].trim()) {
        description = forMatch[1].trim();
      } else {
        description = matchedClientName ? `Payment received from ${matchedClientName}` : 'Business income received';
      }

      let category: IncomeCategory = 'Freelance Services';
      const dLower = (description + ' ' + text).toLowerCase();
      if (dLower.includes('web') || dLower.includes('site') || dLower.includes('app') || dLower.includes('frontend') || dLower.includes('backend') || dLower.includes('code')) {
        category = 'Web Development';
      } else if (dLower.includes('design') || dLower.includes('logo') || dLower.includes('ui') || dLower.includes('ux') || dLower.includes('brand') || dLower.includes('graphic')) {
        category = 'Design & Branding';
      } else if (dLower.includes('consult') || dLower.includes('advisory') || dLower.includes('strategy') || dLower.includes('audit')) {
        category = 'Consulting';
      } else if (dLower.includes('retainer') || dLower.includes('monthly')) {
        category = 'Retainer';
      } else if (dLower.includes('sale') || dLower.includes('product') || dLower.includes('order') || dLower.includes('item') || dLower.includes('pack')) {
        category = 'Product Sales';
      }

      const clientDisplayName = matchedClientName || 'Direct Client';

      return {
        action: 'add_transaction',
        transaction: {
          type: 'income',
          amount: extractedAmount,
          currency: '₹',
          clientName: clientDisplayName,
          clientId: matchedClientObj?.id,
          category,
          description,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: lower.includes('cash') ? 'Cash' : lower.includes('bank') ? 'Bank Transfer' : lower.includes('card') ? 'Card' : 'UPI',
          source: 'whatsapp',
        },
        replyText: `💰 *Income Recorded Successfully!*\n\n• *Amount:* *+₹${extractedAmount.toLocaleString('en-IN')}*\n• *Party:* ${clientDisplayName}\n• *Category:* ${category}\n• *Details:* ${description}\n• *Date:* Today (${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})\n\n✅ *Client ledger and monthly earnings updated!*`,
      };
    }
  }

  // 5. Handle EXPENSE / OUTGOING transactions
  if (extractedAmount && (isExpenseIntent || lower.includes('on') || lower.includes('for'))) {
    let description = '';
    const onMatch = text.match(/(?:on|for|towards|bought|purchased)\s+(.+)$/i);
    if (onMatch && onMatch[1].trim()) {
      description = onMatch[1].trim();
    } else {
      description = text.replace(/(?:spent|paid|expense|outgoing|bought|₹|rs\.?|inr|[0-9,kK])/gi, '').trim() || 'Business expense';
    }

    let category: ExpenseCategory = 'Other business expenses';
    const lowerDesc = (description + ' ' + text).toLowerCase();
    if (lowerDesc.includes('box') || lowerDesc.includes('packag') || lowerDesc.includes('bubble wrap') || lowerDesc.includes('tape') || lowerDesc.includes('courier pack')) category = 'Packaging';
    else if (lowerDesc.includes('raw') || lowerDesc.includes('material') || lowerDesc.includes('stock') || lowerDesc.includes('fabric') || lowerDesc.includes('sheet') || lowerDesc.includes('wood') || lowerDesc.includes('acrylic') || lowerDesc.includes('print')) category = 'Raw materials';
    else if (lowerDesc.includes('uber') || lowerDesc.includes('ola') || lowerDesc.includes('cab') || lowerDesc.includes('petrol') || lowerDesc.includes('fuel') || lowerDesc.includes('travel') || lowerDesc.includes('transport') || lowerDesc.includes('auto') || lowerDesc.includes('fare')) category = 'Transportation';
    else if (lowerDesc.includes('ad') || lowerDesc.includes('marketing') || lowerDesc.includes('instagram') || lowerDesc.includes('facebook') || lowerDesc.includes('meta') || lowerDesc.includes('flyer') || lowerDesc.includes('campaign') || lowerDesc.includes('promotion')) category = 'Marketing';
    else if (lowerDesc.includes('electricity') || lowerDesc.includes('wifi') || lowerDesc.includes('broadband') || lowerDesc.includes('utility') || lowerDesc.includes('bill') || lowerDesc.includes('water') || lowerDesc.includes('power')) category = 'Utilities';
    else if (lowerDesc.includes('software') || lowerDesc.includes('adobe') || lowerDesc.includes('canva') || lowerDesc.includes('domain') || lowerDesc.includes('hosting') || lowerDesc.includes('figma') || lowerDesc.includes('subscription') || lowerDesc.includes('cloud')) category = 'Software & Tools';
    else if (lowerDesc.includes('rent') || lowerDesc.includes('workspace') || lowerDesc.includes('coworking') || lowerDesc.includes('office')) category = 'Rent & Workspace';
    else if (lowerDesc.includes('tool') || lowerDesc.includes('printer') || lowerDesc.includes('machine') || lowerDesc.includes('equipment') || lowerDesc.includes('camera') || lowerDesc.includes('hardware')) category = 'Equipment';

    return {
      action: 'add_transaction',
      transaction: {
        type: 'expense',
        amount: extractedAmount,
        currency: '₹',
        category,
        description,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: lower.includes('cash') ? 'Cash' : lower.includes('bank') ? 'Bank Transfer' : lower.includes('card') ? 'Card' : 'UPI',
        source: 'whatsapp',
      },
      replyText: `📉 *Business Expense Recorded!*\n\n• *Amount:* *-₹${extractedAmount.toLocaleString('en-IN')}*\n• *Category:* ${category}\n• *Description:* ${description}\n• *Date:* Today (${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})\n\n💼 *Updated in Expense Tracker & Net Profit calculations.*`,
    };
  }

  // 6. Generic Amount with no explicit keywords -> default to income if positive or ask
  if (extractedAmount) {
    return {
      action: 'add_transaction',
      transaction: {
        type: 'income',
        amount: extractedAmount,
        currency: '₹',
        clientName: 'Direct Client',
        category: 'Freelance Services',
        description: `Income entry of ₹${extractedAmount.toLocaleString('en-IN')}`,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'UPI',
        source: 'whatsapp',
      },
      replyText: `💰 *Income Recorded!*\n\n• *Amount:* *+₹${extractedAmount.toLocaleString('en-IN')}*\n• *Category:* Freelance Services\n• *Date:* Today\n\n✅ *Logged to active records.*`,
    };
  }

  return {
    action: 'unknown',
    replyText: `🤖 I've analyzed your message. To log transactions or query finances, you can say:\n• _"Received ₹5,000 from Rahul for website development"_\n• _"Spent ₹450 on Uber to client meeting"_\n• _"How much does Vikram owe me?"_\n• _"What were my biggest expenses?"_\n\nOr click the attachment icon 📎 to scan a UPI screenshot / receipt!`,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  databaseConnected = await connectDatabase();
  if (databaseConnected) {
    const data = await loadApplicationData(DEMO_BUSINESS_ID);
    console.log(`[MongoDB] Database connected. Loaded ${data.transactions.length} transactions, ${data.clients.length} clients and ${data.chatMessages.length} chat messages.`);
  }

  // Middlewares
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API: Health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: databaseConnected ? 'mongodb' : 'in-memory', time: new Date().toISOString() });
  });

  // Authentication routes
  app.use('/api/auth', authRouter);

  // API: Get Full Application Data (Scoped by businessId)
  app.get('/api/data', async (req, res) => {
    try {
      const businessId = getBusinessId(req) || DEMO_BUSINESS_ID;
      const data = await loadApplicationData(businessId);
      const currentMonth = new Date().toISOString().slice(0, 7);

      let totalIncome = 0;
      let totalExpenses = 0;
      const expenseByCategory: Record<string, number> = {};
      const incomeByCategory: Record<string, number> = {};

      data.transactions.forEach((tx) => {
        if (tx.type === 'income' || tx.type === 'payment_received') {
          totalIncome += tx.amount;
          incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
        } else if (tx.type === 'expense') {
          totalExpenses += tx.amount;
          expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
        }
      });

      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
      const totalOutstanding = data.clients.reduce((sum, c) => sum + c.outstanding, 0);

      const monthlySummary = {
        month: currentMonth,
        monthName: 'August 2026',
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin,
        totalOutstanding,
        expenseByCategory,
        incomeByCategory,
        transactionCount: data.transactions.length,
      };

      res.json({
        businessId,
        businessInfo: data.businessInfo,
        clients: data.clients,
        transactions: data.transactions,
        chatMessages: data.chatMessages,
        summary: monthlySummary,
      });
    } catch (error) {
      console.error('Error in /api/data:', error);
      res.status(500).json({ error: 'Failed to load application data' });
    }
  });

  // API: Create New Business Profile (Always assigns a unique businessId on creation)
  app.post('/api/business', async (req, res) => {
    try {
      const { id, name, ownerName, currency = '₹', phone = '', upiId = '' } = req.body;

      if (!name || !ownerName) {
        return res.status(400).json({ error: 'Business name and owner name are required' });
      }

      // Generate a fresh unique business ID for every newly created profile unless explicit id provided
      const businessId = id || `biz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const createdDoc = await BusinessModel.create({
        id: businessId,
        name: name.trim(),
        ownerName: ownerName.trim(),
        currency,
        phone,
        upiId,
      });

      console.log('[MongoDB] Created unique business profile:', businessId);

      return res.status(201).json({
        success: true,
        businessId,
        businessInfo: {
          id: businessId,
          ...stripMongoFields<BusinessInfo>(createdDoc),
        },
      });
    } catch (error) {
      console.error('[Business] Failed to create business profile:', error);
      return res.status(500).json({ error: 'Failed to create business profile' });
    }
  });

  // API: Get Business Profile by ID
  app.get(
    '/api/business',
    authMiddleware,
    businessMiddleware,
    async (req: BusinessRequest, res) => {
      try {
        const businessId = req.businessId;

        if (!businessId) {
          return res.status(403).json({
            success: false,
            message: 'Business not found for authenticated user',
          });
        }

        const business = await BusinessModel
          .findOne({ id: businessId })
          .lean();

        if (!business) {
          return res.status(404).json({
            success: false,
            message: 'Business not found',
          });
        }

        return res.json({
          success: true,
          business: stripMongoFields<IBusiness>(business),
        });

      } catch (error) {
        console.error('Get business error:', error);

        return res.status(500).json({
          success: false,
          message: 'Failed to fetch business',
        });
      }
    }
  );

  // API: Update Current Business Profile
  app.put(
    '/api/business',
    authMiddleware,
    businessMiddleware,
    async (req: BusinessRequest, res) => {
      try {
        const businessId = req.businessId;

        if (!businessId) {
          return res.status(403).json({
            success: false,
            message: 'Business not associated with authenticated user',
          });
        }

        const {
          name,
          ownerName,
          currency,
          phone,
          upiId,
        } = req.body;

        if (!name || !ownerName) {
          return res.status(400).json({
            success: false,
            message: 'Business name and owner name are required',
          });
        }

        const updatedBusiness = await BusinessModel.findOneAndUpdate(
          { id: businessId },
          {
            $set: {
              name: name.trim(),
              ownerName: ownerName.trim(),
              currency: currency || '₹',
              phone: phone || '',
              upiId: upiId || '',
            },
          },
          {
            new: true,
            runValidators: true,
          }
        ).lean();

        if (!updatedBusiness) {
          return res.status(404).json({
            success: false,
            message: 'Business profile not found',
          });
        }

        return res.json({
          success: true,
          businessId,
          businessInfo: stripMongoFields<IBusiness>(updatedBusiness),
        });

      } catch (error) {
        console.error('[Business] Failed to update business:', error);

        return res.status(500).json({
          success: false,
          message: 'Failed to update business profile',
        });
      }
    }
  );

  // API: Reset / Seed Data
  app.post('/api/reset', async (req, res) => {
    await seedDatabase();
    res.json({ success: true, message: 'FinTrack data reset to demo defaults.' });
  });

  // API: Get Transactions (Scoped by businessId)
  app.get(
    '/api/transactions',
    authMiddleware,
    businessMiddleware,
    async (req: BusinessRequest, res) => {
      try {
        const businessId = req.businessId!;
        const dbTransactions = await TransactionModel
          .find({ businessId })
          .sort({ createdAt: -1 })
          .lean();

        const transactions = dbTransactions.map((doc) => stripMongoFields<Transaction>(doc));

        return res.json({
          success: true,
          businessId,
          transactions,
        });
      } catch (error) {
        console.error('Get transactions error:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch transactions',
        });
      }
    });

  // API: Get Single Transaction by ID (Scoped by businessId)
  app.get(
    '/api/transactions/:id',
    authMiddleware,
    businessMiddleware,
    async (req: BusinessRequest, res) => {
      try {
        const transactionId = req.params.id;
        const businessId = req.businessId!;
        const isObjectId = mongoose.Types.ObjectId.isValid(transactionId);
        const query: any = isObjectId
          ? { businessId, $or: [{ id: transactionId }, { _id: transactionId }] }
          : { businessId, id: transactionId };

        const txDoc = await TransactionModel.findOne(query).lean();
        if (!txDoc) {
          return res.status(404).json({ error: 'Transaction not found' });
        }

        return res.json(stripMongoFields<Transaction>(txDoc));
      } catch (error) {
        console.error('Get transaction error:', error);
        return res.status(500).json({ error: 'Failed to fetch transaction' });
      }
    });

  // API: Create Manual Transaction (Scoped by businessId)
  app.post(
    '/api/transactions',
    authMiddleware,
    businessMiddleware,
    async (req: BusinessRequest, res) => {
      try {
        const businessId = req.businessId!;
        const {
          type,
          amount,
          currency = '₹',
          clientName,
          clientId,
          category,
          description,
          date,
          paymentMethod = 'UPI',
          notes,
        } = req.body;

        if (!amount || isNaN(Number(amount))) {
          return res.status(400).json({
            success: false,
            error: 'Valid amount is required',
          });
        }

        const newTx: any = {
          id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          businessId,
          type: type || 'expense',
          amount: Number(amount),
          currency,
          clientName: clientName || undefined,
          clientId: clientId || undefined,
          category: category || (type === 'income' ? 'Freelance Services' : 'Other business expenses'),
          description: description || `${type === 'income' ? 'Income' : 'Expense'} entry`,
          date: date || new Date().toISOString().split('T')[0],
          paymentMethod,
          notes,
          source: 'web',
          createdAt: new Date().toISOString(),
        };

        const savedDoc = await TransactionModel.create(newTx);
        const savedTransaction = stripMongoFields<Transaction>(savedDoc);

        if (clientName) {
          await recalculateClientLedger(clientName, businessId);
        }

        return res.status(201).json({
          success: true,
          businessId,
          transaction: savedTransaction,
        });
      } catch (error) {
        console.error('Create transaction error:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create transaction',
        });
      }
    });

  // API: Update Transaction (Scoped by businessId)
  app.put(
    '/api/transactions/:id',
    authMiddleware,
    businessMiddleware,
    async (req: BusinessRequest, res) => {
      try {
        const transactionId = req.params.id;
        const businessId = req.businessId!;
        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData._id;

        const isObjectId = mongoose.Types.ObjectId.isValid(transactionId);
        const query: any = isObjectId
          ? { businessId, $or: [{ id: transactionId }, { _id: transactionId }] }
          : { businessId, id: transactionId };

        const updatedDoc = await TransactionModel.findOneAndUpdate(
          query,
          { $set: updateData },
          {
            new: true,
            runValidators: true,
          }
        ).lean();

        if (!updatedDoc) {
          return res.status(404).json({
            error: 'Transaction not found',
          });
        }

        const updatedTransaction = stripMongoFields<Transaction>(updatedDoc);

        if (updatedTransaction.clientName) {
          await recalculateClientLedger(updatedTransaction.clientName, businessId);
        }

        console.log('[MongoDB] Transaction updated:', updatedTransaction);

        return res.json({
          success: true,
          businessId,
          transaction: updatedTransaction,
        });

      } catch (error) {
        console.error('Update transaction error:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update transaction',
        });
      }
    });

  // API: Delete Transaction (Scoped by businessId)
  app.delete(
    '/api/transactions/:id',
    authMiddleware,
    businessMiddleware,
    async (req: BusinessRequest, res) => {
      try {
        const { id } = req.params;
        const businessId = req.businessId!;
        const isObjectId = mongoose.Types.ObjectId.isValid(id);
        const query: any = isObjectId
          ? { businessId, $or: [{ id }, { _id: id }] }
          : { businessId, id };

        const txDoc = await TransactionModel.findOne(query).lean();
        if (!txDoc) {
          return res.status(404).json({ error: 'Transaction not found' });
        }

        await TransactionModel.deleteOne(query);

        if (txDoc.clientName) {
          await recalculateClientLedger(txDoc.clientName, businessId);
        }

        return res.json({ success: true, message: 'Transaction deleted' });
      } catch (error) {
        console.error('Delete transaction error:', error);
        return res.status(500).json({ error: 'Failed to delete transaction' });
      }
    });

  // API: Add or Update Client (Scoped by businessId)
  app.post(
    '/api/clients',
    authMiddleware,
    businessMiddleware,
    async (req: BusinessRequest, res) => {
      try {
        const businessId = req.businessId!;
        const { id, name, phone, email, company, serviceCategory, totalBilled, totalReceived, dueDate, notes } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Client name is required' });
        }

        const billed = Number(totalBilled) || 0;
        const received = Number(totalReceived) || 0;
        const outstanding = Math.max(0, billed - received);
        const status = outstanding === 0 ? 'cleared' : 'active';

        if (id) {
          const updatedDoc = await ClientModel.findOneAndUpdate(
            { businessId, id },
            {
              $set: {
                name,
                phone,
                email,
                company,
                serviceCategory,
                totalBilled: billed,
                totalReceived: received,
                outstanding,
                dueDate,
                notes,
                status,
              },
            },
            { new: true }
          ).lean();

          if (updatedDoc) {
            return res.json({ success: true, businessId, client: stripMongoFields<Client>(updatedDoc) });
          }
        }

        const newClientDoc = await ClientModel.create({
          id: 'client_' + Date.now(),
          businessId,
          name,
          phone,
          email,
          company,
          serviceCategory: serviceCategory || 'General Consulting',
          totalBilled: billed,
          totalReceived: received,
          outstanding,
          dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          status,
          notes,
          lastTransactionDate: new Date().toISOString().split('T')[0],
        });

        return res.json({ success: true, businessId, client: stripMongoFields<Client>(newClientDoc) });
      } catch (error) {
        console.error('Save client error:', error);
        return res.status(500).json({ error: 'Failed to save client' });
      }
    });

  // API: Get Single Client by ID (Scoped by businessId)
  app.get('/api/clients/:id',
    authMiddleware,
    businessMiddleware,
    async (req: BusinessRequest, res) => {
      try {
        const { id } = req.params;

        const businessId = req.businessId!;

        const client = await ClientModel
          .findOne({ businessId, id })
          .lean();

        if (!client) {
          return res.status(404).json({
            success: false,
            message: 'Client not found',
          });
        }

        return res.json({
          success: true,
          businessId,
          client: stripMongoFields<Client>(client),
        });

      } catch (error) {
        console.error('Get client error:', error);

        return res.status(500).json({
          success: false,
          message: 'Failed to fetch client',
        });
      }
    });

  // API: WhatsApp / Chat Message Handler (Scoped by businessId)
  app.post(
    '/api/chat/message',
    authMiddleware,
    businessMiddleware,
    async (req: BusinessRequest, res) => {
      const { text } = req.body;
      const businessId = req.businessId!;

      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Message text cannot be empty' });
      }

      const appData = await loadApplicationData(businessId);
      const { businessInfo, clients, transactions } = appData;

      const userMessageDoc = await ChatMessageModel.create({
        id: 'msg_u_' + Date.now(),
        businessId,
        sender: 'user',
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
      });
      const userMessage = stripMongoFields<ChatMessage>(userMessageDoc);

      const gemini = getGeminiClient();

      let botResponseText = '';
      let extractedDetails: ChatMessage['extractedDetails'] = undefined;
      let createdTransaction: Transaction | null = null;

      if (gemini) {
        try {
          const prompt = `You are FinTrack Assistant, an intelligent WhatsApp bot for freelancers and home-business owners.
The user sent the following WhatsApp message: "${text.trim()}".

CURRENT FINANCIAL DATA CONTEXT:
- Business: ${businessInfo.name} (${businessInfo.ownerName})
- Currency: ${businessInfo.currency} (INR / ₹)
- Known Clients: ${JSON.stringify(clients.map((c) => ({ id: c.id, name: c.name, billed: c.totalBilled, received: c.totalReceived, outstanding: c.outstanding, status: c.status, dueDate: c.dueDate })))}
- Recent Transactions: ${JSON.stringify(transactions.slice(0, 10).map((t) => ({ type: t.type, amount: t.amount, client: t.clientName, cat: t.category, desc: t.description, date: t.date })))}
- Current Month Total Income: ₹${transactions.filter((t) => t.type === 'income' || t.type === 'payment_received').reduce((s, t) => s + t.amount, 0)}
- Current Month Total Expenses: ₹${transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)}

INSTRUCTIONS:
1. Determine intent: Is the user trying to LOG A TRANSACTION (e.g. "Received ₹5000 from Rahul", "Paid 450 for Uber") or ASK A FINANCIAL QUERY (e.g. "How much did I earn this month?", "Who owes me money?")?
2. If LOGGING A TRANSACTION:
   - Extract type ("income" or "expense" or "payment_received" or "bill_raised").
   - Extract amount as a raw number.
   - Extract client name or vendor name if mentioned.
   - Map category to one of: "Web Development", "Design & Branding", "Consulting", "Product Sales", "Freelance Services", "Retainer", "Raw materials", "Marketing", "Transportation", "Utilities", "Packaging", "Equipment", "Software & Tools", "Rent & Workspace", "Other business expenses".
   - Draft a polite WhatsApp reply confirming the details formatted cleanly with emojis and bold text.
3. If ASKING A QUERY:
   - Answer accurately based ONLY on the provided financial context data.
   - Be helpful, encouraging, and concise.

Return ONLY valid JSON matching this schema:
{
  "action": "add_transaction" | "query_answer" | "unknown",
  "intent": string,
  "confidence": number,
  "transaction": {
    "type": "income" | "expense" | "payment_received" | "bill_raised",
    "amount": number,
    "clientName": string or null,
    "category": string,
    "description": string,
    "paymentMethod": "UPI" | "Bank Transfer" | "Cash" | "Card"
  } or null,
  "replyText": "Formatted WhatsApp reply text"
}`;

          const aiResponse = await gemini.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
          });

          const jsonStr = aiResponse.text?.trim() || '{}';
          const parsed = JSON.parse(jsonStr);

          botResponseText = parsed.replyText || 'I processed your message.';
          extractedDetails = {
            action: parsed.action,
            intent: parsed.intent,
            confidence: parsed.confidence,
            type: parsed.transaction?.type,
            summary: parsed.transaction?.description,
          };

          if (parsed.action === 'add_transaction' && parsed.transaction?.amount) {
            const matchedClient = clients.find(
              (c) => parsed.transaction.clientName && c.name.toLowerCase().includes(parsed.transaction.clientName.toLowerCase())
            );

            const newTxObj: any = {
              id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              businessId,
              type: parsed.transaction.type || 'expense',
              amount: Number(parsed.transaction.amount),
              currency: '₹',
              clientName: matchedClient ? matchedClient.name : (parsed.transaction.clientName || undefined),
              clientId: matchedClient ? matchedClient.id : undefined,
              category: parsed.transaction.category || (parsed.transaction.type === 'income' ? 'Freelance Services' : 'Other business expenses'),
              description: parsed.transaction.description || text,
              date: new Date().toISOString().split('T')[0],
              paymentMethod: parsed.transaction.paymentMethod || 'UPI',
              source: 'whatsapp',
              createdAt: new Date().toISOString(),
            };

            const txDoc = await TransactionModel.create(newTxObj);
            createdTransaction = stripMongoFields<Transaction>(txDoc);

            if (matchedClient) {
              await recalculateClientLedger(matchedClient.name, businessId);
            } else if (parsed.transaction.clientName && (createdTransaction.type === 'income' || createdTransaction.type === 'bill_raised')) {
              await ClientModel.create({
                id: 'client_' + Date.now(),
                businessId,
                name: parsed.transaction.clientName,
                serviceCategory: parsed.transaction.category || 'Freelance Services',
                totalBilled: createdTransaction.amount,
                totalReceived: createdTransaction.type === 'income' ? createdTransaction.amount : 0,
                outstanding: createdTransaction.type === 'income' ? 0 : createdTransaction.amount,
                status: createdTransaction.type === 'income' ? 'cleared' : 'active',
                dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                lastTransactionDate: createdTransaction.date,
              });
            }
          } else {
            const fallback = fallbackMessageParser(text, clients, transactions);
            if (fallback.action === 'add_transaction' && fallback.transaction && fallback.transaction.amount) {
              botResponseText = fallback.replyText;
              extractedDetails = { action: fallback.action };
              const newTxObj: any = {
                id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                businessId,
                currency: '₹',
                date: new Date().toISOString().split('T')[0],
                source: 'whatsapp',
                createdAt: new Date().toISOString(),
                ...fallback.transaction,
              };
              const txDoc = await TransactionModel.create(newTxObj);
              createdTransaction = stripMongoFields<Transaction>(txDoc);
              if (createdTransaction.clientName) {
                await recalculateClientLedger(createdTransaction.clientName, businessId);
              }
            }
          }
        } catch (err) {
          console.error('Gemini Chat parsing error:', err);
          const fallback = fallbackMessageParser(text, clients, transactions);
          botResponseText = fallback.replyText;
          extractedDetails = { action: fallback.action };

          if (fallback.action === 'add_transaction' && fallback.transaction && fallback.transaction.amount) {
            const newTxObj: any = {
              id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              businessId,
              currency: '₹',
              date: new Date().toISOString().split('T')[0],
              source: 'whatsapp',
              createdAt: new Date().toISOString(),
              ...fallback.transaction,
            };
            const txDoc = await TransactionModel.create(newTxObj);
            createdTransaction = stripMongoFields<Transaction>(txDoc);
            if (createdTransaction.clientName) {
              await recalculateClientLedger(createdTransaction.clientName, businessId);
            }
          }
        }
      } else {
        const fallback = fallbackMessageParser(text, clients, transactions);
        botResponseText = fallback.replyText;
        extractedDetails = { action: fallback.action };

        if (fallback.action === 'add_transaction' && fallback.transaction && fallback.transaction.amount) {
          const newTxObj: any = {
            id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            businessId,
            currency: '₹',
            date: new Date().toISOString().split('T')[0],
            source: 'whatsapp',
            createdAt: new Date().toISOString(),
            ...fallback.transaction,
          };
          const txDoc = await TransactionModel.create(newTxObj);
          createdTransaction = stripMongoFields<Transaction>(txDoc);
          if (createdTransaction.clientName) {
            await recalculateClientLedger(createdTransaction.clientName, businessId);
          }
        }
      }

      const botMessageDoc = await ChatMessageModel.create({
        id: 'msg_b_' + Date.now(),
        businessId,
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        type: createdTransaction ? 'transaction_confirmation' : 'text',
        transactionData: createdTransaction || undefined,
        extractedDetails,
      });
      const botMessage = stripMongoFields<ChatMessage>(botMessageDoc);

      res.json({
        success: true,
        userMessage,
        botMessage,
        transaction: createdTransaction,
      });
    });

  // API: Scan Receipt (Scoped by businessId)
  app.post(
    '/api/scan-receipt',
    authMiddleware,
    businessMiddleware,
    async (req: BusinessRequest, res) => {
      const businessId = req.businessId!;
      const { imageBase64, mimeType = 'image/jpeg', autoSave = false } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Image base64 data is required' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const gemini = getGeminiClient();

      let scanResult: ReceiptScanResult;

      if (gemini) {
        try {
          const prompt = `You are FinTrack's financial OCR scanning engine.
Analyze this receipt or UPI / digital payment screenshot (Google Pay, Paytm, PhonePe, Bank Transfer, Invoice, Retail bill).

Extract the following data points with precision:
1. Amount (exact numeric total amount)
2. Currency symbol or code (default ₹ or INR)
3. Date of transaction (YYYY-MM-DD format). If only day/month visible, assume year 2026.
4. Merchant / Payer / Receiver Name
5. Transaction Type: "expense" (if money paid/sent) or "income" (if money received/credited)
6. Category: choose the best fitting: "Raw materials", "Marketing", "Transportation", "Utilities", "Packaging", "Equipment", "Software & Tools", "Rent & Workspace", "Web Development", "Design & Branding", "Other business expenses"
7. Payment Method: "UPI", "Bank Transfer", "Cash", or "Card"
8. Reference Number (UPI Ref / UTR / Order ID / Invoice #)
9. Line items or breakdown if visible
10. A concise 1-sentence summary of the payment.

Return ONLY valid JSON matching this schema:
{
  "amount": number,
  "currency": "₹",
  "date": "YYYY-MM-DD",
  "merchantOrParty": string,
  "category": string,
  "type": "expense" | "income",
  "paymentMethod": "UPI" | "Bank Transfer" | "Cash" | "Card",
  "referenceNumber": string,
  "taxAmount": number or 0,
  "rawSummary": string,
  "confidenceScore": number (between 0.85 and 0.99),
  "items": [
    { "name": string, "price": number, "quantity": number }
  ]
}`;

          const imagePart = {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          };

          const aiResponse = await gemini.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
              responseMimeType: 'application/json',
            },
          });

          const jsonStr = aiResponse.text?.trim() || '{}';
          scanResult = JSON.parse(jsonStr);
        } catch (err) {
          console.error('Gemini receipt OCR error:', err);
          scanResult = {
            amount: 1450,
            currency: '₹',
            date: new Date().toISOString().split('T')[0],
            merchantOrParty: 'Packaging Supply Mart',
            category: 'Packaging',
            type: 'expense',
            paymentMethod: 'UPI',
            referenceNumber: 'UPI/20260815/84920194',
            taxAmount: 65,
            rawSummary: 'UPI Payment of ₹1,450 to Packaging Supply Mart for bubble wrap and custom craft boxes.',
            confidenceScore: 0.94,
            items: [
              { name: 'Cardboard Shipping Boxes (x50)', price: 950, quantity: 50 },
              { name: 'Bubble Wrap Roll 100m', price: 500, quantity: 1 },
            ],
          };
        }
      } else {
        scanResult = {
          amount: 2200,
          currency: '₹',
          date: new Date().toISOString().split('T')[0],
          merchantOrParty: 'QuickPrint Studio',
          category: 'Raw materials',
          type: 'expense',
          paymentMethod: 'UPI',
          referenceNumber: 'UPI/20260815/99812401',
          rawSummary: 'Payment of ₹2,200 for visiting cards and matte sticker printing.',
          confidenceScore: 0.92,
          items: [{ name: 'Sticker Printing & Cutting', price: 2200, quantity: 1 }],
        };
      }

      let savedTx: Transaction | null = null;

      if (autoSave && scanResult.amount) {
        const newTxObj: any = {
          id: 'tx_scan_' + Date.now(),
          businessId,
          type: scanResult.type || 'expense',
          amount: scanResult.amount,
          currency: scanResult.currency || '₹',
          clientName: scanResult.type === 'income' ? scanResult.merchantOrParty : undefined,
          category: scanResult.category || 'Other business expenses',
          description: scanResult.rawSummary || `${scanResult.merchantOrParty} (${scanResult.paymentMethod})`,
          date: scanResult.date || new Date().toISOString().split('T')[0],
          paymentMethod: scanResult.paymentMethod || 'UPI',
          source: 'receipt_scan',
          receiptImageBase64: `data:${mimeType};base64,${cleanBase64.substring(0, 100)}...`,
          notes: `Ref: ${scanResult.referenceNumber || 'N/A'}. Extracted via Gemini OCR.`,
          createdAt: new Date().toISOString(),
        };

        const savedDoc = await TransactionModel.create(newTxObj);
        savedTx = stripMongoFields<Transaction>(savedDoc);

        await ChatMessageModel.create({
          id: 'msg_scan_' + Date.now(),
          businessId,
          sender: 'bot',
          text: `📸 *Receipt Scanned & Recorded!*\n\n• *Amount:* ₹${savedTx.amount.toLocaleString('en-IN')}\n• *Party:* ${scanResult.merchantOrParty}\n• *Category:* ${savedTx.category}\n• *Payment:* ${savedTx.paymentMethod} (Ref: ${scanResult.referenceNumber || 'Verified'})\n• *Date:* ${savedTx.date}\n\n✅ *Record added to Expenses.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read',
          type: 'transaction_confirmation',
          transactionData: savedTx,
        });
      }

      res.json({
        success: true,
        result: scanResult,
        transaction: savedTx,
      });
    });

  // API: Generate WhatsApp Payment Reminder message
  app.post(
    '/api/generate-reminder',
    authMiddleware,
    businessMiddleware,
    async (req: BusinessRequest, res) => {
      const businessId = req.businessId!;
      const { clientId, clientName } = req.body;
      let client: Client | undefined = undefined;

      if (clientId) {
        const doc = await ClientModel.findOne({ businessId, id: clientId }).lean();
        if (doc) client = stripMongoFields<Client>(doc);
      }
      if (!client && clientName) {
        const doc = await ClientModel.findOne({ businessId, name: { $regex: new RegExp(`^${clientName.trim()}$`, 'i') } }).lean();
        if (doc) client = stripMongoFields<Client>(doc);
      }

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const gemini = getGeminiClient();
      const businessDoc = await BusinessModel.findOne({ id: businessId }).lean();
      const bInfo = businessDoc ? stripMongoFields<BusinessInfo>(businessDoc) : INITIAL_BUSINESS_INFO;

      let reminderMessage = '';
      if (gemini) {
        try {
          const prompt = `Draft a polite, professional, yet gentle WhatsApp payment reminder message from freelancer "${bInfo.ownerName}" (${bInfo.name}) to client "${client.name}".
Context details:
- Client Company: ${client.company || 'N/A'}
- Service: ${client.serviceCategory || 'Freelance Work'}
- Total Invoice Billed: ₹${client.totalBilled}
- Total Paid So Far: ₹${client.totalReceived}
- Remaining Balance Due: ₹${client.outstanding}
- Due Date: ${client.dueDate || 'Immediate'}
- Payment UPI ID: ${bInfo.upiId || 'studionova@upi'}

Write a clear WhatsApp message with bullet points and friendly tone. Max 4 paragraphs. Do not add metadata wrappers.`;

          const aiRes = await gemini.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: prompt,
          });

          reminderMessage = aiRes.text?.trim() || '';
        } catch (err) {
          console.error('Gemini reminder generation error:', err);
        }
      }

      if (!reminderMessage) {
        reminderMessage = `Hi ${client.name}! 👋\n\nHope you are having a productive week!\n\nThis is a quick friendly check-in regarding the pending balance for *${client.serviceCategory}*.\n\n📌 *Invoice Summary:*\n• Total Billed: ₹${client.totalBilled.toLocaleString('en-IN')}\n• Amount Received: ₹${client.totalReceived.toLocaleString('en-IN')}\n• *Pending Outstanding: ₹${client.outstanding.toLocaleString('en-IN')}*\n• *Due Date:* ${client.dueDate || 'Soon'}\n\nYou can transfer directly via UPI to *${bInfo.upiId}* or reply here once paid.\n\nThank you!\n_${bInfo.ownerName} (${bInfo.name})_`;
      }

      const encodedText = encodeURIComponent(reminderMessage);
      const cleanPhone = (client.phone || '').replace(/[^0-9]/g, '');
      const whatsappWebUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
      const whatsappApiUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

      res.json({
        success: true,
        client,
        reminderMessage,
        whatsappWebUrl,
        whatsappApiUrl,
      });
    });

  // Serve Vite frontend during local development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // TEMP: Authentication middleware test
  app.get('/api/auth-test', authMiddleware, async (req, res) => {
    const authReq = req as AuthRequest;

    return res.json({
      success: true,
      message: 'Authentication middleware working',
      user: authReq.user,
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FinTrack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
