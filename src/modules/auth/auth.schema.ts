import { z } from 'zod';
import { registry } from '../../docs/registry';
import { ErrorResponseSchema } from '../../docs/schemas/common.schema';

export const RegisterInputSchema = registry.register(
  'RegisterInput',
  z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters')
      .openapi({ example: 'Abrar Yeasir', description: 'Full name of the user' }),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address format')
      .toLowerCase()
      .openapi({ example: 'abrar@example.com', description: 'Unique email address' }),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password cannot exceed 100 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
      .openapi({
        example: 'SecurePass123!',
        description:
          'Password with min 8 chars, including uppercase, lowercase, number, and symbol',
      }),
  }),
);

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const RegisterResponseSchema = registry.register(
  'RegisterResponse',
  z.object({
    success: z.literal(true).openapi({ example: true }),
    statusCode: z.literal(200).openapi({ example: 200 }),
    message: z.string().openapi({
      example: 'Verification code sent to your email. Please verify within 15 minutes.',
    }),
    data: z.object({
      email: z.string().openapi({ example: 'abrar@example.com' }),
      expiresInSeconds: z.number().openapi({ example: 900 }),
    }),
  }),
);

// Register OpenAPI Route Documentation
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/register',
  tags: ['Auth'],
  summary: 'Register new user account (Step 1 - Staging)',
  description:
    'Stages registration payload in Redis with a 15-minute TTL and dispatches a 6-digit OTP code to the provided email address. No record is created in PostgreSQL until OTP verification succeeds.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Registration staged and OTP email dispatched successfully',
      content: {
        'application/json': {
          schema: RegisterResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid input payload or validation errors',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Email already registered in the system',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    429: {
      description: 'Too many requests or resend cooldown active',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});
