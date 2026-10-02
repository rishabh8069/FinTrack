
import { Router } from 'express';
import { randomInt, createHash, timingSafeEqual } from 'crypto';

import { UserModel } from '../models/User';
import { BusinessModel } from '../models/Business';
import { VerificationModel } from '../models/Verification';

import { generateToken } from '../utils/jwt';
import { authMiddleware, AuthRequest } from '../middleware/auth';

import { sendWhatsAppMessage } from '../services/whatsappService';
import { ChatMessageModel } from '../models/ChatMessage';

const router = Router();

// ============================================
// OTP CONFIGURATION
// ============================================

const OTP_EXPIRY_MINUTES = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

// Normalize WhatsApp number.
const normalizeWhatsAppNumber = (number: string): string => {
    return number.replace(/\D/g, '');
};

// Generate SHA-256 hash of OTP.
const hashOTP = (otp: string): string => {
    return createHash('sha256').update(otp).digest('hex');
};

// Securely compare OTP hashes.
const compareOTP = (
    storedHash: string,
    submittedHash: string
): boolean => {
    const storedBuffer = Buffer.from(storedHash, 'hex');
    const submittedBuffer = Buffer.from(submittedHash, 'hex');

    if (storedBuffer.length !== submittedBuffer.length) {
        return false;
    }

    return timingSafeEqual(storedBuffer, submittedBuffer);
};

// ============================================
// SEND OTP
// ============================================

