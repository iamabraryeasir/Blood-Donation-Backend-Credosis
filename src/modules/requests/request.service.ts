import type { Prisma } from '@prisma/client';
import { AppError } from '../../errors';
import type { JwtUserPayload } from '../../utils/jwt';
import { prisma } from '../../utils/prisma';
import { buildPrismaQuery, calculatePaginationMeta } from '../../utils/queryBuilder';
import type {
    CreateBloodRequestInput,
    GetBloodRequestsQuery,
    RejectBloodRequestInput,
} from './request.schema';

export class RequestService {
    /**
     * Retrieve paginated ACTIVE blood donation requests with optional filters and free-text search.
     * Upholds privacy by omitting requester contact numbers from the public feed.
     */
    async getActiveRequests(query: GetBloodRequestsQuery) {
        const prismaQuery = buildPrismaQuery<Prisma.BloodRequestWhereInput>(query, {
            baseWhere: { status: 'ACTIVE' },
            searchableFields: ['hospitalName', 'patientName', 'district', 'area'],
            exactFilterFields: ['bloodGroup', 'urgency'],
            caseInsensitiveFilterFields: ['district', 'area'],
            defaultSortBy: 'createdAt',
            defaultSortOrder: 'desc',
        });

        const [requests, totalCount] = await Promise.all([
            prisma.bloodRequest.findMany({
                where: prismaQuery.where,
                skip: prismaQuery.skip,
                take: prismaQuery.take,
                orderBy: prismaQuery.orderBy,
                select: {
                    id: true,
                    patientName: true,
                    bloodGroup: true,
                    unitsNeeded: true,
                    hospitalName: true,
                    district: true,
                    area: true,
                    urgency: true,
                    neededAt: true,
                    additionalNotes: true,
                    status: true,
                    createdAt: true,
                    requester: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    _count: {
                        select: {
                            responses: true,
                        },
                    },
                },
            }),
            prisma.bloodRequest.count({
                where: prismaQuery.where,
            }),
        ]);

        const pagination = calculatePaginationMeta(
            totalCount,
            prismaQuery.pagination.page,
            prismaQuery.pagination.limit,
        );

        return {
            requests,
            pagination,
        };
    }

