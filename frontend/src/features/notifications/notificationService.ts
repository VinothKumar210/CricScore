import { api } from '../../lib/api';

export interface Notification {
    id: string;
    type: 'MATCH_MILESTONE' | 'MATCH_RESULT' | 'TOURNAMENT_WIN' | 'TOURNAMENT_QUALIFIED' | 'TOURNAMENT_ELIMINATED' | 'MENTION' | 'REACTION' | 'POLL_CREATED' | 'POLL_RESULT' | 'INVITE_RECEIVED' | 'ACHIEVEMENT_UNLOCKED';
    title: string;
    body: string;
    link?: string;
    metadata?: Record<string, any>;
    readAt: string | null;
    createdAt: string;
}

export const notificationService = {
    getNotifications: async (limit: number = 20, cursor?: string) => {
        const { data } = await api.get('/api/notifications', { params: { limit, cursor } });
        return data as { notifications: Notification[], nextCursor: string | null };
    },

    getUnreadCount: async () => {
        const { data } = await api.get('/api/notifications/unread-count');
        return data.unread as number;
    },

    markAsRead: async (id: string) => {
        await api.patch(`/api/notifications/${id}/read`);
    },

    markAllAsRead: async () => {
        await api.patch('/api/notifications/read-all');
    }
};
