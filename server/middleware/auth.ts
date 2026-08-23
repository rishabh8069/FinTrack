import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UserModel } from '../models/User';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        whatsappNumber: string;
        businessId?: string;
    };
}

export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token required',
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = verifyToken(token);

        const user = await UserModel.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authenticated user not found',
            });
        }

        req.user = {
            userId: user._id.toString(),
            whatsappNumber: user.whatsappNumber,
            businessId: user.businessId || undefined,
        };

        next();

    } catch (error) {
        console.error('Authentication error:', error);

        return res.status(401).json({
            success: false,
            message: 'Invalid or expired authentication token',
        });
    }
};