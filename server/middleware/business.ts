import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserModel } from '../models/User';

export interface BusinessRequest extends AuthRequest {
    businessId?: string;
}

export const businessMiddleware = async (
    req: BusinessRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({
                success: false,
                message: 'Authenticated user required',
            });
        }

        const user = await UserModel.findById(req.user.userId).lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (!user.businessId) {
            return res.status(403).json({
                success: false,
                message: 'User is not associated with a business',
            });
        }

        req.businessId = user.businessId;

        next();
    } catch (error) {
        console.error('Business authorization error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to resolve business',
        });
    }
};