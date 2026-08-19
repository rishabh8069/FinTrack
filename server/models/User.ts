import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    whatsappNumber: string;
    whatsappVerified: boolean;
    verificationStatus: 'pending' | 'verified';
    onboardingCompleted: boolean;

    profile: {
        name: string;
        usageType: 'personal' | 'business';
        upiId: string;
        currency: string;
    };

    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        whatsappNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        whatsappVerified: {
            type: Boolean,
            default: false,
        },

        verificationStatus: {
            type: String,
            enum: ['pending', 'verified'],
            default: 'pending',
        },

        onboardingCompleted: {
            type: Boolean,
            default: false,
        },

        profile: {
            name: {
                type: String,
                default: '',
                trim: true,
            },

            usageType: {
                type: String,
                enum: ['personal', 'business'],
                default: 'personal',
            },

            upiId: {
                type: String,
                default: '',
                trim: true,
            },

            currency: {
                type: String,
                default: 'INR',
            },
        },
    },
    {
        timestamps: true,
    }
);

export const UserModel = mongoose.model<IUser>('User', userSchema);