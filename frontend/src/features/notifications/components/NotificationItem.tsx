// =============================================================================
// NotificationItem — Individual notification card (CSS vars, lucide icons)
// =============================================================================

import React from 'react';
import type { Notification } from '../notificationService';
import { formatRelativeTime } from '../../../utils/dateUtils';
import { Bell, Trophy, Star, MessageSquare, BarChart2, Mail, Swords } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotificationStore } from '../notificationStore';

// ---------------------------------------------------------------------------
// Icon Mapping
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, { icon: React.ReactNode; color: string }> = {
    TOURNAMENT_WIN: { icon: <Trophy size={18} />, color: '#D7A65B' },
    TOURNAMENT_QUALIFIED: { icon: <Trophy size={18} />, color: '#10B981' },
    TOURNAMENT_ELIMINATED: { icon: <Trophy size={18} />, color: '#EF4444' },
    MATCH_MILESTONE: { icon: <Star size={18} />, color: '#FBBF24' },
    MATCH_RESULT: { icon: <Swords size={18} />, color: '#63B3ED' },
    ACHIEVEMENT_UNLOCKED: { icon: <Star size={18} />, color: '#A78BFA' },
    REACTION: { icon: <MessageSquare size={18} />, color: '#60A5FA' },
    MENTION: { icon: <MessageSquare size={18} />, color: '#34D399' },
    POLL_CREATED: { icon: <BarChart2 size={18} />, color: '#A78BFA' },
    POLL_RESULT: { icon: <BarChart2 size={18} />, color: '#F472B6' },
    INVITE_RECEIVED: { icon: <Mail size={18} />, color: '#10B981' },
};

const getIcon = (type: string) => ICON_MAP[type] || { icon: <Bell size={18} />, color: '#888' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
    notification: Notification;
    onCloseDropdown?: () => void;
    isLast?: boolean;
}

const NotificationItem: React.FC<Props> = React.memo(({ notification, onCloseDropdown, isLast }) => {
    const { markRead } = useNotificationStore();

    const handleClick = () => {
        if (!notification.readAt) markRead(notification.id);
        if (onCloseDropdown) onCloseDropdown();
    };

    const isUnread = !notification.readAt;
    const { icon, color } = getIcon(notification.type);

    const content = (
        <div
            onClick={handleClick}
            style={{
                display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer',
                borderBottom: isLast ? 'none' : '1px solid var(--border, #2A2D35)',
                background: isUnread ? 'rgba(215,166,91,0.04)' : 'transparent',
                transition: 'background 0.15s',
            }}
        >
            {/* Icon */}
            <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color,
            }}>
                {icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    fontSize: 13,
                    fontWeight: isUnread ? 700 : 500,
                    color: 'var(--text-primary, #EBECEF)',
                    marginBottom: 2,
                }}>
                    {notification.title}
                </p>
                <p style={{
                    fontSize: 12,
                    color: 'var(--text-secondary, #888)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}>
                    {notification.body}
                </p>
                <p style={{
                    fontSize: 10, color: 'var(--text-secondary, #555)',
                    marginTop: 4,
                }}>
                    {formatRelativeTime(notification.createdAt)}
                </p>
            </div>

            {/* Unread dot */}
            {isUnread && (
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--accent, #D7A65B)',
                    }} />
                </div>
            )}
        </div>
    );

    if (notification.link) {
        return <Link to={notification.link} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</Link>;
    }
    return content;
});

export default NotificationItem;
