import { create } from 'zustand';
import { messageService } from './messageService';
import type { Message, RoomType } from './messageService';

interface RoomState {
    messages: Message[];
    cursor: string | null;
    hasMore: boolean;
    isLoading: boolean;
}

interface MessageState {
    rooms: Record<string, RoomState>;
    activeRoom: string | null;

    setActiveRoom: (roomId: string) => void;
    fetchMessages: (roomType: RoomType, roomId: string, cursor?: string | null) => Promise<void>;
    addOptimisticMessage: (roomId: string, message: Message) => void;
    reconcileMessage: (roomId: string, tempId: string, serverMessage: Message) => void;
    markMessageFailed: (roomId: string, tempId: string) => void;
    receiveMessage: (roomId: string, message: Message) => void;
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

    setActiveRoom: (roomId) => set({ activeRoom: roomId }),

    fetchMessages: async (roomType, roomId, cursor = null) => {
        const roomKey = roomId;
        const room = get().rooms[roomKey] || initialRoomState;

        if (room.isLoading || (!cursor && room.messages.length > 0)) return;

        set((state) => ({
            rooms: {
                ...state.rooms,
                [roomKey]: { ...room, isLoading: true },
            },
        }));

        try {
            const { messages, nextCursor } = await messageService.getMessages(roomType, roomId, cursor);

            set((state) => {
                const currentRoom = state.rooms[roomKey] || initialRoomState;

                if (!cursor) {
                    // Reconnect Gap Healing (Cursor = null means we requested the latest page)
                    // We must selectively MERGE these into our existing array, in case we just reconnected
                    // and missed 3 messages at the end. We do NOT want to overwrite or duplicate.
                    const existingIds = new Set(currentRoom.messages.map(m => m.id));
                    const newUniqueMessages = messages.filter(m => m.id && !existingIds.has(m.id));

                    // If we have local messages, we append the missed ones to the bottom
                    const mergedMessages = currentRoom.messages.length > 0
                        ? [...currentRoom.messages, ...newUniqueMessages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                        : messages;

                    return {
                        rooms: {
                            ...state.rooms,
                            [roomKey]: {
                                ...currentRoom,
                                messages: mergedMessages,
                                cursor: currentRoom.cursor || nextCursor, // Preserve older pagination cursor if it existed
                                hasMore: currentRoom.messages.length > 0 ? currentRoom.hasMore : !!nextCursor,
                                isLoading: false,
                            },
                        },
                    };
                }

                // Normal pagination (Cursor provided means we are scrolling UP for older messages)
                // We prepend them.
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

    addOptimisticMessage: (roomId, message) => {
        set((state) => {
            const room = state.rooms[roomId] || initialRoomState;
            return {
                rooms: {
                    ...state.rooms,
                    [roomId]: {
                        ...room,
                        messages: [...room.messages, message], // append to bottom
                    },
                },
            };
        });
    },

    reconcileMessage: (roomId, tempId, serverMessage) => {
        set((state) => {
            const room = state.rooms[roomId];
            if (!room) return state;

            return {
                rooms: {
                    ...state.rooms,
                    [roomId]: {
                        ...room,
                        messages: room.messages.map((m) =>
                            m.tempId === tempId ? serverMessage : m
                        ),
                    },
                },
            };
        });
    },

    markMessageFailed: (roomId, tempId) => {
        set((state) => {
            const room = state.rooms[roomId];
            if (!room) return state;

            return {
                rooms: {
                    ...state.rooms,
                    [roomId]: {
                        ...room,
                        messages: room.messages.map((m) =>
                            m.tempId === tempId ? { ...m, status: 'failed' } : m
                        ),
                    },
                },
            };
        });
    },

    receiveMessage: (roomId, message) => {
        set((state) => {
            const room = state.rooms[roomId] || initialRoomState;

            // 1. Precise Optimistic Race Reconciliation (Surgical Fix)
            if (message.clientNonce) {
                const raceIndex = room.messages.findIndex(m => m.clientNonce === message.clientNonce && m.status === 'sending');
                if (raceIndex !== -1) {
                    const newMessages = [...room.messages];
                    newMessages[raceIndex] = message; // Replace perfectly without append
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: { ...room, messages: newMessages }
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
                            [roomId]: { ...room, messages: newMessages }
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
                    [roomId]: {
                        ...room,
                        messages: [...room.messages, message],
                    },
                },
            };
        });
    },

    reset: () => {
        set({ rooms: {}, activeRoom: null });
    },
}));
