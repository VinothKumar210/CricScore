import { prisma } from '../utils/db.js';
import type { User } from '@prisma/client';

export const userService = {
    /**
     * Find a user by their Firebase UID
     */
    findByFirebaseUid: async (firebaseUid: string): Promise<User | null> => {
        return prisma.user.findUnique({
            where: { firebaseUid },
        });
    },

    /**
     * Create a new user from Firebase data
     */
    createUser: async (
        firebaseUid: string,
        email: string,
        phoneNumber?: string | null,
        fullName?: string | null,
        imageUrl?: string | null
    ): Promise<User> => {
        return prisma.user.create({
            data: {
                firebaseUid,
                email,
                phoneNumber: phoneNumber || null,
                fullName: fullName || 'New User',
                profilePictureUrl: imageUrl || null,
                role: 'BATSMAN', // Default
                onboardingComplete: false,
            },
        });
    },
};
