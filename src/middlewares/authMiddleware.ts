import type { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';

/**
 * Unified Authentication and Role-Based Access Control Middleware.
 *
 * - If no roles are passed: Allows any authenticated user with a valid access token.
 * - If specific roles are passed: Enforces that the user is authenticated AND possesses one of the allowed roles.
 *
 * @example
 * router.get('/profile', checkAuth(), handler); // any authenticated user
 * router.get('/admin/panel', checkAuth('ADMIN'), handler); // ADMIN only
 * router.post('/resource', checkAuth('USER', 'ADMIN'), handler); // USER or ADMIN
 */
export const checkAuth = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Unauthorized: Authentication token is required', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Unauthorized: Authentication token is required', 401);
    }

    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
    } catch {
      throw new AppError('Unauthorized: Invalid or expired token', 401);
    }

    // Role-based authorization check (only if specific roles are constrained)
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      throw new AppError('Forbidden: Insufficient privileges', 403);
    }

    next();
  };
};

/**
 * Optional Authentication Middleware.
 * Populates req.user if a valid Bearer JWT Access Token is present in the Authorization header.
 * If the header is missing, malformed, or the token is invalid, it simply proceeds without req.user.
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
  } catch {
    // Gracefully ignore token errors for optional authentication
  }

  next();
};

/**
 * Middleware to enforce that the authenticated user has completed Step 2 Profile setup.
 */
export const requireProfileComplete = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    throw new AppError('Unauthorized: Authentication required', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { isProfileComplete: true, isVerified: true },
  });

  if (!user) {
    throw new AppError('User account not found', 404);
  }

  if (!user.isVerified) {
    throw new AppError('Your account is not verified. Please verify your email first.', 403);
  }

  if (!user.isProfileComplete) {
    throw new AppError('You must complete your profile before creating a blood request', 403);
  }

  next();
};
