// =============================================================================
// Comparison Routes — Head-to-head player stats
// =============================================================================
//
// GET /api/compare?player1=id&player2=id&from=2025-01-01&to=2025-12-31
//
// =============================================================================

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { compareHeadToHead } from '../services/comparisonService.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new AppError('UNAUTHORIZED');

        const player1 = req.query.player1 as string;
        const player2 = req.query.player2 as string;

        if (!player1 || !player2) {
            throw new AppError('MISSING_FIELD', 'Both player1 and player2 query params are required');
        }
        if (player1 === player2) {
            throw new AppError('INVALID_INPUT', 'Cannot compare a player with themselves');
        }

        const from = req.query.from as string | undefined;
        const to = req.query.to as string | undefined;
        const dateRange = (from || to) ? { from, to } : undefined;

        const result = await compareHeadToHead(player1, player2, dateRange);
        return sendSuccess(res, result);
    } catch (err) {
        next(err);
    }
});

export default router;
