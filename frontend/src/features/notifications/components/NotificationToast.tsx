// =============================================================================
// NotificationToast — Non-blocking toast popup (lucide, CSS vars)
// =============================================================================

import React from 'react';
import type { Notification } from '../notificationService';
import { toast } from 'react-hot-toast';
import type { Toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Bell, Trophy, Star, MessageSquare, BarChart2, Mail } from 'lucide-react';

const getIcon = (type: Notification['type']) => {
    switch (type) {
        case 'TOURNAMENT_WIN':
        case 'TOURNAMENT_QUALIFIED':
        case 'TOURNAMENT_ELIMINATED':
            return <Trophy size={18} color="#D7A65B" />;
        case 'MATCH_MILESTONE':
        case 'ACHIEVEMENT_UNLOCKED':
            return <Star size={18} color="#FBBF24" />;
        case 'REACTION':
        case 'MENTION':
            return <MessageSquare size={18} color="#60A5FA" />;
        case 'POLL_CREATED':
        case 'POLL_RESULT':
            return <BarChart2 size={18} color="#A78BFA" />;
        case 'INVITE_RECEIVED':
            return <Mail size={18} color="#10B981" />;
        default:
            return <Bell size={18} color="#888" />;
    }
};

interface Props {
    t: Toast;
    notification: Notification;
}

const NotificationToast: React.FC<Props> = ({ t, notification }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        toast.dismiss(t.id);
        if (notification.link) navigate(notification.link);
    };

    return (
        <div
            style={{
                maxWidth: 360, width: '100%',
                background: 'var(--bg-card, #191B20)',
                border: '1px solid var(--border, #2A2D35)',
                borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                display: 'flex', overflow: 'hidden',
                opacity: t.visible ? 1 : 0,
                transition: 'opacity 0.2s',
                pointerEvents: 'auto',
            }}
        >
            <div style={{ flex: 1, padding: 12, cursor: 'pointer' }} onClick={handleClick}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>
                        {getIcon(notification.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                            fontSize: 13, fontWeight: 600,
                            color: 'var(--text-primary, #EBECEF)',
                        }}>
                            {notification.title}
                        </p>
                        <p style={{
                            fontSize: 12, color: 'var(--text-secondary, #888)',
                            marginTop: 2,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}>
                            {notification.body}
                        </p>
                    </div>
                </div>
            </div>
            <div style={{
                display: 'flex', borderLeft: '1px solid var(--border, #2A2D35)',
            }}>
                <button
                    onClick={() => toast.dismiss(t.id)}
                    style={{
                        padding: '0 14px', background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        color: 'var(--accent, #D7A65B)', fontFamily: 'inherit',
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default NotificationToast;
