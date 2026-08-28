import mongoose, { Document, Model, Schema } from 'mongoose';
import { DEMO_BUSINESS_ID } from '../constants.ts';

export interface IChatMessage extends Document {
  id: string;
  businessId: string;
  channel?: 'dashboard' | 'whatsapp_app';
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  type?: string;
  imageUrl?: string;
  transactionData?: any;
  extractedDetails?: any;
  status?: 'sent' | 'delivered' | 'read' | 'received';
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    id: { type: String, required: true, unique: true },
    businessId: { type: String, required: true, index: true, default: DEMO_BUSINESS_ID },
    channel: {
      type: String,
      enum: ['dashboard', 'whatsapp_app'],
      default: 'dashboard',
      index: true,
    },
    sender: { type: String, enum: ['user', 'bot', 'system'], required: true },
    text: { type: String, required: true },
    timestamp: { type: String, required: true },
    type: { type: String },
    imageUrl: String,
    transactionData: { type: Schema.Types.Mixed },
    extractedDetails: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'received']
    },
  },
  { versionKey: false }
);

export const ChatMessageModel: Model<IChatMessage> =
  (mongoose.models.FinTrackChatMessage as Model<IChatMessage>) ||
  mongoose.model<IChatMessage>('FinTrackChatMessage', chatMessageSchema);
