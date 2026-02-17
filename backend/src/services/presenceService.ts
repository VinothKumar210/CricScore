import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisClient = new Redis(redisUrl);

// Key Prefixes
const ONLINE_KEY = 'user:online:';

// TTL for presence keys — auto-expires if server crashes
const PRESENCE_TTL_SECONDS = 30;

export const presenceService = {
    /**
     * Mark user as online with TTL.
     * Key auto-expires after 30 seconds if not refreshed.
     */
    setUserOnline: async (userId: string, socketId: string) => {
        await redisClient.setex(`${ONLINE_KEY}${userId}`, PRESENCE_TTL_SECONDS, socketId);
    },

    /**
     * Refresh TTL — called every 15 seconds as heartbeat.
     * Keeps the user online as long as the socket is alive.
     */
    refreshPresence: async (userId: string) => {
        await redisClient.expire(`${ONLINE_KEY}${userId}`, PRESENCE_TTL_SECONDS);
    },

    /**
     * Mark user as offline — immediate cleanup on graceful disconnect.
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
        const results = await redisClient.mget(keys);

        const status: Record<string, boolean> = {};
        userIds.forEach((id, index) => {
            status[id] = results[index] !== null;
        });
        return status;
    }
};
