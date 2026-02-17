import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { pollService } from '../services/pollService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * POST /api/polls
 */
router.post('/polls', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id; // Auth middleware guarantees user
        const { conversationId, question, options, expiresAt, isAnonymous } = req.body;

        if (!conversationId || !question || !options || !Array.isArray(options)) {
            return sendError(res, 'Missing required fields', 400, 'MISSING_PARAM');
        }

        const result = await pollService.createPoll(
            conversationId,
            userId,
            question,
            options,
            expiresAt ? new Date(expiresAt) : undefined,
            isAnonymous
        );

        return sendSuccess(res, result);
    } catch (error: any) {
        return sendError(res, error.message || 'Failed to create poll', 500, 'INTERNAL_ERROR');
    }
});

/**
 * POST /api/polls/:id/vote
 */
router.post('/polls/:id/vote', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const pollId = req.params.id as string;
        const { optionId } = req.body;

        if (!optionId) {
            return sendError(res, 'Option ID required', 400, 'MISSING_PARAM');
        }

        const updatedPoll = await pollService.votePoll(pollId, userId, optionId);
        return sendSuccess(res, updatedPoll);

    } catch (error: any) {
        return sendError(res, error.message || 'Failed to vote', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/polls/:id
 * Dynamic fetch
 */
router.get('/polls/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const pollId = req.params.id as string;
        const poll = await pollService.getPoll(pollId);

        if (!poll) return sendError(res, 'Poll not found', 404, 'NOT_FOUND');

        return sendSuccess(res, poll);
    } catch (error: any) {
        return sendError(res, 'Failed to fetch poll', 500, 'INTERNAL_ERROR');
    }
});

export default router;
