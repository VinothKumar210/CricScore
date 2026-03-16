import { create } from 'zustand';
import { messageService } from './messageService';
import type { Message } from './messageService';

interface RoomState {
    messages: Message[];
    cursor: string | null;
    hasMore: boolean;
    isLoading: boolean;
}

interface MessageState {
    rooms: Record<string, RoomState>;
    activeRoom: string | null;
    unreadCounts: Record<string, number>;
    totalUnread: number;

    setActiveRoom: (conversationId: string) => void;
    fetchMessages: (conversationId: string, cursor?: string | null) => Promise<void>;
    addOptimisticMessage: (conversationId: string, message: Message) => void;
    reconcileMessage: (conversationId: string, tempId: string, serverMessage: Message) => void;
    markMessageFailed: (conversationId: string, tempId: string) => void;
    receiveMessage: (conversationId: string, message: Message) => void;
    fetchUnreadCounts: () => Promise<void>;
    markConversationRead: (conversationId: string) => Promise<void>;
    handleInboxUpdate: (payload: { conversationId: string; lastMessage: any }) => void;
    handleReactionUpdate: (conversationId: string, payload: { messageId: string, userId: string, emoji: string, action: 'add' | 'remove', createdAt?: string }) => void;
    replyingToMessage: Message | null;
    setReplyingTo: (message: Message | null) => void;
    clearReply: () => void;
    reset: () => void;
}

const initialRoomState: RoomState = {
    messages: [],
    cursor: null,
    hasMore: true,
    isLoading: false,
};

