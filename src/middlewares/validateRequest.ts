import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject, ZodEffects } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';
type SchemaType = AnyZodObject | ZodEffects<AnyZodObject>;

export const validateRequest = (schema: SchemaType, target: ValidationTarget = 'body') => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const parsed = await schema.parseAsync(req[target]);
            req[target] = parsed;
            next();
        } catch (error) {
            next(error);
        }
    };
};
