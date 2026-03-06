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
                        include: { user: { select: { id: true, fullName: true, profilePictureUrl: true } } }
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        include: {
                            sender: { select: { id: true, fullName: true, profilePictureUrl: true } }
                        }
                    }
                },
            },
        },
        orderBy: { conversation: { lastMessageAt: 'desc' } }, // Sort globally via DB now
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take: limit + 1, // fetch one extra to detect next page
    });

    const hasMore = memberships.length > limit;
    const page = hasMore ? memberships.slice(0, limit) : memberships;

    // 2. Map to previews and calculate unread counts (which require counted queries)
    const conversations: ConversationPreview[] = await Promise.all(
        page.map(async (membership: any) => {
            const conv = membership.conversation;
            const msg = conv.messages[0];

            let lastMessage: ConversationPreview['lastMessage'] = null;
            if (msg) {
                lastMessage = {
                    id: msg.id,
                    content: truncate(msg.content, 80),
                    senderId: msg.senderId,
                    senderName: msg.sender?.fullName || 'Unknown',
                    senderAvatar: msg.sender?.profilePictureUrl || null,
                    createdAt: msg.createdAt.toISOString(),
                };
            }

            // Unread count
            let unreadCount = 0;
            if (membership.lastReadMessageId) {
                const lastRead = await prisma.message.findUnique({
                    where: { id: membership.lastReadMessageId },
                    select: { createdAt: true },
                });
                if (lastRead) {
                    unreadCount = await prisma.message.count({
                        where: {
                            conversationId: conv.id,
                            createdAt: { gt: lastRead.createdAt },
                        },
                    });
                }
            } else {
                // Never read — all messages are unread
                unreadCount = await prisma.message.count({
                    where: { conversationId: conv.id },
                });
            }

            // Determine display name (e.g., for DIRECT chats, show the other user's name)
            let displayName = conv.name;
            if (conv.type === 'DIRECT') {
                const otherMember = conv.members.find((m: any) => m.userId !== userId);
                if (otherMember) {
                    displayName = otherMember.user.fullName;
                }
            }

            return {
                id: conv.id,
                type: conv.type,
                name: displayName,
                entityId: conv.entityId,
                isArchived: conv.isArchived,
                isMuted: membership.mutedUntil ? new Date(membership.mutedUntil) > new Date() : false,
                unreadCount,
                lastMessage,
                memberCount: conv.members.length,
                updatedAt: conv.updatedAt.toISOString(),
            };
        }),
    );

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
    // Find the latest message directly by conversationId
    const latestMessage = await prisma.message.findFirst({
        where: { conversationId },
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

function truncate(str: string, max: number): string {
    if (str.length <= max) return str;
    return str.slice(0, max - 1) + '…';
}
