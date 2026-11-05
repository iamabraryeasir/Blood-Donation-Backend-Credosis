import { Router } from 'express';
import {
  checkAuth,
  optionalAuth,
  requireProfileComplete,
  validateRequest,
} from '../../middlewares';
import {
  createRequestHandler,
  getActiveRequestsHandler,
  getRequestByIdHandler,
} from './request.controller';
import {
  BloodRequestIdParamSchema,
  CreateBloodRequestInputSchema,
  GetBloodRequestsQuerySchema,
} from './request.schema';

const requestRouter = Router();

// GET /api/v1/requests (List active blood donation requests - Public Feed)
requestRouter.get(
  '/',
  validateRequest(GetBloodRequestsQuerySchema, 'query'),
  getActiveRequestsHandler,
);

// GET /api/v1/requests/:id (Retrieve blood donation request details - Public / Authenticated)
requestRouter.get(
  '/:id',
  optionalAuth,
  validateRequest(BloodRequestIdParamSchema, 'params'),
  getRequestByIdHandler,
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
