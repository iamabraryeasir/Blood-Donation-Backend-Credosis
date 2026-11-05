import { AppError } from '../../errors';
import { catchAsync } from '../../utils';
import { requestService } from './request.service';

export const createRequestHandler = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError('Unauthorized: Authentication required', 401);
  }

  const result = await requestService.createRequest(req.user.userId, req.body);

  res.status(201).json({
    success: true,
    statusCode: 201,
    message: 'Blood donation request submitted successfully and is pending administrative approval',
    data: {
      request: result,
    },
  });
});
