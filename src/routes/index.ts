import { Router } from 'express';

const rootRouter = Router();

// Future domain routes (e.g., users, requests) will be registered here:
// rootRouter.use('/users', userRouter);
// rootRouter.use('/requests', requestRouter);

rootRouter.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Blood Donation Platform API v1',
    docs: '/api-docs',
  });
});

export { rootRouter };
