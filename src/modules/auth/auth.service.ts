import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { redisClient } from '../../config/redis';
import { AppError } from '../../errors/AppError';
import { emailService } from '../../services/email.service';
import { type AuthTokens, generateTokens, verifyRefreshToken } from '../../utils';
import { prisma } from '../../utils/prisma';
import type { LoginInput, RegisterInput, ResendOtpInput, VerifyOtpInput } from './auth.schema';

export interface StagedOnboardingUser {
  name: string;
  email: string;
  passwordHash: string;
  otp: string;
  attempts: number;
  createdAt: string;
}

export interface VerifiedUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isVerified: boolean;
  isProfileComplete: boolean;
  createdAt: Date;
}

export interface VerifyOtpResult {
  user: VerifiedUser;
  tokens: AuthTokens;
}

export interface LoginResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN';
    isVerified: boolean;
    isProfileComplete: boolean;
    createdAt: Date;
    profile: {
      id: string;
      bloodGroup: string;
      phone: string;
      district: string;
      area: string;
      lastDonationDate: Date | null;
      isAvailableForDonation: boolean;
    } | null;
  };
  tokens: AuthTokens;
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

  /**
   * Verify registration OTP: validates attempts limit, compares OTP timing-safely,
   * atomically creates the user in PostgreSQL, evicts Redis keys, and generates JWT tokens.
   */
  async verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const stagingKey = `onboarding:${normalizedEmail}`;
    const cooldownKey = `resend-cooldown:${normalizedEmail}`;

    // 1. Fetch staged registration payload from Redis
    const stagedData = await redisClient.get(stagingKey);
    if (!stagedData) {
      throw new AppError('Verification session expired or invalid. Please register again.', 400);
    }

    const stagedUser: StagedOnboardingUser = JSON.parse(stagedData);

    // 2. Enforce brute-force attempt limits (max 5 attempts)
    if (stagedUser.attempts >= 5) {
      await redisClient.del([stagingKey, cooldownKey]);
      throw new AppError(
        'Too many failed attempts. Your verification session has been invalidated. Please register again.',
        429,
      );
    }

    // 3. Timing-safe OTP comparison
    const providedOtpBuffer = Buffer.from(input.otp.trim());
    const storedOtpBuffer = Buffer.from(stagedUser.otp);

    const isMatch =
      providedOtpBuffer.length === storedOtpBuffer.length &&
      crypto.timingSafeEqual(providedOtpBuffer, storedOtpBuffer);

    if (!isMatch) {
      const remainingTtl = await redisClient.ttl(stagingKey);
      stagedUser.attempts += 1;

      if (stagedUser.attempts >= 5) {
        await redisClient.del([stagingKey, cooldownKey]);
        throw new AppError(
          'Too many failed attempts. Your verification session has been invalidated. Please register again.',
          429,
        );
      }

      // Re-save with updated attempts and preserve remaining TTL
      if (remainingTtl > 0) {
        await redisClient.set(stagingKey, JSON.stringify(stagedUser), {
          EX: remainingTtl,
        });
      }

      const attemptsLeft = 5 - stagedUser.attempts;
      throw new AppError(
        `Invalid verification code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
        400,
      );
    }

    // 4. Atomic promotion to PostgreSQL
    const createdUser = await prisma.$transaction(async (tx) => {
      // Concurrency guard: ensure account wasn't created in parallel
      const existing = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existing) {
        throw new AppError('An account with this email already exists', 409);
      }

      return await tx.user.create({
        data: {
          name: stagedUser.name,
          email: stagedUser.email,
          passwordHash: stagedUser.passwordHash,
          role: 'USER',
          isVerified: true,
          isProfileComplete: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isVerified: true,
          isProfileComplete: true,
          createdAt: true,
        },
      });
    });

    // 5. Purge Redis staging session
    await redisClient.del([stagingKey, cooldownKey]);

    // 6. Generate JWT Authentication Tokens
    const tokens = generateTokens({
      userId: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
    });

    return {
      user: createdUser,
      tokens,
    };
  }

  /**
   * Resend verification OTP: validates user uniqueness, checks 60s cooldown,
   * fetches active Redis staging session, generates fresh OTP, resets attempts to 0,
   * extends session TTL to 15m, and dispatches email.
   */
  async resendOtp(input: ResendOtpInput): Promise<{
    email: string;
    cooldownSeconds: number;
    expiresInSeconds: number;
  }> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const stagingKey = `onboarding:${normalizedEmail}`;
    const cooldownKey = `resend-cooldown:${normalizedEmail}`;

    // 1. Check if user is already verified in PostgreSQL
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError('This account is already verified. Please sign in.', 409);
    }

    // 2. Check for active resend cooldown in Redis (60-second throttling)
    const cooldownTtl = await redisClient.ttl(cooldownKey);
    if (cooldownTtl > 0) {
      throw new AppError(
        `Please wait ${cooldownTtl} seconds before requesting another verification code`,
        429,
      );
    }

    // 3. Fetch staged registration payload from Redis
    const stagedData = await redisClient.get(stagingKey);
    if (!stagedData) {
      throw new AppError('Verification session expired or invalid. Please register again.', 400);
    }

    const stagedUser: StagedOnboardingUser = JSON.parse(stagedData);

    // 4. Generate fresh 6-digit numeric OTP
    const newOtp = crypto.randomInt(100000, 1000000).toString();

    // 5. Update staged payload: reset failed attempts to 0 and assign new OTP
    stagedUser.otp = newOtp;
    stagedUser.attempts = 0;

    const ONBOARDING_TTL_SECONDS = 15 * 60; // 15 minutes
    const RESEND_COOLDOWN_SECONDS = 60; // 60 seconds

    await redisClient.set(stagingKey, JSON.stringify(stagedUser), {
      EX: ONBOARDING_TTL_SECONDS,
    });

    await redisClient.set(cooldownKey, '1', {
      EX: RESEND_COOLDOWN_SECONDS,
    });

    // 6. Dispatch email with new OTP
    try {
      await emailService.sendTemplateEmail({
        to: normalizedEmail,
        subject: 'Your new verification code - Blood Donation Platform',
        templateName: 'otp-verification',
        data: {
          name: stagedUser.name,
          otp: newOtp,
          expiresInMinutes: 15,
        },
      });
    } catch (error) {
      // Clear cooldown key if dispatch fails so user can immediately retry
      await redisClient.del(cooldownKey);
      console.error('Failed to send resend OTP verification email:', error);
      throw new AppError('Failed to dispatch verification email. Please try again.', 500);
    }

    return {
      email: normalizedEmail,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      expiresInSeconds: ONBOARDING_TTL_SECONDS,
    };
  }

  /**
   * Authenticate user credentials, check verification status,
   * generate JWT Access and Refresh tokens.
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Fetch user by email from PostgreSQL
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: {
          select: {
            id: true,
            bloodGroup: true,
            phone: true,
            district: true,
            area: true,
            lastDonationDate: true,
            isAvailableForDonation: true,
          },
        },
      },
    });

    if (!user) {
      // Check if registration is still staged in Redis pending OTP verification
      const stagedData = await redisClient.get(`onboarding:${normalizedEmail}`);
      if (stagedData) {
        throw new AppError(
          'Account verification is pending. Please verify your email with the OTP code sent to you.',
          403,
        );
      }

      throw new AppError('Invalid email or password', 401);
    }

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // 3. Ensure account is verified
    if (!user.isVerified) {
      throw new AppError('Your account is not verified. Please verify your email.', 403);
    }

    // 4. Generate JWT tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isProfileComplete: user.isProfileComplete,
        createdAt: user.createdAt,
        profile: user.profile,
      },
      tokens,
    };
  }

  /**
   * Validate refresh token, verify user exists in PostgreSQL and is verified,
   * rotate session by issuing fresh Access and Refresh tokens.
   */
  async refreshToken(token: string): Promise<{ tokens: AuthTokens }> {
    if (!token || typeof token !== 'string') {
      throw new AppError('Refresh token is required', 401);
    }

    // 1. Verify token signature and expiration
    let decoded: { userId: string; email: string; role: 'USER' | 'ADMIN' };
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // 2. Verify user in PostgreSQL
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
      },
    });

    if (!user) {
      throw new AppError('User account not found', 401);
    }

    if (!user.isVerified) {
      throw new AppError('User account is unverified', 403);
    }

    // 3. Issue rotated tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { tokens };
  }
}

export const authService = new AuthService();
