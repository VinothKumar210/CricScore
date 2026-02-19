import { io, Socket } from 'socket.io-client';

// Singleton socket instance
let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        // In production, this URL would come from env vars
        const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

        socket = io(SOCKET_URL, {
            autoConnect: false, // We connect manually when needed
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('Socket connected:', socket?.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }
    return socket;
};

export const connectSocket = () => {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
    }
    return s;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null; // Reset singleton on explicit disconnect if strictly needed, or just disconnect
    }
};
