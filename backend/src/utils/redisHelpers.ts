/**
 * redisHelpers.ts — Separated Fail-Open / Fail-Closed Redis Operations
 *
 * Cache operations: Fail-open (return null on Redis failure)
 * Rate limiting: Fail-closed (deny request on Redis failure)
 */

import redis from './redis.js';

// ─── Cache Operations (Fail-Open) ───

/**
 * Get cached value. Returns null on cache miss OR Redis failure.
 * Fail-open: never blocks user if Redis is unavailable.
 */
export async function cacheGet(key: string): Promise<string | null> {
    try {
        if (!redis) return null;
        return await redis.get(key);
    } catch {
        return null; // Fail-open
    }
}

/**
 * Set cache value with TTL. Silently fails if Redis is unavailable.
 */
export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
        if (!redis) return;
        await redis.setex(key, ttlSeconds, value);
    } catch {
        // Fail-open: cache miss on next read is acceptable
    }
}

/**
 * Delete cache key. Silently fails if Redis is unavailable.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
    try {
        if (!redis) return;
        await redis.del(...keys);
    } catch {
        // Fail-open: TTL will self-correct
    }
}

// ─── Rate Limiting (Fail-Closed) ───

/**
 * Check rate limit using sliding window (Redis sorted set).
 * Returns true if allowed, false if denied.
 * Fail-CLOSED: if Redis is unavailable, request is DENIED.
 */
export async function rateLimitCheck(
    key: string,
    max: number,
    windowMs: number,
    ttlSeconds: number
): Promise<boolean> {
    if (!redis) return false; // Fail-closed: no Redis = deny

    try {
        const now = Date.now();
        const windowStart = now - windowMs;

        const pipeline = redis.pipeline();
        pipeline.zremrangebyscore(key, 0, windowStart);
        pipeline.zcard(key);
        pipeline.zadd(key, now, `${now}:${Math.random()}`);
        pipeline.expire(key, ttlSeconds);

        const results = await pipeline.exec();

        if (results && results[1] && results[1][1] !== null) {
            const count = results[1][1] as number;
            if (count >= max) return false; // Over limit
        }

        return true;
    } catch {
        return false; // Fail-closed: deny on Redis failure
    }
}
