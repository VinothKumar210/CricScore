import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { conversationService } from '../services/conversationService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * GET /api/conversations
 * Fetch user's conversations, optionally filtered by type
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const type = req.query.type as 'DIRECT' | 'GROUP' | 'TEAM' | 'MATCH' | undefined;

        const conversations = await conversationService.getUserConversations(userId, type);
        return sendSuccess(res, { conversations });
    } catch (error: any) {
        console.error('[ConversationRoutes] Fetch error:', error);
        return sendError(res, 'Failed to fetch conversations', 500, 'INTERNAL_ERROR');
    }
});

/**
 * POST /api/conversations/direct
 * Find or create a direct message conversation with another user
 */
router.post('/direct', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { targetUserId } = req.body;

        if (!targetUserId) {
            return sendError(res, 'targetUserId is required', 400, 'MISSING_PARAM');
        }

        if (userId === targetUserId) {
            return sendError(res, 'Cannot create a direct conversation with yourself', 400, 'BAD_REQUEST');
        }

        const conversation = await conversationService.findOrCreateDirect(userId, targetUserId);
        return sendSuccess(res, { conversation }, 201);
    } catch (error: any) {
        console.error('[ConversationRoutes] Direct chat error:', error);
        return sendError(res, 'Failed to initiate direct conversation', 500, 'INTERNAL_ERROR');
    }
});

/**
 * POST /api/conversations/group
 * Create a sub-group within a team
 */
router.post('/group', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { name, teamId, memberIds } = req.body;

        if (!name || !teamId) {
            return sendError(res, 'name and teamId are required', 400, 'MISSING_PARAM');
        }

        // Must at least have one member besides the creator to be useful, although technically allowed
        const additionalMembers = Array.isArray(memberIds) ? memberIds : [];

        const conversation = await conversationService.createSubGroup(name, teamId, userId, additionalMembers);
        return sendSuccess(res, { conversation }, 201);
    } catch (error: any) {
        console.error('[ConversationRoutes] Create group error:', error);
        return sendError(res, 'Failed to create group conversation', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/conversations/:id/members
 * Get detailed member list for a conversation
 */
router.get('/:id/members', requireAuth, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const members = await conversationService.getConversationMembersDetails(id);
        return sendSuccess(res, { members });
    } catch (error: any) {
        console.error('[ConversationRoutes] Fetch members error:', error);
        return sendError(res, 'Failed to fetch conversation members', 500, 'INTERNAL_ERROR');
    }
});

export default router;
