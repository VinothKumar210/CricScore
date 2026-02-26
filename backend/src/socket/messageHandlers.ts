import { Server, Socket } from 'socket.io';
import { messageService } from '../services/messageService.js';
import { redisClient } from '../services/presenceService.js';

const TYPING_TTL_SECONDS = 5;
const TYPING_PREFIX = 'typing:room:';

export const registerMessageHandlers = (io: Server, socket: Socket, user: any) => {

    // RULE 7: Socket Join Protocol
    socket.on('room:join', async (payload) => {
        try {
            const { roomType, roomId } = payload;

            if (!roomType || !roomId) {
                return socket.emit('error', { message: 'roomType and roomId required' });
            }

            // Server statically validates membership directly against Database
            const isMember = await messageService.validateRoomMembership(user.id, roomType, roomId);

            if (isMember) {
                const roomKey = `${roomType}:${roomId}`;
                await socket.join(roomKey);
                socket.emit('room:joined', { roomType, roomId });
            } else {
                // Reject unauthorized bounds
                socket.emit('error', { message: 'Not authorized to join this room' });
            }
        } catch (error) {
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    // 2. Typing Indicators
    socket.on('typing:start', async (payload) => {
        try {
            const { roomType, roomId } = payload;
            const roomKey = `${roomType}:${roomId}`;

            await redisClient.setex(
                `${TYPING_PREFIX}${roomKey}:${user.id}`,
                TYPING_TTL_SECONDS,
                '1'
            );

            socket.to(roomKey).emit('typing:start', {
                roomType,
                roomId,
                userId: user.id,
                name: user.fullName || user.username
            });
        } catch (e) {
            // Fail open
        }
    });

    socket.on('typing:stop', async (payload) => {
        try {
            const { roomType, roomId } = payload;
            const roomKey = `${roomType}:${roomId}`;

            await redisClient.del(`${TYPING_PREFIX}${roomKey}:${user.id}`);

            socket.to(roomKey).emit('typing:stop', {
                roomType,
                roomId,
                userId: user.id
            });
        } catch (e) {
            // Fail open
        }
    });

};
