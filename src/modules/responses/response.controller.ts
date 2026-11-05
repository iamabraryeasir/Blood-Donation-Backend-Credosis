import { AppError } from '../../errors';
import { catchAsync } from '../../utils';
import type { CreateDonorResponseInput, GetDonorResponsesQuery } from './response.schema';
import { responseService } from './response.service';

export const createResponseHandler = catchAsync(async (req, res) => {
    if (!req.user) {
        throw new AppError('Unauthorized: Authentication required', 401);
    }

    const result = await responseService.createResponse(
        req.params.id as string,
        req.user.userId,
        req.body as CreateDonorResponseInput,
    );

    res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Donation response submitted successfully. Requester contact details unlocked.',
        data: result,
    });
});

export const getResponsesHandler = catchAsync(async (req, res) => {
    if (!req.user) {
        throw new AppError('Unauthorized: Authentication required', 401);
    }

    const result = await responseService.getResponsesByRequestId(
        req.params.id as string,
        req.user,
        req.query as unknown as GetDonorResponsesQuery,
    );

    res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Donor responses retrieved successfully',
        data: result,
    });
});
