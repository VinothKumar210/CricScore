import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireMatchRole } from '../middlewares/matchPermission.js';
import { scoringEngine } from '../services/scoringEngine.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { redisClient } from '../services/presenceService.js';

const router = Router();

// -----------------------------------------------------------------------------
// Redis-Based Scoring Rate Limiter (Sliding Window via Sorted Set)
// 60 operations / 60 seconds / matchId + userId
// Horizontally scalable — shared across all server instances.
// Fail-open — if Redis is unavailable, requests are allowed.
// -----------------------------------------------------------------------------

const SCORING_RATE_WINDOW_MS = 60_000; // 60 seconds
const SCORING_RATE_MAX = 60;
const SCORING_RATE_TTL_SECONDS = 120; // Key expires after 2 minutes of inactivity
const SCORING_RATE_PREFIX = 'score:rate:';

/**
 * Check and record a scoring operation against the rate limit.
 * Uses Redis sorted set with timestamps as scores for a sliding window.
 *
 * @returns true if allowed, false if rate limited
 */
const checkScoringRateLimit = async (matchId: string, userId: string): Promise<boolean> => {
    try {
        const key = `${SCORING_RATE_PREFIX}${matchId}:${userId}`;
        const now = Date.now();
        const windowStart = now - SCORING_RATE_WINDOW_MS;

        // Atomic pipeline: remove old entries, count remaining, add new, set TTL
        const pipeline = redisClient.pipeline();
        pipeline.zremrangebyscore(key, 0, windowStart);     // 1. Remove expired entries
        pipeline.zcard(key);                                  // 2. Count remaining
        pipeline.zadd(key, now, `${now}:${Math.random()}`);  // 3. Add current timestamp (unique member)
        pipeline.expire(key, SCORING_RATE_TTL_SECONDS);       // 4. Set TTL

        const results = await pipeline.exec();

        // results[1] = [error, count] from zcard
        if (results && results[1] && results[1][1] !== null) {
            const count = results[1][1] as number;
            if (count >= SCORING_RATE_MAX) {
                // Over limit — remove the entry we just added
                // (it was added before we checked, but pipeline is atomic)
                // Actually count was checked BEFORE zadd in pipeline order,
                // so count reflects pre-add state. If count >= MAX, reject.
                return false;
            }
        }

        return true;
    } catch (error) {
        // Fail-open: if Redis is unavailable, allow the request
        console.warn('[ScoringRateLimit] Redis unavailable, allowing request:', error);
        return true;
    }
};

// --- Scoring Operations ---

/**
 * POST /api/matches/:id/operations
 * Submit a scoring operation
 */
router.post('/matches/:id/operations', requireAuth, requireMatchRole(['OWNER', 'CAPTAIN', 'VICE_CAPTAIN']), async (req: Request, res: Response) => {
    try {
        const matchId = req.params.id as string;
        const userId = req.user!.id;

        // Per-match rate limit check (Redis-backed)
        if (!(await checkScoringRateLimit(matchId, userId))) {
            return sendError(res, 'Scoring rate limit exceeded. Max 60 ops/minute per match.', 429, 'RATE_LIMITED');
        }

        const { clientOpId, expectedVersion, type, payload } = req.body;

        if (!clientOpId || expectedVersion === undefined || !type) {
            return sendError(res, 'Missing required fields', 400, 'MISSING_PARAM');
        }

        const result = await scoringEngine.addOperation(matchId, userId, {
            clientOpId,
            expectedVersion,
            type,
            payload
        });

        return sendSuccess(res, result);
    } catch (error: any) {
        if (error.statusCode) return sendError(res, error.message, error.statusCode, error.code, { currentVersion: error.currentVersion, detail: error.detail });
        console.error('[ScoringRoutes] Add Op Error:', error);
        return sendError(res, 'Failed to submit operation', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/matches/:id/state
 * Get current match state
 */
router.get('/matches/:id/state', requireAuth, async (req: Request, res: Response) => {
    try {
        const matchId = req.params.id as string;
        const state = await scoringEngine.getMatchState(matchId);
        return sendSuccess(res, { state });
    } catch (error: any) {
        return sendError(res, 'Failed to get match state', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/matches/:id/operations
 * Sync operations
 */
router.get('/matches/:id/operations', requireAuth, async (req: Request, res: Response) => {
    try {
        const matchId = req.params.id as string;
        const since = parseInt(req.query.since as string) || 0;

        const operations = await scoringEngine.getOperations(matchId, since);
        return sendSuccess(res, { operations });
    } catch (error: any) {
        return sendError(res, 'Failed to fetch operations', 500, 'INTERNAL_ERROR');
    }
});

export default router;
