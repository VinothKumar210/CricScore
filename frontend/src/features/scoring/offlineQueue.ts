// =============================================================================
// Offline Scoring Queue — IndexedDB-backed event queue with sync engine
// =============================================================================
//
// Architecture:
//   1. All scoring events are written to IndexedDB FIRST (offline-first)
//   2. Events are replayed to the server when online
//   3. Server confirms via clientOpId (idempotent — replays are safe)
//   4. Conflict resolution: server's expectedVersion mismatch → re-fetch
//      state and rebase pending ops
//
// IndexedDB Schema:
//   Store "offlineOps" — { clientOpId, matchId, type, payload, expectedVersion,
//                          createdAt, status: 'pending'|'synced'|'failed',
//                          retryCount, serverError? }
//
// =============================================================================

import { api } from '../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OfflineOperation {
    clientOpId: string;
    matchId: string;
    type: string;
    payload: Record<string, unknown>;
    expectedVersion: number;
    createdAt: number;               // Date.now() timestamp
    status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
    retryCount: number;
    serverError?: string;
}

interface SyncResult {
    synced: number;
    failed: number;
    conflicts: number;
}

// ---------------------------------------------------------------------------
// IndexedDB Setup
// ---------------------------------------------------------------------------

const DB_NAME = 'cricscore_offline';
const DB_VERSION = 1;
const STORE_NAME = 'offlineOps';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'clientOpId' });
                store.createIndex('matchId', 'matchId', { unique: false });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function txStore(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

// ---------------------------------------------------------------------------
// Core Queue Operations
// ---------------------------------------------------------------------------

/**
 * Generate a unique client operation ID.
 * Format: timestamp-random for sortability + uniqueness.
 */
export function generateOpId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Queue a scoring operation locally (offline-first).
 * Returns immediately — sync happens in background.
 */
export async function queueOperation(
    matchId: string,
    type: string,
    payload: Record<string, unknown>,
    expectedVersion: number,
): Promise<OfflineOperation> {
    const op: OfflineOperation = {
        clientOpId: generateOpId(),
        matchId,
        type,
        payload,
        expectedVersion,
        createdAt: Date.now(),
        status: 'pending',
        retryCount: 0,
    };

    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
        const req = txStore(db, 'readwrite').put(op);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
    db.close();

    // Trigger sync if online
    if (navigator.onLine) {
        syncPendingOps(matchId).catch(() => { /* background */ });
    }

    return op;
}

/**
 * Get all pending operations for a match.
 */
export async function getPendingOps(matchId: string): Promise<OfflineOperation[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const store = txStore(db, 'readonly');
        const index = store.index('matchId');
        const req = index.getAll(matchId);
        req.onsuccess = () => {
            const ops = (req.result as OfflineOperation[])
                .filter(op => op.status === 'pending' || op.status === 'conflict')
                .sort((a, b) => a.createdAt - b.createdAt);
            db.close();
            resolve(ops);
        };
        req.onerror = () => { db.close(); reject(req.error); };
    });
}

/**
 * Get all operations for a match (any status).
 */
export async function getAllOps(matchId: string): Promise<OfflineOperation[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const store = txStore(db, 'readonly');
        const index = store.index('matchId');
        const req = index.getAll(matchId);
        req.onsuccess = () => {
            db.close();
            resolve((req.result as OfflineOperation[]).sort((a, b) => a.createdAt - b.createdAt));
        };
        req.onerror = () => { db.close(); reject(req.error); };
    });
}

/**
 * Update an operation's status.
 */
async function updateOpStatus(
    clientOpId: string,
    status: OfflineOperation['status'],
    serverError?: string,
): Promise<void> {
    const db = await openDB();
    const store = txStore(db, 'readwrite');
    const getReq = store.get(clientOpId);
    await new Promise<void>((resolve, reject) => {
        getReq.onsuccess = () => {
            const op = getReq.result as OfflineOperation;
            if (op) {
                op.status = status;
                op.retryCount++;
                if (serverError) op.serverError = serverError;
                store.put(op);
            }
            resolve();
        };
        getReq.onerror = () => reject(getReq.error);
    });
    db.close();
}

/**
 * Clear synced operations older than N minutes.
 */
export async function cleanupSyncedOps(olderThanMinutes = 60): Promise<number> {
    const db = await openDB();
    const cutoff = Date.now() - olderThanMinutes * 60 * 1000;
    let cleaned = 0;

    return new Promise((resolve, reject) => {
        const store = txStore(db, 'readwrite');
        const req = store.openCursor();
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                const op = cursor.value as OfflineOperation;
                if (op.status === 'synced' && op.createdAt < cutoff) {
                    cursor.delete();
                    cleaned++;
                }
                cursor.continue();
            } else {
                db.close();
                resolve(cleaned);
            }
        };
        req.onerror = () => { db.close(); reject(req.error); };
    });
}

