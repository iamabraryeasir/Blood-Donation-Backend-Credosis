import type { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Middleware to authenticate requests via Bearer JWT Access Token.
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
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
    next();
  } catch {
    throw new AppError('Unauthorized: Invalid or expired token', 401);
  }
};

/**
 * Middleware to enforce Role-Based Access Control (RBAC).
 */
export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Unauthorized: Authentication required', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError('Forbidden: Insufficient privileges', 403);
    }

    next();
  };
};
