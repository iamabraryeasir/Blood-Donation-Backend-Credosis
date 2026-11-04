import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { redisClient } from '../../config/redis';
import { AppError } from '../../errors/AppError';
import { emailService } from '../../services/email.service';
import { prisma } from '../../utils/prisma';
import type { RegisterInput } from './auth.schema';

export interface StagedOnboardingUser {
  name: string;
  email: string;
  passwordHash: string;
  otp: string;
  attempts: number;
  createdAt: string;
}

export class AuthService {
  /**
   * Register a new user: checks DB uniqueness, hashes password,
   * stages registration in Redis (15m TTL), and emails 6-digit OTP.
   */
  async register(input: RegisterInput): Promise<{
    email: string;
    expiresInSeconds: number;
  }> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Check if user already exists in PostgreSQL database
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError('An account with this email already exists', 409);
    }

    // 2. Check for active resend cooldown in Redis (60-second throttling)
    const cooldownTtl = await redisClient.ttl(`resend-cooldown:${normalizedEmail}`);
    if (cooldownTtl > 0) {
      throw new AppError(
        `Please wait ${cooldownTtl} seconds before requesting another verification code`,
        429,
      );
    }

    // 3. Hash password securely
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 4. Generate cryptographically strong 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // 5. Stage registration payload in Redis with 15-minute expiration
    const stagedPayload: StagedOnboardingUser = {
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      otp,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    const ONBOARDING_TTL_SECONDS = 15 * 60; // 15 minutes
    const RESEND_COOLDOWN_SECONDS = 60; // 60 seconds

    await redisClient.set(`onboarding:${normalizedEmail}`, JSON.stringify(stagedPayload), {
      EX: ONBOARDING_TTL_SECONDS,
    });

    await redisClient.set(`resend-cooldown:${normalizedEmail}`, '1', {
      EX: RESEND_COOLDOWN_SECONDS,
    });

    // 6. Dispatch branded email with OTP
    try {
      await emailService.sendTemplateEmail({
        to: normalizedEmail,
        subject: 'Verify your email - Blood Donation Platform',
        templateName: 'otp-verification',
        data: {
          name: input.name.trim(),
          otp,
          expiresInMinutes: 15,
        },
      });
    } catch (error) {
      // Clear cooldown key if dispatch fails so user can immediately retry
      await redisClient.del(`resend-cooldown:${normalizedEmail}`);
      console.error('Failed to send verification email:', error);
      throw new AppError('Failed to dispatch verification email. Please try again.', 500);
    }

    return {
      email: normalizedEmail,
      expiresInSeconds: ONBOARDING_TTL_SECONDS,
    };
  }
}

export const authService = new AuthService();
