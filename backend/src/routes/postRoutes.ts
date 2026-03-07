import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { postService } from '../services/postService.js';
import { reactionService } from '../services/reactionService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// =============================================================================
// Feed & Profiles
// =============================================================================

/**
 * GET /api/posts/feed
 * Get personalized feed (own posts + following)
 */
router.get('/posts/feed', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const cursor = req.query.cursor as string | undefined;

        const feed = await postService.getFeed(userId, cursor);
        return sendSuccess(res, feed);
    } catch (error: any) {
        console.error('[PostRoutes] Get feed error:', error);
        return sendError(res, 'Failed to fetch feed', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/posts/user/:targetId
 * Get posts for a specific user profile
 */
router.get('/posts/user/:targetId', requireAuth, async (req: Request, res: Response) => {
    try {
        const viewerId = req.user!.id;
        const targetId = req.params.targetId as string;
        const cursor = req.query.cursor as string | undefined;

        if (!targetId) return sendError(res, 'Target ID is required', 400, 'MISSING_PARAM');

        const profilePosts = await postService.getUserPosts(viewerId, targetId, cursor);
        return sendSuccess(res, profilePosts);
    } catch (error: any) {
        console.error('[PostRoutes] Get user posts error:', error);
        return sendError(res, 'Failed to fetch user posts', 500, 'INTERNAL_ERROR');
    }
});

// =============================================================================
// Post CRUD
// =============================================================================

/**
 * POST /api/posts
 * Create a new user post
 */
router.post('/posts', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { content, mediaUrls, visibility } = req.body;

        if (!content && (!mediaUrls || mediaUrls.length === 0)) {
            return sendError(res, 'Content or media is required', 400, 'MISSING_PARAM');
        }

        const post = await postService.createPost(userId, content, mediaUrls, visibility);
        return sendSuccess(res, { post }, 201);
    } catch (error: any) {
        console.error('[PostRoutes] Create post error:', error);
        return sendError(res, 'Failed to create post', 500, 'INTERNAL_ERROR');
    }
});

/**
 * DELETE /api/posts/:postId
 * Delete a post
 */
router.delete('/posts/:postId', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const postId = req.params.postId as string;

        if (!postId) return sendError(res, 'Post ID is required', 400, 'MISSING_PARAM');

        const result = await postService.deletePost(postId, userId);
        return sendSuccess(res, result);
    } catch (error: any) {
        console.error('[PostRoutes] Delete post error:', error);
        if (error.statusCode) return sendError(res, error.message, error.statusCode);
        return sendError(res, 'Failed to delete post', 500, 'INTERNAL_ERROR');
    }
});

// =============================================================================
// Reactions
// =============================================================================

/**
 * POST /api/posts/:postId/react
 * Add or update a reaction
 */
router.post('/posts/:postId/react', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const postId = req.params.postId as string;
        const { type } = req.body;

        if (!postId) return sendError(res, 'Post ID is required', 400, 'MISSING_PARAM');
        if (!type) return sendError(res, 'Reaction type is required', 400, 'MISSING_PARAM');

        const result = await reactionService.reactToPost(userId, postId, type);
        return sendSuccess(res, result);
    } catch (error: any) {
        console.error('[PostRoutes] React error:', error);
        if (error.statusCode) return sendError(res, error.message, error.statusCode);
        return sendError(res, 'Failed to react to post', 500, 'INTERNAL_ERROR');
    }
});

/**
 * DELETE /api/posts/:postId/react
 * Remove a reaction
 */
router.delete('/posts/:postId/react', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const postId = req.params.postId as string;

        if (!postId) return sendError(res, 'Post ID is required', 400, 'MISSING_PARAM');

        const result = await reactionService.removeReaction(userId, postId);
        return sendSuccess(res, result);
    } catch (error: any) {
        console.error('[PostRoutes] Remove react error:', error);
        return sendError(res, 'Failed to remove reaction', 500, 'INTERNAL_ERROR');
    }
});

// =============================================================================
// Comments
// =============================================================================

/**
 * GET /api/posts/:postId/comments
 * Fetch comments for a post
 */
router.get('/posts/:postId/comments', requireAuth, async (req: Request, res: Response) => {
    try {
        const postId = req.params.postId as string;
        const cursor = req.query.cursor as string | undefined;

        if (!postId) return sendError(res, 'Post ID is required', 400, 'MISSING_PARAM');

        const result = await reactionService.getComments(postId, cursor);
        return sendSuccess(res, result);
    } catch (error: any) {
        console.error('[PostRoutes] Get comments error:', error);
        return sendError(res, 'Failed to fetch comments', 500, 'INTERNAL_ERROR');
    }
});

/**
 * POST /api/posts/:postId/comments
 * Add a comment
 */
router.post('/posts/:postId/comments', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const postId = req.params.postId as string;
        const { content } = req.body;

        if (!postId) return sendError(res, 'Post ID is required', 400, 'MISSING_PARAM');
        if (!content) return sendError(res, 'Content is required', 400, 'MISSING_PARAM');

        const result = await reactionService.addComment(userId, postId, content);
        return sendSuccess(res, result, 201);
    } catch (error: any) {
        console.error('[PostRoutes] Add comment error:', error);
        if (error.statusCode) return sendError(res, error.message, error.statusCode);
        return sendError(res, 'Failed to add comment', 500, 'INTERNAL_ERROR');
    }
});

/**
 * DELETE /api/posts/:postId/comments/:commentId
 * Delete a comment
 */
router.delete('/posts/:postId/comments/:commentId', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const commentId = req.params.commentId as string;

        if (!commentId) return sendError(res, 'Comment ID is required', 400, 'MISSING_PARAM');

        const result = await reactionService.deleteComment(userId, commentId);
        return sendSuccess(res, result);
    } catch (error: any) {
        console.error('[PostRoutes] Delete comment error:', error);
        if (error.statusCode) return sendError(res, error.message, error.statusCode);
        return sendError(res, 'Failed to delete comment', 500, 'INTERNAL_ERROR');
    }
});

export default router;