router.post('/send-otp', async (req, res) => {
    try {
        const { whatsappNumber } = req.body;

        if (!whatsappNumber || typeof whatsappNumber !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp number is required',
            });
        }

        const trimmedNumber = whatsappNumber.trim();

        if (!trimmedNumber.startsWith('+')) {
            return res.status(400).json({
                success: false,
                message: 'Please include your country code, e.g. +919876543210',
            });
        }

        const normalizedNumber = normalizeWhatsAppNumber(trimmedNumber);

        if (
            normalizedNumber.length < 8 ||
            normalizedNumber.length > 15
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid WhatsApp number',
            });
        }

        // Determine OTP delivery mode.
        const otpDeliveryMode =
            process.env.OTP_DELIVERY_MODE || 'whatsapp';

        // Validate delivery configuration.
        if (!['development', 'whatsapp'].includes(otpDeliveryMode)) {
            return res.status(500).json({
                success: false,
                message: 'Invalid OTP delivery configuration.',
            });
        }

        // Development OTP must never run in production.
        if (
            otpDeliveryMode === 'development' &&
            process.env.NODE_ENV === 'production'
        ) {
            return res.status(500).json({
                success: false,
                message: 'Development OTP mode is not allowed in production.',
            });
        }

        const numberVariants = [
            normalizedNumber,
            `+${normalizedNumber}`,
        ];

        // Check previous OTP for resend cooldown.
        const previousVerification = await VerificationModel.findOne({
            whatsappNumber: normalizedNumber,
        }).sort({ createdAt: -1 });

        if (
            previousVerification &&
            !previousVerification.verified
        ) {
            const elapsedSeconds =
                (Date.now() -
                    previousVerification.createdAt.getTime()) / 1000;

            if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
                const remainingSeconds = Math.ceil(
                    OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds
                );

                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remainingSeconds} seconds before requesting another OTP`,
                });
            }
        }

        // Find existing user or create a new one.
        let user = await UserModel.findOne({
            whatsappNumber: { $in: numberVariants },
        });

        if (!user) {
            user = await UserModel.create({
                whatsappNumber: normalizedNumber,
            });
        }

        // Generate a secure six-digit OTP.
        const otp = randomInt(100000, 1000000).toString();

        const expiresAt = new Date(
            Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
        );

        // Remove previous OTP records.
        await VerificationModel.deleteMany({
            whatsappNumber: normalizedNumber,
        });

        // Store only the hashed OTP in MongoDB.
        await VerificationModel.create({
            whatsappNumber: normalizedNumber,
            otp: hashOTP(otp),
            expiresAt,
            verified: false,
            attempts: 0,
        });

        // ----------------------------------------
        // OTP DELIVERY
        // ----------------------------------------

        if (otpDeliveryMode === 'development') {
            // Development mode: show OTP in backend terminal.
            // No WhatsApp API request is made.

            console.log('\n========== FINTRACK DEVELOPMENT OTP ==========');
            console.log(`WhatsApp Number: +${normalizedNumber}`);
            console.log(`OTP: ${otp}`);
            console.log(`Expires in: ${OTP_EXPIRY_MINUTES} minutes`);
            console.log('================================================\n');

        } else {
            // WhatsApp mode: preserve existing Meta integration.
            const otpMessage =
                `Your FinTrack verification code is ${otp}.\n\n` +
                `This code expires in ${OTP_EXPIRY_MINUTES} minutes.\n` +
                `Please do not share this code with anyone.`;

            try {
                const result = await sendWhatsAppMessage(
                    normalizedNumber,
                    otpMessage
                );

                if (!result.success) {
                    await VerificationModel.deleteMany({
                        whatsappNumber: normalizedNumber,
                    });

                    return res.status(502).json({
                        success: false,
                        message:
                            result.error ||
                            'Unable to deliver OTP through WhatsApp.',
                    });
                }

            } catch (whatsappError) {
                await VerificationModel.deleteMany({
                    whatsappNumber: normalizedNumber,
                });

                console.error(
                    '[OTP] WhatsApp delivery failed:',
                    whatsappError
                );

                return res.status(502).json({
                    success: false,
                    message: 'Unable to deliver OTP through WhatsApp. Please try again.',
                });
            }
        }

        return res.json({
            success: true,
            message:
                otpDeliveryMode === 'development'
                    ? 'Development OTP generated. Check the backend terminal.'
                    : 'OTP sent successfully to your WhatsApp number',
        });

    } catch (error) {
        console.error('Send OTP error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
        });
    }
});

// ============================================
// VERIFY OTP
// ============================================

router.post('/verify-otp', async (req, res) => {
    try {
        const { whatsappNumber, otp } = req.body;

        if (!whatsappNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp number and OTP are required',
            });
        }

        if (
            typeof whatsappNumber !== 'string' ||
            typeof otp !== 'string' ||
            !/^\d{6}$/.test(otp)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid WhatsApp number or OTP format',
            });
        }

        const normalizedNumber =
            normalizeWhatsAppNumber(whatsappNumber);

        const verification = await VerificationModel.findOne({
            whatsappNumber: normalizedNumber,
        }).sort({ createdAt: -1 });

        if (!verification) {
            return res.status(400).json({
                success: false,
                message: 'No OTP found. Please request a new OTP.',
            });
        }

        if (verification.verified) {
            return res.status(400).json({
                success: false,
                message: 'This OTP has already been used. Please request a new one.',
            });
        }

        // Check OTP expiration.
        if (verification.expiresAt.getTime() < Date.now()) {
            await VerificationModel.deleteOne({
                _id: verification._id,
            });

            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.',
            });
        }

        // Check maximum attempts.
        if (verification.attempts >= OTP_MAX_ATTEMPTS) {
            return res.status(429).json({
                success: false,
                message: 'Maximum OTP attempts exceeded. Please request a new OTP.',
            });
        }

        // Compare submitted OTP with stored hash.
        const submittedHash = hashOTP(otp);

        if (!compareOTP(verification.otp, submittedHash)) {
            verification.attempts += 1;
            await verification.save();

            const remainingAttempts = Math.max(
                0,
                OTP_MAX_ATTEMPTS - verification.attempts
            );

            return res.status(400).json({
                success: false,
                message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
            });
        }

        // Mark OTP as verified.
        verification.verified = true;
        await verification.save();

        const numberVariants = [
            normalizedNumber,
            `+${normalizedNumber}`,
        ];

        // Update user's verification status.
        const user = await UserModel.findOneAndUpdate(
            {
                whatsappNumber: { $in: numberVariants },
            },
            {
                whatsappVerified: true,
                verificationStatus: 'verified',
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found. Please request a new OTP.',
            });
        }

        // Generate JWT.
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


// ============================================
// USER ONBOARDING
// ============================================

router.post(
    '/onboarding',
    authMiddleware,
    async (req: AuthRequest, res) => {
        try {
            // Identify user through authenticated JWT.
            const authenticatedUserId = req.user?.userId;

            if (!authenticatedUserId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required.',
                });
            }

            const user = await UserModel.findById(authenticatedUserId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found.',
                });
            }

            // Ensure OTP verification is complete.
            if (
                !user.whatsappVerified ||
                user.verificationStatus !== 'verified'
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'WhatsApp number must be verified before onboarding.',
                });
            }

            // Prevent repeated onboarding.
            if (user.onboardingCompleted) {
                return res.status(400).json({
                    success: false,
                    message: 'Onboarding is already completed.',
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

            // Normalize account type.
            const normalizedUsageType =
                usageType === 'business' ? 'business' : 'personal';

            // Update user profile.
            user.profile = {
                name: name || user.profile?.name || '',
                usageType: normalizedUsageType,
                upiId: upiId || user.profile?.upiId || '',
                currency: currency || user.profile?.currency || '₹',
            };

            // Determine workspace details.
            const workspaceName =
                normalizedUsageType === 'business'
                    ? businessName || name || 'My Business'
                    : name
                        ? `${name}'s Personal Workspace`
                        : 'Personal Workspace';

            const workspaceOwner =
                name || user.profile.name || 'Owner';

            const workspacePhone =
                phone || user.whatsappNumber;

            const workspaceUpi =
                upiId || user.profile.upiId || '';

            // Find an existing workspace linked to this user.
            let workspace = null;

            if (user.businessId) {
                workspace = await BusinessModel.findOne({
                    id: user.businessId,
                });
            }

            // Create a separate workspace if one does not exist.
            if (!workspace) {
                const workspaceId =
                    `bus_${Date.now()}_${randomInt(100000, 1000000)}`;

                workspace = await BusinessModel.create({
                    id: workspaceId,
                    name: workspaceName,
                    ownerName: workspaceOwner,
                    currency: currency || '₹',
                    phone: workspacePhone,
                    upiId: workspaceUpi,
                });

            } else {
                // Update only the workspace already linked to this user.
                workspace.name = workspaceName;
                workspace.ownerName = workspaceOwner;
                workspace.currency = currency || '₹';
                workspace.phone = workspacePhone;
                workspace.upiId = workspaceUpi;

                await workspace.save();
            }

            // Link workspace to the authenticated user.
            user.businessId = workspace.id;
            user.onboardingCompleted = true;

            await user.save();

            // Preserve the existing welcome message for business accounts.
            if (normalizedUsageType === 'business') {
                const welcomeMessage =
                    `👋 Welcome to FinTrack, ${user.profile.name || 'there'}!\n\n` +
                    `Your account has been successfully set up.\n\n` +
                    `Business: ${workspace.name}\n` +
                    `WhatsApp: ${user.whatsappNumber}\n\n` +
                    `You can now send your financial transactions directly through WhatsApp.`;

                try {
                    const result = await sendWhatsAppMessage(
                        user.whatsappNumber,
                        welcomeMessage
                    );

                    if (!result.success) {
                        throw new Error(
                            result.error || 'Welcome message delivery failed'
                        );
                    }

                    await ChatMessageModel.create({
                        id: `chat_${Date.now()}_${Math.random()
                            .toString(36)
                            .substring(2, 8)}`,
                        businessId: workspace.id,
                        channel: 'whatsapp_app',
                        sender: 'bot',
                        text: welcomeMessage,
                        timestamp: new Date().toISOString(),
                        type: 'text',
                        status: 'sent',
                    });

                } catch (error) {
                    console.error(
                        '[ONBOARDING] Welcome message error:',
                        error
                    );
                }
            }

            return res.json({
                success: true,
                message: 'User onboarding completed successfully.',
                user,
                workspace,
                business:
                    normalizedUsageType === 'business'
                        ? workspace
                        : null,
            });

        } catch (error) {
            console.error('Onboarding error:', error);

            return res.status(500).json({
                success: false,
                message: 'User onboarding failed.',
            });
        }
    }
);


// ============================================
// TEST PROTECTED AUTH ROUTE
// ============================================

router.get(
    '/auth-test',
    authMiddleware,
    (req: AuthRequest, res) => {
        return res.json({
            success: true,
            message: 'Authentication middleware is working',
            user: req.user,
        });
    }
);

export default router;
