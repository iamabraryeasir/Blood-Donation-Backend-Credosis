import { z } from 'zod';
import { registry } from '../../docs/registry';
import { ErrorResponseSchema, PaginationMetaSchema } from '../../docs/schemas/common.schema';
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
            .openapi({
                example: 'Rahim Uddin',
                description: 'Full name of the patient',
            }),
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
            .openapi({
                example: 1,
                description: 'Number of blood bags required',
            }),
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
            .openapi({
                example: 'Bakshibazar',
                description: 'Area / Thana / Location',
            }),
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
                id: z.string().uuid().openapi({
                    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                }),
                requesterId: z.string().uuid().openapi({
                    example: 'e4b2d354-9a57-4f51-b8d2-5a9e3240e111',
                }),
                patientName: z.string().openapi({ example: 'Rahim Uddin' }),
                bloodGroup: BloodGroupEnum.openapi({ example: 'O_POS' }),
                unitsNeeded: z.number().openapi({ example: 1 }),
                hospitalName: z.string().openapi({ example: 'Dhaka Medical College Hospital' }),
                district: z.string().openapi({ example: 'Dhaka' }),
                area: z.string().openapi({ example: 'Bakshibazar' }),
                urgency: UrgencyLevelEnum.openapi({ example: 'URGENT' }),
                neededAt: z.string().datetime().openapi({ example: '2026-11-06T14:00:00.000Z' }),
                contactNumber: z.string().openapi({ example: '01712345678' }),
                additionalNotes: z.string().nullable().openapi({
                    example: 'Emergency surgery scheduled for tomorrow morning.',
                }),
                status: RequestStatusEnum.openapi({
                    example: 'PENDING_APPROVAL',
                }),
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

export const GetBloodRequestsQuerySchema = registry.register(
    'GetBloodRequestsQuery',
    z.object({
        page: z.coerce
            .number()
            .int()
            .min(1)
            .default(1)
            .openapi({ example: 1, description: 'Page number' }),
        limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(10)
            .openapi({ example: 10, description: 'Items per page (max 100)' }),
        sortBy: z
            .enum(['createdAt', 'neededAt', 'urgency', 'unitsNeeded'])
            .default('createdAt')
            .openapi({ example: 'createdAt', description: 'Field to sort by' }),
        sortOrder: z
            .enum(['asc', 'desc'])
            .default('desc')
            .openapi({ example: 'desc', description: 'Sort direction' }),
        bloodGroup: BloodGroupEnum.optional().openapi({
            example: 'O_POS',
            description: 'Filter by required blood group',
        }),
        urgency: UrgencyLevelEnum.optional().openapi({
            example: 'URGENT',
            description: 'Filter by urgency level',
        }),
        district: z.string().trim().optional().openapi({
            example: 'Dhaka',
            description: 'Case-insensitive filter by district',
        }),
        area: z.string().trim().optional().openapi({
            example: 'Bakshibazar',
            description: 'Case-insensitive filter by area',
        }),
        search: z.string().trim().optional().openapi({
            example: 'Medical',
            description: 'Free-text search across hospital, patient, district, and area',
        }),
    }),
);

export type GetBloodRequestsQuery = z.infer<typeof GetBloodRequestsQuerySchema>;

