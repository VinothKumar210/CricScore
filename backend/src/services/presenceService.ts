import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisClient = new Redis(redisUrl);

// Key Prefixes
const ONLINE_KEY = 'user:online:';
const TYPING_KEY = 'user:typing:';

export const presenceService = {
    /**
     * Mark user as online.
     */
    setUserOnline: async (userId: string, socketId: string) => {
        await redisClient.set(`${ONLINE_KEY}${userId}`, socketId);
        // Optional: Set expire if needed, but connection persists.
    },

    /**
     * Mark user as offline.
     */
    setUserOffline: async (userId: string) => {
        await redisClient.del(`${ONLINE_KEY}${userId}`);
    },

    /**
     * Check if user is online.
     */
    isUserOnline: async (userId: string): Promise<boolean> => {
        const exists = await redisClient.exists(`${ONLINE_KEY}${userId}`);
        return exists === 1;
    },

    /**
     * Get multiple users' status.
     */
    getUsersPresence: async (userIds: string[]): Promise<Record<string, boolean>> => {
        if (userIds.length === 0) return {};
        const keys = userIds.map(id => `${ONLINE_KEY}${id}`);
        // MGET returns values or null
        const results = await redisClient.mget(keys);

        const status: Record<string, boolean> = {};
        userIds.forEach((id, index) => {
            status[id] = results[index] !== null;
        });
        return status;
    }
};
