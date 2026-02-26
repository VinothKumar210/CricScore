// =============================================================================
// Inbox Routes — Conversation list + read receipts
// =============================================================================
//
// GET    /api/inbox                            → Paginated conversation list
// GET    /api/inbox/unread-count               → Total unread badge count
// PATCH  /api/inbox/:conversationId/read       → Mark conversation as read
//
// =============================================================================

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { getUserInbox, markConversationRead, getTotalUnreadCount } from '../services/inboxService.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/inbox — Paginated conversation list
// ---------------------------------------------------------------------------
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new AppError('UNAUTHORIZED');

        const cursor = req.query.cursor as string | undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
        const archived = req.query.archived === 'true';

        const result = await getUserInbox(userId, {
            cursor: cursor || undefined,
            limit,
            archived,
        });
        return sendSuccess(res, result);
    } catch (err) {
        next(err);
    }
});

// -------------------------------------------------------------------------
// GET /api/inbox/unread-count — Badge count
// -------------------------------------------------------------------------
router.get('/unread-count', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new AppError('UNAUTHORIZED');

        const count = await getTotalUnreadCount(userId);
        return sendSuccess(res, { count });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// PATCH /api/inbox/:conversationId/read — Mark as read
// ---------------------------------------------------------------------------
router.patch('/:conversationId/read', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new AppError('UNAUTHORIZED');

        const conversationId = req.params.conversationId as string;
        await markConversationRead(userId, conversationId);
        return sendSuccess(res, { marked: true });
    } catch (err) {
        next(err);
    }
});

export default router;
