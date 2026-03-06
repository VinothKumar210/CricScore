import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from './messageStore';

let socket: Socket | null = null;

export const useMessageSocket = () => {
    const { isAuthenticated } = useAuthStore(state => ({
        isAuthenticated: state.isAuthenticated
    }));

    const { activeRoom, receiveMessage, fetchMessages } = useMessageStore();

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
                if (activeRoom) {
                    socket?.emit('room:join', { conversationId: activeRoom });

                    // Reconnect Gap Repair. `activeRoom` is directly our `conversationId`
                    if (fetchMessages) {
                        fetchMessages(activeRoom, null);
                    }
                }
            });

            socket.on('message:new', (payload) => {
                // expecting payload to include conversationId and message natively from backend
                // the `saveMessage` natively returns the message object with conversationId intact
                if (payload.conversationId) {
                    receiveMessage(payload.conversationId, payload);
                }
            });

            socket.on('disconnect', () => {
                console.log('Disconnected from /messages namespace');
            });
        }

        return () => {
            // Do NOT disconnect on normal unmounts unless explicitly logging out.
        };
    }, [isAuthenticated, receiveMessage]);

    useEffect(() => {
        if (socket && socket.connected && activeRoom) {
            socket.emit('room:join', { conversationId: activeRoom });
        }
        return () => {
            if (socket && socket.connected && activeRoom) {
                // Not heavily reliant on leave right now since we re-join, but good for cleanliness.
            }
        };
    }, [activeRoom]);

    useEffect(() => {
        if (!isAuthenticated && socket) {
            socket.disconnect();
            socket = null;
        }
    }, [isAuthenticated]);

    return socket;
};
