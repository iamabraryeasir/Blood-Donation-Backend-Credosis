import type { Role } from '@prisma/client';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtUserPayload {
    userId: string;
    email: string;
    role: Role;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

/**
 * Generate Access and Refresh JWT tokens
 */
export const generateTokens = (payload: JwtUserPayload): AuthTokens => {
    const accessOptions: SignOptions = {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    };

    const refreshOptions: SignOptions = {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, accessOptions);
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, refreshOptions);

    return { accessToken, refreshToken };
};

/**
 * Verify an Access Token
 */
export const verifyAccessToken = (token: string): JwtUserPayload => {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUserPayload;
};

/**
 * Verify a Refresh Token
 */
export const verifyRefreshToken = (token: string): JwtUserPayload => {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtUserPayload;
};
