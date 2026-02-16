import type { Request, Response } from 'express';
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { userService } from '../services/userService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * PATCH /api/profile
 * Update the authenticated user's profile.
 */
router.patch('/profile', requireAuth, async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            return sendError(res, 'User not found', 401, 'UNAUTHORIZED');
        }

        const updatedUser = await userService.updateProfile(user.id, req.body);
        return sendSuccess(res, { user: updatedUser });
    } catch (error: any) {
        if (error.statusCode) {
            return sendError(res, error.message, error.statusCode, error.code);
        }

        // Handle Prisma unique constraint violations
        if (error.code === 'P2002') {
            const field = error.meta?.target?.[0] || 'field';
            return sendError(res, `${field} already exists`, 409, 'UNIQUE_CONSTRAINT');
        }

        console.error('[ProfileRoutes] Update error:', error);
        return sendError(res, 'Failed to update profile', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/profile/username-available?username=xyz
 * Check if a username is available.
 */
router.get('/profile/username-available', requireAuth, async (req: Request, res: Response) => {
    try {
        const username = req.query.username as string;

        if (!username) {
            return sendError(res, 'username query parameter is required', 400, 'MISSING_PARAM');
        }

        const available = await userService.checkUsernameAvailable(username);
        return sendSuccess(res, { username, available });
    } catch (error) {
        console.error('[ProfileRoutes] Username check error:', error);
        return sendError(res, 'Failed to check username', 500, 'INTERNAL_ERROR');
    }
});

export default router;
