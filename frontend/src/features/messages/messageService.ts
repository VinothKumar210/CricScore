import { api } from '../../lib/api';

export type ConversationType = 'DIRECT' | 'TEAM' | 'MATCH' | 'GROUP';

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    clientNonce?: string; // Optimistic Race identifier
    tempId?: string; // Client-only
    status?: 'sending' | 'failed' | 'sent'; // Client-only
    createdAt: string;
    sender: {
        id: string;
        name: string;
        fullName?: string;
        avatarUrl?: string;
        profilePictureUrl?: string;
    };
    reactions?: {
        messageId: string;
        userId: string;
        emoji: string;
        createdAt: string;
    }[];
    attachments?: {
        id?: string;
        url: string;
        type: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';
        filename: string;
        sizeBytes: number;
        mimeType: string;
        thumbnailUrl?: string;
    }[];
    replyTo?: {
        id: string;
        content: string;
        type?: string;
        sender?: { fullName?: string };
    } | null;
}



export const messageService = {
    getMessages: async (conversationId: string, cursor?: string | null): Promise<{ messages: Message[], nextCursor: string | null }> => {
        const { data } = await api.get(`/api/messages/${conversationId}`, {
            params: { cursor, limit: 50 }
        });

        // Handle standard backend sendSuccess wrapper if present
        const result = data.data || data;
        // Backend getHistory returns a flat array of messages
        const messages: Message[] = Array.isArray(result) ? result : (result.messages || []);

        // Derive nextCursor from the oldest message ID for cursor-based pagination
        // Backend returns messages in ASC order, so first message is the oldest
        const nextCursor = messages.length >= 50 ? messages[0]?.id || null : null;

        return {
            messages,
            nextCursor
        };
    },

    sendMessage: async (conversationId: string, content: string, clientNonce?: string, attachments?: any[], replyToId?: string): Promise<Message> => {
        const { data } = await api.post(`/api/messages/${conversationId}`, {
            content,
            clientNonce,
            attachments,
            replyToId
        });
        return data.data || data;
    },

    createDirectConversation: async (targetUserId: string) => {
        const { data } = await api.post('/api/conversations/direct', { targetUserId });
        return data.data || data;
    },

    createSubGroup: async (name: string, teamId: string, memberIds: string[]) => {
        const { data } = await api.post('/api/conversations/group', { name, teamId, memberIds });
        return data.data || data;
    },

    markAsRead: async (conversationId: string) => {
        const { data } = await api.post(`/api/messages/${conversationId}/read`);
        return data.data || data;
    },

    getUnreadCounts: async (): Promise<{ total: number; perConversation: Record<string, number> }> => {
        const { data } = await api.get('/api/messages/unread-counts');
        return data.data || data;
    },

    getConversationMembers: async (conversationId: string): Promise<any[]> => {
        const { data } = await api.get(`/api/conversations/${conversationId}/members`);
        return data.data || data;
    },

    addReaction: async (conversationId: string, messageId: string, emoji: string) => {
        await api.post(`/api/messages/${conversationId}/${messageId}/react`, { emoji });
    },

    removeReaction: async (conversationId: string, messageId: string, emoji: string) => {
        await api.delete(`/api/messages/${conversationId}/${messageId}/react?emoji=${encodeURIComponent(emoji)}`);
    }
};
