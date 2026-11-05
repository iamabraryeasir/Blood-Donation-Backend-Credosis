import { Router } from 'express';
import { authenticate, authorize, validateRequest } from '../../middlewares';
import { completeProfileHandler, getMeHandler, updateAvailabilityHandler } from './user.controller';
import { CompleteProfileInputSchema, UpdateAvailabilityInputSchema } from './user.schema';

const userRouter = Router();

// GET /api/v1/users/me (Get authenticated user profile and donation metrics)
userRouter.get('/me', authenticate, authorize('USER', 'ADMIN'), getMeHandler);

// POST /api/v1/users/complete-profile (Step 2 Onboarding)
userRouter.post(
  '/complete-profile',
  authenticate,
  authorize('USER', 'ADMIN'),
  validateRequest(CompleteProfileInputSchema),
  completeProfileHandler,
);

// PATCH /api/v1/users/availability (Toggle or set donation availability)
userRouter.patch(
  '/availability',
  authenticate,
  authorize('USER', 'ADMIN'),
  validateRequest(UpdateAvailabilityInputSchema),
  updateAvailabilityHandler,
);

export { userRouter };
