import { prisma } from '../utils/db.js';

// -----------------------------------------------------------------------------
// Centralized Notification Service
// All notification writes MUST go through this service.
// This service is fire-and-forget safe — errors are logged, never thrown.
// -----------------------------------------------------------------------------

interface CreateNotificationParams {
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    dedupeKey?: string;
}

const DEDUPE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export const notificationService = {
    /**
     * Create a notification record.
     *
     * - Validates required fields.
     * - Optional deduplication via `dedupeKey` (checked within 5-minute window).
     * - Wrapped in try/catch — NEVER throws, NEVER blocks calling logic.
     *
     * @returns The created notification, or null if skipped/errored.
     */
    createNotification: async (params: CreateNotificationParams) => {
        try {
            const { userId, type, title, body, data, dedupeKey } = params;

            // 1. Validate required fields
            if (!userId || !type || !title || !body) {
                console.warn('[NotificationService] Missing required fields:', {
                    userId: !!userId,
                    type: !!type,
                    title: !!title,
                    body: !!body,
                });
                return null;
            }

            // 2. Deduplication check (if dedupeKey provided)
            if (dedupeKey) {
                const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS);

                const existing = await prisma.notification.findFirst({
                    where: {
                        userId,
                        createdAt: { gte: cutoff },
                        // Store dedupeKey inside data.dedupeKey for lookup
                        data: {
                            path: ['dedupeKey'],
                            equals: dedupeKey,
                        },
                    } as any,
                });

                if (existing) {
                    // Skip — duplicate notification within window
                    return null;
                }
            }

            // 3. Create notification
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type: type as any,
                    title,
                    body,
                    data: {
                        ...(data || {}),
                        ...(dedupeKey ? { dedupeKey } : {}),
                    },
                } as any,
            });

            return notification;
        } catch (error) {
            // 4. Log and swallow — notification failure must NEVER break main logic
            console.error('[NotificationService] Failed to create notification:', error);
            return null;
        }
    },
};
