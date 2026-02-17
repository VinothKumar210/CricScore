import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireMatchRole } from '../middlewares/matchPermission.js';
import { scoringEngine } from '../services/scoringEngine.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// -----------------------------------------------------------------------------
// Per-Match Scoring Rate Limiter
// 60 operations / minute / matchId / userId
// In-memory Map — resets on server restart (acceptable for scoring ops).
// -----------------------------------------------------------------------------

interface RateLimitEntry {
    count: number;
    windowStart: number;
}

const scoringRateLimits = new Map<string, RateLimitEntry>();
const SCORING_RATE_WINDOW_MS = 60_000; // 1 minute
const SCORING_RATE_MAX = 60; // 60 ops per window

// Cleanup stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of scoringRateLimits) {
        if (now - entry.windowStart > SCORING_RATE_WINDOW_MS * 2) {
            scoringRateLimits.delete(key);
        }
    }
}, 5 * 60_000);

const checkScoringRateLimit = (matchId: string, userId: string): boolean => {
    const key = `${matchId}:${userId}`;
    const now = Date.now();
    const entry = scoringRateLimits.get(key);

    if (!entry || now - entry.windowStart > SCORING_RATE_WINDOW_MS) {
        // New window
        scoringRateLimits.set(key, { count: 1, windowStart: now });
        return true;
    }

    if (entry.count >= SCORING_RATE_MAX) {
        return false; // Rate limited
    }

    entry.count += 1;
    return true;
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

        // Per-match rate limit check
        if (!checkScoringRateLimit(matchId, userId)) {
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
