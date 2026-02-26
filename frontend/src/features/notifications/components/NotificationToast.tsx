import React from 'react';
import type { Notification } from '../notificationService';
import { toast } from 'react-hot-toast';
import type { Toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { BellIcon, TrophyIcon, StarIcon, ChatBubbleLeftIcon, ChartBarIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const getIconForType = (type: Notification['type']) => {
    switch (type) {
        case 'TOURNAMENT_WIN':
        case 'TOURNAMENT_QUALIFIED':
        case 'TOURNAMENT_ELIMINATED':
            return <TrophyIcon className="h-6 w-6 text-primary-500" />;
        case 'MATCH_MILESTONE':
        case 'ACHIEVEMENT_UNLOCKED':
            return <StarIcon className="h-6 w-6 text-yellow-500" />;
        case 'REACTION':
        case 'MENTION':
            return <ChatBubbleLeftIcon className="h-6 w-6 text-blue-500" />;
        case 'POLL_CREATED':
        case 'POLL_RESULT':
            return <ChartBarIcon className="h-6 w-6 text-purple-500" />;
        case 'INVITE_RECEIVED':
            return <EnvelopeIcon className="h-6 w-6 text-green-500" />;
        default:
            return <BellIcon className="h-6 w-6 text-muted-foreground" />;
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
        if (notification.link) {
            navigate(notification.link);
        }
    };

    return (
        <div
            className={`${t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-sm w-full bg-card dark:bg-card-900 shadow-xl rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10`}
        >
            <div className="flex-1 w-0 p-4 cursor-pointer" onClick={handleClick}>
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        {getIconForType(notification.type)}
                    </div>
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-foreground dark:text-gray-100">
                            {notification.title}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground dark:text-gray-400 line-clamp-2">
                            {notification.body}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex border-l border-border dark:border-gray-800">
                <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default NotificationToast;
