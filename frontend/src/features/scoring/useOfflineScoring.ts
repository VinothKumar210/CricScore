// =============================================================================
// useOfflineScoring — React hook for offline-first scoring
// =============================================================================
//
// Wraps offlineQueue with React state management.
// Provides: queueOp, syncNow, status indicators, auto-sync on reconnect.
//
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    queueOperation,
    syncPendingOps,
    getQueueStatus,
    registerAutoSync,
    cleanupSyncedOps,
    type OfflineOperation,
    getPendingOps,
} from './offlineQueue';

interface OfflineScoringState {
    isOnline: boolean;
    pendingCount: number;
    conflictCount: number;
    failedCount: number;
    isSyncing: boolean;
    lastSyncResult: { synced: number; failed: number; conflicts: number } | null;
}

export function useOfflineScoring(matchId: string) {
    const [state, setState] = useState<OfflineScoringState>({
        isOnline: navigator.onLine,
        pendingCount: 0,
        conflictCount: 0,
        failedCount: 0,
        isSyncing: false,
        lastSyncResult: null,
    });

    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Refresh queue status
    const refreshStatus = useCallback(async () => {
        try {
            const status = await getQueueStatus(matchId);
            setState(prev => ({
                ...prev,
                isOnline: status.isOnline,
                pendingCount: status.pendingCount,
                conflictCount: status.conflictCount,
                failedCount: status.failedCount,
            }));
        } catch { /* silent */ }
    }, [matchId]);

    // Online/offline tracking
    useEffect(() => {
        const onOnline = () => setState(prev => ({ ...prev, isOnline: true }));
        const onOffline = () => setState(prev => ({ ...prev, isOnline: false }));
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    // Auto-sync registration + periodic status refresh
    useEffect(() => {
        const unregister = registerAutoSync(matchId);
        refreshStatus();

        // Poll queue status every 3 seconds
        refreshIntervalRef.current = setInterval(refreshStatus, 3000);

        // Cleanup old synced ops on mount
        cleanupSyncedOps(30).catch(() => { });

        return () => {
            unregister();
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        };
    }, [matchId, refreshStatus]);

    /**
     * Queue a scoring operation (offline-first).
     * Returns immediately with the queued op.
     */
    const queueOp = useCallback(async (
        type: string,
        payload: Record<string, unknown>,
        expectedVersion: number,
    ): Promise<OfflineOperation> => {
        const op = await queueOperation(matchId, type, payload, expectedVersion);
        await refreshStatus();
        return op;
    }, [matchId, refreshStatus]);

    /**
     * Manually trigger sync.
     */
    const syncNow = useCallback(async () => {
        if (!navigator.onLine) return;
        setState(prev => ({ ...prev, isSyncing: true }));
        try {
            const result = await syncPendingOps(matchId);
            setState(prev => ({ ...prev, isSyncing: false, lastSyncResult: result }));
            await refreshStatus();
        } catch {
            setState(prev => ({ ...prev, isSyncing: false }));
        }
    }, [matchId, refreshStatus]);

    /**
     * Get pending ops for display.
     */
    const getPending = useCallback(() => getPendingOps(matchId), [matchId]);

    return {
        ...state,
        queueOp,
        syncNow,
        getPending,
        refreshStatus,
    };
}
