import { AppError } from '../../errors';
import { catchAsync } from '../../utils';
import type { GetBloodRequestsQuery } from './request.schema';
import { requestService } from './request.service';

export const getActiveRequestsHandler = catchAsync(async (req, res) => {
    const result = await requestService.getActiveRequests(
        req.query as unknown as GetBloodRequestsQuery,
    );

    res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Active blood donation requests retrieved successfully',
        data: result,
    });
});

export const getPendingRequestsHandler = catchAsync(async (req, res) => {
    const result = await requestService.getPendingRequests(
        req.query as unknown as GetBloodRequestsQuery,
    );

    res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Pending blood donation requests retrieved successfully',
        data: result,
    });
});

export const getRequestByIdHandler = catchAsync(async (req, res) => {
    const result = await requestService.getRequestById(req.params.id as string, req.user);

    res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Blood donation request details retrieved successfully',
        data: {
            request: result,
        },
    });
});

export const createRequestHandler = catchAsync(async (req, res) => {
    if (!req.user) {
        throw new AppError('Unauthorized: Authentication required', 401);
    }

    const result = await requestService.createRequest(req.user.userId, req.body);

    res.status(201).json({
        success: true,
        statusCode: 201,
        message:
            'Blood donation request submitted successfully and is pending administrative approval',
        data: {
            request: result,
        },
    });
});
