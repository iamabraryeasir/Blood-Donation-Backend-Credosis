import { Router } from 'express';
import { checkAuth, requireProfileComplete, validateRequest } from '../../middlewares';
import { createRequestHandler } from './request.controller';
import { CreateBloodRequestInputSchema } from './request.schema';

const requestRouter = Router();

// POST /api/v1/requests (Create a new blood donation request)
requestRouter.post(
  '/',
  checkAuth(),
  requireProfileComplete,
  validateRequest(CreateBloodRequestInputSchema),
  createRequestHandler,
);

export { requestRouter };
