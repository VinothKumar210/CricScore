import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireMatchRole } from '../middlewares/matchPermission.js';
import { matchService } from '../services/matchService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// --- Match CRUD ---

/**
 * POST /api/matches
 * Create a new match
 */
router.post('/matches', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const required = ['matchType', 'homeTeamId', 'awayTeamId', 'overs', 'ballType'];
        const missing = required.filter(f => !req.body[f]);

        if (missing.length > 0) {
            return sendError(res, `Missing fields: ${missing.join(', ')}`, 400, 'MISSING_PARAM');
        }

        const match = await matchService.createMatch(userId, req.body);
        return sendSuccess(res, { match }, 201);
    } catch (error: any) {
        if (error.statusCode) return sendError(res, error.message, error.statusCode, error.code);
        console.error('[MatchRoutes] Create error:', error);
        return sendError(res, 'Failed to create match', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/matches/:id
 * Get match details
 */
router.get('/matches/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const matchId = req.params.id as string;
        if (!matchId) return sendError(res, 'Match ID required', 400, 'MISSING_PARAM');

        const match = await matchService.getMatch(matchId);
        if (!match) return sendError(res, 'Match not found', 404, 'NOT_FOUND');

        return sendSuccess(res, { match });
    } catch (error: any) {
        return sendError(res, 'Failed to fetch match', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/matches
 * List matches (filter by team, status, date)
 */
router.get('/matches', requireAuth, async (req: Request, res: Response) => {
    try {
        const filters = {
            teamId: req.query.teamId as string,
            status: req.query.status as string,
            date: req.query.date as string,
        };
        const matches = await matchService.getMatches(filters);
        return sendSuccess(res, { matches });
    } catch (error: any) {
        return sendError(res, 'Failed to list matches', 500, 'INTERNAL_ERROR');
    }
});

/**
 * PATCH /api/matches/:id/status
 * Update match status (e.g., START, END)
 * Requires Match Role (Owner/Captain of participating teams)
 */
router.patch('/matches/:id/status', requireAuth, requireMatchRole(['OWNER', 'CAPTAIN']), async (req: Request, res: Response) => {
    try {
        const matchId = req.params.id as string;
        if (!matchId) return sendError(res, 'Match ID required', 400, 'MISSING_PARAM');

        const { status } = req.body;
        if (!status) return sendError(res, 'Status is required', 400, 'MISSING_PARAM');

        const match = await matchService.updateMatchStatus(matchId, status);
        return sendSuccess(res, { match });
    } catch (error: any) {
        if (error.statusCode) return sendError(res, error.message, error.statusCode, error.code);
        console.error('[MatchRoutes] Status update error:', error);
        return sendError(res, 'Failed to update status', 500, 'INTERNAL_ERROR');
    }
});

export default router;
