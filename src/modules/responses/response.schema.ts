import { z } from 'zod';
import { registry } from '../../docs/registry';
import { ErrorResponseSchema } from '../../docs/schemas/common.schema';
import { BloodRequestIdParamSchema } from '../requests/request.schema';

export const ResponseStatusEnum = z.enum(['INTERESTED', 'ACCEPTED', 'REJECTED', 'CANCELLED']);

export const CreateDonorResponseInputSchema = registry.register(
    'CreateDonorResponseInput',
    z.object({
        donorMessage: z
            .string()
            .trim()
            .max(300, 'Donor message cannot exceed 300 characters')
            .optional()
            .openapi({
                example: 'I am nearby and can reach Dhaka Medical College by 3 PM.',
                description: 'Optional coordination message from the responding donor',
            }),
    }),
);

export type CreateDonorResponseInput = z.infer<typeof CreateDonorResponseInputSchema>;

export const CreateDonorResponseResponseSchema = registry.register(
    'CreateDonorResponseResponse',
    z.object({
        success: z.literal(true).openapi({ example: true }),
        statusCode: z.literal(201).openapi({ example: 201 }),
        message: z.string().openapi({
            example:
                'Donation response submitted successfully. Requester contact details unlocked.',
        }),
        data: z.object({
            response: z.object({
                id: z.string().uuid().openapi({ example: '7fa85f64-5717-4562-b3fc-2c963f66af99' }),
                requestId: z
                    .string()
                    .uuid()
                    .openapi({ example: 'e14bea71-fa81-4126-97b1-bc3552996d09' }),
                donorId: z
                    .string()
                    .uuid()
                    .openapi({ example: '8b2c6a2e-10e9-4cf1-904c-e9f5b53b0a47' }),
                status: ResponseStatusEnum.openapi({ example: 'INTERESTED' }),
                donorMessage: z.string().nullable().openapi({
                    example: 'I am nearby and can reach Dhaka Medical College by 3 PM.',
                }),
                createdAt: z.string().datetime().openapi({ example: '2026-11-06T02:15:00.000Z' }),
            }),
            emergencyContactDetails: z.object({
                patientName: z.string().openapi({ example: 'Rahim Uddin' }),
                hospitalName: z.string().openapi({ example: 'Dhaka Medical College Hospital' }),
                district: z.string().openapi({ example: 'Dhaka' }),
                area: z.string().openapi({ example: 'Bakshibazar' }),
                contactNumber: z.string().openapi({
                    example: '01712345678',
                    description: 'Direct contact phone number for coordination',
                }),
                requesterName: z.string().openapi({ example: 'Abrar Yeasir' }),
            }),
        }),
    }),
);

registry.registerPath({
    method: 'post',
    path: '/api/v1/requests/{id}/responses',
    tags: ['Donor Responses'],
    summary: 'Respond to an active blood donation request',
    description:
        'Allows an eligible donor to respond to an active blood request. Enforces strict exact blood group match, 90-day cooldown period, donor availability, and self-donation prevention. On success, unlocks requester contact details.',
    security: [{ bearerAuth: [] }],
    request: {
        params: BloodRequestIdParamSchema,
        body: {
            content: {
                'application/json': {
                    schema: CreateDonorResponseInputSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Donation response accepted and contact details unlocked',
            content: {
                'application/json': {
                    schema: CreateDonorResponseResponseSchema,
                },
            },
        },
        400: {
            description:
                'Validation error, blood group mismatch, self-donation violation, or 90-day cooldown restriction',
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
            description: 'Forbidden (incomplete profile or unverified account)',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
        404: {
            description: 'Blood donation request not found',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
        409: {
            description: 'Conflict (donor has already responded to this request)',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
    },
});
