import { Router } from 'express';
import {
    checkAuth,
    optionalAuth,
    requireProfileComplete,
    validateRequest,
} from '../../middlewares';
import {
    approveRequestHandler,
    createRequestHandler,
    getActiveRequestsHandler,
    getPendingRequestsHandler,
    getRequestByIdHandler,
    rejectRequestHandler,
} from './request.controller';
import {
    BloodRequestIdParamSchema,
    CreateBloodRequestInputSchema,
    GetBloodRequestsQuerySchema,
    RejectBloodRequestInputSchema,
} from './request.schema';

const requestRouter = Router();

// GET /api/v1/requests (List active blood donation requests - Public Feed)
requestRouter.get(
    '/',
    validateRequest(GetBloodRequestsQuerySchema, 'query'),
    getActiveRequestsHandler,
);

// GET /api/v1/requests/pending (List pending blood donation requests - Admin Only)
requestRouter.get(
    '/pending',
    checkAuth('ADMIN'),
    validateRequest(GetBloodRequestsQuerySchema, 'query'),
    getPendingRequestsHandler,
);

// GET /api/v1/requests/:id (Retrieve blood donation request details - Public / Authenticated)
requestRouter.get(
    '/:id',
    optionalAuth,
    validateRequest(BloodRequestIdParamSchema, 'params'),
    getRequestByIdHandler,
);

// PATCH /api/v1/requests/:id/approve (Approve pending blood donation request - Admin Only)
requestRouter.patch(
    '/:id/approve',
    checkAuth('ADMIN'),
    validateRequest(BloodRequestIdParamSchema, 'params'),
    approveRequestHandler,
);

// PATCH /api/v1/requests/:id/reject (Reject pending blood donation request - Admin Only)
requestRouter.patch(
    '/:id/reject',
    checkAuth('ADMIN'),
    validateRequest(BloodRequestIdParamSchema, 'params'),
    validateRequest(RejectBloodRequestInputSchema, 'body'),
    rejectRequestHandler,
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
