// =============================================================================
// Inbox Service — Conversation list with last message + unread counts
// =============================================================================

import { prisma } from '../utils/db.js';

const db = prisma as any;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationPreview {
    id: string;
    type: string;        // DIRECT, TEAM, MATCH, GROUP
    name: string | null;
    entityId: string | null;
    isArchived: boolean;
    isMuted: boolean;
    unreadCount: number;
    lastMessage: {
        id: string;
        content: string;
        senderId: string;
        senderName: string;
        senderAvatar: string | null;
        createdAt: string;
    } | null;
    memberCount: number;
    updatedAt: string;
}

// ---------------------------------------------------------------------------
// GET /api/inbox — Paginated conversation list
// ---------------------------------------------------------------------------

export async function getUserInbox(
    userId: string,
    options: { cursor?: string | undefined; limit?: number; archived?: boolean } = {},
): Promise<{ conversations: ConversationPreview[]; nextCursor: string | null }> {
    const { cursor, limit = 20, archived = false } = options;

    // 1. Get all conversation memberships for this user
    const memberships = await db.conversationMember.findMany({
        where: {
            userId,
            conversation: { isArchived: archived },
        },
        include: {
            conversation: {
                include: {
                    members: {
                        select: { userId: true },
                    },
                },
            },
        },
        orderBy: { conversation: { updatedAt: 'desc' } },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take: limit + 1, // fetch one extra to detect next page
    });

    const hasMore = memberships.length > limit;
    const page = hasMore ? memberships.slice(0, limit) : memberships;

    // 2. For each conversation, fetch last message + unread count
    const conversations: ConversationPreview[] = await Promise.all(
        page.map(async (membership: any) => {
            const conv = membership.conversation;
            const roomKey = resolveRoomKey(conv);

            // Last message in this room
            let lastMessage: ConversationPreview['lastMessage'] = null;
            if (roomKey) {
                const msg = await prisma.message.findFirst({
                    where: {
                        roomType: roomKey.roomType as any,
                        roomId: roomKey.roomId,
                    },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        sender: {
                            select: { id: true, fullName: true, profilePictureUrl: true },
                        },
                    },
                });

                if (msg) {
                    lastMessage = {
                        id: msg.id,
                        content: truncate(msg.content, 80),
                        senderId: msg.senderId,
                        senderName: (msg as any).sender?.fullName || 'Unknown',
                        senderAvatar: (msg as any).sender?.profilePictureUrl || null,
                        createdAt: msg.createdAt.toISOString(),
                    };
                }
            }

            // Unread count: messages after lastReadMessageId
            let unreadCount = 0;
            if (roomKey && membership.lastReadMessageId) {
                const lastRead = await prisma.message.findUnique({
                    where: { id: membership.lastReadMessageId },
                    select: { createdAt: true },
                });
                if (lastRead) {
                    unreadCount = await prisma.message.count({
                        where: {
                            roomType: roomKey.roomType as any,
                            roomId: roomKey.roomId,
                            createdAt: { gt: lastRead.createdAt },
                        },
                    });
                }
            } else if (roomKey && !membership.lastReadMessageId) {
                // Never read — all messages are unread
                unreadCount = await prisma.message.count({
                    where: {
                        roomType: roomKey.roomType as any,
                        roomId: roomKey.roomId,
                    },
                });
            }

            return {
                id: conv.id,
                type: conv.type,
                name: conv.name,
                entityId: conv.entityId,
                isArchived: conv.isArchived,
                isMuted: membership.mutedUntil ? new Date(membership.mutedUntil) > new Date() : false,
                unreadCount,
                lastMessage,
                memberCount: conv.members?.length || 0,
                updatedAt: conv.updatedAt.toISOString(),
            };
        }),
    );

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt || a.updatedAt;
        const timeB = b.lastMessage?.createdAt || b.updatedAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    return {
        conversations,
        nextCursor: hasMore ? page[page.length - 1].id : null,
    };
}

// ---------------------------------------------------------------------------
// PATCH /api/inbox/:conversationId/read — Mark conversation as read
// ---------------------------------------------------------------------------

export async function markConversationRead(
    userId: string,
    conversationId: string,
): Promise<void> {
    const roomKey = await getConversationRoomKey(conversationId);
    if (!roomKey) return;

    // Find the latest message in the room
    const latestMessage = await prisma.message.findFirst({
        where: {
            roomType: roomKey.roomType as any,
            roomId: roomKey.roomId,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
    });

    if (latestMessage) {
        await db.conversationMember.updateMany({
            where: {
                conversationId,
                userId,
            },
            data: {
                lastReadMessageId: latestMessage.id,
            },
        });
    }
}

// ---------------------------------------------------------------------------
// GET /api/inbox/unread-count — Total unread badge count
// ---------------------------------------------------------------------------

export async function getTotalUnreadCount(userId: string): Promise<number> {
    const result = await getUserInbox(userId, { limit: 100 });
    return result.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveRoomKey(conv: any): { roomType: string; roomId: string } | null {
    if (!conv) return null;

    if (conv.type === 'TEAM' && conv.entityId) {
        return { roomType: 'TEAM', roomId: conv.entityId };
    }
    if (conv.type === 'MATCH' && conv.entityId) {
        return { roomType: 'MATCH', roomId: conv.entityId };
    }
    // For DIRECT / GROUP, use conversation ID itself
    if (conv.type === 'DIRECT' || conv.type === 'GROUP') {
        return { roomType: conv.type, roomId: conv.id };
    }
    return null;
}

async function getConversationRoomKey(conversationId: string) {
    const conv = await db.conversation.findUnique({
        where: { id: conversationId },
        select: { type: true, entityId: true, id: true },
    });
    return conv ? resolveRoomKey(conv) : null;
}

function truncate(str: string, max: number): string {
    if (str.length <= max) return str;
    return str.slice(0, max - 1) + '…';
}
