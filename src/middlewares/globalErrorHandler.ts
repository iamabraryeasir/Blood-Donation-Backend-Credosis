import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';

export const globalErrorHandler: ErrorRequestHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let errors: unknown = undefined;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    } else if (err instanceof ZodError) {
        statusCode = 400;
        message = 'Validation Error';
        errors = err.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
        }));
    } else if (err instanceof SyntaxError && 'body' in err) {
        statusCode = 400;
        message = 'Malformed JSON payload';
    } else if (err instanceof Error) {
        message = env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
    }

    res.status(statusCode).json({
        success: false,
        message,
        statusCode,
        ...(errors !== undefined && { errors }),
        ...(env.NODE_ENV === 'development' && err instanceof Error && { stack: err.stack }),
    });
};
