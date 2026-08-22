import mongoose, { Document, Model, Schema } from 'mongoose';
import { DEMO_BUSINESS_ID } from '../constants.ts';

export interface IClient extends Document {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  serviceCategory?: string;
  totalBilled: number;
  totalReceived: number;
  outstanding: number;
  lastTransactionDate?: string;
  status: 'active' | 'cleared' | 'overdue';
  dueDate?: string;
  notes?: string;
}

const clientSchema = new Schema<IClient>(
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

export const ClientModel: Model<IClient> =
  (mongoose.models.FinTrackClient as Model<IClient>) ||
  mongoose.model<IClient>('FinTrackClient', clientSchema);
