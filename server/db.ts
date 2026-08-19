import mongoose, { Schema } from 'mongoose';
import dns from 'dns';

import {
  INITIAL_BUSINESS_INFO,
  INITIAL_CLIENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_CHAT_MESSAGES,
} from '../src/data/initialData.ts';
import type { BusinessInfo, Client, Transaction, ChatMessage } from '../src/types.ts';

dns.setServers(['8.8.8.8', '1.1.1.1']);

export const DEMO_BUSINESS_ID = 'business_demo';

const businessSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    ownerName: { type: String, required: true },
    currency: { type: String, default: '₹' },
    phone: { type: String, default: '' },
    upiId: { type: String, default: '' },
  },
  { versionKey: false }
);

const clientSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    businessId: { type: String, required: true, index: true, default: DEMO_BUSINESS_ID },
    name: { type: String, required: true },
    phone: String,
    email: String,
    company: String,
    serviceCategory: String,
    totalBilled: { type: Number, default: 0 },
    totalReceived: { type: Number, default: 0 },
    outstanding: { type: Number, default: 0 },
    lastTransactionDate: String,
    status: { type: String, enum: ['active', 'cleared', 'overdue'], default: 'active' },
    dueDate: String,
    notes: String,
  },
  { versionKey: false }
);

const transactionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    businessId: { type: String, required: true, index: true, default: DEMO_BUSINESS_ID },
    type: { type: String, enum: ['income', 'expense', 'bill_raised', 'payment_received'], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: '₹' },
    clientId: String,
    clientName: String,
    category: { type: String, required: true },
    description: { type: String, default: '' },
    date: { type: String, required: true },
    paymentMethod: { type: String, enum: ['UPI', 'Bank Transfer', 'Cash', 'Card', 'Cheque'] },
    receiptUrl: String,
    receiptImageBase64: String,
    notes: String,
    whatsappMessageId: String,
    source: { type: String, enum: ['whatsapp', 'web', 'receipt_scan'], required: true },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

const chatMessageSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    businessId: { type: String, required: true, index: true, default: DEMO_BUSINESS_ID },
    sender: { type: String, enum: ['user', 'bot', 'system'], required: true },
    text: { type: String, required: true },
    timestamp: { type: String, required: true },
    type: { type: String },
    imageUrl: String,
    transactionData: { type: Schema.Types.Mixed },
    extractedDetails: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['sent', 'delivered', 'read'] },
  },
  { versionKey: false }
);

const BusinessModel = mongoose.models.FinTrackBusiness || mongoose.model('FinTrackBusiness', businessSchema);
const ClientModel = mongoose.models.FinTrackClient || mongoose.model('FinTrackClient', clientSchema);
const TransactionModel = mongoose.models.FinTrackTransaction || mongoose.model('FinTrackTransaction', transactionSchema);
const ChatMessageModel = mongoose.models.FinTrackChatMessage || mongoose.model('FinTrackChatMessage', chatMessageSchema);

function stripMongoFields<T>(doc: any): T {
  const obj = typeof doc?.toObject === 'function' ? doc.toObject() : doc;
  const { _id, __v, businessId, ...clean } = obj;
  return clean as T;
}

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI is not configured. Using in-memory fallback.');
    return false;
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log('[MongoDB] Connected successfully.');
  return true;
}

export async function loadApplicationData() {
  const business = await BusinessModel.findOne({ id: DEMO_BUSINESS_ID }).lean();

  if (!business) {
    await seedDatabase();
  }

  const [businessDoc, clientDocs, transactionDocs, chatDocs] = await Promise.all([
    BusinessModel.findOne({ id: DEMO_BUSINESS_ID }).lean(),
    ClientModel.find({ businessId: DEMO_BUSINESS_ID }).sort({ id: 1 }).lean(),
    TransactionModel.find({ businessId: DEMO_BUSINESS_ID }).sort({ createdAt: -1 }).lean(),
    ChatMessageModel.find({ businessId: DEMO_BUSINESS_ID }).sort({ _id: 1 }).lean(),
  ]);

  return {
    businessInfo: stripMongoFields<BusinessInfo>(businessDoc),
    clients: clientDocs.map((doc) => stripMongoFields<Client>(doc)),
    transactions: transactionDocs.map((doc) => stripMongoFields<Transaction>(doc)),
    chatMessages: chatDocs.map((doc) => stripMongoFields<ChatMessage>(doc)),
  };
}

export async function seedDatabase() {
  await Promise.all([
    BusinessModel.deleteMany({}),
    ClientModel.deleteMany({}),
    TransactionModel.deleteMany({}),
    ChatMessageModel.deleteMany({}),
  ]);

  await Promise.all([
    BusinessModel.create({ id: DEMO_BUSINESS_ID, ...INITIAL_BUSINESS_INFO }),
    ClientModel.insertMany(INITIAL_CLIENTS.map((client) => ({ ...client, businessId: DEMO_BUSINESS_ID }))),
    TransactionModel.insertMany(INITIAL_TRANSACTIONS.map((transaction) => ({ ...transaction, businessId: DEMO_BUSINESS_ID }))),
    ChatMessageModel.insertMany(INITIAL_CHAT_MESSAGES.map((message) => ({ ...message, businessId: DEMO_BUSINESS_ID }))),
  ]);

  console.log('[MongoDB] FinTrack demo data seeded.');
}

/**
 * Phase-1 persistence bridge.
 *
 * The existing FinTrack server currently keeps its working state in arrays.
 * This function mirrors that state into MongoDB after each mutation so the
 * existing business logic/UI can remain unchanged during the migration.
 */
export async function persistApplicationData(
  businessInfo: BusinessInfo,
  clients: Client[],
  transactions: Transaction[],
  chatMessages: ChatMessage[]
) {
  if (mongoose.connection.readyState !== 1) return;

  console.log('[DB DEBUG] Persisting transactions:', transactions.length);
  console.log(
    '[DB DEBUG] Latest transaction:',
    transactions[0]
  );

  await Promise.all([
    BusinessModel.replaceOne(
      { id: DEMO_BUSINESS_ID },
      { id: DEMO_BUSINESS_ID, ...businessInfo },
      { upsert: true }
    ),
    ClientModel.deleteMany({ businessId: DEMO_BUSINESS_ID }),
    TransactionModel.deleteMany({ businessId: DEMO_BUSINESS_ID }),
    ChatMessageModel.deleteMany({ businessId: DEMO_BUSINESS_ID }),
  ]);

  await Promise.all([
    ClientModel.insertMany(clients.map((client) => ({ ...client, businessId: DEMO_BUSINESS_ID }))),
    TransactionModel.insertMany(transactions.map((transaction) => ({ ...transaction, businessId: DEMO_BUSINESS_ID }))),
    ChatMessageModel.insertMany(chatMessages.map((message) => ({ ...message, businessId: DEMO_BUSINESS_ID }))),
  ]);
}

export async function closeDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
