import { AppError } from '../../errors';
import { prisma } from '../../utils/prisma';
import type { CompleteProfileInput, UpdateAvailabilityInput } from './user.schema';

export class UserService {
    /**
     * Complete Step 2 onboarding: creates the user's Profile record
     * and updates User.isProfileComplete to true atomically.
     */
    async completeProfile(userId: string, input: CompleteProfileInput) {
        // 1. Fetch user to verify status
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (!user.isVerified) {
            throw new AppError(
                'Your account is not verified. Please verify your email first.',
                403,
            );
        }

        if (user.isProfileComplete || user.profile) {
            throw new AppError(
                'Profile is already completed. Use update endpoints to edit your profile.',
                409,
            );
        }

        // 2. Validate phone uniqueness
        const normalizedPhone = input.phone.trim();
        const existingPhone = await prisma.profile.findUnique({
            where: { phone: normalizedPhone },
        });

        if (existingPhone) {
            throw new AppError(
                'This phone number is already registered with another account.',
                409,
            );
        }

        // 3. Validate last donation date is not in future
        if (input.lastDonationDate && input.lastDonationDate > new Date()) {
            throw new AppError('Last donation date cannot be in the future', 400);
        }

        // 4. Atomic profile creation & user state update
        const result = await prisma.$transaction(async (tx) => {
            const profile = await tx.profile.create({
                data: {
                    userId: user.id,
                    bloodGroup: input.bloodGroup,
                    phone: normalizedPhone,
                    district: input.district.trim(),
                    area: input.area.trim(),
                    lastDonationDate: input.lastDonationDate ?? null,
                    isAvailableForDonation: input.isAvailableForDonation ?? true,
                },
            });

            const updatedUser = await tx.user.update({
                where: { id: user.id },
                data: { isProfileComplete: true },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isVerified: true,
                    isProfileComplete: true,
                },
            });

            return {
                user: updatedUser,
                profile,
            };
        });

        return result;
    }

    /**
     * Retrieve authenticated user details, profile, donation metrics,
     * and 90-day cooldown eligibility calculations.
     */
    async getMe(userId: string) {
        // 1. Fetch user and profile
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isVerified: true,
                isProfileComplete: true,
                createdAt: true,
                profile: {
                    select: {
                        id: true,
                        bloodGroup: true,
                        phone: true,
                        district: true,
                        area: true,
                        lastDonationDate: true,
                        isAvailableForDonation: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!user) {
            throw new AppError('User account not found', 404);
        }

        // 2. Aggregate donation metrics in parallel
        const [
            totalRequestsCreated,
            totalRequestsFulfilled,
            totalDonationsOffered,
            totalDonationsCompleted,
        ] = await Promise.all([
            prisma.bloodRequest.count({
                where: { requesterId: userId },
            }),
            prisma.bloodRequest.count({
                where: { requesterId: userId, status: 'FULFILLED' },
            }),
            prisma.donationResponse.count({
                where: { donorId: userId },
            }),
            prisma.donationResponse.count({
                where: { donorId: userId, status: 'ACCEPTED' },
            }),
        ]);

        // 3. Calculate 90-day cooldown and eligibility
        const COOLDOWN_DAYS = 90;
        const profile = user.profile;

        let isEligibleToDonate = false;
        let daysSinceLastDonation: number | null = null;
        let daysUntilNextDonation: number | null = null;
        let nextEligibleDonationDate: string | null = null;

        if (profile) {
            if (!profile.lastDonationDate) {
                // User has never donated before
                isEligibleToDonate = profile.isAvailableForDonation;
                daysSinceLastDonation = null;
                daysUntilNextDonation = 0;
                nextEligibleDonationDate = null;
            } else {
                const lastDonationTime = profile.lastDonationDate.getTime();
                const now = Date.now();
                const diffInMs = now - lastDonationTime;
                const daysElapsed = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

                daysSinceLastDonation = Math.max(0, daysElapsed);

                if (daysElapsed >= COOLDOWN_DAYS) {
                    isEligibleToDonate = profile.isAvailableForDonation;
                    daysUntilNextDonation = 0;
                    nextEligibleDonationDate = null;
                } else {
                    isEligibleToDonate = false;
                    daysUntilNextDonation = COOLDOWN_DAYS - daysElapsed;
                    const eligibleTimestamp =
                        lastDonationTime + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
                    nextEligibleDonationDate = new Date(eligibleTimestamp).toISOString();
                }
            }
        }

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                isProfileComplete: user.isProfileComplete,
                createdAt: user.createdAt,
            },
            profile: user.profile,
            metrics: {
                totalRequestsCreated,
                totalRequestsFulfilled,
                totalDonationsOffered,
                totalDonationsCompleted,
            },
            eligibility: {
                isAvailable: profile?.isAvailableForDonation ?? false,
                isEligibleToDonate,
                daysSinceLastDonation,
                daysUntilNextDonation,
                nextEligibleDonationDate,
            },
        };
    }

    /**
     * Update donor availability status (isAvailableForDonation)
     * and recalculate dynamic eligibility.
     */
    async updateAvailability(userId: string, input: UpdateAvailabilityInput) {
        // 1. Fetch user profile
        const profile = await prisma.profile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new AppError(
                'Profile must be completed before updating donation availability',
                400,
            );
        }

        // 2. Update availability in database
        const updatedProfile = await prisma.profile.update({
            where: { userId },
            data: {
                isAvailableForDonation: input.isAvailableForDonation,
            },
            select: {
                id: true,
                bloodGroup: true,
                phone: true,
                district: true,
                area: true,
                lastDonationDate: true,
                isAvailableForDonation: true,
                updatedAt: true,
            },
        });

        // 3. Dynamic cooldown check
        const COOLDOWN_DAYS = 90;
        let isEligibleToDonate = false;
        let daysSinceLastDonation: number | null = null;
        let daysUntilNextDonation: number | null = null;

        if (!updatedProfile.lastDonationDate) {
            isEligibleToDonate = updatedProfile.isAvailableForDonation;
            daysSinceLastDonation = null;
            daysUntilNextDonation = 0;
        } else {
            const lastDonationTime = updatedProfile.lastDonationDate.getTime();
            const now = Date.now();
            const diffInMs = now - lastDonationTime;
            const daysElapsed = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

            daysSinceLastDonation = Math.max(0, daysElapsed);

            if (daysElapsed >= COOLDOWN_DAYS) {
                isEligibleToDonate = updatedProfile.isAvailableForDonation;
                daysUntilNextDonation = 0;
            } else {
                isEligibleToDonate = false;
                daysUntilNextDonation = COOLDOWN_DAYS - daysElapsed;
            }
        }

        return {
            profile: updatedProfile,
            eligibility: {
                isAvailable: updatedProfile.isAvailableForDonation,
                isEligibleToDonate,
                daysSinceLastDonation,
                daysUntilNextDonation,
            },
        };
    }
}

export const userService = new UserService();
