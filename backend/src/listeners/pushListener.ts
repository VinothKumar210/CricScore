import { eventBus } from '../events/eventBus.js';
import { pushService } from '../services/pushService.js';

// Initialize Push Listener
export const initPushListener = () => {
    console.log('🔔 Push Listener Initialized');

    eventBus.on('notification.created', async (notification) => {
        try {
            await pushService.sendPushNotification(notification.userId, {
                title: notification.title,
                body: notification.body,
                data: notification.data as Record<string, string>
            });
        } catch (error) {
            console.error('❌ Error in Push Listener:', error);
        }
    });
};
