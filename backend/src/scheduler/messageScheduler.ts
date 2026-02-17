import { prisma } from '../utils/db.js';
import { io } from '../socket/index.js'; // Assuming io is exported from socket/index.ts

const BATCH_SIZE = 20;

export const messageScheduler = {
    start: () => {
        console.log('📅 Message Scheduler started (10s interval)');
        setInterval(async () => {
            await messageScheduler.processScheduledMessages();
        }, 10000); // 10 seconds
    },

    processScheduledMessages: async () => {
        try {
            const now = new Date();

            // 1. Fetch Due Messages
            // Using the specialized index [scheduledAt, sentAt]
            const dueMessages = await prisma.message.findMany({
                where: {
                    scheduledAt: { lte: now },
                    sentAt: null
                },
                take: BATCH_SIZE
            });

            if (dueMessages.length === 0) return;

            console.log(`🚀 Delivering ${dueMessages.length} scheduled messages...`);

            // 2. Process Each Message Transactionally
            for (const msg of dueMessages) {
                try {
                    await prisma.$transaction(async (tx: any) => {
                        // Double-check lock (skip if already sent by another racer)
                        const current = await tx.message.findUnique({
                            where: { id: msg.id }
                        });

                        if (current.sentAt) return; // Already processed

                        // Mark as Sent
                        const updatedMsg = await tx.message.update({
                            where: { id: msg.id },
                            data: { sentAt: new Date() },
                            include: {
                                sender: { select: { id: true, fullName: true, profilePictureUrl: true } }
                            }
                        });

                        // Broadcast via Socket.IO
                        // Need conversation room ID format
                        io.to(`conversation:${msg.conversationId}`).emit('message:new', updatedMsg);
                    });
                } catch (err) {
                    console.error(`❌ Failed to deliver scheduled message ${msg.id}:`, err);
                }
            }
        } catch (error) {
            console.error('❌ Scheduler Error:', error);
        }
    }
};
