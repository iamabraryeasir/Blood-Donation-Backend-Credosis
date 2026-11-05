import { AppError } from '../../errors';
import { catchAsync } from '../../utils';
import { userService } from './user.service';

export const completeProfileHandler = catchAsync(async (req, res) => {
    if (!req.user) {
        throw new AppError('Unauthorized: Authentication required', 401);
    }

    const result = await userService.completeProfile(req.user.userId, req.body);

    res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Profile completed successfully',
        data: result,
    });
});

export const getMeHandler = catchAsync(async (req, res) => {
    if (!req.user) {
        throw new AppError('Unauthorized: Authentication required', 401);
    }

    const result = await userService.getMe(req.user.userId);

    res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'User profile and donation metrics retrieved successfully',
        data: result,
    });
});

export const updateAvailabilityHandler = catchAsync(async (req, res) => {
    if (!req.user) {
        throw new AppError('Unauthorized: Authentication required', 401);
    }

    const result = await userService.updateAvailability(req.user.userId, req.body);

    res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Donation availability updated successfully',
        data: result,
    });
});