// ---------------------------------------------------------------------------
// Sync Engine
// ---------------------------------------------------------------------------

let syncInProgress = false;

/**
 * Sync all pending operations for a match.
 * Operations are sent sequentially in order (FIFO).
 * Idempotent — server uses clientOpId to deduplicate.
 */
export async function syncPendingOps(matchId: string): Promise<SyncResult> {
    if (syncInProgress) return { synced: 0, failed: 0, conflicts: 0 };
    syncInProgress = true;

    const result: SyncResult = { synced: 0, failed: 0, conflicts: 0 };

    try {
        const pending = await getPendingOps(matchId);
        if (pending.length === 0) return result;

        for (const op of pending) {
            // Mark as syncing
            await updateOpStatus(op.clientOpId, 'syncing');

            try {
                await api.post(`/api/matches/${matchId}/operations`, {
                    clientOpId: op.clientOpId,
                    expectedVersion: op.expectedVersion,
                    type: op.type,
                    payload: op.payload,
                });

                await updateOpStatus(op.clientOpId, 'synced');
                result.synced++;
            } catch (err: any) {
                const status = err?.response?.status;
                const code = err?.response?.data?.error?.code;

                if (status === 409 || code === 'VERSION_CONFLICT') {
                    // Version conflict — needs rebase
                    await updateOpStatus(op.clientOpId, 'conflict', 'Version conflict — rebase required');
                    result.conflicts++;

                    // Attempt auto-rebase
                    await attemptRebase(matchId);
                    break; // Stop processing — rebase changes versions
                } else if (status === 429) {
                    // Rate limited — stop and retry later
                    await updateOpStatus(op.clientOpId, 'pending', 'Rate limited');
                    break;
                } else {
                    await updateOpStatus(op.clientOpId, 'failed', err?.message || 'Unknown error');
                    result.failed++;
                }
            }
        }
    } finally {
        syncInProgress = false;
    }

    return result;
}

/**
 * Rebase conflicted operations against current server state.
 * Fetches latest server version, updates expectedVersion for pending ops.
 */
async function attemptRebase(matchId: string): Promise<void> {
    try {
        // Get current server state
        const { data } = await api.get(`/api/matches/${matchId}/state`);
        const serverState = data.data || data;
        const currentVersion = serverState?.state?.version || 0;

        // Update all pending/conflict ops with new expectedVersion
        const db = await openDB();
        const store = txStore(db, 'readwrite');
        const index = store.index('matchId');
        const req = index.getAll(matchId);

        await new Promise<void>((resolve, reject) => {
            req.onsuccess = () => {
                const ops = req.result as OfflineOperation[];
                let nextVersion = currentVersion;

                for (const op of ops.sort((a, b) => a.createdAt - b.createdAt)) {
                    if (op.status === 'pending' || op.status === 'conflict') {
                        op.expectedVersion = nextVersion;
                        op.status = 'pending'; // Reset conflict to pending
                        op.serverError = undefined;
                        store.put(op);
                        nextVersion++;
                    }
                }
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
        db.close();
    } catch {
        // Rebase failed — ops stay in conflict state
    }
}

// ---------------------------------------------------------------------------
// Online/Offline Listeners
// ---------------------------------------------------------------------------

let registeredMatchId: string | null = null;

/**
 * Register auto-sync for a match when connection comes back.
 */
export function registerAutoSync(matchId: string): () => void {
    registeredMatchId = matchId;

    const onOnline = () => {
        if (registeredMatchId) {
            syncPendingOps(registeredMatchId).catch(() => { /* background */ });
        }
    };

    window.addEventListener('online', onOnline);

    return () => {
        window.removeEventListener('online', onOnline);
        registeredMatchId = null;
    };
}

/**
 * Get current connectivity + queue status.
 */
export async function getQueueStatus(matchId: string): Promise<{
    isOnline: boolean;
    pendingCount: number;
    conflictCount: number;
    failedCount: number;
}> {
    const ops = await getAllOps(matchId);
    return {
        isOnline: navigator.onLine,
        pendingCount: ops.filter(o => o.status === 'pending' || o.status === 'syncing').length,
        conflictCount: ops.filter(o => o.status === 'conflict').length,
        failedCount: ops.filter(o => o.status === 'failed').length,
    };
}
