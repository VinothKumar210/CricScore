// =============================================================================
// Profile Routes — Edit Profile + Avatar Upload
// =============================================================================
//
// PATCH  /api/profile          → Update text fields (name, bio, role, etc.)
// POST   /api/profile/avatar   → Upload avatar image (multipart form)
// DELETE /api/profile/avatar   → Remove avatar
// GET    /api/profile/username-available?username=xyz
//
// =============================================================================

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { uploadSingle } from '../middlewares/upload.js';
import { userService } from '../services/userService.js';
import { uploadAvatar, deleteAvatar } from '../services/uploadService.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { prisma } from '../utils/db.js';

const router = Router();

// ---------------------------------------------------------------------------
// PATCH /api/profile — Update text fields
// ---------------------------------------------------------------------------
router.patch('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) throw new AppError('UNAUTHORIZED');

        const updatedUser = await userService.updateProfile(user.id, req.body);
        return sendSuccess(res, { user: updatedUser });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// POST /api/profile/avatar — Upload avatar (multipart/form-data)
// ---------------------------------------------------------------------------
router.post(
    '/profile/avatar',
    requireAuth,
    uploadSingle('avatar', 5), // max 5 MB
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            if (!user) throw new AppError('UNAUTHORIZED');
            if (!(req as any).file) throw new AppError('MISSING_FIELD', 'No image file provided');

            // Upload to Cloudinary (compressed)
            const result = await uploadAvatar((req as any).file.buffer, user.id);

            // Update user record
            const updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: { profilePictureUrl: result.url },
                select: {
                    id: true,
                    fullName: true,
                    username: true,
                    profilePictureUrl: true,
                },
            });

            return sendSuccess(res, {
                user: updatedUser,
                upload: {
                    url: result.url,
                    width: result.width,
                    height: result.height,
                    format: result.format,
                    bytes: result.bytes,
                },
            });
        } catch (err) {
            next(err);
        }
    },
);

// ---------------------------------------------------------------------------
// DELETE /api/profile/avatar — Remove avatar
// ---------------------------------------------------------------------------
router.delete('/profile/avatar', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) throw new AppError('UNAUTHORIZED');

        // Delete from Cloudinary (non-blocking, best-effort)
        await deleteAvatar(`cricscore/avatars/avatar_${user.id}`);

        // Clear URL in database
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { profilePictureUrl: null },
            select: {
                id: true,
                fullName: true,
                username: true,
                profilePictureUrl: true,
            },
        });

        return sendSuccess(res, { user: updatedUser });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/profile/username-available?username=xyz
// ---------------------------------------------------------------------------
router.get('/profile/username-available', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const username = req.query.username as string;
        if (!username) throw new AppError('MISSING_FIELD', 'username query parameter is required');

        const available = await userService.checkUsernameAvailable(username);
        return sendSuccess(res, { username, available });
    } catch (err) {
        next(err);
    }
});

export default router;
