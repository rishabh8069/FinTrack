import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IBusiness extends Document {
    id: string;
    name: string;
    ownerName: string;
    currency: string;
    phone: string;
    upiId: string;
}

const businessSchema = new Schema<IBusiness>(
    {
        id: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        ownerName: {
            type: String,
            required: true,
            trim: true,
        },

        currency: {
            type: String,
            default: '₹',
        },

        phone: {
            type: String,
            default: '',
            trim: true,
        },

        upiId: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        versionKey: false,
    }
);

export const BusinessModel: Model<IBusiness> =
    (mongoose.models.FinTrackBusiness as Model<IBusiness>) ||
    mongoose.model<IBusiness>('FinTrackBusiness', businessSchema);