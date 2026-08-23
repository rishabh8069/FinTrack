import { Router } from 'express';
import { UserModel } from '../models/User';
import { BusinessModel } from '../models/Business';
import { generateToken, verifyToken } from '../utils/jwt';
import { authMiddleware, AuthRequest } from '../middleware/auth';

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

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const token = generateToken({
            userId: user._id.toString(),
            whatsappNumber: user.whatsappNumber,
        });

        return res.json({
            success: true,
            message: 'WhatsApp number verified successfully',
            token,
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


// USER ONBOARDING
router.post('/onboarding', async (req, res) => {
    try {
        let userId: string | undefined;
        let whatsappNumber: string | undefined;

        // Extract auth token from Authorization header if present
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = verifyToken(token);
                userId = decoded.userId;
                whatsappNumber = decoded.whatsappNumber;
            } catch (err) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token',
                });
            }
        }

        // Fallback to body parameters if header is not present
        if (!userId && req.body.userId) {
            userId = req.body.userId;
        }
        if (!whatsappNumber && req.body.whatsappNumber) {
            whatsappNumber = req.body.whatsappNumber;
        }

        let user;
        if (userId) {
            user = await UserModel.findById(userId);
        } else if (whatsappNumber) {
            user = await UserModel.findOne({ whatsappNumber });
        }
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found. Please complete OTP verification first.',
            });
        }

        if (!user.whatsappVerified || user.verificationStatus !== 'verified') {
            return res.status(403).json({
                success: false,
                message: 'WhatsApp number must be verified before onboarding',
            });
        }

        if (user.onboardingCompleted) {
            return res.status(400).json({
                success: false,
                message: 'Onboarding is already completed',
            });
        }

        const {
            name,
            usageType = 'personal',
            upiId = '',
            currency = '₹',
            businessName,
            phone,
        } = req.body;

        // Update User Profile
        user.profile = {
            name: name || user.profile?.name || '',
            usageType: usageType === 'business' ? 'business' : 'personal',
            upiId: upiId || user.profile?.upiId || '',
            currency: currency || user.profile?.currency || '₹',
        };
        user.onboardingCompleted = true;

        let business = null;

        // Create or update Business if usageType is business or businessName provided
        if (usageType === 'business' || businessName) {
            const bName = businessName || name || 'My Business';
            const bOwner = name || user.profile.name || 'Owner';
            const bPhone = phone || user.whatsappNumber;
            const bUpi = upiId || user.profile.upiId || '';

            if (user.businessId) {
                business = await BusinessModel.findOne({ id: user.businessId });
            }

            if (!business) {
                const businessId = `bus_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                business = await BusinessModel.create({
                    id: businessId,
                    name: bName,
                    ownerName: bOwner,
                    currency: currency || '₹',
                    phone: bPhone,
                    upiId: bUpi,
                });
                user.businessId = business.id;
            } else {
                business.name = bName;
                business.ownerName = bOwner;
                business.currency = currency || '₹';
                business.phone = bPhone;
                business.upiId = bUpi;
                await business.save();
            }
        }

        await user.save();

        return res.json({
            success: true,
            message: 'User onboarding completed successfully',
            user,
            business,
        });

    } catch (error) {
        console.error('Onboarding error:', error);

        return res.status(500).json({
            success: false,
            message: 'User onboarding failed',
        });
    }
});

// TEST PROTECTED AUTH ROUTE
router.get('/auth-test', authMiddleware, (req: AuthRequest, res) => {
    return res.json({
        success: true,
        message: 'Authentication middleware is working',
        user: req.user,
    });
});

export default router;