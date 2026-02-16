import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireMatchRole } from '../middlewares/matchPermission.js';
import { matchFinalizationService } from '../services/matchFinalizationService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * POST /api/matches/:id/finalize
 * Finalize a completed match and generate summary.
 */
router.post('/matches/:id/finalize', requireAuth, requireMatchRole(['OWNER', 'CAPTAIN']), async (req: Request, res: Response) => {
    try {
        const matchId = req.params.id as string;
        const userId = req.user!.id;

        const result = await matchFinalizationService.finalizeMatch(matchId, userId);
        return sendSuccess(res, result);
    } catch (error: any) {
        if (error.statusCode) return sendError(res, error.message, error.statusCode, error.code);
        console.error('[MatchFinalization] Error:', error);
        return sendError(res, 'Failed to finalize match', 500, 'INTERNAL_ERROR');
    }
});

export default router;
