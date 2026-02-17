import { prisma } from '../utils/db.js';
import { redisClient } from './presenceService.js';
import { URL } from 'url';
import path from 'path';

const DEDUP_PREFIX = 'message:dedup:';
const DEDUP_TTL = 600; // 10 minutes

// Validation Constants
const ALLOWED_DOMAINS = ['cloudinary.com', 'res.cloudinary.com', 'firebaseapp.com', 'firebasestorage.googleapis.com'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mp3', '.webm', '.webp', '.pdf'];
const MAX_URL_LENGTH = 500;

export const messageService = {
    /**
     * Validate Media URL for security.
     */
    validateMediaUrl: (url: string) => {
        if (!url) return;

        if (url.length > MAX_URL_LENGTH) {
            throw new Error('Media URL exceeds maximum length of 500 characters');
        }

        try {
            const parsedUrl = new URL(url);

            // Domain Check
            const hostname = parsedUrl.hostname;
            const isAllowedDomain = ALLOWED_DOMAINS.some(d => hostname.endsWith(d));
            if (!isAllowedDomain) {
                throw new Error(`Domain ${hostname} is not allowed for media attachments`);
            }

            // Extension Check (Optimistic - based on path, might query params)
            // We check pathname strictly
            const ext = path.extname(parsedUrl.pathname).toLowerCase();
            if (ext) { // Only valid if extension exists in path. If no extension, we might skip or enforce?
                // User said: Optionally validate file extension. Let's enforce if present.
                if (!ALLOWED_EXTENSIONS.includes(ext)) {
                    throw new Error(`File extension ${ext} is not allowed`);
                }
            } else {
                // Some CDN URLs (like signed ones) might not have extensions cleanly or hide them.
                // We'll allow it if domain matches, per "Do NOT block existing valid URLs".
            }

        } catch (error: any) {
            // Re-throw if it's our error, else wrap
            if (error.message.includes('not allowed') || error.message.includes('maximum length')) {
                throw error;
            }
            throw new Error('Invalid Media URL format');
        }
    },

    /**
     * Save Message with Idempotency Check and Transactional Write.
     */
    saveMessage: async (
        senderId: string,
        conversationId: string,
        content: string,
        clientMessageId: string,
        type: 'TEXT' | 'IMAGE' | 'AUDIO' = 'TEXT',
        mediaUrl?: string
    ) => {
        // 0. Validate Inputs
        if (mediaUrl) {
            messageService.validateMediaUrl(mediaUrl);
        }

        // 1. Check Deduplication
        try {
            const existingId = await redisClient.get(`${DEDUP_PREFIX}${clientMessageId}`);
            if (existingId) {
                return prisma.message.findUnique({
                    where: { id: existingId },
                    include: { sender: { select: { id: true, fullName: true, phoneNumber: true } } }
                });
            }
        } catch (e) {
            console.warn('[MessageService] Redis dedup check failed:', e);
        }

        // 2. Validate Membership
        const member = await prisma.conversationMember.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: senderId
                }
            }
        });

        if (!member) {
            throw new Error('User is not a member of this conversation');
        }

        // 3. Atomic Transaction
        const message = await prisma.$transaction(async (tx: any) => {
            const msg = await tx.message.create({
                data: {
                    conversation: { connect: { id: conversationId } },
                    sender: { connect: { id: senderId } },
                    content,
                    type: type as any,
                    mediaUrl,
                    mentions: []
                } as any,
                include: {
                    sender: { select: { id: true, fullName: true, phoneNumber: true } }
                }
            });

            await tx.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() }
            });

            return msg;
        });

        // 4. Save Deduplication Key
        try {
            await redisClient.setex(`${DEDUP_PREFIX}${clientMessageId}`, DEDUP_TTL, message.id);
        } catch (e) {
            console.warn('[MessageService] Redis dedup save failed:', e);
        }

        return message;
    },

    /**
     * Fetch Conversation History.
     */
    getHistory: async (conversationId: string, limit = 50, beforeId?: string) => {
        return prisma.message.findMany({
            where: {
                conversationId,
                ...(beforeId ? { id: { lt: beforeId } } : {})
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { id: true, fullName: true } }
            }
        });
    },

    /**
     * Search Messages using Optimized MongoDB Text Search.
     */
    searchMessages: async (conversationId: string, query: string) => {
        try {
            // Use findRaw to leverage $text index
            const results = await prisma.message.findRaw({
                filter: {
                    conversationId: { $oid: conversationId },
                    $text: { $search: query }
                },
                options: {
                    limit: 20,
                    sort: { score: { $meta: "textScore" }, createdAt: -1 }
                }
            });

            // Safely cast results to any array
            const rawMessages = Array.isArray(results) ? results : [];

            if (rawMessages.length === 0) return [];

            // Extract IDs safely
            const messageIds: string[] = rawMessages.map((m: any) => {
                if (m._id && typeof m._id === 'object' && '$oid' in m._id) {
                    return m._id.$oid as string;
                }
                return String(m._id);
            });

            // Fetch full objects
            const fullMessages = await prisma.message.findMany({
                where: { id: { in: messageIds } },
                include: { sender: { select: { id: true, fullName: true } } }
            });

            // Map back to preserve order
            const msgsById = new Map(fullMessages.map((m: any) => [m.id, m]));
            return messageIds
                .map((id) => msgsById.get(id))
                .filter((m) => m !== undefined);

        } catch (error) {
            // Fallback
            return prisma.message.findMany({
                where: {
                    conversationId,
                    content: { contains: query, mode: 'insensitive' }
                },
                take: 20,
                orderBy: { createdAt: 'desc' },
                include: { sender: { select: { id: true, fullName: true } } }
            });
        }
    }
};
