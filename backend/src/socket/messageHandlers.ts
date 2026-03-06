import { Server, Socket } from 'socket.io';
import { messageService } from '../services/messageService.js';
import { redisClient } from '../services/presenceService.js';

const TYPING_TTL_SECONDS = 5;
const TYPING_PREFIX = 'typing:room:';

export const registerMessageHandlers = (io: Server, socket: Socket, user: any) => {

    // RULE 7: Socket Join Protocol
    socket.on('room:join', async (payload) => {
        try {
            const { conversationId } = payload;

            if (!conversationId) {
                return socket.emit('error', { message: 'conversationId required' });
            }

            // Server statically validates membership directly against Database
            const isMember = await messageService.validateConversationMembership(user.id, conversationId);

            if (isMember) {
                const roomKey = `conversation:${conversationId}`;
                await socket.join(roomKey);
                socket.emit('room:joined', { conversationId });
            } else {
                // Reject unauthorized bounds
                socket.emit('error', { message: 'Not authorized to join this conversation' });
            }
        } catch (error) {
            socket.emit('error', { message: 'Failed to join conversation' });
        }
    });

    // 2. Typing Indicators
    socket.on('typing:start', async (payload) => {
        try {
            const { conversationId } = payload;
            if (!conversationId) return;
            const roomKey = `conversation:${conversationId}`;

            await redisClient.setex(
                `${TYPING_PREFIX}${roomKey}:${user.id}`,
                TYPING_TTL_SECONDS,
                '1'
            );

            socket.to(roomKey).emit('typing:start', {
                conversationId,
                userId: user.id,
                name: user.fullName || user.username
            });
        } catch (e) {
            // Fail open
        }
    });

    socket.on('typing:stop', async (payload) => {
        try {
            const { conversationId } = payload;
            if (!conversationId) return;
            const roomKey = `conversation:${conversationId}`;

            await redisClient.del(`${TYPING_PREFIX}${roomKey}:${user.id}`);

            socket.to(roomKey).emit('typing:stop', {
                conversationId,
                userId: user.id
            });
        } catch (e) {
            // Fail open
        }
    });

};
