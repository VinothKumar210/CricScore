// =============================================================================
// NotificationBell — Header bell icon with unread badge (lucide, CSS vars)
// =============================================================================

import React, { useRef, useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../notificationStore';
import NotificationDropdown from './NotificationDropdown';

const NotificationBell: React.FC = () => {
    const { unreadCount, fetchUnreadCount } = useNotificationStore();
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    useEffect(() => { fetchUnreadCount(); }, [fetchUnreadCount]);

    useEffect(() => {
        if (!isOpen || !anchorRef.current) return;
        let rafId: number;
        const updatePos = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                if (anchorRef.current) setAnchorRect(anchorRef.current.getBoundingClientRect());
            });
        };
        window.addEventListener('scroll', updatePos, true);
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
                aria-label="Notifications"
                aria-expanded={isOpen}
                style={{
                    position: 'relative', padding: 8, background: 'none', border: 'none',
                    cursor: 'pointer', borderRadius: '50%', color: 'var(--text-secondary, #888)',
                    transition: 'color 0.15s',
                }}
            >
                <Bell size={22} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: 6, right: 6,
                        width: 9, height: 9, borderRadius: '50%',
                        background: '#EF4444',
                        border: '2px solid var(--bg-primary, #0a0e1a)',
                    }} />
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
