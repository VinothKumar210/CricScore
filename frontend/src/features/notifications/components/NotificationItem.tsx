import React from 'react';
import type { Notification } from '../notificationService';
import { formatRelativeTime } from '../../../utils/dateUtils';
import { Bell, Trophy, Star, MessageSquare, BarChart2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotificationStore } from '../notificationStore';

const getIconForType = (type: Notification['type']) => {
    switch (type) {
        case 'TOURNAMENT_WIN':
        case 'TOURNAMENT_QUALIFIED':
        case 'TOURNAMENT_ELIMINATED':
            return <Trophy className="h-6 w-6 text-brand-500" />;
        case 'MATCH_MILESTONE':
        case 'ACHIEVEMENT_UNLOCKED':
            return <Star className="h-6 w-6 text-yellow-500" />;
        case 'REACTION':
        case 'MENTION':
            return <MessageSquare className="h-6 w-6 text-blue-500" />;
        case 'POLL_CREATED':
        case 'POLL_RESULT':
            return <BarChart2 className="h-6 w-6 text-purple-500" />;
        case 'INVITE_RECEIVED':
            return <Mail className="h-6 w-6 text-green-500" />;
        default:
            return <Bell className="h-6 w-6 text-gray-500" />;
    }
};

interface Props {
    notification: Notification;
    onCloseDropdown?: () => void;
}

const NotificationItem: React.FC<Props> = React.memo(({ notification, onCloseDropdown }) => {
    const { markRead } = useNotificationStore();
    const [isNew, setIsNew] = React.useState(true);

    React.useEffect(() => {
        // Unset `isNew` immediately after mount, triggering fade-in naturally
        const timer = setTimeout(() => setIsNew(false), 300);
        return () => clearTimeout(timer);
    }, []);

    const handleClick = () => {
        if (!notification.readAt) {
            markRead(notification.id);
        }
        if (onCloseDropdown) onCloseDropdown();
    };

    const isUnread = !notification.readAt;

    const Wrapper = notification.link ? Link : 'div';
    const wrapperProps = notification.link ? { to: notification.link, onClick: handleClick } : { onClick: handleClick };

    return (
        <Wrapper
            {...wrapperProps as any}
            className={`block px-4 py-3 hover:bg-gray-50 dark:hover:bg-card-900 transition-colors cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${isUnread ? 'bg-brand-50 dark:bg-brand-900/10' : ''
                } ${isNew ? 'animate-fade-in' : ''}`}
        >
            <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                    {getIconForType(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                        {notification.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {notification.body}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatRelativeTime(notification.createdAt)}
                    </p>
                </div>
                {isUnread && (
                    <div className="flex-shrink-0 flex items-center">
                        <span className="h-2 w-2 bg-brand-500 rounded-full" />
                    </div>
                )}
            </div>
        </Wrapper>
    );
});

export default NotificationItem;