export const useMessageStore = create<MessageState>((set, get) => ({
    rooms: {},
    activeRoom: null,
    unreadCounts: {},
    totalUnread: 0,
    replyingToMessage: null,

    setReplyingTo: (message) => set({ replyingToMessage: message }),
    clearReply: () => set({ replyingToMessage: null }),

    setActiveRoom: (conversationId) => set({ activeRoom: conversationId }),

    fetchMessages: async (conversationId, cursor = null) => {
        const roomKey = conversationId;
        const room = get().rooms[roomKey] || initialRoomState;

        if (room.isLoading || (!cursor && room.messages.length > 0)) return;

        set((state) => ({
            rooms: {
                ...state.rooms,
                [roomKey]: { ...room, isLoading: true },
            },
        }));

        try {
            const { messages, nextCursor } = await messageService.getMessages(conversationId, cursor);

            set((state) => {
                const currentRoom = state.rooms[roomKey] || initialRoomState;

                if (!cursor) {
                    // Reconnect Gap Healing
                    const existingIds = new Set(currentRoom.messages.map(m => m.id));
                    const newUniqueMessages = messages.filter(m => m.id && !existingIds.has(m.id));

                    const mergedMessages = currentRoom.messages.length > 0
                        ? [...currentRoom.messages, ...newUniqueMessages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                        : messages;

                    return {
                        rooms: {
                            ...state.rooms,
                            [roomKey]: {
                                ...currentRoom,
                                messages: mergedMessages,
                                cursor: currentRoom.cursor || nextCursor,
                                hasMore: currentRoom.messages.length > 0 ? currentRoom.hasMore : !!nextCursor,
                                isLoading: false,
                            },
                        },
                    };
                }

                // Normal pagination (Cursor provided means we are scrolling UP for older messages)
                const newMessages = [...messages, ...currentRoom.messages];

                return {
                    rooms: {
                        ...state.rooms,
                        [roomKey]: {
                            ...currentRoom,
                            messages: newMessages,
                            cursor: nextCursor,
                            hasMore: !!nextCursor,
                            isLoading: false,
                        },
                    },
                };
            });
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            set((state) => ({
                rooms: {
                    ...state.rooms,
                    [roomKey]: { ...(state.rooms[roomKey] || initialRoomState), isLoading: false },
                },
            }));
        }
    },

    addOptimisticMessage: (conversationId, message) => {
        set((state) => {
            const room = state.rooms[conversationId] || initialRoomState;
            return {
                rooms: {
                    ...state.rooms,
                    [conversationId]: {
                        ...room,
                        messages: [...room.messages, message], // append to bottom
                    },
                },
            };
        });
    },

    reconcileMessage: (conversationId, tempId, serverMessage) => {
        set((state) => {
            const room = state.rooms[conversationId];
            if (!room) return state;

            return {
                rooms: {
                    ...state.rooms,
                    [conversationId]: {
                        ...room,
                        messages: room.messages.map((m) =>
                            m.tempId === tempId ? serverMessage : m
                        ),
                    },
                },
            };
        });
    },

    markMessageFailed: (conversationId, tempId) => {
        set((state) => {
            const room = state.rooms[conversationId];
            if (!room) return state;

            return {
                rooms: {
                    ...state.rooms,
                    [conversationId]: {
                        ...room,
                        messages: room.messages.map((m) =>
                            m.tempId === tempId ? { ...m, status: 'failed' } : m
                        ),
                    },
                },
            };
        });
    },

    receiveMessage: (conversationId, message) => {
        set((state) => {
            const room = state.rooms[conversationId] || initialRoomState;

            // 1. Precise Optimistic Race Reconciliation
            if (message.clientNonce) {
                const raceIndex = room.messages.findIndex(m => m.clientNonce === message.clientNonce && m.status === 'sending');
                if (raceIndex !== -1) {
                    const newMessages = [...room.messages];
                    newMessages[raceIndex] = message; // Replace perfectly without append
                    return {
                        rooms: {
                            ...state.rooms,
                            [conversationId]: { ...room, messages: newMessages }
                        }
                    };
                }
            } else {
                // Fallback heuristic if backend fails to bounce the nonce
                const heuristicIndex = room.messages.findIndex(m =>
                    m.status === 'sending' &&
                    m.senderId === message.senderId &&
                    m.content === message.content &&
                    Math.abs(new Date(m.createdAt || Date.now()).getTime() - new Date(message.createdAt).getTime()) < 2000
                );

                if (heuristicIndex !== -1) {
                    const newMessages = [...room.messages];
                    newMessages[heuristicIndex] = message; // Replace heuristically
                    return {
                        rooms: {
                            ...state.rooms,
                            [conversationId]: { ...room, messages: newMessages }
                        }
                    };
                }
            }

            // 2. Strict ID Deduplication
            if (room.messages.some((m) => m.id === message.id)) {
                return state;
            }

            // 3. Normal Append
            return {
                rooms: {
                    ...state.rooms,
                    [conversationId]: {
                        ...room,
                        messages: [...room.messages, message],
                    },
                },
            };
        });
    },

    reset: () => {
        set({ rooms: {}, activeRoom: null, unreadCounts: {}, totalUnread: 0 });
    },

    fetchUnreadCounts: async () => {
        try {
            const { total, perConversation } = await messageService.getUnreadCounts();
            set({ totalUnread: total, unreadCounts: perConversation });
        } catch (error) {
            console.error('Failed to fetch unread counts:', error);
        }
    },

    markConversationRead: async (conversationId: string) => {
        try {
            await messageService.markAsRead(conversationId);
            set(state => {
                const newCounts = { ...state.unreadCounts };
                const removedCount = newCounts[conversationId] || 0;
                delete newCounts[conversationId];
                return {
                    unreadCounts: newCounts,
                    totalUnread: Math.max(0, state.totalUnread - removedCount)
                };
            });
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    },

    handleInboxUpdate: (payload: { conversationId: string; lastMessage: any }) => {
        const { activeRoom } = get();
        // Don't increment unread if we're currently viewing this conversation
        if (activeRoom === payload.conversationId) return;

        set(state => {
            const currentCount = state.unreadCounts[payload.conversationId] || 0;
            return {
                unreadCounts: {
                    ...state.unreadCounts,
                    [payload.conversationId]: currentCount + 1
                },
                totalUnread: state.totalUnread + 1
            };
        });
    },

    handleReactionUpdate: (conversationId, payload) => {
        set(state => {
            const room = state.rooms[conversationId];
            if (!room) return state;

            const messageIndex = room.messages.findIndex(m => m.id === payload.messageId);
            if (messageIndex === -1) return state;

            const message = room.messages[messageIndex];
            const currentReactions = message.reactions || [];

            let newReactions = [...currentReactions];
            if (payload.action === 'add') {
                if (!newReactions.some(r => r.emoji === payload.emoji && r.userId === payload.userId)) {
                    newReactions.push({
                        messageId: payload.messageId,
                        userId: payload.userId,
                        emoji: payload.emoji,
                        createdAt: payload.createdAt || new Date().toISOString()
                    });
                }
            } else if (payload.action === 'remove') {
                newReactions = newReactions.filter(r => !(r.emoji === payload.emoji && r.userId === payload.userId));
            }

            const newMessages = [...room.messages];
            newMessages[messageIndex] = { ...message, reactions: newReactions };

            return {
                rooms: {
                    ...state.rooms,
                    [conversationId]: {
                        ...room,
                        messages: newMessages
                    }
                }
            };
        });
    },
}));
