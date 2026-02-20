import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Singleton
let redis: any = null;

try {
    const isTls = redisUrl.startsWith('rediss://');

    // @ts-ignore
    redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        family: 0, // Force IPv4/IPv6 auto-resolution (fixes Render connection issues)
        ...(isTls && {
            tls: {
                rejectUnauthorized: false
            }
        }),
        retryStrategy(times: number) {
            if (times > 3) return null; // stop retrying
            return Math.min(times * 50, 2000);
        },
        lazyConnect: true // Don't connect immediately
    });

    redis.on('error', (err: any) => {
        // Suppress connection errors to avoid crashing if Redis is optional/missing dev
        if (process.env.NODE_ENV !== 'production') {
            const msg = err.message || err;
            console.warn('Redis connection failed (optional in dev):', msg);
        } else {
            console.error('Redis Error:', err);
        }
    });

} catch (error) {
    console.error('Failed to initialize Redis:', error);
}

export default redis;
