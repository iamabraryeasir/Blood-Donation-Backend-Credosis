import { z } from 'zod';
import { registry } from '../registry';

export const ErrorResponseSchema = registry.register(
  'ErrorResponse',
  z
    .object({
      success: z.literal(false).openapi({ example: false }),
      statusCode: z.number().openapi({ example: 400 }),
      message: z.string().openapi({ example: 'Invalid request payload or operational failure' }),
      errors: z
        .array(
          z.object({
            path: z.string().openapi({ example: 'email' }),
            message: z.string().openapi({ example: 'Invalid email address format' }),
          }),
        )
        .optional()
        .openapi({ description: 'Detailed validation issues when applicable' }),
    })
    .openapi({ description: 'Standardized Error Response Envelope' }),
);

export const HealthStatusSchema = registry.register(
  'HealthStatus',
  z
    .object({
      success: z.literal(true).openapi({ example: true }),
      message: z.string().openapi({ example: 'Blood Donation Platform API is healthy' }),
      data: z.object({
        status: z.string().openapi({ example: 'UP' }),
        uptime: z.number().openapi({ example: 12.34 }),
        timestamp: z.string().openapi({ example: '2026-11-03T02:40:00.000Z' }),
        environment: z.string().openapi({ example: 'development' }),
      }),
    })
    .openapi({ description: 'Service Health Status Envelope' }),
);

export const ApiRootMessageSchema = registry.register(
  'ApiRootMessage',
  z
    .object({
      success: z.literal(true).openapi({ example: true }),
      message: z.string().openapi({ example: 'Welcome to Blood Donation Platform API v1' }),
      docs: z.string().openapi({ example: '/api-docs' }),
    })
    .openapi({ description: 'API Root Information Envelope' }),
);
