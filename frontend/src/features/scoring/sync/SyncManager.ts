import { matchDB } from '../db/matchDB';
import { api } from '../../../lib/api';

class SyncManagerClass {
    private syncInterval: number | null = null;
    private isSyncing = false;

    constructor() {
        // Listen to online events to trigger immediate sync
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.triggerSync.bind(this));
        }
    }

    startAutoSync(intervalMs = 10000) {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = window.setInterval(() => {
            this.triggerSync();
        }, intervalMs);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async triggerSync() {
        if (this.isSyncing || !navigator.onLine) return;
        this.isSyncing = true;

        try {
            await this.flush();
        } finally {
            this.isSyncing = false;
        }
    }

    async flush() {
        // 1. Get all pending events, ordered by localId (oldest first)
        const pendingEvents = await matchDB.matchEvents
            .where('syncStatus')
            .equals('PENDING')
            .sortBy('localId');

        if (pendingEvents.length === 0) return;

        // 2. Iterate and sync sequentially to maintain ordering
        for (const event of pendingEvents) {
            try {
                const payload = {
                    clientOpId: event.clientOpId,
                    type: event.type,
                    payload: event // Send the whole event as payload for the backend processor
                };

                await api.post(`/api/matches/${event.matchId}/operations`, payload);

                // 3. On success, mark as SYNCED
                await matchDB.matchEvents.update(event.localId as number, { syncStatus: 'SYNCED' });

            } catch (error: any) {
                // If 409 Conflict (already exists), it's safe to mark as SYNCED
                if (error?.response?.status === 409 || error?.statusCode === 409 || error?.response?.data?.code === 'OP_EXISTS') {
                    await matchDB.matchEvents.update(event.localId as number, { syncStatus: 'SYNCED' });
                } else if (error?.response?.status >= 500) {
                    // Server error, stop syncing for now and try later
                    break;
                }
                // If 400 Bad Request, mark FAILED to prevent blocking queue
                else if (error?.response?.status === 400) {
                     await matchDB.matchEvents.update(event.localId as number, { syncStatus: 'FAILED' });
                }
                
                console.error(`Sync failed for event ${event.clientOpId}:`, error);
            }
        }
    }
}

export const syncManager = new SyncManagerClass();
