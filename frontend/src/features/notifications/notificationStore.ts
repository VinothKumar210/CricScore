import { create } from 'zustand';
import { notificationService } from './notificationService';
import type { Notification } from './notificationService';

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    isDropdownOpen: boolean;
    lastNotification: Notification | null;
    fetchLatest: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    prependNotification: (n: Notification) => void;
    setDropdownOpen: (isOpen: boolean) => void;
    reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    isDropdownOpen: false,
    lastNotification: null,

    fetchLatest: async () => {
        set({ isLoading: true });
        try {
            const { notifications } = await notificationService.getNotifications(10);
            set({ notifications });
        } catch (error) {
            console.error('Failed to fetch latest notifications:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchUnreadCount: async () => {
        try {
            const unreadCount = await notificationService.getUnreadCount();
            set({ unreadCount });
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    },

    markRead: async (id: string) => {
        const { notifications, unreadCount } = get();

        // Optimistic UI update for speed and feel
        const target = notifications.find(n => n.id === id);
        if (target && !target.readAt) {
            set({
                notifications: notifications.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n),
                unreadCount: Math.max(0, unreadCount - 1)
            });
            try {
                await notificationService.markAsRead(id);
            } catch (error) {
                // Background error, no block
                console.error('Failed to mark as read remotely:', error);
            }
        }
    },

    markAllRead: async () => {
        set({ unreadCount: 0, notifications: get().notifications.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })) });
        try {
            await notificationService.markAllAsRead();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    },

    prependNotification: (n: Notification) => {
        set(state => ({
            notifications: [n, ...state.notifications].slice(0, 10), // Keep latest 10
            unreadCount: state.unreadCount + 1,
            lastNotification: n
        }));
    },

    setDropdownOpen: (isOpen: boolean) => set({ isDropdownOpen: isOpen }),

    reset: () => set({ notifications: [], unreadCount: 0, isDropdownOpen: false })
}));
