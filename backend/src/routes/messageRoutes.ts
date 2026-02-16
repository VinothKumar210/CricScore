import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { messageService } from '../services/messageService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * GET /api/conversations/:id/messages
 * Fetch history
 */
router.get('/conversations/:id/messages', requireAuth, async (req: Request, res: Response) => {
    try {
        const conversationId = req.params.id as string;
        // const limit = parseInt(req.query.limit as string) || 50; 
        // Casts are tricky in endpoints without middleware validation, use defaults safely
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const beforeId = req.query.beforeId as string;

        const messages = await messageService.getHistory(conversationId, limit, beforeId);
        return sendSuccess(res, messages);
    } catch (error: any) {
        return sendError(res, 'Failed to fetch messages', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/conversations/:id/search
 * Search messages
 */
router.get('/conversations/:id/search', requireAuth, async (req: Request, res: Response) => {
    try {
        const conversationId = req.params.id as string;
        const query = req.query.q as string;

        if (!query) return sendError(res, 'Query required', 400, 'INVALID_PARAM');

        const messages = await messageService.searchMessages(conversationId, query);
        return sendSuccess(res, messages);
    } catch (error: any) {
        return sendError(res, 'Search failed', 500, 'INTERNAL_ERROR');
    }
});

export default router;
