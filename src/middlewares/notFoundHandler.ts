import type { Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `API endpoint '${req.method} ${req.originalUrl}' not found`,
  });
};
