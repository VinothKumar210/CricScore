import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireMatchRole } from '../middlewares/matchPermission.js';
import { scoringEngine } from '../services/scoringEngine.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// --- Scoring Operations ---

/**
 * POST /api/matches/:id/operations
 * Submit a scoring operation
 */
router.post('/matches/:id/operations', requireAuth, requireMatchRole(['OWNER', 'CAPTAIN', 'VICE_CAPTAIN']), async (req: Request, res: Response) => {
    try {
        const matchId = req.params.id as string;
        const userId = req.user!.id;
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
        if (error.statusCode) return sendError(res, error.message, error.statusCode, error.code, { currentVersion: error.currentVersion });
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
