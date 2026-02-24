import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { prisma } from '../utils/db.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// -----------------------------------------------------------------------------
// Notification API (Secure & Scalable)
// Scoped strictly to req.user.id
// -----------------------------------------------------------------------------

/**
 * GET /api/notifications
 * Fetch notifications with cursor-based pagination.
 * Scoped to req.user.id.
 */
router.get('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const cursor = req.query.cursor as string;
        const limit = Math.min(parseInt((req.query.limit as string) || '20'), 50);

        const notifications = await prisma.notification.findMany({
            where: {
                userId: userId
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit,
            ...(cursor && {
                skip: 1,
                cursor: { id: cursor }
            }),
            select: {
                id: true,
                type: true,
                title: true,
                body: true,
                metadata: true,
                readAt: true,
                createdAt: true
                // userId and dedupeKey excluded appropriately
            }
        });

        // Determine next cursor
        const nextCursor = notifications.length === limit ? notifications[notifications.length - 1]?.id : null;

        return sendSuccess(res, { notifications, nextCursor });
    } catch (error: any) {
        console.error('[NotificationRoutes] List Error:', error);
        return sendError(res, 'Failed to fetch notifications', 500, 'INTERNAL_ERROR');
    }
});

/**
 * GET /api/notifications/unread-count
 * Efficient count of unread notifications.
 */
router.get('/unread-count', requireAuth, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const count = await prisma.notification.count({
            where: {
                userId: userId,
                readAt: null
            }
        });
        return sendSuccess(res, { unread: count });
    } catch (error: any) {
        return sendError(res, 'Failed to fetch unread count', 500, 'INTERNAL_ERROR');
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 * Uses updateMany to prevent IDOR (only updates if id AND userId match).
 */
router.patch('/:id/read', requireAuth, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const result = await prisma.notification.updateMany({
            where: {
                id: notificationId,
                userId: userId
            },
            data: {
                readAt: new Date()
            }
        });

        if (result.count === 0) {
            // Either not found or not owned by user
            return sendError(res, 'Notification not found', 404, 'NOT_FOUND');
        }

        return sendSuccess(res, { success: true });
    } catch (error: any) {
        return sendError(res, 'Failed to mark notification as read', 500, 'INTERNAL_ERROR');
    }
});

/**
 * PATCH /api/notifications/read-all
 * Mark ALL unread notifications as read.
 */
router.patch('/read-all', requireAuth, async (req: any, res) => {
    try {
        const userId = req.user.id;

        const result = await prisma.notification.updateMany({
            where: {
                userId: userId,
                readAt: null
            },
            data: {
                readAt: new Date()
            }
        });

        return sendSuccess(res, { success: true, count: result.count });
    } catch (error: any) {
        return sendError(res, 'Failed to mark all as read', 500, 'INTERNAL_ERROR');
    }
});

export default router;
