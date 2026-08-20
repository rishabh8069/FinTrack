import jwt from 'jsonwebtoken';

export interface JwtPayload {
    userId: string;
    whatsappNumber: string;
}

export function generateToken(payload: JwtPayload): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign(payload, secret, {
        expiresIn: '7d',
    });
}

export function verifyToken(token: string): JwtPayload {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }

    return jwt.verify(token, secret) as JwtPayload;
}