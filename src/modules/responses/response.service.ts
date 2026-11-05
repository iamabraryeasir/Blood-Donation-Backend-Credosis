import { AppError } from '../../errors';
import { prisma } from '../../utils/prisma';
import type { CreateDonorResponseInput } from './response.schema';

const COOLDOWN_DAYS = 90;

export class ResponseService {
    /**
     * Submit a donor response to an active blood donation request.
     * Enforces matching invariants:
     * 1. Active request status
     * 2. Self-donation guard (requester !== donor)
     * 3. Completed donor profile
     * 4. Donor availability flag
     * 5. Strict blood group match (exact match)
     * 6. 90-day donation cooldown
     * 7. Unique response constraint
     */
    async createResponse(requestId: string, donorId: string, input: CreateDonorResponseInput) {
        // 1. Fetch request details and requester info
        const request = await prisma.bloodRequest.findUnique({
            where: { id: requestId },
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

        if (!request) {
            throw new AppError('Blood donation request not found', 404);
        }

        if (request.status !== 'ACTIVE') {
            throw new AppError(
                `Cannot respond to request with status '${request.status}'. Only ACTIVE requests accept donor responses.`,
                400,
            );
        }

        // 2. Self-Donation Guard
        if (request.requesterId === donorId) {
            throw new AppError('You cannot respond to donate to your own blood request', 400);
        }

        // 3. Fetch donor and profile
        const donor = await prisma.user.findUnique({
            where: { id: donorId },
            include: { profile: true },
        });

        if (!donor) {
            throw new AppError('User not found', 404);
        }

        if (!donor.isVerified) {
            throw new AppError(
                'Your account is not verified. Please verify your email first.',
                403,
            );
        }

        if (!donor.isProfileComplete || !donor.profile) {
            throw new AppError(
                'You must complete your profile before responding to blood requests',
                403,
            );
        }

        const profile = donor.profile;

        // 4. Availability Guard
        if (!profile.isAvailableForDonation) {
            throw new AppError(
                'You have marked yourself as currently unavailable for donation. Please update your availability first.',
                400,
            );
        }

        // 5. Strict Blood Group Match (MVP Invariant)
        if (profile.bloodGroup !== request.bloodGroup) {
            throw new AppError(
                `Blood group mismatch: This request requires '${request.bloodGroup}', but your profile blood group is '${profile.bloodGroup}'.`,
                400,
            );
        }

        // 6. 90-Day Recovery Cooldown Gate
        if (profile.lastDonationDate) {
            const lastDonationTime = profile.lastDonationDate.getTime();
            const now = Date.now();
            const diffInMs = now - lastDonationTime;
            const daysElapsed = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

            if (daysElapsed < COOLDOWN_DAYS) {
                const remainingDays = COOLDOWN_DAYS - daysElapsed;
                throw new AppError(
                    `You are currently in the 90-day medical recovery cooldown period. You will be eligible to donate again in ${remainingDays} day(s).`,
                    400,
                );
            }
        }

        // 7. Check if donor has already responded
        const existingResponse = await prisma.donationResponse.findUnique({
            where: {
                requestId_donorId: {
                    requestId,
                    donorId,
                },
            },
        });

        if (existingResponse) {
            throw new AppError(
                'You have already submitted a response for this blood request.',
                409,
            );
        }

        // 8. Create DonationResponse
        const response = await prisma.donationResponse.create({
            data: {
                requestId,
                donorId,
                donorMessage: input.donorMessage ? input.donorMessage.trim() : null,
                status: 'INTERESTED',
            },
        });

        // 9. Return mutual contact disclosure
        return {
            response: {
                id: response.id,
                requestId: response.requestId,
                donorId: response.donorId,
                status: response.status,
                donorMessage: response.donorMessage,
                createdAt: response.createdAt.toISOString(),
            },
            emergencyContactDetails: {
                patientName: request.patientName,
                hospitalName: request.hospitalName,
                district: request.district,
                area: request.area,
                contactNumber: request.contactNumber,
                requesterName: request.requester.name,
            },
        };
    }
}

export const responseService = new ResponseService();

