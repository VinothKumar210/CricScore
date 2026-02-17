import { prisma } from '../utils/db.js';
import crypto from 'crypto';

// -----------------------------------------------------------------------------
// API Key Management
// -----------------------------------------------------------------------------

/**
 * Generate a new API Key.
 * Format: pk_live_<random_hex_32>
 * Returns raw key only once. Stores hash.
 */
export const createApiKey = async (userId: string, name: string, permissions: string[] = []) => {
    const rawKey = `pk_live_${crypto.randomBytes(24).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await prisma.apiKey.create({
        data: {
            userId,
            name,
            key: hash, // Store hash
            permissions,
            isActive: true
        }
    });

    return { ...apiKey, key: rawKey }; // Return raw key to user
};

/**
 * Validate API Key.
 * Checks hash, active status, and permissions.
 * Updates lastUsedAt.
 */
export const validateApiKey = async (rawKey: string, requiredPermission?: string) => {
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await prisma.apiKey.findUnique({
        where: { key: hash },
        include: { user: true }
    });

    if (!apiKey) return null;
    if (!apiKey.isActive) return null;

    // Permission check
    if (requiredPermission && !apiKey.permissions.includes(requiredPermission)) {
        return null; // Or specific error type if needed
    }

    // Update Usage (Async, don't await blocking)
    prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
    }).catch(console.error);

    return apiKey;
};

export const listApiKeys = async (userId: string) => {
    return prisma.apiKey.findMany({
        where: { userId },
        select: {
            id: true,
            name: true,
            permissions: true,
            isActive: true, // Renamed from isActive? Schema has isActive.
            createdAt: true,
            lastUsedAt: true,
            key: false // Never return hash
        }
    });
};

export const revokeApiKey = async (userId: string, keyId: string) => {
    const key = await prisma.apiKey.findFirst({ where: { id: keyId, userId } });
    if (!key) throw new Error('API Key not found');

    return prisma.apiKey.delete({ where: { id: keyId } });
};
