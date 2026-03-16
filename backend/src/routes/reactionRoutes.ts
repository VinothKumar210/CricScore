// =============================================================================
// Reaction Routes — Message Reactions
// =============================================================================
//
// POST   /api/messages/:conversationId/:messageId/react → Add/toggle reaction
// DELETE /api/messages/:conversationId/:messageId/react → Remove reaction
//
// =============================================================================

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { prisma } from '../utils/db.js';
const db = prisma as any;
import { sendSuccess, sendError } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { io } from '../socket/index.js';

const router = Router({ mergeParams: true });

// ---------------------------------------------------------------------------
// Helper: Validate Membership
// ---------------------------------------------------------------------------
async function validateMembership(userId: string, conversationId: string): Promise<boolean> {
    const isMember = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
    });
    return !!isMember;
}

// ---------------------------------------------------------------------------
// POST /api/messages/:conversationId/:messageId/react — Add/Toggle Reaction
// ---------------------------------------------------------------------------
router.post('/react', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new AppError('UNAUTHORIZED');

        const conversationId = req.params.conversationId as string;
        const messageId = req.params.messageId as string;
        const { emoji } = req.body;

        if (!emoji) {
            return sendError(res, 'Emoji is required', 400, 'BAD_REQUEST');
        }

        const isMember = await validateMembership(userId, conversationId);
        if (!isMember) {
            return sendError(res, 'Not authorized for this conversation', 403, 'FORBIDDEN');
        }

        const message = await prisma.message.findUnique({
            where: { id: messageId },
        });

        if (!message || message.conversationId !== conversationId) {
            return sendError(res, 'Message not found', 404, 'NOT_FOUND');
        }

        // Upsert reaction (toggle or update existing)
        const reaction = await db.messageReaction.upsert({
            where: {
                messageId_userId_emoji: {
                    messageId,
                    userId,
                    emoji,
                },
            },
            update: { createdAt: new Date() },
            create: {
                messageId,
                userId,
                emoji,
            },
        });

        // Broadcast to conversation room
        io.of('/messages').to(`conversation:${conversationId}`).emit('message:reaction', {
            messageId,
            userId,
            emoji: reaction.emoji,
            action: 'add',
            createdAt: reaction.createdAt,
        });

        return sendSuccess(res, reaction, 201);
    } catch (err: any) {
        if (err.code === 'P2002') {
            // Handle race condition if upsert fails
            return sendError(res, 'Reaction already exists', 400, 'BAD_REQUEST');
        }
        next(err);
    }
});

// ---------------------------------------------------------------------------
// DELETE /api/messages/:conversationId/:messageId/react — Remove Reaction
// ---------------------------------------------------------------------------
router.delete('/react', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new AppError('UNAUTHORIZED');

        const conversationId = req.params.conversationId as string;
        const messageId = req.params.messageId as string;
        const targetEmoji = (req.query.emoji || req.body.emoji) as string | undefined;

        if (!targetEmoji) {
            return sendError(res, 'Emoji is required', 400, 'BAD_REQUEST');
        }

        const isMember = await validateMembership(userId, conversationId);
        if (!isMember) {
            return sendError(res, 'Not authorized for this conversation', 403, 'FORBIDDEN');
        }

        try {
            await db.messageReaction.delete({
                where: {
                    messageId_userId_emoji: {
                        messageId,
                        userId,
                        emoji: targetEmoji,
                    },
                },
            });

            // Broadcast to conversation room
            io.of('/messages').to(`conversation:${conversationId}`).emit('message:reaction', {
                messageId,
                userId,
                emoji: targetEmoji,
                action: 'remove',
            });

            return sendSuccess(res, { success: true });
        } catch (e: any) {
            if (e.code === 'P2025') {
                // Record to delete does not exist. That's fine.
                return sendSuccess(res, { success: true });
            }
            throw e;
        }
    } catch (err) {
        next(err);
    }
});

export default router;
