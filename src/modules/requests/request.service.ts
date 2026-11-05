import { AppError } from '../../errors';
import { prisma } from '../../utils/prisma';
import type { CreateBloodRequestInput } from './request.schema';

export class RequestService {
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
