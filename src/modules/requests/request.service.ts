import type { Prisma } from '@prisma/client';
import { AppError } from '../../errors';
import { prisma } from '../../utils/prisma';
import { buildPrismaQuery, calculatePaginationMeta } from '../../utils/queryBuilder';
import type { CreateBloodRequestInput, GetBloodRequestsQuery } from './request.schema';

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
      throw new AppError('Your account is not verified. Please verify your email first.', 403);
    }

    if (!requester.isProfileComplete) {
      throw new AppError('You must complete your profile before creating a blood request', 403);
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
}

export const requestService = new RequestService();
