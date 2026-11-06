import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { requestRouter } from '../modules/requests/request.routes';
import { userRouter } from '../modules/users/user.routes';

const rootRouter = Router();

// Domain Routes
rootRouter.use('/auth', authRouter);
rootRouter.use('/users', userRouter);
rootRouter.use('/requests', requestRouter);

rootRouter.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to Blood Donation System API v1',
        docs: '/api-docs',
    });
});

export { rootRouter };
