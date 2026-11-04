import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';

const rootRouter = Router();

// Domain Routes
rootRouter.use('/auth', authRouter);

rootRouter.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Blood Donation Platform API v1',
    docs: '/api-docs',
  });
});

export { rootRouter };
