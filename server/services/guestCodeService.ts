/**
 * Guest Code Generation Service
 * Generates unique 5-character alphanumeric codes for guest players.
 * Codes are case-insensitive and stored in lowercase.
 */

import { prisma } from '../db';

// Character set for guest codes (lowercase alphanumeric, excluding similar-looking chars)
const CHARSET = 'abcdefghjkmnpqrstuvwxyz23456789'; // No i, l, o, 0, 1 to avoid confusion
const CODE_LENGTH = 5;

/**
 * Generate a random guest code
 */
function generateRandomCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
        const randomIndex = Math.floor(Math.random() * CHARSET.length);
        code += CHARSET[randomIndex];
    }
    return code;
}

/**
 * Check if a guest code already exists (case-insensitive)
 */
async function codeExists(code: string): Promise<boolean> {
    const existing = await prisma.guestPlayer.findFirst({
        where: {
            guestCode: code.toLowerCase(),
        },
    });
    return existing !== null;
}

/**
 * Generate a unique guest code with retry logic
 * @param maxRetries - Maximum number of retries if collision occurs
 * @returns Unique lowercase guest code
 */
export async function generateUniqueGuestCode(maxRetries = 10): Promise<string> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const code = generateRandomCode();
        const exists = await codeExists(code);

        if (!exists) {
            return code; // Already lowercase
        }

        console.log(`Guest code collision detected: ${code}, retrying...`);
    }

    throw new Error('Failed to generate unique guest code after maximum retries');
}

/**
 * Find a guest player by their code (case-insensitive)
 */
export async function findGuestByCode(code: string) {
    return prisma.guestPlayer.findFirst({
        where: {
            guestCode: code.toLowerCase(),
        },
        include: {
            team: true,
            addedBy: {
                select: {
                    id: true,
                    username: true,
                    profileName: true,
                    profilePictureUrl: true,
                },
            },
            linkedUser: {
                select: {
                    id: true,
                    username: true,
                    profileName: true,
                    profilePictureUrl: true,
                },
            },
        },
    });
}

/**
 * Validate guest code format (5 alphanumeric chars)
 */
export function isValidGuestCodeFormat(code: string): boolean {
    return /^[a-zA-Z0-9]{5}$/.test(code);
}
