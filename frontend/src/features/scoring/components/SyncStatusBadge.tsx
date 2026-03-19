import { useScoringStore } from '../scoringStore';
import { Cloud, CloudOff, RefreshCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';

export const SyncStatusBadge = () => {
    const syncStatus = useScoringStore(state => state.syncStatus);
    const pendingSyncCount = useScoringStore(state => state.pendingSyncCount);
    
    // Force re-render periodically to catch online/offline native events in case listeners missed
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Derived states
    const isOfflineMode = !isOnline || syncStatus === 'OFFLINE';
    const isSyncing = syncStatus === 'SYNCING';

    return (
        <div className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-sm transition-all",
            isOfflineMode ? "bg-destructive/10 text-destructive border-destructive/20" :
            pendingSyncCount === 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
            "bg-amber-500/10 text-amber-600 border-amber-500/20"
        )}>
            {isOfflineMode ? (
                <>
                    <CloudOff className="w-3 h-3" />
                    <span>Offline {pendingSyncCount > 0 ? `(${pendingSyncCount})` : ''}</span>
                </>
            ) : pendingSyncCount === 0 ? (
                <>
                    <Cloud className="w-3 h-3" />
                    <span>Synced</span>
                </>
            ) : (
                <>
                    <RefreshCcw className={clsx("w-3 h-3", isSyncing && "animate-spin")} />
                    <span>{pendingSyncCount} Pending</span>
                </>
            )}
        </div>
    );
};
