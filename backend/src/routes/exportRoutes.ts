// =============================================================================
// Export Routes — Scorecard PDF + Social Share Image
// =============================================================================
//
// GET /api/export/:matchId/pdf           → Download scorecard PDF
// GET /api/export/:matchId/image         → Download social share image (PNG)
// GET /api/export/:matchId/data          → Get raw scorecard JSON
//
// =============================================================================

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import {
    getScorecardData,
    generateScorecardPDF,
    generateShareImage,
} from '../services/exportService.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/export/:matchId/pdf — Download scorecard as PDF
// ---------------------------------------------------------------------------
router.get('/:matchId/pdf', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { matchId } = req.params;
        const pdfBuffer = await generateScorecardPDF(matchId as string);

        if (!pdfBuffer) {
            throw new AppError('NOT_FOUND', 'Match not found');
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="scorecard-${matchId}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        return res.end(pdfBuffer);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/export/:matchId/image — Social share image (1200x630 PNG)
// ---------------------------------------------------------------------------
router.get('/:matchId/image', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { matchId } = req.params;
        const imageBuffer = await generateShareImage(matchId as string);

        if (!imageBuffer) {
            throw new AppError('NOT_FOUND', 'Match not found');
        }

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `inline; filename="scorecard-${matchId}.png"`);
        res.setHeader('Content-Length', imageBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1hr cache
        return res.end(imageBuffer);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/export/:matchId/data — Raw scorecard JSON
// ---------------------------------------------------------------------------
router.get('/:matchId/data', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { matchId } = req.params;
        const data = await getScorecardData(matchId as string);

        if (!data) {
            throw new AppError('NOT_FOUND', 'Match not found');
        }

        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
});

export default router;
