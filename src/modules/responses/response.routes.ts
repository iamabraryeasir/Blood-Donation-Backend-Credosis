import { Router } from 'express';
import { checkAuth, requireProfileComplete, validateRequest } from '../../middlewares';
import { BloodRequestIdParamSchema } from '../requests/request.schema';
import { createResponseHandler, getResponsesHandler } from './response.controller';
import { CreateDonorResponseInputSchema, GetDonorResponsesQuerySchema } from './response.schema';

const responseRouter = Router({ mergeParams: true });

// POST /api/v1/requests/:id/responses (Respond to an active blood donation request)
responseRouter.post(
    '/',
    checkAuth(),
    requireProfileComplete,
    validateRequest(BloodRequestIdParamSchema, 'params'),
    validateRequest(CreateDonorResponseInputSchema, 'body'),
    createResponseHandler,
);

// GET /api/v1/requests/:id/responses (List responding donors - Requester or ADMIN)
responseRouter.get(
    '/',
    checkAuth('USER', 'ADMIN'),
    validateRequest(BloodRequestIdParamSchema, 'params'),
    validateRequest(GetDonorResponsesQuerySchema, 'query'),
    getResponsesHandler,
);

export { responseRouter };
