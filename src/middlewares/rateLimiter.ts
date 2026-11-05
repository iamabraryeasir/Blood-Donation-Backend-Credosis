import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

// Global API Rate Limiter
export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // 100 requests per IP per window
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req: Request) => req.path === '/health',
    handler: (_req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            statusCode: 429,
            message: 'Too many requests from this IP address, please try again after 15 minutes.',
        });
    },
});

// Strict rate limiter for sensitive endpoints (e.g. login, registration, OTP)
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // 10 requests per IP per window
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            statusCode: 429,
            message: 'Too many authentication attempts, please try again after 15 minutes.',
        });
    },
});
