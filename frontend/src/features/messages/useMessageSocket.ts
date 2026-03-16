import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuth } from 'firebase/auth';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from './messageStore';

let socket: Socket | null = null;

/** Get the current socket instance for typing emissions */
export const getMessageSocket = (): Socket | null => socket;

/**
 * Get a fresh Firebase ID token (auto-refreshes if expired)
 */
const getFreshToken = async (): Promise<string | null> => {
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return localStorage.getItem('authToken');
        const token = await user.getIdToken(true); // force refresh
        localStorage.setItem('authToken', token);
        return token;
    } catch {
        return localStorage.getItem('authToken');
    }
};

export const useMessageSocket = () => {
    // Use individual selectors to avoid re-rendering on every store change
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);

    const activeRoom = useMessageStore(state => state.activeRoom);
    const receiveMessage = useMessageStore(state => state.receiveMessage);
    const handleInboxUpdate = useMessageStore(state => state.handleInboxUpdate);
    const handleReactionUpdate = useMessageStore(state => state.handleReactionUpdate);
    const addTypingUser = useMessageStore(state => state.addTypingUser);
    const removeTypingUser = useMessageStore(state => state.removeTypingUser);

    // Use refs to hold latest values for socket callbacks without causing effect re-runs
    const activeRoomRef = useRef(activeRoom);
    activeRoomRef.current = activeRoom;
    const receiveMessageRef = useRef(receiveMessage);
    receiveMessageRef.current = receiveMessage;
    const handleInboxUpdateRef = useRef(handleInboxUpdate);
    handleInboxUpdateRef.current = handleInboxUpdate;
    const handleReactionUpdateRef = useRef(handleReactionUpdate);
    handleReactionUpdateRef.current = handleReactionUpdate;
    const addTypingUserRef = useRef(addTypingUser);
    addTypingUserRef.current = addTypingUser;
    const removeTypingUserRef = useRef(removeTypingUser);
    removeTypingUserRef.current = removeTypingUser;

    useEffect(() => {
        if (!isAuthenticated) {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
            return;
        }

        const initSocket = async () => {
            if (socket) return;

            const validToken = await getFreshToken();
            if (!validToken) {
                console.warn('[MessageSocket] No auth token found, skipping connection');
                return;
            }

            socket = io(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/messages`, {
                auth: { token: validToken },
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 2000,
                reconnectionDelayMax: 30000,
            });

            socket.on('connect', () => {
                console.log('[MessageSocket] Connected to /messages namespace');
                const room = activeRoomRef.current;
                if (room) {
                    socket?.emit('room:join', { conversationId: room });
                }
            });

            // Real-time message delivery for the active chat
            socket.on('message:new', (payload) => {
                if (payload.conversationId) {
                    receiveMessageRef.current(payload.conversationId, payload);
                }
            });

            // Real-time inbox updates for ALL conversations (WhatsApp-style)
            socket.on('inbox:update', (payload) => {
                handleInboxUpdateRef.current(payload);
            });

            // Real-time reactions
            socket.on('message:reaction', (payload) => {
                const roomContext = activeRoomRef.current; // Real-time reactions only come to the focused room realistically
                if (roomContext) {
                    handleReactionUpdateRef.current(roomContext, payload);
                }
            });

            socket.on('connect_error', async (err) => {
                console.error('[MessageSocket] Connection error:', err.message);
                // If auth error, try refreshing the token
                if (err.message.includes('Authentication')) {
                    const freshToken = await getFreshToken();
                    if (freshToken && socket) {
                        socket.auth = { token: freshToken };
                    }
                }
            });

            socket.on('disconnect', (reason) => {
                console.log('[MessageSocket] Disconnected:', reason);
            });

            // Typing indicators
            socket.on('typing:start', (payload: { conversationId: string; userId: string; name: string }) => {
                addTypingUserRef.current(payload.conversationId, payload.userId, payload.name);
            });

            socket.on('typing:stop', (payload: { conversationId: string; userId: string }) => {
                removeTypingUserRef.current(payload.conversationId, payload.userId);
            });
        };

        initSocket();

        return () => {
            // Do NOT disconnect on normal unmounts unless explicitly logging out.
        };
    }, [isAuthenticated]);

    // Join the active conversation room
    useEffect(() => {
        if (socket && socket.connected && activeRoom) {
            socket.emit('room:join', { conversationId: activeRoom });
        }
    }, [activeRoom]);

    // Cleanup on logout
    useEffect(() => {
        if (!isAuthenticated && socket) {
            socket.disconnect();
            socket = null;
        }
    }, [isAuthenticated]);

    return socket;
};
