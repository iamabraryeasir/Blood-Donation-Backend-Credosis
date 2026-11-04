import { env } from '../../config/env';
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

export const verifyOtpHandler = catchAsync(async (req, res) => {
  const result = await authService.verifyOtp(req.body);

  // Set HTTP-only refresh token cookie
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json({
    success: true,
    statusCode: 201,
    message: 'Email verified successfully. Please complete your profile to continue.',
    data: result,
  });
});
