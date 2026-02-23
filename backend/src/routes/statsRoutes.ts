import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { statsService } from '../services/statsService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// --- Stats Routes ---

/**
 * GET /api/stats/player/:id
 * Get aggregated stats for a player
 */
router.get('/stats/player/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const stats = await statsService.getPlayerStats(req.params.id as string);
        return sendSuccess(res, stats);
    } catch (error: any) {
        return sendError(res, 'Failed to fetch player stats', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/stats/player/:id/form
 * Get player form
 */
router.get('/stats/player/:id/form', requireAuth, async (req: Request, res: Response) => {
    try {
        const form = await statsService.getPlayerForm(req.params.id as string);
        return sendSuccess(res, form);
    } catch (error: any) {
        return sendError(res, 'Failed to fetch player form', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/stats/team/:id
 * Get team aggregated stats
 */
router.get('/stats/team/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const stats = await statsService.getTeamStats(req.params.id as string);
        return sendSuccess(res, stats);
    } catch (error: any) {
        return sendError(res, 'Failed to fetch team stats', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/stats/leaderboard
 * ?category=runs|wickets&limit=10
 */
router.get('/stats/leaderboard', requireAuth, async (req: Request, res: Response) => {
    try {
        const category = req.query.category as any;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

        if (!['runs', 'wickets'].includes(category)) {
            return sendError(res, 'Invalid category', 400, 'INVALID_PARAM');
        }

        const leaderboard = await statsService.getLeaderboard(category, limit);
        return sendSuccess(res, leaderboard);
    } catch (error: any) {
        return sendError(res, 'Failed to fetch leaderboard', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/stats/player/:id/competitive
 * Returns impact rating, global rank, prestige tier, role, best performance.
 * ALL competitive logic is server-computed.
 */
router.get('/stats/player/:id/competitive', requireAuth, async (req: Request, res: Response) => {
    try {
        const competitive = await statsService.getCompetitiveProfile(req.params.id as string);
        return sendSuccess(res, competitive);
    } catch (error: any) {
        return sendError(res, 'Failed to fetch competitive profile', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/stats/leaderboard/impact
 * Paginated impact leaderboard. Players with >= 5 matches only.
 * ?page=1&limit=20
 */
router.get('/stats/leaderboard/impact', requireAuth, async (req: Request, res: Response) => {
    try {
        const page = Math.max(parseInt(req.query.page as string) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const leaderboard = await statsService.getImpactLeaderboard(page, limit);
        return sendSuccess(res, leaderboard);
    } catch (error: any) {
        return sendError(res, 'Failed to fetch impact leaderboard', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/profile/public/:username
 * Public profile — scrubbed (no email, no Firebase UID).
 * Returns stats + competitive + limited form.
 */
router.get('/profile/public/:username', async (req: Request, res: Response) => {
    try {
        const result = await statsService.getPublicProfile(req.params.username as string);
        if (!result) {
            return sendError(res, 'Profile not found', 404, 'NOT_FOUND');
        }
        return sendSuccess(res, result);
    } catch (error: any) {
        return sendError(res, 'Failed to fetch public profile', 500, 'INTERNAL_ERROR');
    }
});

export default router;
