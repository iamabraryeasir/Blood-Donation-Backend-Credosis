import { Router } from 'express';
import { checkAuth, requireProfileComplete, validateRequest } from '../../middlewares';
import { BloodRequestIdParamSchema } from '../requests/request.schema';
import { createResponseHandler } from './response.controller';
import { CreateDonorResponseInputSchema } from './response.schema';

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

export { responseRouter };

