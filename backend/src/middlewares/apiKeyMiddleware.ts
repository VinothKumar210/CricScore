import type { Request, Response, NextFunction } from 'express';
import { validateApiKey } from '../services/apiKeyService.js';

// Simple In-Memory Rate Limiter
// In production, use Redis.
interface RateLimitEntry {
    count: number;
    windowStart: number;
}

const rateLimits = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minute
const LIMIT = 100; // 100 requests per minute

export const requireApiKey = (requiredPermission?: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const apiKey = req.header('x-api-key');

        if (!apiKey) {
            return res.status(401).json({ message: 'Missing API Key' });
        }

        // 1. Rate Limiting Check
        // We use the raw key as identifier for simplicity, or we could use hash if we don't want to expose heavy computation to DOS.
        // Better: Hash it first? validating takes DB call.
        // Optimization: Rate limit based on IP if key invalid? 
        // For now, rate limit based on KEY.

        const now = Date.now();
        const entry = rateLimits.get(apiKey) || { count: 0, windowStart: now };

        if (now - entry.windowStart > WINDOW_MS) {
            entry.count = 0;
            entry.windowStart = now;
        }

        if (entry.count >= LIMIT) {
            rateLimits.set(apiKey, entry); // Update timestamp if needed
            return res.status(429).json({ message: 'Rate limit exceeded' });
        }

        entry.count++;
        rateLimits.set(apiKey, entry);

        // 2. Validate Key
        try {
            const validKey = await validateApiKey(apiKey, requiredPermission);
            if (!validKey) {
                // Determine if 401 (invalid) or 403 (permission)
                // validateApiKey returns null for both.
                // We can assume 401.
                return res.status(401).json({ message: 'Invalid or inactive API Key' });
            }

            // Attach to request
            (req as any).apiKey = validKey;
            next();
        } catch (error) {
            console.error('API Key Validation Error:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    };
};
