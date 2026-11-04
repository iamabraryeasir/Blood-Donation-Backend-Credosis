import { catchAsync } from '../../utils';
import { authService } from './auth.service';

export const registerHandler = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Verification code sent to your email. Please verify within 15 minutes.',
    data: result,
  });
});
