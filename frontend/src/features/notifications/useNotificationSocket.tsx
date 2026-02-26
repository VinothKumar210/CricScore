import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useNotificationStore } from './notificationStore';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import type { Notification } from './notificationService';
import NotificationToast from './components/NotificationToast';

export const useNotificationSocket = () => {
    const socket = getSocket();
    const { prependNotification, fetchUnreadCount } = useNotificationStore();
    const { user } = useAuthStore();

    useEffect(() => {
        if (!socket || !user) return;

        // The chat namespace (currently handling general user notifications as well)
        // Ensure user is joined to their room if they aren't already
        // Wait, socketStore typically joins them on mount, but let's confirm events.

        const handleNewNotification = (notification: Notification) => {
            prependNotification(notification);

            // Show non-blocking toast
            toast.custom((t: any) => (
                <NotificationToast t={t} notification={notification} />
            ), {
                duration: 5000,
                position: 'top-right'
            });
        };

        // Listen for the backend's notification event
        socket.on('notification:new', handleNewNotification);

        return () => {
            socket.off('notification:new', handleNewNotification);
        };
    }, [socket, user, prependNotification]);

    // 30s Polling Fallback (If socket disconnects)
    useEffect(() => {
        if (!user) return;

        let interval: ReturnType<typeof setInterval>;
        if (!socket?.connected) {
            interval = setInterval(() => {
                fetchUnreadCount();
                // Optionally fetchLatest(), but strictly fetchUnreadCount is lighter
            }, 30000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [socket?.connected, user, fetchUnreadCount]);
};
