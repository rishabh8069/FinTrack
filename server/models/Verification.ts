import mongoose, { Document, Schema } from 'mongoose';

export interface IVerification extends Document {
    whatsappNumber: string;
    otp: string;
    expiresAt: Date;
    verified: boolean;
    attempts: number;
    createdAt: Date;
    updatedAt: Date;
}

const verificationSchema = new Schema<IVerification>(
    {
        whatsappNumber: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },

        otp: {
            type: String,
            required: true,
        },

        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },

        verified: {
            type: Boolean,
            default: false,
        },

        attempts: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

export const VerificationModel = mongoose.model<IVerification>(
    'Verification',
    verificationSchema
);