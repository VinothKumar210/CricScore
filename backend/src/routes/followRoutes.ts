import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { followService } from '../services/followService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * POST /api/follows/:targetId
 * Follow a user
 */
router.post('/follows/:targetId', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const targetId = req.params.targetId as string;

        if (!targetId) return sendError(res, 'Target User ID required', 400, 'MISSING_PARAM');

        const result = await followService.followUser(userId, targetId);
        return sendSuccess(res, result, 201);
    } catch (error: any) {
        console.error('[FollowRoutes] Follow user error:', error);
        if (error.statusCode) return sendError(res, error.message, error.statusCode);
        return sendError(res, 'Failed to follow user', 500, 'INTERNAL_ERROR');
    }
});

/**
 * DELETE /api/follows/:targetId
 * Unfollow a user or cancel an existing pending request
 */
router.delete('/follows/:targetId', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const targetId = req.params.targetId as string;

        if (!targetId) return sendError(res, 'Target User ID required', 400, 'MISSING_PARAM');

        const result = await followService.unfollowUser(userId, targetId);
        return sendSuccess(res, result);
    } catch (error: any) {
        console.error('[FollowRoutes] Unfollow user error:', error);
        return sendError(res, 'Failed to unfollow user', 500, 'INTERNAL_ERROR');
    }
});

/**
 * POST /api/follows/requests/:followerId
 * Respond to a pending follow request (accept or reject)
 */
router.post('/follows/requests/:followerId', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const followerId = req.params.followerId as string;
        const { accept } = req.body;

        if (!followerId) return sendError(res, 'Follower ID required', 400, 'MISSING_PARAM');
        if (accept === undefined) return sendError(res, 'Accept boolean required', 400, 'MISSING_PARAM');

        const result = await followService.respondToRequest(userId, followerId, accept);
        return sendSuccess(res, result);
    } catch (error: any) {
        console.error('[FollowRoutes] Respond to request error:', error);
        if (error.statusCode) return sendError(res, error.message, error.statusCode);
        return sendError(res, 'Failed to respond to request', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/follows/requests
 * Get all pending follow requests for the authenticated user
 */
router.get('/follows/requests', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const requests = await followService.getFollowRequests(userId);
        return sendSuccess(res, { requests });
    } catch (error: any) {
        console.error('[FollowRoutes] Get requests error:', error);
        return sendError(res, 'Failed to fetch follow requests', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/follows/:userId/followers
 * Get followers of a specific user
 */
router.get('/follows/:userId/followers', requireAuth, async (req: Request, res: Response) => {
    try {
        const targetUserId = req.params.userId as string;
        if (!targetUserId) return sendError(res, 'User ID required', 400, 'MISSING_PARAM');

        const followers = await followService.getFollowers(targetUserId);
        return sendSuccess(res, { followers });
    } catch (error: any) {
        console.error('[FollowRoutes] Get followers error:', error);
        return sendError(res, 'Failed to fetch followers', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/follows/:userId/following
 * Get users the specific user is following
 */
router.get('/follows/:userId/following', requireAuth, async (req: Request, res: Response) => {
    try {
        const targetUserId = req.params.userId as string;
        if (!targetUserId) return sendError(res, 'User ID required', 400, 'MISSING_PARAM');

        const following = await followService.getFollowing(targetUserId);
        return sendSuccess(res, { following });
    } catch (error: any) {
        console.error('[FollowRoutes] Get following error:', error);
        return sendError(res, 'Failed to fetch following users', 500, 'INTERNAL_ERROR');
    }
});

export default router;
