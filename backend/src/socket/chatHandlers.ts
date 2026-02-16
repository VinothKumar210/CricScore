import { Server, Socket } from 'socket.io';
import { messageService } from '../services/messageService.js';
import { prisma } from '../utils/db.js';

export const registerChatHandlers = (io: Server, socket: Socket, user: any) => {

    // Join Conversation
    socket.on('join:conversation', async ({ conversationId }) => {
        try {
            // Verify membership
            const member = await prisma.conversationMember.findUnique({
                where: {
                    conversationId_userId: {
                        conversationId,
                        userId: user.id
                    }
                }
            });

            if (member) {
                await socket.join(`conversation:${conversationId}`);
                socket.emit('joined:conversation', { conversationId });
            } else {
                socket.emit('error', { message: 'Not a member' });
            }
        } catch (error) {
            socket.emit('error', { message: 'Failed to join conversation' });
        }
    });

    // Send Message
    socket.on('message:send', async (payload) => {
        const { clientMessageId, conversationId, content, type, mediaUrl } = payload;

        try {
            const message = await messageService.saveMessage(
                user.id,
                conversationId,
                content,
                clientMessageId,
                type || 'TEXT',
                mediaUrl
            );

            // Broadcast to room
            const nsp = socket.nsp;
            nsp.to(`conversation:${conversationId}`).emit('message:new', message);

            // Ack to sender
            socket.emit('message:ack', { clientMessageId, messageId: message?.id, status: 'SENT' });

        } catch (error: any) {
            console.error('Message send error:', error);
            socket.emit('error', {
                clientMessageId,
                message: error.message || 'Failed to send message'
            });
        }
    });

    // Typing Indicators
    socket.on('typing:start', ({ conversationId }) => {
        socket.to(`conversation:${conversationId}`).emit('typing:start', {
            conversationId,
            userId: user.id,
            name: user.fullName
        });
    });

    socket.on('typing:stop', ({ conversationId }) => {
        socket.to(`conversation:${conversationId}`).emit('typing:stop', {
            conversationId,
            userId: user.id
        });
    });
};
