// =============================================================================
// Wagon Wheel Routes — GET /api/wagon-wheel/:matchId/:batsmanId
// =============================================================================

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { getWagonWheel } from '../services/wagonWheelService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * GET /api/wagon-wheel/:matchId/:batsmanId
 *
 * Returns wagon wheel shot data for a batsman in a match.
 *
 * Response:
 *   200 — { data: WagonWheelData }
 *   204 — No data (batsman didn't bat or no balls recorded)
 *   400 — Invalid parameters
 *   404 — Match or batsman not found
 */
router.get(
    '/:matchId/:batsmanId',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const matchId = req.params.matchId as string;
            const batsmanId = req.params.batsmanId as string;

            if (!matchId || !batsmanId) {
                return sendError(res, 'matchId and batsmanId are required', 400, 'MISSING_PARAM');
            }

            const data = await getWagonWheel(matchId, batsmanId);

            if (!data) {
                return res.status(204).end(); // No content — batsman has no balls
            }

            return sendSuccess(res, data);
        } catch (err: any) {
            if (err.statusCode) {
                return sendError(res, err.message, err.statusCode, err.code);
            }
            next(err);
        }
    },
);

export default router;
