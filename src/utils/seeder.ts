import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { prisma } from './prisma';

/**
 * Seeds the initial super administrator account if not already present in PostgreSQL.
 * Configuration is sourced from validated environment variables.
 * Executes automatically during server bootstrap.
 */
export async function seedAdmin(): Promise<void> {
    try {
        const adminEmail = env.ADMIN_EMAIL.toLowerCase().trim();
        const adminPassword = env.ADMIN_PASSWORD;
        const adminName = env.ADMIN_NAME.trim();
        const adminPhone = env.ADMIN_PHONE.trim();

        const existingAdmin = await prisma.user.findUnique({
            where: { email: adminEmail },
            include: { profile: true },
        });

        if (existingAdmin) {
            if (existingAdmin.role !== 'ADMIN') {
                await prisma.user.update({
                    where: { id: existingAdmin.id },
                    data: { role: 'ADMIN', isVerified: true },
                });
                console.log(`[Admin Seeder] Upgraded existing user (${adminEmail}) to ADMIN role.`);
            } else {
                console.log(
                    `[Admin Seeder] Admin user already exists (${adminEmail}). Skipping creation.`,
                );
            }
            return;
        }

        const passwordHash = await bcrypt.hash(adminPassword, 10);

        const existingPhone = await prisma.profile.findUnique({
            where: { phone: adminPhone },
        });

        await prisma.user.create({
            data: {
                email: adminEmail,
                name: adminName,
                passwordHash,
                role: 'ADMIN',
                isVerified: true,
                isProfileComplete: true,
                ...(!existingPhone && {
                    profile: {
                        create: {
                            bloodGroup: 'O_POS',
                            phone: adminPhone,
                            district: 'Dhaka',
                            area: 'Central',
                            isAvailableForDonation: false,
                        },
                    },
                }),
            },
        });

        console.log(`[Admin Seeder] Default admin account successfully seeded: ${adminEmail}`);
    } catch (error) {
        console.error('[Admin Seeder] Error during admin seeding:', error);
    }
}
