import { Router } from 'express';
import { checkAuth, requireProfileComplete, validateRequest } from '../../middlewares';
import { createRequestHandler, getActiveRequestsHandler } from './request.controller';
import { CreateBloodRequestInputSchema, GetBloodRequestsQuerySchema } from './request.schema';

const requestRouter = Router();

// GET /api/v1/requests (List active blood donation requests - Public Feed)
requestRouter.get(
  '/',
  validateRequest(GetBloodRequestsQuerySchema, 'query'),
  getActiveRequestsHandler,
);

// POST /api/v1/requests (Create a new blood donation request)
requestRouter.post(
  '/',
  checkAuth(),
  requireProfileComplete,
  validateRequest(CreateBloodRequestInputSchema),
  createRequestHandler,
);

export { requestRouter };
