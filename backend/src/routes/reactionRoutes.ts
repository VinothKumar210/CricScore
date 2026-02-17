import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { reactionService } from '../services/reactionService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * POST /api/messages/:id/reactions
 * Toggle reaction
 */
router.post('/messages/:id/reactions', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const messageId = req.params.id as string;
        const { emoji } = req.body;

        if (!emoji) return sendError(res, 'Emoji required', 400, 'MISSING_PARAM');

        const result = await reactionService.toggleReaction(messageId, userId, emoji);
        return sendSuccess(res, result);
    } catch (error: any) {
        return sendError(res, error.message || 'Failed to toggle reaction', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/messages/:id/reactions
 * Get aggregated reactions
 */
router.get('/messages/:id/reactions', requireAuth, async (req: Request, res: Response) => {
    try {
        const messageId = req.params.id as string;
        const reactions = await reactionService.getReactions(messageId);
        return sendSuccess(res, reactions);
    } catch (error: any) {
        return sendError(res, 'Failed to fetch reactions', 500, 'INTERNAL_ERROR');
    }
});

export default router;
