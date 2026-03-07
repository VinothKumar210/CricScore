import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from './messageStore';

let socket: Socket | null = null;

export const useMessageSocket = () => {
    // Use individual selectors to avoid re-rendering on every store change
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);

    const activeRoom = useMessageStore(state => state.activeRoom);
    const receiveMessage = useMessageStore(state => state.receiveMessage);
    const fetchMessages = useMessageStore(state => state.fetchMessages);

    // Use refs to hold latest values for socket callbacks without causing effect re-runs
    const activeRoomRef = useRef(activeRoom);
    activeRoomRef.current = activeRoom;
    const fetchMessagesRef = useRef(fetchMessages);
    fetchMessagesRef.current = fetchMessages;
    const receiveMessageRef = useRef(receiveMessage);
    receiveMessageRef.current = receiveMessage;

    useEffect(() => {
        if (!isAuthenticated) {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
            return;
        }

        if (!socket) {
            const validToken = localStorage.getItem('token');
            socket = io(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/messages`, {
                auth: { token: validToken },
                transports: ['websocket'],
                reconnection: true,
            });

            socket.on('connect', () => {
                console.log('Connected to /messages namespace');
                const room = activeRoomRef.current;
                if (room) {
                    socket?.emit('room:join', { conversationId: room });
                    fetchMessagesRef.current(room, null);
                }
            });

            socket.on('message:new', (payload) => {
                if (payload.conversationId) {
                    receiveMessageRef.current(payload.conversationId, payload);
                }
            });

            socket.on('disconnect', () => {
                console.log('Disconnected from /messages namespace');
            });
        }

        return () => {
            // Do NOT disconnect on normal unmounts unless explicitly logging out.
        };
    }, [isAuthenticated]);

    useEffect(() => {
        if (socket && socket.connected && activeRoom) {
            socket.emit('room:join', { conversationId: activeRoom });
        }
    }, [activeRoom]);

    useEffect(() => {
        if (!isAuthenticated && socket) {
            socket.disconnect();
            socket = null;
        }
    }, [isAuthenticated]);

    return socket;
};
