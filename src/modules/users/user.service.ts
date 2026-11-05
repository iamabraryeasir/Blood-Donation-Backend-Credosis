import { AppError } from '../../errors';
import { prisma } from '../../utils/prisma';
import type { CompleteProfileInput } from './user.schema';

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
      throw new AppError('Your account is not verified. Please verify your email first.', 403);
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
      throw new AppError('This phone number is already registered with another account.', 409);
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
}

export const userService = new UserService();
