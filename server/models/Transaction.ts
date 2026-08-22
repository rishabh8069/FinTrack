import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ITransaction extends Document {
    id: string;
    businessId: string;

    type:
    | 'income'
    | 'expense'
    | 'bill_raised'
    | 'payment_received';

    amount: number;
    currency: string;

    clientId?: string;
    clientName?: string;

    category: string;
    description: string;
    date: string;

    paymentMethod?:
    | 'UPI'
    | 'Bank Transfer'
    | 'Cash'
    | 'Card'
    | 'Cheque';

    receiptUrl?: string;
    receiptImageBase64?: string;

    notes?: string;
    whatsappMessageId?: string;

    source: 'whatsapp' | 'web' | 'receipt_scan';

    createdAt: string;
}

const transactionSchema = new Schema<ITransaction>(
    {
        id: {
            type: String,
            required: true,
            unique: true,
        },

        businessId: {
            type: String,
            required: true,
            index: true,
        },

        type: {
            type: String,
            enum: [
                'income',
                'expense',
                'bill_raised',
                'payment_received',
            ],
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        currency: {
            type: String,
            default: '₹',
        },

        clientId: String,
        clientName: String,

        category: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            default: '',
        },

        date: {
            type: String,
            required: true,
        },

        paymentMethod: {
            type: String,
            enum: [
                'UPI',
                'Bank Transfer',
                'Cash',
                'Card',
                'Cheque',
            ],
        },

        receiptUrl: String,
        receiptImageBase64: String,
        notes: String,
        whatsappMessageId: String,

        source: {
            type: String,
            enum: ['whatsapp', 'web', 'receipt_scan'],
            required: true,
        },

        createdAt: {
            type: String,
            required: true,
        },
    },
    {
        versionKey: false,
    }
);

export const TransactionModel: Model<ITransaction> =
    (mongoose.models.FinTrackTransaction as Model<ITransaction>) ||
    mongoose.model<ITransaction>(
        'FinTrackTransaction',
        transactionSchema
    );