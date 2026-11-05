import { Router } from 'express';
import { authRateLimiter, validateRequest } from '../../middlewares';
import {
  loginHandler,
  registerHandler,
  resendOtpHandler,
  verifyOtpHandler,
} from './auth.controller';
import {
  LoginInputSchema,
  RegisterInputSchema,
  ResendOtpInputSchema,
  VerifyOtpInputSchema,
} from './auth.schema';

const authRouter = Router();

// POST /api/v1/auth/register (Staged registration & OTP email delivery)
authRouter.post(
  '/register',
  authRateLimiter,
  validateRequest(RegisterInputSchema),
  registerHandler,
);

// POST /api/v1/auth/verify-otp (Verify OTP, commit user, issue tokens)
authRouter.post(
  '/verify-otp',
  authRateLimiter,
  validateRequest(VerifyOtpInputSchema),
  verifyOtpHandler,
);

// POST /api/v1/auth/resend-otp (Resend OTP code with 60s cooldown check)
authRouter.post(
  '/resend-otp',
  authRateLimiter,
  validateRequest(ResendOtpInputSchema),
  resendOtpHandler,
);

// POST /api/v1/auth/login (Authenticate existing user, issue tokens)
authRouter.post('/login', authRateLimiter, validateRequest(LoginInputSchema), loginHandler);

export { authRouter };
