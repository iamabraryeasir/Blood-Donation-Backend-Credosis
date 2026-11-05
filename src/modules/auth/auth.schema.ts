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

export const VerifyOtpInputSchema = registry.register(
  'VerifyOtpInput',
  z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address format')
      .toLowerCase()
      .openapi({
        example: 'abrar@example.com',
        description: 'Email address used during registration',
      }),
    otp: z.coerce
      .string({ required_error: 'OTP is required' })
      .trim()
      .regex(/^[0-9]{6}$/, 'OTP must be exactly 6 numeric digits')
      .openapi({ example: '890496', description: '6-digit verification code' }),
  }),
);

export type VerifyOtpInput = z.infer<typeof VerifyOtpInputSchema>;

export const VerifyOtpResponseSchema = registry.register(
  'VerifyOtpResponse',
  z.object({
    success: z.literal(true).openapi({ example: true }),
    statusCode: z.literal(201).openapi({ example: 201 }),
    message: z.string().openapi({
      example: 'Email verified successfully. Please complete your profile to continue.',
    }),
    data: z.object({
      user: z.object({
        id: z.string().uuid().openapi({ example: 'e4b2d354-9a57-4f51-b8d2-5a9e3240e111' }),
        name: z.string().openapi({ example: 'Abrar Yeasir' }),
        email: z.string().openapi({ example: 'abrar@example.com' }),
        role: z.enum(['USER', 'ADMIN']).openapi({ example: 'USER' }),
        isVerified: z.boolean().openapi({ example: true }),
        isProfileComplete: z.boolean().openapi({ example: false }),
        createdAt: z.string().datetime().openapi({ example: '2026-11-05T02:00:00.000Z' }),
      }),
      tokens: z.object({
        accessToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1Ni...' }),
        refreshToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1Ni...' }),
      }),
    }),
  }),
);

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/verify-otp',
  tags: ['Auth'],
  summary: 'Verify registration OTP and create user (Step 1B)',
  description:
    'Verifies the 6-digit OTP code against the Redis staging session. On success, creates the User record in PostgreSQL, purges the Redis staging keys, sets the HTTP-only refresh token cookie, and returns the authenticated user data with JWT tokens.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: VerifyOtpInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Email verified and user account created successfully',
      content: {
        'application/json': {
          schema: VerifyOtpResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid OTP code or expired verification session',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    429: {
      description: 'Maximum verification attempts exceeded (session revoked)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const ResendOtpInputSchema = registry.register(
  'ResendOtpInput',
  z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address format')
      .toLowerCase()
      .openapi({
        example: 'abrar@example.com',
        description: 'Email address of the staged registration',
      }),
  }),
);

export type ResendOtpInput = z.infer<typeof ResendOtpInputSchema>;

export const ResendOtpResponseSchema = registry.register(
  'ResendOtpResponse',
  z.object({
    success: z.literal(true).openapi({ example: true }),
    statusCode: z.literal(200).openapi({ example: 200 }),
    message: z.string().openapi({
      example: 'A new verification code has been sent to your email.',
    }),
    data: z.object({
      email: z.string().openapi({ example: 'abrar@example.com' }),
      cooldownSeconds: z.number().openapi({ example: 60 }),
      expiresInSeconds: z.number().openapi({ example: 900 }),
    }),
  }),
);

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/resend-otp',
  tags: ['Auth'],
  summary: 'Resend registration OTP code',
  description:
    'Validates that the account is not already registered, enforces a 60-second resend cooldown via Redis, generates a new 6-digit OTP, updates the Redis staging session (resetting failed attempts and extending expiration to 15 minutes), and dispatches the new code via email.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: ResendOtpInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'New verification OTP dispatched successfully',
      content: {
        'application/json': {
          schema: ResendOtpResponseSchema,
        },
      },
    },
    400: {
      description: 'Verification session expired or invalid',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Account already registered and verified',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    429: {
      description: 'Resend cooldown active or too many requests',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const LoginInputSchema = registry.register(
  'LoginInput',
  z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address format')
      .toLowerCase()
      .openapi({
        example: 'abrar@example.com',
        description: 'Registered user email address',
      }),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password cannot be empty')
      .openapi({
        example: 'SecurePass123!',
        description: 'Account password',
      }),
  }),
);

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const LoginResponseSchema = registry.register(
  'LoginResponse',
  z.object({
    success: z.literal(true).openapi({ example: true }),
    statusCode: z.literal(200).openapi({ example: 200 }),
    message: z.string().openapi({ example: 'Login successful' }),
    data: z.object({
      user: z.object({
        id: z.string().uuid().openapi({ example: 'e4b2d354-9a57-4f51-b8d2-5a9e3240e111' }),
        name: z.string().openapi({ example: 'Abrar Yeasir' }),
        email: z.string().openapi({ example: 'abrar@example.com' }),
        role: z.enum(['USER', 'ADMIN']).openapi({ example: 'USER' }),
        isVerified: z.boolean().openapi({ example: true }),
        isProfileComplete: z.boolean().openapi({ example: false }),
        createdAt: z.string().datetime().openapi({ example: '2026-11-05T02:00:00.000Z' }),
        profile: z
          .object({
            id: z.string().uuid(),
            bloodGroup: z.string(),
            phone: z.string(),
            district: z.string(),
            area: z.string(),
            lastDonationDate: z.string().nullable(),
            isAvailableForDonation: z.boolean(),
          })
          .nullable()
          .openapi({ example: null }),
      }),
      tokens: z.object({
        accessToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1Ni...' }),
        refreshToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1Ni...' }),
      }),
    }),
  }),
);

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  tags: ['Auth'],
  summary: 'Authenticate existing user and issue JWT tokens',
  description:
    'Authenticates user credentials against PostgreSQL, verifies that the email account has been verified, generates JWT Access and Refresh tokens, sets the HTTP-only refresh token cookie, and returns the authenticated user data.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: LoginResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid input payload or validation error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid email or password',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Account not verified or registration pending OTP verification',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});
