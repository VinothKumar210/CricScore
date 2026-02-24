import { prisma } from '../utils/db.js';
import { eventBus } from '../events/eventBus.js';
import { pushService } from './pushService.js';
import { redisClient } from './presenceService.js';
import { NotificationType } from '@prisma/client';

export const notificationService = {
    /**
     * Create a notification with deduplication, throttling, DB persistence,
     * socket emitting, and FCM push integration.
     */
    createNotification: async (params: {
        userId: string;
        type: NotificationType;
        title: string;
        body: string;
        link?: string;
        metadata?: Record<string, any>;
    }) => {
        const { userId, type, title, body, link, metadata } = params;

        try {
            // 1. Deduplication (Last 60 seconds)
            // Match on userId, type, and link to prevent duplicate identical milestones
            const dedupKey = `notification:dedup:${userId}:${type}:${link || 'nolink'}`;

            if (redisClient.status === 'ready') {
                // Option B: Redis Lock (Atomic)
                const acquired = await redisClient.set(dedupKey, '1', 'EX', 60, 'NX');
                if (!acquired) {
                    console.log(`[NotificationService] Deduplicated ${type} via Redis lock for user ${userId}`);
                    return null;
                }
            } else {
                // Fallback: Option A logic (DB Query if Redis down)
                const oneMinuteAgo = new Date(Date.now() - 60_000);
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId,
                        type,
                        link: link ? link : null,
                        createdAt: { gte: oneMinuteAgo }
                    }
                });

                if (existing) {
                    console.log(`[NotificationService] Deduplicated ${type} via DB for user ${userId}`);
                    return existing;
                }
            }

            // 2. Persist to DB
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type,
                    title,
                    body,
                    link: link ?? null,
                    metadata: metadata ? (metadata as any) : null,
                }
            });

            // 3. Socket Integration (via existing Event Bus)
            eventBus.emit('notification.created', notification);

            // 4. FCM Push & Throttling
            await handlePushNotification(userId, type, title, body, link);

            return notification;
        } catch (error) {
            console.error('[NotificationService] Failed to create notification:', error);
            // Fail-closed strategy for error loops
            return null;
        }
    },

    /**
     * Daily 30-day hard delete cleanup
     * Run this via a Cron Job
     */
    cleanupOldNotifications: async () => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        try {
            const result = await prisma.notification.deleteMany({
                where: {
                    createdAt: { lt: thirtyDaysAgo }
                }
            });
            console.log(`[NotificationService] Cleanup: Deleted ${result.count} notifications older than 30 days.`);
        } catch (error) {
            console.error('[NotificationService] Cleanup Failed:', error);
        }
    }
};

/**
 * Handle Push logic and Throttling separately
 */
async function handlePushNotification(userId: string, type: NotificationType, originalTitle: string, originalBody: string, link?: string) {
    // Only send pushes for significant events
    const PUSH_ENABLED_TYPES: NotificationType[] = [
        'INVITE_RECEIVED',
        'MATCH_RESULT',
        'TOURNAMENT_WIN',
        'MENTION'
    ];

    if (!PUSH_ENABLED_TYPES.includes(type)) return;

    try {
        // Throttling: How many pushes in last 60s
        const throttleKey = `push:throttle:${userId}`;

        let count = 1;
        if (redisClient.status === 'ready') {
            // Option 2: Atomic Lua script to INCR and EXPIRE correctly
            const script = `
                local c = redis.call("INCR", KEYS[1])
                if c == 1 then
                    redis.call("EXPIRE", KEYS[1], 60)
                end
                return c
            `;
            count = await redisClient.eval(script, 1, throttleKey) as number;
        }

        let pushTitle = originalTitle;
        let pushBody = originalBody;
        let pushData: Record<string, string> | undefined = link ? { link } : undefined;

        if (count > 3) {
            // Batch push formatting
            pushTitle = "New Updates in CricScore";
            pushBody = `You have ${count} new pending notifications.`;
            pushData = undefined; // Drop deep link on batch

            // Only send the batched push precisely on the 4th occurrence in the window
            // Subsequent pushes within the 60s window are silently suppressed
            if (count > 4) {
                return;
            }
        }

        // Send via FCM service
        await pushService.sendPushNotification(userId, {
            title: pushTitle,
            body: pushBody,
            ...(pushData && { data: pushData })
        });

    } catch (error) {
        console.error('[NotificationService] Push handling failed:', error);
    }
}
