import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Container } from '../../components/ui/Container';
import { MessageSquare, Users, Swords, VolumeX, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ───

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

// ─── Inbox Page ───

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
            // silent
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
        if (conv.unreadCount > 0) {
            setConversations(prev =>
                prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c),
            );
            setTotalUnread(prev => Math.max(0, prev - conv.unreadCount));
            api.patch(`/api/inbox/${conv.id}/read`).catch(() => { });
        }
        const roomType = conv.type.toLowerCase();
        const roomId = conv.entityId || conv.id;
        navigate(`/messages/${roomType}/${roomId}`);
    };

    if (loading) return <InboxSkeleton />;

    return (
        <Container className="py-6 pb-24 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-primary" />
                        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
                    </div>
                    {totalUnread > 0 && (
                        <p className="text-xs text-primary font-semibold mt-0.5 pl-8">
                            {totalUnread} unread
                        </p>
                    )}
                </div>
            </div>

            {/* List */}
            {conversations.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
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
                    className="w-full py-3 rounded-xl bg-secondary border border-border text-sm font-medium text-muted-foreground hover:bg-card transition-colors flex items-center justify-center gap-2"
                >
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {loadingMore ? 'Loading...' : 'Load More'}
                </button>
            )}
        </Container>
    );
};

// ─── Conversation Row ───

const TYPE_ICONS: Record<string, React.ReactNode> = {
    TEAM: <Users className="w-5 h-5 text-primary" />,
    MATCH: <Swords className="w-5 h-5 text-amber-400" />,
    DIRECT: <MessageSquare className="w-5 h-5 text-emerald-400" />,
    GROUP: <Users className="w-5 h-5 text-purple-400" />,
};

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

    return (
        <div
            onClick={onClick}
            className={clsx(
                "flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-secondary/50 transition-colors",
                !isLast && "border-b border-border",
                conv.unreadCount > 0 && "bg-primary/5"
            )}
        >
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 relative">
                {conv.lastMessage?.senderAvatar ? (
                    <img src={conv.lastMessage.senderAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                    TYPE_ICONS[conv.type] || <MessageSquare className="w-5 h-5 text-muted-foreground" />
                )}
                {conv.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary-foreground">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                    <span className={clsx(
                        "text-sm truncate max-w-[65%]",
                        conv.unreadCount > 0 ? "font-bold text-foreground" : "font-medium text-foreground"
                    )}>
                        {conv.name || conv.type}
                    </span>
                    <span className={clsx(
                        "text-[10px] shrink-0",
                        conv.unreadCount > 0 ? "text-primary font-semibold" : "text-muted-foreground"
                    )}>
                        {timeLabel}
                    </span>
                </div>

                {conv.lastMessage && (
                    <p className={clsx(
                        "text-xs mt-0.5 truncate",
                        conv.unreadCount > 0 ? "text-foreground/80" : "text-muted-foreground"
                    )}>
                        <span className="font-medium">{conv.lastMessage.senderName}:</span>{' '}
                        {conv.lastMessage.content}
                    </p>
                )}

                {conv.isMuted && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                        <VolumeX className="w-3 h-3" /> Muted
                    </span>
                )}
            </div>
        </div>
    );
};

// ─── Helpers ───

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

// ─── Sub-components ───

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-9 h-9 text-primary" />
        </div>
        <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">No Conversations</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Messages from your teams and matches will appear here
            </p>
        </div>
    </div>
);

const InboxSkeleton = () => (
    <Container className="py-6 space-y-4">
        <div className="h-8 w-32 bg-secondary rounded-lg animate-pulse" />
        <div className="bg-card rounded-xl border border-border overflow-hidden">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-b-0">
                    <div className="w-11 h-11 rounded-full bg-secondary animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-secondary rounded-lg animate-pulse" style={{ width: `${50 + i * 8}%` }} />
                        <div className="h-3 w-4/5 bg-secondary rounded-lg animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    </Container>
);