    /**
     * Retrieve paginated PENDING_APPROVAL blood donation requests awaiting admin review.
     * Discloses requester contact details and email to facilitate verification audits.
     */
    async getPendingRequests(query: GetBloodRequestsQuery) {
        const prismaQuery = buildPrismaQuery<Prisma.BloodRequestWhereInput>(query, {
            baseWhere: { status: 'PENDING_APPROVAL' },
            searchableFields: ['hospitalName', 'patientName', 'district', 'area'],
            exactFilterFields: ['bloodGroup', 'urgency'],
            caseInsensitiveFilterFields: ['district', 'area'],
            defaultSortBy: 'createdAt',
            defaultSortOrder: 'desc',
        });

        const [requests, totalCount] = await Promise.all([
            prisma.bloodRequest.findMany({
                where: prismaQuery.where,
                skip: prismaQuery.skip,
                take: prismaQuery.take,
                orderBy: prismaQuery.orderBy,
                select: {
                    id: true,
                    patientName: true,
                    bloodGroup: true,
                    unitsNeeded: true,
                    hospitalName: true,
                    district: true,
                    area: true,
                    urgency: true,
                    neededAt: true,
                    contactNumber: true,
                    additionalNotes: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    requester: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            }),
            prisma.bloodRequest.count({
                where: prismaQuery.where,
            }),
        ]);

        const pagination = calculatePaginationMeta(
            totalCount,
            prismaQuery.pagination.page,
            prismaQuery.pagination.limit,
        );

        return {
            requests,
            pagination,
        };
    }

    /**
     * Retrieve single blood donation request details by ID.
     * Upholds privacy rules: contactNumber is visible strictly to requester, admin, or responded donors.
     * Non-active requests (PENDING_APPROVAL, REJECTED) are viewable strictly by requester or admin.
     */
    async getRequestById(requestId: string, currentUser?: JwtUserPayload) {
        const request = await prisma.bloodRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        responses: true,
                    },
                },
                responses: currentUser
                    ? {
                          where: { donorId: currentUser.userId },
                          select: { id: true, status: true },
                      }
                    : false,
            },
        });

        if (!request) {
            throw new AppError('Blood donation request not found', 404);
        }

        const isOwner = currentUser?.userId === request.requesterId;
        const isAdmin = currentUser?.role === 'ADMIN';
        const hasResponded = Boolean(request.responses && request.responses.length > 0);

        // Visibility rule: non-active requests can only be viewed by owner or admin
        if (request.status !== 'ACTIVE' && !isOwner && !isAdmin) {
            throw new AppError('Blood donation request not found', 404);
        }

        return {
            id: request.id,
            patientName: request.patientName,
            bloodGroup: request.bloodGroup,
            unitsNeeded: request.unitsNeeded,
            hospitalName: request.hospitalName,
            district: request.district,
            area: request.area,
            urgency: request.urgency,
            neededAt: request.neededAt,
            contactNumber: isOwner || isAdmin || hasResponded ? request.contactNumber : null,
            additionalNotes: request.additionalNotes,
            status: request.status,
            rejectionReason:
                (isOwner || isAdmin) && request.status === 'REJECTED'
                    ? request.rejectionReason
                    : null,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            requester: request.requester,
            _count: request._count,
            isRequester: isOwner,
            hasUserResponded: hasResponded,
        };
    }

    /**
   * Create a new blood donation request.

   * Enforces user existence, verification, and profile completeness.
   * Initializes status strictly as PENDING_APPROVAL.
   */
    async createRequest(requesterId: string, input: CreateBloodRequestInput) {
        // 1. Double check profile completeness
        const requester = await prisma.user.findUnique({
            where: { id: requesterId },
            select: { id: true, isVerified: true, isProfileComplete: true },
        });

        if (!requester) {
            throw new AppError('User not found', 404);
        }

        if (!requester.isVerified) {
            throw new AppError(
                'Your account is not verified. Please verify your email first.',
                403,
            );
        }

        if (!requester.isProfileComplete) {
            throw new AppError(
                'You must complete your profile before creating a blood request',
                403,
            );
        }

        // 2. Insert into PostgreSQL
        const newRequest = await prisma.bloodRequest.create({
            data: {
                requesterId: requester.id,
                patientName: input.patientName.trim(),
                bloodGroup: input.bloodGroup,
                unitsNeeded: input.unitsNeeded,
                hospitalName: input.hospitalName.trim(),
                district: input.district.trim(),
                area: input.area.trim(),
                urgency: input.urgency,
                neededAt: input.neededAt,
                contactNumber: input.contactNumber.trim(),
                additionalNotes: input.additionalNotes ? input.additionalNotes.trim() : null,
                status: 'PENDING_APPROVAL',
            },
        });

        return newRequest;
    }

    /**
     * Approve a blood donation request (Admin action).
     * Transitions status from PENDING_APPROVAL to ACTIVE.
     */
    async approveRequest(requestId: string) {
        const existing = await prisma.bloodRequest.findUnique({
            where: { id: requestId },
        });

        if (!existing) {
            throw new AppError('Blood donation request not found', 404);
        }

        if (existing.status === 'ACTIVE') {
            throw new AppError('Request is already approved and active', 400);
        }

        if (existing.status !== 'PENDING_APPROVAL') {
            throw new AppError(
                `Cannot approve request with status '${existing.status}'. Only PENDING_APPROVAL requests can be approved.`,
                400,
            );
        }

        const updatedRequest = await prisma.bloodRequest.update({
            where: { id: requestId },
            data: {
                status: 'ACTIVE',
                rejectionReason: null,
            },
            include: {
                requester: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return updatedRequest;
    }

    /**
     * Reject a blood donation request (Admin action).
     * Transitions status from PENDING_APPROVAL to REJECTED with a mandatory reason.
     */
    async rejectRequest(requestId: string, input: RejectBloodRequestInput) {
        const existing = await prisma.bloodRequest.findUnique({
            where: { id: requestId },
        });

        if (!existing) {
            throw new AppError('Blood donation request not found', 404);
        }

        if (existing.status === 'REJECTED') {
            throw new AppError('Request has already been rejected', 400);
        }

        if (existing.status !== 'PENDING_APPROVAL') {
            throw new AppError(
                `Cannot reject request with status '${existing.status}'. Only PENDING_APPROVAL requests can be rejected.`,
                400,
            );
        }

        const updatedRequest = await prisma.bloodRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                rejectionReason: input.reason.trim(),
            },
            include: {
                requester: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return updatedRequest;
    }
}

export const requestService = new RequestService();
