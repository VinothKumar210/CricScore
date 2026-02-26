// =============================================================================
// Offline Sync Status Bar — Shows queue status during scoring
// =============================================================================
//
// Drop into any scoring page to show:
//   ✅ Online / ⚠️ X pending / 🔄 Syncing / ❌ Conflicts
//
// =============================================================================

import React from 'react';

interface SyncStatusBarProps {
    isOnline: boolean;
    pendingCount: number;
    conflictCount: number;
    failedCount: number;
    isSyncing: boolean;
    onSyncNow: () => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
    isOnline,
    pendingCount,
    conflictCount,
    failedCount,
    isSyncing,
    onSyncNow,
}) => {
    const hasIssues = pendingCount > 0 || conflictCount > 0 || failedCount > 0;
    const allClear = isOnline && !hasIssues && !isSyncing;

    if (allClear) return null; // Don't show when everything is fine

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 16px', borderRadius: 10,
            background: !isOnline
                ? 'rgba(217,96,85,0.1)'
                : conflictCount > 0
                    ? 'rgba(237,137,54,0.1)'
                    : 'rgba(215,166,91,0.1)',
            border: '1px solid',
            borderColor: !isOnline
                ? 'rgba(217,96,85,0.3)'
                : conflictCount > 0
                    ? 'rgba(237,137,54,0.3)'
                    : 'rgba(215,166,91,0.3)',
            fontSize: 12, fontWeight: 600,
        }}>
            {/* Status Icon */}
            <span style={{ fontSize: 14 }}>
                {!isOnline ? '📡' : isSyncing ? '🔄' : conflictCount > 0 ? '⚠️' : '📤'}
            </span>

            {/* Status Text */}
            <span style={{
                flex: 1,
                color: !isOnline ? '#D96055' : conflictCount > 0 ? '#ED8936' : '#D7A65B',
            }}>
                {!isOnline && 'Offline — scoring locally'}
                {isOnline && isSyncing && 'Syncing operations...'}
                {isOnline && !isSyncing && pendingCount > 0 && `${pendingCount} pending`}
                {isOnline && !isSyncing && conflictCount > 0 && ` · ${conflictCount} conflicts`}
                {isOnline && !isSyncing && failedCount > 0 && ` · ${failedCount} failed`}
            </span>

            {/* Sync Button */}
            {isOnline && !isSyncing && hasIssues && (
                <button
                    onClick={onSyncNow}
                    style={{
                        padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        background: 'var(--accent, #D7A65B)', color: '#0a0e1a',
                    }}
                >
                    Sync Now
                </button>
            )}
        </div>
    );
};
