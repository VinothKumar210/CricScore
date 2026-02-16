import { prisma } from '../utils/db';
import { User } from '@prisma/client';

export const userService = {
    /**
     * Find a user by their Clerk ID
     */
    findByClerkId: async (clerkId: string): Promise<User | null> => {
        return prisma.user.findUnique({
            where: { clerkId },
        });
    },

    /**
     * Create a new user from Clerk data
     */
    createUser: async (
        clerkId: string,
        email: string,
        phoneNumber?: string | null,
        fullName?: string | null,
        imageUrl?: string | null
    ): Promise<User> => {
        return prisma.user.create({
            data: {
                clerkId,
                email,
                phoneNumber,
                fullName: fullName || 'New User',
                profilePictureUrl: imageUrl,
                role: 'BATSMAN', // Default
                onboardingComplete: false,
            },
        });
    },

    /**
     * Sync user from Clerk Webhook payload
     * Ensures idempotency (find or create)
     */
    syncUser: async (data: any): Promise<User> => {
        const { id: clerkId, email_addresses, phone_numbers, first_name, last_name, image_url } = data;

        const email = email_addresses?.[0]?.email_address || '';
        const phoneNumber = phone_numbers?.[0]?.phone_number || null;
        const fullName = `${first_name || ''} ${last_name || ''}`.trim() || 'User';

        const existingUser = await prisma.user.findUnique({
            where: { clerkId },
        });

        if (existingUser) {
            // Optional: Update fields if changed? For now, we assume profile is managed in-app.
            // But we might want to sync email/phone if changed in Clerk.
            return existingUser;
        }

        return prisma.user.create({
            data: {
                clerkId,
                email,
                phoneNumber,
                fullName,
                profilePictureUrl: image_url,
                onboardingComplete: false,
            },
        });
    }
};
