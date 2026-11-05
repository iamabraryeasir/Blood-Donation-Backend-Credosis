import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { redisClient } from './config/redis';
import { swaggerRouter } from './docs';
import {
    globalErrorHandler,
    globalRateLimiter,
    notFoundHandler,
    requestLogger,
} from './middlewares';
import { rootRouter } from './routes';

const app: Application = express();

// Trust reverse proxy (e.g. Render, Cloudflare, AWS ALB) for accurate client IP in rate limiting & secure cookies
app.set('trust proxy', 1);

// Disable x-powered-by header
app.disable('x-powered-by');

// Security HTTP headers
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
);

// Cross-Origin Resource Sharing (CORS)
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || env.CORS_ORIGIN === '*' || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    }),
);

// Global Rate Limiting
app.use(globalRateLimiter);

// Structured HTTP Request Logger
app.use(requestLogger);

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Root ping & discovery endpoint
app.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Blood Donation Platform API is live and operational',
        environment: env.NODE_ENV,
        health: '/health',
        api: '/api/v1',
        ...(env.ENABLE_DOCS ? { docs: '/api-docs' } : {}),
    });
});

// Liveness & health check endpoint (supports both /health and /api/v1/health)
app.get(['/health', '/api/v1/health'], (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Blood Donation Platform API is healthy',
        data: {
            status: 'UP',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            environment: env.NODE_ENV,
            services: {
                redis: redisClient.isOpen ? 'CONNECTED' : 'DISCONNECTED',
            },
        },
    });
});

// API Documentation (Swagger UI & OpenAPI JSON Spec)
if (env.ENABLE_DOCS) {
    app.use('/api-docs', swaggerRouter);
}

// Modular domain routes under /api/v1
app.use('/api/v1', rootRouter);

// 404 Not Found route handler
app.use(notFoundHandler);

// Centralized error handling pipeline
app.use(globalErrorHandler);

export { app };
export default app;
