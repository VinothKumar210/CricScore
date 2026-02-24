import { notificationService } from '../services/notificationService.js';

/**
 * Daily Cron script to clean up 30-day old notifications.
 * Can be run via package.json script: "ts-node src/scripts/cleanupNotifications.ts"
 * Does NOT check 'readAt', rigidly relies on 'createdAt'.
 */
async function run() {
    console.log('[Cron] Starting 30-day Notification Cleanup...');
    try {
        await notificationService.cleanupOldNotifications();
        console.log('[Cron] Cleanup Task Completed.');
    } catch (err) {
        console.error('[Cron] Cleanup Failed:', err);
    } finally {
        process.exit(0);
    }
}

run();
