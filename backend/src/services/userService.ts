import { prisma } from '../utils/db.js';
import type { User } from '@prisma/client';

// Valid enum values from Prisma schema
const VALID_ROLES = ['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER_BATSMAN'] as const;
const VALID_BATTING_HAND = ['RIGHT_HANDED', 'LEFT_HANDED'] as const;
const VALID_BATTING_POSITION = ['OPENER', 'TOP_ORDER', 'MIDDLE_ORDER', 'LOWER_ORDER', 'FINISHER'] as const;
const VALID_BOWLING_STYLE = ['RIGHT_ARM_FAST', 'RIGHT_ARM_MEDIUM', 'LEFT_ARM_FAST', 'LEFT_ARM_MEDIUM', 'RIGHT_ARM_SPIN', 'LEFT_ARM_SPIN'] as const;
const VALID_BOWLING_SUB_TYPE = [
    'RIGHT_ARM_FAST', 'RIGHT_ARM_MEDIUM', 'LEFT_ARM_FAST', 'LEFT_ARM_MEDIUM',
    'RIGHT_ARM_OFF_SPIN', 'RIGHT_ARM_LEG_SPIN', 'LEFT_ARM_ORTHODOX', 'LEFT_ARM_CHINAMAN', 'SLOW_LEFT_ARM'
] as const;

// Allowed profile update fields
const ALLOWED_PROFILE_FIELDS = [
    'fullName', 'username', 'description', 'dateOfBirth',
    'city', 'state', 'country', 'jerseyNumber',
    'role', 'battingHand', 'battingPosition', 'bowlingStyle', 'bowlingSubType',
    'onboardingComplete', 'profilePictureUrl',
] as const;

type ProfileField = typeof ALLOWED_PROFILE_FIELDS[number];

function isValidEnum(value: string, validValues: readonly string[]): boolean {
    return validValues.includes(value);
}

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
                role: 'BATSMAN',
                onboardingComplete: false,
            },
        });
    },

    /**
     * Update user profile with validated fields
     */
    updateProfile: async (userId: string, data: Record<string, any>): Promise<User> => {
        const updateData: Record<string, any> = {};

        for (const key of Object.keys(data)) {
            if (!ALLOWED_PROFILE_FIELDS.includes(key as ProfileField)) {
                continue; // Skip unknown fields silently
            }

            const value = data[key];

            // Validate enums
            if (key === 'role' && value !== null && !isValidEnum(value, VALID_ROLES)) {
                throw { statusCode: 400, message: `Invalid role: ${value}`, code: 'INVALID_ENUM' };
            }
            if (key === 'battingHand' && value !== null && !isValidEnum(value, VALID_BATTING_HAND)) {
                throw { statusCode: 400, message: `Invalid battingHand: ${value}`, code: 'INVALID_ENUM' };
            }
            if (key === 'battingPosition' && value !== null && !isValidEnum(value, VALID_BATTING_POSITION)) {
                throw { statusCode: 400, message: `Invalid battingPosition: ${value}`, code: 'INVALID_ENUM' };
            }
            if (key === 'bowlingStyle' && value !== null && !isValidEnum(value, VALID_BOWLING_STYLE)) {
                throw { statusCode: 400, message: `Invalid bowlingStyle: ${value}`, code: 'INVALID_ENUM' };
            }
            if (key === 'bowlingSubType' && value !== null && !isValidEnum(value, VALID_BOWLING_SUB_TYPE)) {
                throw { statusCode: 400, message: `Invalid bowlingSubType: ${value}`, code: 'INVALID_ENUM' };
            }

            // Validate types
            if (key === 'jerseyNumber' && value !== null && typeof value !== 'number') {
                throw { statusCode: 400, message: 'jerseyNumber must be a number', code: 'INVALID_TYPE' };
            }
            if (key === 'onboardingComplete' && typeof value !== 'boolean') {
                throw { statusCode: 400, message: 'onboardingComplete must be a boolean', code: 'INVALID_TYPE' };
            }
            if (key === 'dateOfBirth' && value !== null) {
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    throw { statusCode: 400, message: 'Invalid dateOfBirth format', code: 'INVALID_TYPE' };
                }
                updateData[key] = date;
                continue;
            }

            updateData[key] = value;
        }

        if (Object.keys(updateData).length === 0) {
            throw { statusCode: 400, message: 'No valid fields to update', code: 'NO_FIELDS' };
        }

        // If username is being set, check uniqueness
        if (updateData.username) {
            const existing = await prisma.user.findUnique({
                where: { username: updateData.username },
            });
            if (existing && existing.id !== userId) {
                throw { statusCode: 409, message: 'Username already taken', code: 'USERNAME_TAKEN' };
            }
        }

        // Auto-generate autoUsername if fullName is provided and autoUsername is not yet set
        if (updateData.fullName) {
            const currentUser = await prisma.user.findUnique({ where: { id: userId } });
            if (currentUser && !currentUser.autoUsername) {
                updateData.autoUsername = await userService.generateAutoUsername(updateData.fullName);
            }
        }

        return prisma.user.update({
            where: { id: userId },
            data: updateData,
        });
    },

    /**
     * Generate a unique auto-username from a full name.
     * Lowercase, remove special chars, append random 2-digit suffix.
     */
    generateAutoUsername: async (fullName: string): Promise<string> => {
        const base = fullName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
            .slice(0, 20); // Cap length

        if (!base) {
            return userService.generateAutoUsername('user');
        }

        // Try up to 10 times to find a unique username
        for (let attempt = 0; attempt < 10; attempt++) {
            const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
            const candidate = `${base}_${suffix}`;

            const existing = await prisma.user.findUnique({
                where: { autoUsername: candidate },
            });

            if (!existing) {
                return candidate;
            }
        }

        // Fallback: use timestamp
        const fallback = `${base}_${Date.now() % 10000}`;
        return fallback;
    },

    /**
     * Check if a username is available (case-insensitive)
     */
    checkUsernameAvailable: async (username: string): Promise<boolean> => {
        const normalized = username.toLowerCase().trim();
        if (!normalized || normalized.length < 3) {
            return false;
        }

        const existing = await prisma.user.findFirst({
            where: {
                username: {
                    equals: normalized,
                    mode: 'insensitive',
                },
            },
        });

        return !existing;
    },

    /**
     * Update lastSeenAt timestamp
     */
    updateLastSeen: async (userId: string): Promise<void> => {
        await prisma.user.update({
            where: { id: userId },
            data: { lastSeenAt: new Date() },
        });
    },
};
