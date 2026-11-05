import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    SMTP_HOST: z.string().default('smtp.ethereal.email'),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_SECURE: z.coerce.boolean().default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().default('Blood Donation Platform <noreply@blooddonation.org>'),
    CORS_ORIGIN: z.string().default('*'),
    ENABLE_DOCS: z.coerce.boolean().default(true),
    ADMIN_EMAIL: z.string().email().default('admin@gmail.com'),
    ADMIN_PASSWORD: z
        .string()
        .min(8, 'ADMIN_PASSWORD must be at least 8 characters')
        .default('Admin123@#'),
    ADMIN_NAME: z.string().default('System Admin'),
    ADMIN_PHONE: z.string().default('01700000000'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
    process.exit(1);
}

export type EnvConfig = z.infer<typeof envSchema>;
export const env: EnvConfig = parsedEnv.data;
