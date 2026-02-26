import React, { useRef, useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useNotificationStore } from '../notificationStore';
import NotificationDropdown from './NotificationDropdown';

const NotificationBell: React.FC = () => {
    const { unreadCount, fetchUnreadCount } = useNotificationStore();
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    // Initial fetch of unread count
    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    // Update anchor rect on scroll/resize if open
    useEffect(() => {
        if (!isOpen || !anchorRef.current) return;

        let rafId: number;
        const updatePos = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                if (anchorRef.current) {
                    setAnchorRect(anchorRef.current.getBoundingClientRect());
                }
            });
        };

        window.addEventListener('scroll', updatePos, true); // true = capture phase for all scrolling containers
        window.addEventListener('resize', updatePos);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('scroll', updatePos, true);
            window.removeEventListener('resize', updatePos);
        };
    }, [isOpen]);

    const toggleDropdown = () => {
        if (!isOpen && anchorRef.current) {
            setAnchorRect(anchorRef.current.getBoundingClientRect());
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    return (
        <>
            <button
                ref={anchorRef}
                onClick={toggleDropdown}
                className="relative p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-full transition-colors"
                aria-label="Notifications"
                aria-expanded={isOpen}
            >
                <BellIcon className="h-6 w-6" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span
                        key={unreadCount} // strictly forces re-render pulse once on increment
                        className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900 animate-pulse-once"
                    />
                )}
            </button>

            {isOpen && (
                <NotificationDropdown
                    anchorRef={anchorRef}
                    anchorRect={anchorRect}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
};

export default NotificationBell;
