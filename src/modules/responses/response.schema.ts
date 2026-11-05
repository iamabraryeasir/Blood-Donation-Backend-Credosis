import { z } from 'zod';
import { registry } from '../../docs/registry';
import { ErrorResponseSchema, PaginationMetaSchema } from '../../docs/schemas/common.schema';
import { BloodRequestIdParamSchema } from '../requests/request.schema';
import { BloodGroupEnum } from '../users/user.schema';

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

export const GetDonorResponsesQuerySchema = registry.register(
    'GetDonorResponsesQuery',
    z.object({
        page: z.coerce.number().int().positive().default(1).openapi({
            example: 1,
            description: 'Page number for pagination (minimum: 1)',
        }),
        limit: z.coerce.number().int().positive().max(100).default(10).openapi({
            example: 10,
            description: 'Number of responses per page (maximum: 100)',
        }),
        status: ResponseStatusEnum.optional().openapi({
            example: 'INTERESTED',
            description:
                'Filter responses by status (e.g. INTERESTED, ACCEPTED, REJECTED, CANCELLED)',
        }),
        sortBy: z.enum(['createdAt']).default('createdAt').openapi({
            example: 'createdAt',
            description: 'Sort field',
        }),
        sortOrder: z.enum(['asc', 'desc']).default('desc').openapi({
            example: 'desc',
            description: 'Sort ordering',
        }),
    }),
);

export type GetDonorResponsesQuery = z.infer<typeof GetDonorResponsesQuerySchema>;

export const DonorResponseItemSchema = registry.register(
    'DonorResponseItem',
    z.object({
        id: z.string().uuid().openapi({ example: '7fa85f64-5717-4562-b3fc-2c963f66af99' }),
        requestId: z.string().uuid().openapi({ example: 'e14bea71-fa81-4126-97b1-bc3552996d09' }),
        status: ResponseStatusEnum.openapi({ example: 'INTERESTED' }),
        donorMessage: z.string().nullable().openapi({
            example: 'I am nearby and can reach Dhaka Medical College by 3 PM.',
        }),
        createdAt: z.string().datetime().openapi({ example: '2026-11-06T02:15:00.000Z' }),
        updatedAt: z.string().datetime().openapi({ example: '2026-11-06T02:15:00.000Z' }),
        donor: z.object({
            id: z.string().uuid().openapi({ example: '8b2c6a2e-10e9-4cf1-904c-e9f5b53b0a47' }),
            name: z.string().openapi({ example: 'Jane Doe' }),
            email: z.string().email().openapi({ example: 'donor@example.com' }),
            profile: z.object({
                phone: z.string().openapi({ example: '01712345678' }),
                bloodGroup: BloodGroupEnum.openapi({ example: 'O_POS' }),
                district: z.string().openapi({ example: 'Dhaka' }),
                area: z.string().openapi({ example: 'Dhanmondi' }),
                lastDonationDate: z.string().datetime().nullable().openapi({
                    example: '2026-08-01T00:00:00.000Z',
                }),
            }),
        }),
    }),
);

export const GetDonorResponsesResponseSchema = registry.register(
    'GetDonorResponsesResponse',
    z.object({
        success: z.literal(true).openapi({ example: true }),
        statusCode: z.literal(200).openapi({ example: 200 }),
        message: z.string().openapi({
            example: 'Donor responses retrieved successfully',
        }),
        data: z.object({
            responses: z.array(DonorResponseItemSchema),
            pagination: PaginationMetaSchema,
        }),
    }),
);

registry.registerPath({
    method: 'get',
    path: '/api/v1/requests/{id}/responses',
    tags: ['Donor Responses'],
    summary: 'List responding donors for a blood request',
    description:
        'Retrieves a paginated list of donors who have responded to a blood donation request with full verified contact information. Accessible strictly by the original requester or an ADMIN.',
    security: [{ bearerAuth: [] }],
    request: {
        params: BloodRequestIdParamSchema,
        query: GetDonorResponsesQuerySchema,
    },
    responses: {
        200: {
            description: 'Donor responses retrieved successfully',
            content: {
                'application/json': {
                    schema: GetDonorResponsesResponseSchema,
                },
            },
        },
        400: {
            description: 'Validation error (invalid query parameters or UUID format)',
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
            description: 'Forbidden (caller is neither the original requester nor an ADMIN)',
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
    },
});
