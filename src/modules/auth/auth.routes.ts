import { Router } from 'express';
import { authRateLimiter, validateRequest } from '../../middlewares';
import { registerHandler, verifyOtpHandler } from './auth.controller';
import { RegisterInputSchema, VerifyOtpInputSchema } from './auth.schema';

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

export { authRouter };
