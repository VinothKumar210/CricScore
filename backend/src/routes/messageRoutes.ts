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
 * POST /api/messages/:conversationId
 * Send message — strict idempotency, rate limits, broadcasts
 */
router.post('/:conversationId', requireAuth, async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user?.id;
        const { content, clientNonce } = req.body;

        if (!userId) return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
        if (!content || !content.trim()) return sendError(res, 'Content required', 400, 'BAD_REQUEST');

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
            content,
            clientNonce as string | undefined
        );

        // RULE 1: Server Emitted Broadcasts (Authoritative Layer)
        // Emit to the conversation room. The type/entityId are attached to the message object.
        io.of('/messages').to(`conversation:${conversationId}`).emit('message:new', message);

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
