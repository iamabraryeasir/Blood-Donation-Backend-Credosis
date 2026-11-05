import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { userRouter } from '../modules/users/user.routes';

const rootRouter = Router();

// Domain Routes
rootRouter.use('/auth', authRouter);
rootRouter.use('/users', userRouter);

rootRouter.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Blood Donation Platform API v1',
    docs: '/api-docs',
  });
});

export { rootRouter };
