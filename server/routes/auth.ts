import { Router } from 'express';
import { UserModel } from '../models/User';

const router = Router();

// Temporary in-memory OTP store for Phase 1 testing
const otpStore = new Map<string, string>();

// SEND OTP
router.post('/send-otp', async (req, res) => {
    try {
        const { whatsappNumber } = req.body;

        if (!whatsappNumber) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp number is required',
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        otpStore.set(whatsappNumber, otp);

        let user = await UserModel.findOne({ whatsappNumber });

        if (!user) {
            user = await UserModel.create({
                whatsappNumber,
            });
        }

        console.log(`[OTP TEST] ${whatsappNumber} → ${otp}`);

        return res.json({
            success: true,
            message: 'OTP generated successfully',
        });

    } catch (error) {
        console.error('Send OTP error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to generate OTP',
        });
    }
});


// VERIFY OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { whatsappNumber, otp } = req.body;

        if (!whatsappNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp number and OTP are required',
            });
        }

        const storedOtp = otpStore.get(whatsappNumber);

        if (!storedOtp || storedOtp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP',
            });
        }

        const user = await UserModel.findOneAndUpdate(
            { whatsappNumber },
            {
                whatsappVerified: true,
                verificationStatus: 'verified',
            },
            { new: true }
        );

        otpStore.delete(whatsappNumber);

        return res.json({
            success: true,
            message: 'WhatsApp number verified successfully',
            user,
        });

    } catch (error) {
        console.error('Verify OTP error:', error);

        return res.status(500).json({
            success: false,
            message: 'OTP verification failed',
        });
    }
});

export default router;