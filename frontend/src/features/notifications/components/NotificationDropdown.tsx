// =============================================================================
// NotificationDropdown — Portal dropdown from bell (lucide, CSS vars)
// =============================================================================

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, Link } from 'react-router-dom';
import { useNotificationStore } from '../notificationStore';
import NotificationItem from './NotificationItem';
import { Loader2, CheckCheck } from 'lucide-react';

interface Props {
    anchorRect: DOMRect | null;
    onClose: () => void;
    anchorRef: React.RefObject<any>;
}

const NotificationDropdown: React.FC<Props> = ({ anchorRect, onClose, anchorRef }) => {
    const { notifications, isLoading, fetchLatest, markAllRead } = useNotificationStore();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    useEffect(() => { fetchLatest(); }, [fetchLatest]);

    // Click outside
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (!dropdownRef.current || !anchorRef.current) return;
            if (!dropdownRef.current.contains(e.target as Node) && !anchorRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [onClose, anchorRef]);

    // Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Close on route change
    useEffect(() => { onClose(); }, [location.pathname, onClose]);

    // Focus trap
    useEffect(() => { dropdownRef.current?.focus(); }, []);

    if (typeof window === 'undefined' || !anchorRect) return null;

    const dropdownWidth = 360;
    let leftPos = anchorRect.right - dropdownWidth;
    if (leftPos < 10) leftPos = 10;

    const style: React.CSSProperties = {
        position: 'absolute',
        top: anchorRect.bottom + 8,
        left: leftPos,
        width: Math.min(dropdownWidth, window.innerWidth - 20),
        zIndex: 1050,
        background: 'var(--bg-card, #191B20)',
        border: '1px solid var(--border, #2A2D35)',
        borderRadius: 14,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '85vh',
        outline: 'none',
    };

    return createPortal(
        <div ref={dropdownRef} style={style} tabIndex={-1} role="dialog" aria-label="Notifications">
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border, #2A2D35)',
            }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #EBECEF)' }}>
                    Notifications
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => markAllRead()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 11, fontWeight: 600, color: 'var(--accent, #D7A65B)',
                            fontFamily: 'inherit',
                        }}
                    >
                        <CheckCheck size={13} />
                        Read all
                    </button>
                    <Link
                        to="/notifications"
                        onClick={onClose}
                        style={{
                            fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                            color: 'var(--text-secondary, #888)',
                            textDecoration: 'none',
                        }}
                    >
                        View All
                    </Link>
                </div>
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
                {isLoading && notifications.length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                        <Loader2 size={20} className="animate-spin" color="var(--accent, #D7A65B)" />
                    </div>
                ) : notifications.length > 0 ? (
                    notifications.map((n, i) => (
                        <NotificationItem
                            key={n.id}
                            notification={n}
                            onCloseDropdown={onClose}
                            isLast={i === notifications.length - 1}
                        />
                    ))
                ) : (
                    <div style={{
                        padding: '32px 16px', textAlign: 'center',
                        fontSize: 13, color: 'var(--text-secondary, #888)',
                    }}>
                        No notifications yet.
                    </div>
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div style={{
                    borderTop: '1px solid var(--border, #2A2D35)',
                    padding: 8,
                }}>
                    <Link
                        to="/notifications"
                        onClick={onClose}
                        style={{
                            display: 'block', textAlign: 'center', padding: '8px 0',
                            fontSize: 12, fontWeight: 600,
                            color: 'var(--accent, #D7A65B)',
                            textDecoration: 'none',
                            borderRadius: 8,
                            background: 'rgba(215,166,91,0.06)',
                        }}
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
