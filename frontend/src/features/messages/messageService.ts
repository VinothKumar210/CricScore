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
    }
}



export const messageService = {
    getMessages: async (conversationId: string, cursor?: string | null): Promise<{ messages: Message[], nextCursor: string | null }> => {
        const { data } = await api.get(`/api/messages/${conversationId}`, {
            params: { cursor }
        });

        // Handle standard backend sendSuccess wrapper if present
        const result = data.data || data;
        const messages = Array.isArray(result) ? result : (result.messages || []);

        return {
            messages,
            nextCursor: result.nextCursor || null
        };
    },

    sendMessage: async (conversationId: string, content: string, clientNonce?: string): Promise<Message> => {
        const { data } = await api.post(`/api/messages/${conversationId}`, {
            content,
            clientNonce
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
    }
};
