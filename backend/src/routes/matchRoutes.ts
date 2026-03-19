import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireMatchRole } from '../middlewares/matchPermission.js';
import { matchService } from '../services/matchService.js';
import { aiNarrativeService } from '../services/aiNarrativeService.js';
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
        const required = ['matchType', 'homeTeamId', 'awayTeamName', 'overs', 'ballType'];
        const missing = required.filter(f => req.body[f] === undefined || req.body[f] === null || req.body[f] === '');

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
 * GET /api/matches/:id/insight
 * Get AI-generated Narrative (Recap)
 */
router.get('/matches/:id/insight', requireAuth, async (req: Request, res: Response) => {
    try {
        const matchId = req.params.id as string;
        if (!matchId) return sendError(res, 'Match ID required', 400, 'MISSING_PARAM');

        const narrative = await aiNarrativeService.generateMatchRecap(matchId);
        return sendSuccess(res, { narrative });
    } catch (error: any) {
        return sendError(res, 'Failed to fetch match insight', 500, 'INTERNAL_ERROR');
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

/**
 * PATCH /api/matches/:id/toss
 * Step 2: Record Toss result
 * Requires Match Role (Owner/Captain or Match Creator)
 */
router.patch('/matches/:id/toss', requireAuth, requireMatchRole(['OWNER', 'CAPTAIN', 'VICE_CAPTAIN']), async (req: Request, res: Response) => {
    try {
        const matchId = req.params.id as string;
        if (!matchId) return sendError(res, 'Match ID required', 400, 'MISSING_PARAM');

        const { tossWinnerName, tossDecision } = req.body;
        if (!tossWinnerName || !tossDecision) {
            return sendError(res, 'Toss winner and decision are required', 400, 'MISSING_PARAM');
        }

        const match = await matchService.updateMatchToss(matchId, tossWinnerName, tossDecision);
        return sendSuccess(res, { match });
    } catch (error: any) {
        if (error.statusCode) return sendError(res, error.message, error.statusCode, error.code);
        console.error('[MatchRoutes] Toss error:', error);
        return sendError(res, 'Failed to update toss', 500, 'INTERNAL_ERROR');
    }
});

/**
 * PATCH /api/matches/:id/playing-xi
 * Step 3: Record Playing XI
 */
router.patch('/matches/:id/playing-xi', requireAuth, requireMatchRole(['OWNER', 'CAPTAIN', 'VICE_CAPTAIN']), async (req: Request, res: Response) => {
    try {
        const matchId = req.params.id as string;
        if (!matchId) return sendError(res, 'Match ID required', 400, 'MISSING_PARAM');

        const { homeXI, awayXI } = req.body;
        if (!homeXI || !awayXI) {
            return sendError(res, 'Home and Away XI are required', 400, 'MISSING_PARAM');
        }

        const match = await matchService.updatePlayingXI(matchId, homeXI, awayXI);
        return sendSuccess(res, { match });
    } catch (error: any) {
        if (error.statusCode) return sendError(res, error.message, error.statusCode, error.code);
        console.error('[MatchRoutes] Playing XI error:', error);
        return sendError(res, 'Failed to update playing XI', 500, 'INTERNAL_ERROR');
    }
});

/**
 * PATCH /api/matches/:id/openers
 * Step 4: Record Openers & Start Match
 */
router.patch('/matches/:id/openers', requireAuth, requireMatchRole(['OWNER', 'CAPTAIN', 'VICE_CAPTAIN']), async (req: Request, res: Response) => {
    try {
        const matchId = req.params.id as string;
        if (!matchId) return sendError(res, 'Match ID required', 400, 'MISSING_PARAM');

        const { strikerId, nonStrikerId, bowlerId } = req.body;
        if (!strikerId || !nonStrikerId || !bowlerId) {
            return sendError(res, 'Striker, non-striker, and bowler are required', 400, 'MISSING_PARAM');
        }

        const match = await matchService.updateOpeners(matchId, strikerId, nonStrikerId, bowlerId);
        return sendSuccess(res, { match });
    } catch (error: any) {
        if (error.statusCode) return sendError(res, error.message, error.statusCode, error.code);
        console.error('[MatchRoutes] Openers error:', error);
        return sendError(res, 'Failed to start match with openers', 500, 'INTERNAL_ERROR');
    }
});

/**
 * POST /api/matches/:id/complete
 * Mark match as COMPLETED. Idempotent.
 */
router.post('/matches/:id/complete', requireAuth, requireMatchRole(['OWNER', 'CAPTAIN', 'VICE_CAPTAIN']), async (req: Request, res: Response) => {
    try {
        const matchId = req.params.id as string;
        if (!matchId) return sendError(res, 'Match ID required', 400, 'MISSING_PARAM');

        const { resultString } = req.body;
        if (!resultString) {
            return sendError(res, 'Result string is required', 400, 'MISSING_PARAM');
        }

        const match = await matchService.completeMatch(matchId, resultString);
        return sendSuccess(res, { match });
    } catch (error: any) {
        if (error.statusCode) return sendError(res, error.message, error.statusCode, error.code);
        console.error('[MatchRoutes] Complete error:', error);
        return sendError(res, 'Failed to complete match', 500, 'INTERNAL_ERROR');
    }
});

export default router;
