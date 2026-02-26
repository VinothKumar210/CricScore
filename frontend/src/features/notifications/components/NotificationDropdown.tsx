import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, Link } from 'react-router-dom';
import { useNotificationStore } from '../notificationStore';
import NotificationItem from './NotificationItem';
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Props {
    anchorRect: DOMRect | null;
    onClose: () => void;
    anchorRef: React.RefObject<any>;
}

const NotificationDropdown: React.FC<Props> = ({ anchorRect, onClose, anchorRef }) => {
    const { notifications, isLoading, fetchLatest, markAllRead } = useNotificationStore();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    // 1. Fetch on mount
    useEffect(() => {
        fetchLatest();
    }, [fetchLatest]);

    // 2. Click outside logic
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (!dropdownRef.current || !anchorRef.current) return;
            // If click is not in Dropdown AND not in Bell icon, close
            if (!dropdownRef.current.contains(e.target as Node) && !anchorRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [onClose, anchorRef]);

    // 3. Escape key logic
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // 4. Auto-closing on route change
    useEffect(() => {
        onClose();
    }, [location.pathname, onClose]);

    // 5. Focus Trap / Initial Focus
    useEffect(() => {
        if (dropdownRef.current) {
            dropdownRef.current.focus();
        }
    }, []);

    // SSR safety
    if (typeof window === 'undefined' || !anchorRect) return null;

    // Offset math: Position below bell, align right edge linearly with bell right edge.
    // Ensure it doesn't fall off the window if window is too small.
    const dropdownWidth = 360; // Max width
    let leftPos = anchorRect.right - dropdownWidth;
    if (leftPos < 10) leftPos = 10; // Keep at least 10px from screen edge

    const dropdownStyle: React.CSSProperties = {
        position: 'absolute',
        top: anchorRect.bottom + 8, // 8px vertical offset
        left: leftPos,
        width: Math.min(dropdownWidth, window.innerWidth - 20),
        zIndex: 1050, // Between header and modal
    };

    const handleMarkAllRead = async () => {
        await markAllRead();
    };

    return createPortal(
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            tabIndex={-1}
            role="dialog"
            aria-label="Notifications"
            className="bg-white dark:bg-card-900 rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col max-h-[85vh] outline-none animate-dropdown"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-brand-600 hover:text-brand-500 font-medium flex items-center gap-1"
                        title="Mark all as read"
                    >
                        <CheckIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Mark all read</span>
                    </button>
                    <Link
                        to="/notifications"
                        onClick={onClose}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                        View All
                    </Link>
                </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto overscroll-contain flex-1">
                {isLoading && notifications.length === 0 ? (
                    <div className="p-6 flex justify-center text-gray-400">
                        <ArrowPathIcon className="h-6 w-6 animate-spin" />
                    </div>
                ) : notifications.length > 0 ? (
                    notifications.map(n => (
                        <NotificationItem key={n.id} notification={n} onCloseDropdown={onClose} />
                    ))
                ) : (
                    <div className="py-8 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No notifications yet.
                    </div>
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-800 p-2 shrink-0 bg-gray-50 dark:bg-card-950">
                    <Link
                        to="/notifications"
                        onClick={onClose}
                        className="block w-full text-center py-2 text-sm font-medium text-brand-600 hover:text-brand-700 bg-white dark:bg-card-900 rounded-md border border-gray-200 dark:border-gray-700"
                    >
                        See all activity
                    </Link>
                </div>
            )}
        </div>,
        document.body
    );
};

export default NotificationDropdown;
