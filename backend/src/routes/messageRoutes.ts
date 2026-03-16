import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { messageService } from '../services/messageService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { redisClient } from '../services/presenceService.js';
import { io } from '../socket/index.js';

const router = Router();

// -----------------------------------------------------------------------------
// Rate Limiter Guard (10 req / sec)
// -----------------------------------------------------------------------------
const enforceRateLimit = async (userId: string): Promise<boolean> => {
    try {
        const key = `msg:rate:${userId}`;
        const current = await redisClient.incr(key);
        if (current === 1) {
            await redisClient.expire(key, 1);
        }
        return current <= 10;
    } catch (error) {
        // Fail closed on Redis failure 
        return false;
    }
};

/**
 * GET /api/messages/unread-counts
 * Get unread message counts for all conversations
 * NOTE: This must be placed BEFORE the /:conversationId routes to avoid param conflicts
 */
router.get('/unread-counts', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');

        const counts = await messageService.getUnreadCounts(userId);
        return sendSuccess(res, counts);
    } catch (error: any) {
        return sendError(res, 'Failed to fetch unread counts', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/messages/:conversationId
 * Fetch history — dual pagination support, requires membership
 */
router.get('/:conversationId', requireAuth, async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user?.id;

        if (!userId) return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');

        // RULE 3: Validate Membership
        const isMember = await messageService.validateConversationMembership(userId, conversationId as string);
        if (!isMember) return sendError(res, 'Not authorized for this conversation', 403, 'FORBIDDEN');

        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const cursor = req.query.cursor as string | undefined;
        const after = req.query.after as string | undefined; // RULE 4: Dual Pagination

        const messages = await messageService.getHistory(conversationId as string, limit, cursor, after);
        return sendSuccess(res, messages);
    } catch (error: any) {
        return sendError(res, 'Failed to fetch messages', 500, 'INTERNAL_ERROR');
    }
});

/**
 * POST /api/messages/:conversationId/read
 * Mark all messages in a conversation as read
 */
router.post('/:conversationId/read', requireAuth, async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user?.id;

        if (!userId) return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');

        await messageService.markAsRead(userId, conversationId as string);
        return sendSuccess(res, { success: true });
    } catch (error: any) {
        return sendError(res, 'Failed to mark as read', 500, 'INTERNAL_ERROR');
    }
});

/**
 * POST /api/messages/:conversationId
 * Send message — strict idempotency, rate limits, broadcasts
 */
router.post('/:conversationId', requireAuth, async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user?.id;
        const { content, clientNonce, attachments } = req.body;

        if (!userId) return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
        if ((!content || !content.trim()) && (!attachments || attachments.length === 0)) {
            return sendError(res, 'Content or an attachment is required', 400, 'BAD_REQUEST');
        }

        // RULE 6: Strict Rate Limiting
        const isAllowed = await enforceRateLimit(userId);
        if (!isAllowed) {
            return sendError(res, 'Rate limit exceeded. Too many requests.', 429, 'RATE_LIMIT');
        }

        // Save natively (handles Membership validation internally, throws if unauthorized)
        // Also checks idempotency via clientNonce
        const message = await messageService.saveMessage(
            userId,
            conversationId as string,
            content || '',
            clientNonce as string | undefined,
            attachments
        );

        // RULE 1: Server Emitted Broadcasts (Authoritative Layer)
        // Emit to the conversation room for real-time chat updates
        io.of('/messages').to(`conversation:${conversationId}`).emit('message:new', message);

        // RULE 8: Inbox Update — Emit to each member's personal room
        // This allows the inbox to update in real-time for ALL conversations
        messageService.getConversationMembers(conversationId as string).then(memberIds => {
            for (const memberId of memberIds) {
                if (memberId !== userId) {
                    io.of('/messages').to(`user:${memberId}`).emit('inbox:update', {
                        conversationId,
                        lastMessage: {
                            id: message.id,
                            content: message.content,
                            senderId: message.senderId,
                            sender: (message as any).sender,
                            createdAt: message.createdAt
                        }
                    });
                }
            }
        }).catch(err => {
            console.error('[inbox:update] Failed to broadcast:', err);
        });

        // RULE 2: clientNonce Echo Contract
        return sendSuccess(res, message, 201);
    } catch (error: any) {
        if (error.message.includes('not authorized')) {
            return sendError(res, error.message, 403, 'FORBIDDEN');
        }
        return sendError(res, 'Failed to send message', 500, 'INTERNAL_ERROR');
    }
});

export default router;
