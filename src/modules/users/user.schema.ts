import { z } from 'zod';
import { registry } from '../../docs/registry';
import { ErrorResponseSchema } from '../../docs/schemas/common.schema';

export const BloodGroupEnum = z.enum([
  'A_POS',
  'A_NEG',
  'B_POS',
  'B_NEG',
  'AB_POS',
  'AB_NEG',
  'O_POS',
  'O_NEG',
]);

export const CompleteProfileInputSchema = registry.register(
  'CompleteProfileInput',
  z.object({
    bloodGroup: BloodGroupEnum.openapi({
      example: 'O_POS',
      description: 'Blood group of the donor',
    }),
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .regex(
        /^(?:\+8801|01)[3-9]\d{8}$/,
        'Must be a valid Bangladeshi phone number (e.g. 017XXXXXXXX or +88017XXXXXXXX)',
      )
      .openapi({
        example: '01712345678',
        description: 'Unique mobile phone number',
      }),
    district: z
      .string({ required_error: 'District is required' })
      .trim()
      .min(2, 'District must be at least 2 characters')
      .max(50, 'District cannot exceed 50 characters')
      .openapi({ example: 'Dhaka', description: 'District / City name' }),
    area: z
      .string({ required_error: 'Area is required' })
      .trim()
      .min(2, 'Area must be at least 2 characters')
      .max(100, 'Area cannot exceed 100 characters')
      .openapi({ example: 'Mirpur 10', description: 'Sub-district, Thana, or Area' }),
    lastDonationDate: z.coerce
      .date()
      .optional()
      .refine((date) => !date || date <= new Date(), 'Last donation date cannot be in the future')
      .openapi({
        example: '2026-08-01T00:00:00.000Z',
        description: 'Optional date of last blood donation (for 90-day cooldown calculation)',
      }),
    isAvailableForDonation: z.boolean().default(true).openapi({
      example: true,
      description: 'Whether donor is ready and willing to donate blood',
    }),
  }),
);

export type CompleteProfileInput = z.infer<typeof CompleteProfileInputSchema>;

export const CompleteProfileResponseSchema = registry.register(
  'CompleteProfileResponse',
  z.object({
    success: z.literal(true).openapi({ example: true }),
    statusCode: z.literal(201).openapi({ example: 201 }),
    message: z.string().openapi({ example: 'Profile completed successfully' }),
    data: z.object({
      user: z.object({
        id: z.string().uuid().openapi({ example: 'e4b2d354-9a57-4f51-b8d2-5a9e3240e111' }),
        name: z.string().openapi({ example: 'Abrar Yeasir' }),
        email: z.string().openapi({ example: 'abrar@example.com' }),
        role: z.enum(['USER', 'ADMIN']).openapi({ example: 'USER' }),
        isVerified: z.boolean().openapi({ example: true }),
        isProfileComplete: z.literal(true).openapi({ example: true }),
      }),
      profile: z.object({
        id: z.string().uuid().openapi({ example: '7b8a1c9e-9a57-4f51-b8d2-5a9e3240e222' }),
        bloodGroup: BloodGroupEnum.openapi({ example: 'O_POS' }),
        phone: z.string().openapi({ example: '01712345678' }),
        district: z.string().openapi({ example: 'Dhaka' }),
        area: z.string().openapi({ example: 'Mirpur 10' }),
        lastDonationDate: z.string().nullable().openapi({ example: '2026-08-01T00:00:00.000Z' }),
        isAvailableForDonation: z.boolean().openapi({ example: true }),
        createdAt: z.string().datetime().openapi({ example: '2026-11-05T22:20:00.000Z' }),
      }),
    }),
  }),
);

