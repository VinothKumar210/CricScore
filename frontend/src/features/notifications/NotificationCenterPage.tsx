import React, { useEffect, useState, useCallback } from 'react';
import { useNotificationStore } from './notificationStore';
import { notificationService } from './notificationService';
import type { Notification } from './notificationService';
import NotificationItem from './components/NotificationItem';
import { CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useNotificationSocket } from './useNotificationSocket';

const NotificationCenterPage: React.FC = () => {
    // 1. Activate socket/polling at the page level just in case
    useNotificationSocket();

    const { markAllRead, lastNotification } = useNotificationStore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const fetchInitial = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await notificationService.getNotifications(20);
            setNotifications(res.notifications);
            setCursor(res.nextCursor);
            setHasMore(!!res.nextCursor);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitial();
    }, [fetchInitial]);

    const loadMore = async () => {
        if (!cursor || isFetchingMore) return;
        setIsFetchingMore(true);
        try {
            const res = await notificationService.getNotifications(20, cursor);
            setNotifications(prev => [...prev, ...res.notifications]);
            setCursor(res.nextCursor);
            setHasMore(!!res.nextCursor);
        } catch (error) {
            console.error(error);
        } finally {
            setIsFetchingMore(false);
        }
    };

    // Prepend live incoming notifications if we're theoretically on the first page
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
        // Update local state visually
        setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                {notifications.length > 0 && notifications.some(n => !n.readAt) && (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 px-3 py-1.5 rounded-md transition-colors"
                    >
                        <CheckIcon className="h-4 w-4" />
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-card-900 rounded-lg shadow ring-1 ring-black/5 dark:ring-white/10 overflow-hidden mb-6">
                {notifications.length > 0 ? (
                    notifications.map(n => (
                        <NotificationItem key={n.id} notification={n} />
                    ))
                ) : (
                    <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="mx-auto h-12 w-12 text-gray-400 mb-3 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-xl">📭</span>
                        </div>
                        <p>No notifications yet.</p>
                        <p className="text-sm mt-1">When something happens, it will show up here.</p>
                    </div>
                )}
            </div>

            {hasMore && notifications.length > 0 && (
                <div className="flex justify-center">
                    <button
                        onClick={loadMore}
                        disabled={isFetchingMore}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-card-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-card-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isFetchingMore ? 'Loading...' : 'Load older notifications'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationCenterPage;
