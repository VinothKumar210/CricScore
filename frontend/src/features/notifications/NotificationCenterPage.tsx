// =============================================================================
// NotificationCenterPage — Full notification feed with date grouping & filters
// =============================================================================

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNotificationStore } from './notificationStore';
import { notificationService } from './notificationService';
import type { Notification } from './notificationService';
import NotificationItem from './components/NotificationItem';
import { CheckCheck, Loader2, Bell, BellOff } from 'lucide-react';
import { useNotificationSocket } from './useNotificationSocket';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterTab = 'all' | 'match' | 'team' | 'social' | 'system';

const FILTER_TABS: { key: FilterTab; label: string; icon: string; types: Notification['type'][] }[] = [
    { key: 'all', label: 'All', icon: '📋', types: [] },
    { key: 'match', label: 'Matches', icon: '🏏', types: ['MATCH_MILESTONE', 'MATCH_RESULT'] },
    { key: 'team', label: 'Teams', icon: '🛡️', types: ['INVITE_RECEIVED', 'TOURNAMENT_WIN', 'TOURNAMENT_QUALIFIED', 'TOURNAMENT_ELIMINATED'] },
    { key: 'social', label: 'Social', icon: '💬', types: ['MENTION', 'REACTION', 'POLL_CREATED', 'POLL_RESULT'] },
    { key: 'system', label: 'System', icon: '⚙️', types: ['ACHIEVEMENT_UNLOCKED'] },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NotificationCenterPage: React.FC = () => {
    useNotificationSocket();

    const { markAllRead, lastNotification } = useNotificationStore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

    const fetchInitial = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await notificationService.getNotifications(30);
            setNotifications(res.notifications);
            setCursor(res.nextCursor);
            setHasMore(!!res.nextCursor);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchInitial(); }, [fetchInitial]);

    const loadMore = async () => {
        if (!cursor || isFetchingMore) return;
        setIsFetchingMore(true);
        try {
            const res = await notificationService.getNotifications(20, cursor);
            setNotifications(prev => [...prev, ...res.notifications]);
            setCursor(res.nextCursor);
            setHasMore(!!res.nextCursor);
        } catch (error) { console.error(error); }
        finally { setIsFetchingMore(false); }
    };

    // Prepend live incoming notifications
    useEffect(() => {
        if (lastNotification) {
            setNotifications(prev => {
                if (prev.find(n => n.id === lastNotification.id)) return prev;
                return [lastNotification, ...prev];
            });
        }
    }, [lastNotification]);

    const handleMarkAllRead = async () => {
        await markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    };

    // Filter notifications
    const filtered = useMemo(() => {
        if (activeFilter === 'all') return notifications;
        const tab = FILTER_TABS.find(t => t.key === activeFilter);
        if (!tab) return notifications;
        return notifications.filter(n => tab.types.includes(n.type));
    }, [notifications, activeFilter]);

    // Group by date
    const grouped = useMemo(() => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups: { label: string; items: Notification[] }[] = [];
        const todayItems: Notification[] = [];
        const yesterdayItems: Notification[] = [];
        const olderItems: Notification[] = [];

        for (const n of filtered) {
            const d = new Date(n.createdAt);
            if (d.toDateString() === today.toDateString()) todayItems.push(n);
            else if (d.toDateString() === yesterday.toDateString()) yesterdayItems.push(n);
            else olderItems.push(n);
        }

        if (todayItems.length) groups.push({ label: 'Today', items: todayItems });
        if (yesterdayItems.length) groups.push({ label: 'Yesterday', items: yesterdayItems });
        if (olderItems.length) groups.push({ label: 'Older', items: olderItems });
        return groups;
    }, [filtered]);

    const hasUnread = notifications.some(n => !n.readAt);

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 80px' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 16,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bell size={22} color="var(--accent, #D7A65B)" />
                    <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary, #EBECEF)' }}>
                        Notifications
                    </h1>
                </div>
                {hasUnread && (
                    <button
                        onClick={handleMarkAllRead}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 8, border: 'none',
                            background: 'rgba(215,166,91,0.1)', color: 'var(--accent, #D7A65B)',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    >
                        <CheckCheck size={14} />
                        Mark all read
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div style={{
                display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12,
                marginBottom: 4,
            }}>
                {FILTER_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveFilter(tab.key)}
                        style={{
                            padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
                            fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
                            border: '1px solid',
                            borderColor: activeFilter === tab.key ? 'var(--accent, #D7A65B)' : 'var(--border, #2A2D35)',
                            background: activeFilter === tab.key ? 'rgba(215,166,91,0.1)' : 'transparent',
                            color: activeFilter === tab.key ? 'var(--accent, #D7A65B)' : 'var(--text-secondary, #888)',
                            transition: 'all 0.15s',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {isLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 10 }}>
                    <Loader2 size={28} className="animate-spin" color="var(--accent, #D7A65B)" />
                    <p style={{ fontSize: 13, color: 'var(--text-secondary, #888)' }}>Loading notifications...</p>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filtered.length === 0 && (
                <div style={{
                    textAlign: 'center', padding: '48px 20px',
                    color: 'var(--text-secondary, #888)',
                }}>
                    <BellOff size={36} color="var(--text-secondary, #555)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 14, fontWeight: 500 }}>
                        {activeFilter === 'all' ? 'No notifications yet' : `No ${activeFilter} notifications`}
                    </p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>
                        When something happens, it will show up here.
                    </p>
                </div>
            )}

            {/* Grouped Notifications */}
            {!isLoading && grouped.map(group => (
                <div key={group.label} style={{ marginBottom: 16 }}>
                    {/* Group Header */}
                    <div style={{
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                        color: 'var(--text-secondary, #666)', letterSpacing: '0.06em',
                        padding: '8px 0 6px',
                    }}>
                        {group.label}
                    </div>

                    {/* Notification Cards */}
                    <div style={{
                        background: 'var(--bg-card, #191B20)',
                        border: '1px solid var(--border, #2A2D35)',
                        borderRadius: 14, overflow: 'hidden',
                    }}>
                        {group.items.map((n, idx) => (
                            <NotificationItem
                                key={n.id}
                                notification={n}
                                isLast={idx === group.items.length - 1}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {/* Load More */}
            {hasMore && filtered.length > 0 && !isLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                    <button
                        onClick={loadMore}
                        disabled={isFetchingMore}
                        style={{
                            padding: '8px 20px', borderRadius: 10, fontSize: 12,
                            fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                            border: '1px solid var(--border, #2A2D35)',
                            background: 'var(--bg-card, #191B20)',
                            color: 'var(--text-primary, #EBECEF)',
                            opacity: isFetchingMore ? 0.5 : 1,
                        }}
                    >
                        {isFetchingMore ? 'Loading...' : 'Load older notifications'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationCenterPage;
