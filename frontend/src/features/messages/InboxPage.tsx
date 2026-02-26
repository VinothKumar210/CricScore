// =============================================================================
// Inbox Page — Conversation list with last message + unread counts
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationPreview {
    id: string;
    type: 'DIRECT' | 'TEAM' | 'MATCH' | 'GROUP';
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
// Inbox Page Component
// ---------------------------------------------------------------------------

export const InboxPage = () => {
    const [conversations, setConversations] = useState<ConversationPreview[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [totalUnread, setTotalUnread] = useState(0);
    const navigate = useNavigate();

    const fetchInbox = useCallback(async (cursor?: string) => {
        try {
            const isLoadMore = !!cursor;
            if (isLoadMore) setLoadingMore(true); else setLoading(true);

            const params: Record<string, string> = {};
            if (cursor) params.cursor = cursor;

            const { data } = await api.get('/api/inbox', { params } as any);
            const result = data.data || data;

            if (isLoadMore) {
                setConversations(prev => [...prev, ...result.conversations]);
            } else {
                setConversations(result.conversations);
            }
            setNextCursor(result.nextCursor);
        } catch {
            // silent fail
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const { data } = await api.get('/api/inbox/unread-count');
            setTotalUnread((data.data || data).count || 0);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchInbox();
        fetchUnreadCount();
    }, [fetchInbox, fetchUnreadCount]);

    const handleConversationClick = async (conv: ConversationPreview) => {
        // Mark as read optimistically
        if (conv.unreadCount > 0) {
            setConversations(prev =>
                prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c),
            );
            setTotalUnread(prev => Math.max(0, prev - conv.unreadCount));
            api.patch(`/api/inbox/${conv.id}/read`).catch(() => { /* rollback if needed */ });
        }

        // Navigate to message room
        const roomType = conv.type.toLowerCase();
        const roomId = conv.entityId || conv.id;
        navigate(`/messages/${roomType}/${roomId}`);
    };

    if (loading) return <InboxSkeleton />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0 0 16px 0',
            }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Messages</h1>
                    {totalUnread > 0 && (
                        <p style={{ fontSize: 12, color: 'var(--accent, #D7A65B)', marginTop: 2, fontWeight: 600 }}>
                            {totalUnread} unread
                        </p>
                    )}
                </div>
            </div>

            {/* Conversation List */}
            {conversations.length === 0 ? (
                <EmptyState />
            ) : (
                <div style={{
                    background: 'var(--bg-card, #191B20)',
                    border: '1px solid var(--border, #2A2D35)',
                    borderRadius: 14, overflow: 'hidden',
                }}>
                    {conversations.map((conv, idx) => (
                        <ConversationRow
                            key={conv.id}
                            conversation={conv}
                            onClick={() => handleConversationClick(conv)}
                            isLast={idx === conversations.length - 1}
                        />
                    ))}
                </div>
            )}

            {/* Load More */}
            {nextCursor && (
                <button
                    onClick={() => fetchInbox(nextCursor)}
                    disabled={loadingMore}
                    style={{
                        marginTop: 16, padding: '12px', borderRadius: 10,
                        background: 'var(--bg-surface, #24262D)',
                        border: '1px solid var(--border, #2A2D35)',
                        color: 'var(--text-secondary, #888)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                >
                    {loadingMore ? 'Loading...' : 'Load More'}
                </button>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Conversation Row Component
// ---------------------------------------------------------------------------

const ConversationRow = ({
    conversation: conv,
    onClick,
    isLast,
}: {
    conversation: ConversationPreview;
    onClick: () => void;
    isLast: boolean;
}) => {
    const timeLabel = conv.lastMessage
        ? formatRelativeTime(conv.lastMessage.createdAt)
        : formatRelativeTime(conv.updatedAt);

    const typeIcon = getTypeIcon(conv.type);

    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', cursor: 'pointer',
                borderBottom: isLast ? 'none' : '1px solid var(--border, #2A2D35)',
                background: conv.unreadCount > 0 ? 'rgba(215,166,91,0.04)' : 'transparent',
                transition: 'background 0.15s',
            }}
        >
            {/* Avatar / Icon */}
            <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--bg-surface, #24262D)',
                border: '1px solid var(--border, #2A2D35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0, position: 'relative',
            }}>
                {conv.lastMessage?.senderAvatar ? (
                    <img
                        src={conv.lastMessage.senderAvatar}
                        alt=""
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                    />
                ) : (
                    <span>{typeIcon}</span>
                )}
                {conv.unreadCount > 0 && (
                    <div style={{
                        position: 'absolute', top: -2, right: -2,
                        width: 18, height: 18, borderRadius: '50%',
                        background: 'var(--accent, #D7A65B)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800, color: '#0a0e1a',
                    }}>
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </div>
                )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{
                        fontSize: 14, fontWeight: conv.unreadCount > 0 ? 700 : 500,
                        color: 'var(--text-primary, #EBECEF)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: '65%',
                    }}>
                        {conv.name || conv.type}
                    </span>
                    <span style={{
                        fontSize: 11, color: conv.unreadCount > 0
                            ? 'var(--accent, #D7A65B)'
                            : 'var(--text-secondary, #888)',
                        fontWeight: conv.unreadCount > 0 ? 600 : 400,
                        flexShrink: 0,
                    }}>
                        {timeLabel}
                    </span>
                </div>

                {conv.lastMessage && (
                    <p style={{
                        fontSize: 12, margin: '3px 0 0',
                        color: conv.unreadCount > 0
                            ? 'var(--text-primary, #EBECEF)'
                            : 'var(--text-secondary, #888)',
                        fontWeight: conv.unreadCount > 0 ? 500 : 400,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        <span style={{ fontWeight: 500 }}>{conv.lastMessage.senderName}:</span>{' '}
                        {conv.lastMessage.content}
                    </p>
                )}

                {conv.isMuted && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted, #555)' }}>🔇 Muted</span>
                )}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTypeIcon(type: string): string {
    switch (type) {
        case 'TEAM': return '🏏';
        case 'MATCH': return '⚔️';
        case 'DIRECT': return '💬';
        case 'GROUP': return '👥';
        default: return '💬';
    }
}

function formatRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const EmptyState = () => (
    <div style={{
        textAlign: 'center', padding: '60px 20px',
        color: 'var(--text-secondary, #888)',
    }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary, #EBECEF)' }}>
            No conversations yet
        </h3>
        <p style={{ fontSize: 13 }}>
            Messages from your teams and matches will appear here
        </p>
    </div>
);

const InboxSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '20px 0' }}>
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
            }}>
                <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: '#191B20',
                }} />
                <div style={{ flex: 1 }}>
                    <div style={{
                        height: 14, width: `${50 + i * 8}%`, borderRadius: 4,
                        background: '#191B20', marginBottom: 6,
                    }} />
                    <div style={{
                        height: 10, width: '80%', borderRadius: 4,
                        background: '#191B20', opacity: 0.6,
                    }} />
                </div>
            </div>
        ))}
    </div>
);
