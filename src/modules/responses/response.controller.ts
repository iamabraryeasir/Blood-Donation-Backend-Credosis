import { AppError } from '../../errors';
import { catchAsync } from '../../utils';
import type { CreateDonorResponseInput } from './response.schema';
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

