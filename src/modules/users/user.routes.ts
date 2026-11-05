import { Router } from 'express';
import { authenticate, authorize, validateRequest } from '../../middlewares';
import { completeProfileHandler } from './user.controller';
import { CompleteProfileInputSchema } from './user.schema';

const userRouter = Router();

// POST /api/v1/users/complete-profile (Step 2 Onboarding)
userRouter.post(
  '/complete-profile',
  authenticate,
  authorize('USER', 'ADMIN'),
  validateRequest(CompleteProfileInputSchema),
  completeProfileHandler,
);

export { userRouter };
