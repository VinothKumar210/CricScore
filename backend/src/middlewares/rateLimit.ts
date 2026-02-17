import { rateLimit } from 'express-rate-limit';
import { redisClient } from '../services/presenceService.js';

// Custom Redis Store for express-rate-limit using ioredis
// To avoid strict dependency on 'rate-limit-redis' package if not present
class RedisStore {
    windowMs: number;

    constructor(windowMs: number) {
        this.windowMs = windowMs;
    }

    async init() { }

    async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
        // Use a transaction ensures atomic increment + expire
        // key format: rl:{key}
        const rKey = `rl:${key}`;

        // Multi: INCR, PTTL
        const results = await redisClient.multi()
            .incr(rKey)
            .pttl(rKey)
            .exec();

        // results: [[error, incrVal], [error, pttlVal]]
        if (!results) throw new Error('Redis failed');

        const totalHits = results[0]?.[1] as number;
        let pttl = results[1]?.[1] as number;

        // If newly created (totalHits === 1), set expiration
        if (totalHits === 1) {
            await redisClient.pexpire(rKey, this.windowMs);
            pttl = this.windowMs;
        }

        const resetTime = new Date(Date.now() + pttl);

        return {
            totalHits,
            resetTime
        };
    }

    async decrement(key: string) {
        const rKey = `rl:${key}`;
        await redisClient.decr(rKey);
    }

    async resetKey(key: string) {
        const rKey = `rl:${key}`;
        await redisClient.del(rKey);
    }
}

// Global Limiter: 200 requests / 15 minutes
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: new RedisStore(15 * 60 * 1000) as any, // Cast to any to satisfy Store interface quirks
    validate: { trustProxy: false } // We will set app.set('trust proxy') if needed, preventing warning
    // message: 'Too many requests, please try again later.' (Default json)
});
