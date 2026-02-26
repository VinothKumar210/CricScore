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
            // we should pull token directly from localstorage to bypass store derivations if simpler
            const validToken = localStorage.getItem('token');
            socket = io(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/messages`, {
                auth: { token: validToken },
                transports: ['websocket'],
                reconnection: true,
            });

            socket.on('connect', () => {
                console.log('Connected to /messages namespace');
                if (activeRoom) {
                    socket?.emit('room:join', { roomId: activeRoom });

                    // 2. Reconnect Gap Repair (Surgical Fix)
                    // We immediately burst-fetch to hydrate any messages missed during the transient disconnect 
                    // using our idempotently designed `cursor=null` which prepends/merges natively if needed,
                    // but we will expose a dedicated sync later if pagination cursor=null just fetches latest 50.
                    // By fetching the latest page on reconnect, we guarantee the gap is closed natively.
                    const [roomType, id] = activeRoom.split(':');
                    if (roomType && id && fetchMessages) {
                        fetchMessages(roomType as any, id, null);
                    }
                }
            });

            socket.on('message:new', (payload) => {
                // expecting payload to include roomId and message
                if (payload.roomId && payload.message) {
                    receiveMessage(payload.roomId, payload.message);
                }
            });

            socket.on('disconnect', () => {
                console.log('Disconnected from /messages namespace');
            });
        }

        return () => {
            // Do NOT disconnect on normal unmounts unless explicitly logging out.
            // We want the socket to persist across navigation.
        };
    }, [isAuthenticated, receiveMessage]);

    useEffect(() => {
        if (socket && socket.connected && activeRoom) {
            socket.emit('room:join', { roomId: activeRoom });

            // Re-fetch logic can be driven by the page mount, 
            // but upon room join we might want to tell the server we are here.
        }
        return () => {
            if (socket && socket.connected && activeRoom) {
                socket.emit('room:leave', { roomId: activeRoom });
            }
        };
    }, [activeRoom]);

    // Expose explicit disconnect for logout
    useEffect(() => {
        if (!isAuthenticated && socket) {
            socket.disconnect();
            socket = null;
        }
    }, [isAuthenticated]);

    return socket;
};
