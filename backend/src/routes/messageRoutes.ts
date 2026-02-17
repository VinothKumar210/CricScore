import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { messageService } from '../services/messageService.js';
import { prisma } from '../utils/db.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// -----------------------------------------------------------------------------
// Conversation Membership Guard
// Ensures the authenticated user is a member before accessing any messages.
// -----------------------------------------------------------------------------

const requireConversationMember = async (req: Request, res: Response): Promise<boolean> => {
    const conversationId = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) {
        sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
        return false;
    }

    const member = await prisma.conversationMember.findUnique({
        where: {
            conversationId_userId: {
                conversationId,
                userId,
            },
        },
    });

    if (!member) {
        sendError(res, 'You are not a member of this conversation', 403, 'FORBIDDEN');
        return false;
    }

    return true;
};

/**
 * GET /api/conversations/:id/messages
 * Fetch history — requires membership
 */
router.get('/conversations/:id/messages', requireAuth, async (req: Request, res: Response) => {
    try {
        if (!(await requireConversationMember(req, res))) return;

        const conversationId = req.params.id as string;
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
 * Search messages — requires membership
 */
router.get('/conversations/:id/search', requireAuth, async (req: Request, res: Response) => {
    try {
        if (!(await requireConversationMember(req, res))) return;

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
