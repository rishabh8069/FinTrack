import mongoose from 'mongoose';
import dns from 'dns';

import {
  INITIAL_BUSINESS_INFO,
  INITIAL_CLIENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_CHAT_MESSAGES,
} from '../src/data/initialData.ts';
import type { BusinessInfo, Client, Transaction, ChatMessage } from '../src/types.ts';
import { BusinessModel } from './models/Business';
import { ClientModel } from './models/Client';
import { TransactionModel } from './models/Transaction';
import { ChatMessageModel } from './models/ChatMessage';

dns.setServers(['8.8.8.8', '1.1.1.1']);

import { DEMO_BUSINESS_ID } from './constants.ts';
export { DEMO_BUSINESS_ID };

export function stripMongoFields<T>(doc: any): T {
  if (!doc) return doc;
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

export async function loadApplicationData(targetBusinessId: string = DEMO_BUSINESS_ID) {
  const bizQuery = { $regex: new RegExp(`^${targetBusinessId.trim()}$`, 'i') };

  let business = await BusinessModel.findOne({ id: bizQuery }).lean();

  if (!business && targetBusinessId === DEMO_BUSINESS_ID) {
    await seedDatabase();
    business = await BusinessModel.findOne({ id: bizQuery }).lean();
  }

  const [businessDoc, clientDocs, transactionDocs, chatDocs] = await Promise.all([
    BusinessModel.findOne({ id: bizQuery }).lean(),
    ClientModel.find({ businessId: bizQuery }).sort({ id: 1 }).lean(),
    TransactionModel.find({ businessId: bizQuery }).sort({ createdAt: -1 }).lean(),
    ChatMessageModel.find({ businessId: bizQuery, channel: { $ne: 'whatsapp_app' } }).sort({ _id: 1 }).lean(),
  ]);

  console.log(
    '[DATA DEBUG] Target Business ID:',
    targetBusinessId
  );

  console.log(
    '[DATA DEBUG] Total transactions fetched:',
    transactionDocs.length
  );

  console.log(
    '[DATA DEBUG] Latest transactions:',
    transactionDocs.slice(0, 5).map((tx) => ({
      id: tx.id,
      businessId: tx.businessId,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      source: tx.source,
      createdAt: tx.createdAt,
    }))
  );

  console.log(
    '[DATA DEBUG] WhatsApp transactions fetched:',
    transactionDocs
      .filter((tx) => tx.source === 'whatsapp')
      .slice(0, 5)
      .map((tx) => ({
        id: tx.id,
        businessId: tx.businessId,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        source: tx.source,
        createdAt: tx.createdAt,
      }))
  );

  const defaultBInfo: BusinessInfo = {
    name: 'My Business',
    ownerName: 'Owner',
    currency: '₹',
    phone: '',
    upiId: '',
  };

  return {
    businessInfo: businessDoc ? stripMongoFields<BusinessInfo>(businessDoc) : defaultBInfo,
    clients: clientDocs.map((doc) => stripMongoFields<Client>(doc)),
    transactions: transactionDocs.map((doc) => stripMongoFields<Transaction>(doc)),
    chatMessages: chatDocs.map((doc) => stripMongoFields<ChatMessage>(doc)),
  };
}

export async function seedDatabase() {
  await Promise.all([
    BusinessModel.deleteMany({ id: DEMO_BUSINESS_ID }),
    ClientModel.deleteMany({ businessId: DEMO_BUSINESS_ID }),
    TransactionModel.deleteMany({ businessId: DEMO_BUSINESS_ID }),
    ChatMessageModel.deleteMany({ businessId: DEMO_BUSINESS_ID }),
  ]);

  await Promise.all([
    BusinessModel.create({ id: DEMO_BUSINESS_ID, ...INITIAL_BUSINESS_INFO }),
    ClientModel.insertMany(INITIAL_CLIENTS.map((client) => ({ ...client, businessId: DEMO_BUSINESS_ID }))),
    TransactionModel.insertMany(INITIAL_TRANSACTIONS.map((transaction) => ({ ...transaction, businessId: DEMO_BUSINESS_ID }))),
    ChatMessageModel.insertMany(INITIAL_CHAT_MESSAGES.map((message) => ({ ...message, businessId: DEMO_BUSINESS_ID }))),
  ]);

  console.log('[MongoDB] FinTrack demo data seeded.');
}

export async function closeDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
