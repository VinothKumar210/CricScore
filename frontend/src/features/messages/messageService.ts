import { api } from '../../lib/api';

export type RoomType = 'match' | 'team';

export interface Message {
    id: string;
    roomId: string; // match:{id} or team:{id}
    senderId: string;
    content: string;
    clientNonce?: string; // Optimistic Race identifier
    tempId?: string; // Client-only
    status?: 'sending' | 'failed' | 'sent'; // Client-only
    createdAt: string;
    sender: {
        id: string;
        name: string;
        avatarUrl?: string;
    }
}

interface MessagesResponse {
    messages: Message[];
    nextCursor: string | null;
}

export const messageService = {
    getMessages: async (roomType: RoomType, roomId: string, cursor?: string | null): Promise<MessagesResponse> => {
        const { data } = await api.get(`/api/messages/${roomType}/${roomId}`, {
            params: { cursor }
        });
        return data; // Expected { messages: Message[], nextCursor: string | null }
    },

    sendMessage: async (roomType: RoomType, roomId: string, content: string, clientNonce?: string): Promise<Message> => {
        const { data } = await api.post(`/api/messages/${roomType}/${roomId}`, {
            content,
            clientNonce
        });
        return data;
    }
};
