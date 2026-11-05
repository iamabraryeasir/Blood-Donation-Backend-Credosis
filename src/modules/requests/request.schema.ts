import { z } from 'zod';
import { registry } from '../../docs/registry';
import { ErrorResponseSchema } from '../../docs/schemas/common.schema';
import { BloodGroupEnum } from '../users/user.schema';

export const UrgencyLevelEnum = z.enum(['NORMAL', 'URGENT', 'EMERGENCY']);
export const RequestStatusEnum = z.enum(['PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'FULFILLED']);

export const CreateBloodRequestInputSchema = registry.register(
  'CreateBloodRequestInput',
  z.object({
    patientName: z
      .string({ required_error: 'Patient name is required' })
      .trim()
      .min(2, 'Patient name must be at least 2 characters')
      .max(100, 'Patient name cannot exceed 100 characters')
      .openapi({ example: 'Rahim Uddin', description: 'Full name of the patient' }),
    bloodGroup: BloodGroupEnum.openapi({
      example: 'O_POS',
      description: 'Required blood group',
    }),
    unitsNeeded: z.coerce
      .number()
      .int()
      .min(1, 'Units needed must be at least 1')
      .max(10, 'Units needed cannot exceed 10 bags')
      .default(1)
      .openapi({ example: 1, description: 'Number of blood bags required' }),
    hospitalName: z
      .string({ required_error: 'Hospital name is required' })
      .trim()
      .min(2, 'Hospital name must be at least 2 characters')
      .max(150, 'Hospital name cannot exceed 150 characters')
      .openapi({
        example: 'Dhaka Medical College Hospital',
        description: 'Hospital or clinic name where blood is needed',
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
      .openapi({ example: 'Bakshibazar', description: 'Area / Thana / Location' }),
    urgency: UrgencyLevelEnum.default('NORMAL').openapi({
      example: 'URGENT',
      description: 'Urgency level of the request',
    }),
    neededAt: z.coerce.date({ required_error: 'Date and time needed is required' }).openapi({
      example: '2026-11-06T14:00:00.000Z',
      description: 'Date and time when blood is needed',
    }),
    contactNumber: z
      .string({ required_error: 'Contact number is required' })
      .trim()
      .regex(
        /^(?:\+8801|01)[3-9]\d{8}$/,
        'Must be a valid Bangladeshi phone number (e.g. 017XXXXXXXX or +88017XXXXXXXX)',
      )
      .openapi({
        example: '01712345678',
        description: 'Contact number for coordination',
      }),
    additionalNotes: z
      .string()
      .trim()
      .max(500, 'Additional notes cannot exceed 500 characters')
      .optional()
      .openapi({
        example: 'Emergency surgery scheduled for tomorrow morning.',
        description: 'Optional additional context or instructions',
      }),
  }),
);

export type CreateBloodRequestInput = z.infer<typeof CreateBloodRequestInputSchema>;

export const CreateBloodRequestResponseSchema = registry.register(
  'CreateBloodRequestResponse',
  z.object({
    success: z.literal(true).openapi({ example: true }),
    statusCode: z.literal(201).openapi({ example: 201 }),
    message: z.string().openapi({
      example:
        'Blood donation request submitted successfully and is pending administrative approval',
    }),
    data: z.object({
      request: z.object({
        id: z.string().uuid().openapi({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
        requesterId: z.string().uuid().openapi({ example: 'e4b2d354-9a57-4f51-b8d2-5a9e3240e111' }),
        patientName: z.string().openapi({ example: 'Rahim Uddin' }),
        bloodGroup: BloodGroupEnum.openapi({ example: 'O_POS' }),
        unitsNeeded: z.number().openapi({ example: 1 }),
        hospitalName: z.string().openapi({ example: 'Dhaka Medical College Hospital' }),
        district: z.string().openapi({ example: 'Dhaka' }),
        area: z.string().openapi({ example: 'Bakshibazar' }),
        urgency: UrgencyLevelEnum.openapi({ example: 'URGENT' }),
        neededAt: z.string().datetime().openapi({ example: '2026-11-06T14:00:00.000Z' }),
        contactNumber: z.string().openapi({ example: '01712345678' }),
        additionalNotes: z
          .string()
          .nullable()
          .openapi({ example: 'Emergency surgery scheduled for tomorrow morning.' }),
        status: RequestStatusEnum.openapi({ example: 'PENDING_APPROVAL' }),
        createdAt: z.string().datetime().openapi({ example: '2026-11-05T23:00:00.000Z' }),
      }),
    }),
  }),
);

registry.registerPath({
  method: 'post',
  path: '/api/v1/requests',
  tags: ['Requests'],
  summary: 'Create a new blood donation request',
  description:
    'Submits a new blood request into PENDING_APPROVAL status. Requires an authenticated user with a completed donor profile.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateBloodRequestInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Blood request submitted successfully',
      content: {
        'application/json': {
          schema: CreateBloodRequestResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
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
      description: 'Forbidden (profile incomplete or unverified account)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});
