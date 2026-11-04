import { Router } from 'express';
import { authRateLimiter, validateRequest } from '../../middlewares';
import { registerHandler } from './auth.controller';
import { RegisterInputSchema } from './auth.schema';

const authRouter = Router();

// POST /api/v1/auth/register (Staged registration & OTP email delivery)
authRouter.post(
  '/register',
  authRateLimiter,
  validateRequest(RegisterInputSchema),
  registerHandler,
);

export { authRouter };