export const ActiveBloodRequestItemSchema = registry.register(
    'ActiveBloodRequestItem',
    z.object({
        id: z.string().uuid().openapi({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
        patientName: z.string().openapi({ example: 'Rahim Uddin' }),
        bloodGroup: BloodGroupEnum.openapi({ example: 'O_POS' }),
        unitsNeeded: z.number().openapi({ example: 1 }),
        hospitalName: z.string().openapi({ example: 'Dhaka Medical College Hospital' }),
        district: z.string().openapi({ example: 'Dhaka' }),
        area: z.string().openapi({ example: 'Bakshibazar' }),
        urgency: UrgencyLevelEnum.openapi({ example: 'URGENT' }),
        neededAt: z.string().datetime().openapi({ example: '2026-11-06T14:00:00.000Z' }),
        additionalNotes: z.string().nullable().openapi({
            example: 'Emergency surgery scheduled for tomorrow morning.',
        }),
        status: RequestStatusEnum.openapi({ example: 'ACTIVE' }),
        createdAt: z.string().datetime().openapi({ example: '2026-11-05T23:00:00.000Z' }),
        requester: z.object({
            id: z.string().uuid().openapi({ example: 'e4b2d354-9a57-4f51-b8d2-5a9e3240e111' }),
            name: z.string().openapi({ example: 'Abrar Yeasir' }),
        }),
        _count: z.object({
            responses: z.number().openapi({
                example: 2,
                description: 'Number of donors who responded to this request',
            }),
        }),
    }),
);

export const GetBloodRequestsResponseSchema = registry.register(
    'GetBloodRequestsResponse',
    z.object({
        success: z.literal(true).openapi({ example: true }),
        statusCode: z.literal(200).openapi({ example: 200 }),
        message: z.string().openapi({
            example: 'Active blood donation requests retrieved successfully',
        }),
        data: z.object({
            requests: z.array(ActiveBloodRequestItemSchema),
            pagination: PaginationMetaSchema,
        }),
    }),
);

registry.registerPath({
    method: 'get',
    path: '/api/v1/requests',
    tags: ['Requests'],
    summary: 'List active blood donation requests (Public Feed)',
    description:
        'Retrieves a paginated list of ACTIVE blood donation requests with optional filters for blood group, urgency, district, area, and free-text search. Requester contact numbers are omitted to preserve privacy until donor responds.',
    request: {
        query: GetBloodRequestsQuerySchema,
    },
    responses: {
        200: {
            description: 'Active blood donation requests retrieved successfully',
            content: {
                'application/json': {
                    schema: GetBloodRequestsResponseSchema,
                },
            },
        },
        400: {
            description: 'Validation error (invalid query parameter)',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
    },
});

export const BloodRequestIdParamSchema = registry.register(
    'BloodRequestIdParam',
    z.object({
        id: z.string().uuid({ message: 'Request ID must be a valid UUID' }).openapi({
            example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            description: 'Unique UUID identifier of the blood request',
        }),
    }),
);

export type BloodRequestIdParam = z.infer<typeof BloodRequestIdParamSchema>;

export const BloodRequestDetailsItemSchema = registry.register(
    'BloodRequestDetailsItem',
    z.object({
        id: z.string().uuid().openapi({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
        patientName: z.string().openapi({ example: 'Rahim Uddin' }),
        bloodGroup: BloodGroupEnum.openapi({ example: 'O_POS' }),
        unitsNeeded: z.number().openapi({ example: 1 }),
        hospitalName: z.string().openapi({ example: 'Dhaka Medical College Hospital' }),
        district: z.string().openapi({ example: 'Dhaka' }),
        area: z.string().openapi({ example: 'Bakshibazar' }),
        urgency: UrgencyLevelEnum.openapi({ example: 'URGENT' }),
        neededAt: z.string().datetime().openapi({ example: '2026-11-06T14:00:00.000Z' }),
        contactNumber: z.string().nullable().openapi({
            example: '01712345678',
            description:
                'Requester contact number. Strictly null for unauthenticated visitors and non-participating users to preserve donor/requester privacy.',
        }),
        additionalNotes: z.string().nullable().openapi({
            example: 'Emergency surgery scheduled for tomorrow morning.',
        }),
        status: RequestStatusEnum.openapi({ example: 'ACTIVE' }),
        rejectionReason: z.string().nullable().openapi({
            example: null,
            description:
                'Administrative rejection reason, visible only to the requester or administrators if rejected',
        }),
        createdAt: z.string().datetime().openapi({ example: '2026-11-05T23:00:00.000Z' }),
        updatedAt: z.string().datetime().openapi({ example: '2026-11-05T23:00:00.000Z' }),
        requester: z.object({
            id: z.string().uuid().openapi({ example: 'e4b2d354-9a57-4f51-b8d2-5a9e3240e111' }),
            name: z.string().openapi({ example: 'Abrar Yeasir' }),
        }),
        _count: z.object({
            responses: z.number().openapi({
                example: 2,
                description: 'Number of donors who responded to this request',
            }),
        }),
        isRequester: z.boolean().openapi({
            example: false,
            description: 'True if the currently authenticated user created this request',
        }),
        hasUserResponded: z.boolean().openapi({
            example: false,
            description:
                'True if the currently authenticated user has submitted a response to donate',
        }),
    }),
);

export const GetBloodRequestDetailsResponseSchema = registry.register(
    'GetBloodRequestDetailsResponse',
    z.object({
        success: z.literal(true).openapi({ example: true }),
        statusCode: z.literal(200).openapi({ example: 200 }),
        message: z.string().openapi({
            example: 'Blood donation request details retrieved successfully',
        }),
        data: z.object({
            request: BloodRequestDetailsItemSchema,
        }),
    }),
);

registry.registerPath({
    method: 'get',
    path: '/api/v1/requests/{id}',
    tags: ['Requests'],
    summary: 'Retrieve blood donation request details',
    description:
        'Retrieves detailed information for a specific blood donation request. Contact number is disclosed strictly to the requester, administrators, and responding donors. Non-active requests (PENDING_APPROVAL, REJECTED) are viewable only by their owner or an admin.',
    request: {
        params: BloodRequestIdParamSchema,
    },
    responses: {
        200: {
            description: 'Blood donation request details retrieved successfully',
            content: {
                'application/json': {
                    schema: GetBloodRequestDetailsResponseSchema,
                },
            },
        },
        400: {
            description: 'Invalid UUID path parameter',
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

export const PendingBloodRequestItemSchema = registry.register(
    'PendingBloodRequestItem',
    z.object({
        id: z.string().uuid().openapi({ example: 'e14bea71-fa81-4126-97b1-bc3552996d09' }),
        patientName: z.string().openapi({ example: 'Rahim Uddin' }),
        bloodGroup: BloodGroupEnum.openapi({ example: 'O_POS' }),
        unitsNeeded: z.number().openapi({ example: 1 }),
        hospitalName: z.string().openapi({ example: 'Dhaka Medical College Hospital' }),
        district: z.string().openapi({ example: 'Dhaka' }),
        area: z.string().openapi({ example: 'Bakshibazar' }),
        urgency: UrgencyLevelEnum.openapi({ example: 'NORMAL' }),
        neededAt: z.string().datetime().openapi({ example: '2026-11-06T14:00:00.000Z' }),
        contactNumber: z.string().openapi({
            example: '01712345678',
            description: 'Contact number for administrative audit and verification',
        }),
        additionalNotes: z.string().nullable().openapi({
            example: 'Emergency surgery scheduled for tomorrow morning.',
        }),
        status: RequestStatusEnum.openapi({ example: 'PENDING_APPROVAL' }),
        createdAt: z.string().datetime().openapi({ example: '2026-11-05T23:00:00.000Z' }),
        updatedAt: z.string().datetime().openapi({ example: '2026-11-05T23:00:00.000Z' }),
        requester: z.object({
            id: z.string().uuid().openapi({ example: '8b2c6a2e-10e9-4cf1-904c-e9f5b53b0a47' }),
            name: z.string().openapi({ example: 'Abrar Yeasir' }),
            email: z.string().email().openapi({ example: 'abraryeasir.dev@gmail.com' }),
        }),
    }),
);

export const GetPendingBloodRequestsResponseSchema = registry.register(
    'GetPendingBloodRequestsResponse',
    z.object({
        success: z.literal(true).openapi({ example: true }),
        statusCode: z.literal(200).openapi({ example: 200 }),
        message: z.string().openapi({
            example: 'Pending blood donation requests retrieved successfully',
        }),
        data: z.object({
            requests: z.array(PendingBloodRequestItemSchema),
            pagination: PaginationMetaSchema,
        }),
    }),
);

registry.registerPath({
    method: 'get',
    path: '/api/v1/requests/pending',
    tags: ['Requests'],
    summary: 'List pending blood donation requests (Admin Only)',
    description:
        'Retrieves a paginated queue of PENDING_APPROVAL blood requests awaiting administrative audit and approval. Full contact and requester details are provided for verification.',
    security: [{ bearerAuth: [] }],
    request: {
        query: GetBloodRequestsQuerySchema,
    },
    responses: {
        200: {
            description: 'Pending blood requests retrieved successfully',
            content: {
                'application/json': {
                    schema: GetPendingBloodRequestsResponseSchema,
                },
            },
        },
        400: {
            description: 'Validation error (invalid query parameter)',
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
            description: 'Forbidden (admin role required)',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
    },
});