registry.registerPath({
  method: 'post',
  path: '/api/v1/users/complete-profile',
  tags: ['Users'],
  summary: 'Complete user profile (Step 2 Onboarding)',
  description:
    'Sets up donor profile details (blood group, unique phone number, geographic location, donation availability, and optional last donation date) and marks the account profile as complete.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CompleteProfileInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Profile created and onboarding completed successfully',
      content: {
        'application/json': {
          schema: CompleteProfileResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error (e.g. invalid phone number, future donation date)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized (missing or invalid Bearer JWT token)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden (insufficient permissions)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Conflict (profile already completed or phone number in use)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const UserProfileResponseSchema = registry.register(
  'UserProfileResponse',
  z.object({
    success: z.literal(true).openapi({ example: true }),
    statusCode: z.literal(200).openapi({ example: 200 }),
    message: z.string().openapi({
      example: 'User profile and donation metrics retrieved successfully',
    }),
    data: z.object({
      user: z.object({
        id: z.string().uuid().openapi({ example: 'e4b2d354-9a57-4f51-b8d2-5a9e3240e111' }),
        name: z.string().openapi({ example: 'Abrar Yeasir' }),
        email: z.string().openapi({ example: 'abrar@example.com' }),
        role: z.enum(['USER', 'ADMIN']).openapi({ example: 'USER' }),
        isVerified: z.boolean().openapi({ example: true }),
        isProfileComplete: z.boolean().openapi({ example: true }),
        createdAt: z.string().datetime().openapi({ example: '2026-11-05T02:00:00.000Z' }),
      }),
      profile: z
        .object({
          id: z.string().uuid().openapi({ example: '7b8a1c9e-9a57-4f51-b8d2-5a9e3240e222' }),
          bloodGroup: BloodGroupEnum.openapi({ example: 'O_POS' }),
          phone: z.string().openapi({ example: '01712345678' }),
          district: z.string().openapi({ example: 'Dhaka' }),
          area: z.string().openapi({ example: 'Mirpur 10' }),
          lastDonationDate: z.string().nullable().openapi({ example: '2026-08-01T00:00:00.000Z' }),
          isAvailableForDonation: z.boolean().openapi({ example: true }),
          createdAt: z.string().datetime().openapi({ example: '2026-11-05T22:20:00.000Z' }),
        })
        .nullable()
        .openapi({ example: null }),
      metrics: z.object({
        totalRequestsCreated: z.number().openapi({ example: 2 }),
        totalRequestsFulfilled: z.number().openapi({ example: 1 }),
        totalDonationsOffered: z.number().openapi({ example: 3 }),
        totalDonationsCompleted: z.number().openapi({ example: 2 }),
      }),
      eligibility: z.object({
        isAvailable: z.boolean().openapi({ example: true }),
        isEligibleToDonate: z.boolean().openapi({ example: true }),
        daysSinceLastDonation: z.number().nullable().openapi({ example: 96 }),
        daysUntilNextDonation: z.number().nullable().openapi({ example: 0 }),
        nextEligibleDonationDate: z
          .string()
          .nullable()
          .openapi({ example: '2026-10-30T00:00:00.000Z' }),
      }),
    }),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/api/v1/users/me',
  tags: ['Users'],
  summary: 'Get authenticated user profile and donation metrics',
  description:
    'Retrieves the current user identity, profile details, historical donation metrics, and dynamic 90-day cooldown eligibility calculations.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Profile and metrics retrieved successfully',
      content: {
        'application/json': {
          schema: UserProfileResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized (missing or invalid Bearer JWT token)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden (insufficient permissions)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'User account not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const UpdateAvailabilityInputSchema = registry.register(
  'UpdateAvailabilityInput',
  z.object({
    isAvailableForDonation: z
      .boolean({
        required_error: 'isAvailableForDonation boolean is required',
        invalid_type_error: 'isAvailableForDonation must be a boolean',
      })
      .openapi({
        example: false,
        description: 'New donor availability status (true: ready to donate, false: paused)',
      }),
  }),
);

export type UpdateAvailabilityInput = z.infer<typeof UpdateAvailabilityInputSchema>;

export const UpdateAvailabilityResponseSchema = registry.register(
  'UpdateAvailabilityResponse',
  z.object({
    success: z.literal(true).openapi({ example: true }),
    statusCode: z.literal(200).openapi({ example: 200 }),
    message: z.string().openapi({ example: 'Donation availability updated successfully' }),
    data: z.object({
      profile: z.object({
        id: z.string().uuid().openapi({ example: '7b8a1c9e-9a57-4f51-b8d2-5a9e3240e222' }),
        bloodGroup: BloodGroupEnum.openapi({ example: 'O_POS' }),
        phone: z.string().openapi({ example: '01712345678' }),
        district: z.string().openapi({ example: 'Dhaka' }),
        area: z.string().openapi({ example: 'Mirpur 10' }),
        lastDonationDate: z.string().nullable().openapi({ example: '2026-08-01T00:00:00.000Z' }),
        isAvailableForDonation: z.boolean().openapi({ example: false }),
        updatedAt: z.string().datetime().openapi({ example: '2026-11-05T22:40:00.000Z' }),
      }),
      eligibility: z.object({
        isAvailable: z.boolean().openapi({ example: false }),
        isEligibleToDonate: z.boolean().openapi({ example: false }),
        daysSinceLastDonation: z.number().nullable().openapi({ example: 96 }),
        daysUntilNextDonation: z.number().nullable().openapi({ example: 0 }),
      }),
    }),
  }),
);

registry.registerPath({
  method: 'patch',
  path: '/api/v1/users/availability',
  tags: ['Users'],
  summary: 'Update donation availability status',
  description:
    'Allows authenticated donors to pause or resume their availability for blood donation requests.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateAvailabilityInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Availability updated successfully',
      content: {
        'application/json': {
          schema: UpdateAvailabilityResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error or profile not completed',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized (missing or invalid Bearer JWT token)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden (insufficient permissions)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'User account not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});
