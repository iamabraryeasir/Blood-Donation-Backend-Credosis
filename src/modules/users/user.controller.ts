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

