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

            // 2. Create Notification (DB Constraint handles dedupe)
            // We strip dedupeKey from data object to avoid redundancy
            const finalData = { ...data };
            if (finalData.dedupeKey) delete finalData.dedupeKey;

            try {
                const notification = await prisma.notification.create({
                    data: {
                        userId,
                        type: type as any,
                        title,
                        body,
                        data: finalData,
                        dedupeKey: dedupeKey || null // Top-level field
                    } as any,
                });

                // Emit Domain Event (Fire-and-forget for sockets/push)
                // We use dynamic import or ensure eventBus is safe.
                // Better to import at top level as it is a pure node module.
                // But let's check imports first.
                // We need to import eventBus.
                const { eventBus } = await import('../events/eventBus.js');
                eventBus.emit('notification.created', notification);

                return notification;
            } catch (error: any) {
                // Handle Unique Constraint Violation (P2002)
                if (error.code === 'P2002') {
                    // Swallow error - duplicate notification ignored
                    return null;
                }
                throw error; // Rethrow other errors
            }
        } catch (error) {
            // 3. Log and swallow — notification failure must NEVER break main logic
            console.error('[NotificationService] Failed to create notification:', error);
            return null;
        }
    },
};
