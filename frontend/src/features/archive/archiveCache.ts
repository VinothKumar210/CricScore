/**
 * archiveCache.ts — IndexedDB LRU Cache for Archive Detail
 *
 * Rules:
 * - Max 20 entries
 * - LRU eviction on put when full
 * - accessedAt updated AND PERSISTED on every get
 * - Used ONLY in archiveStore.fetchDetail()
 * - List view NEVER uses this cache
 */

import type { ArchivedMatchFull } from './types';

const DB_NAME = 'cricscore-archive';
const DB_VERSION = 1;
const STORE_NAME = 'archives';
const MAX_ENTRIES = 20;

interface CacheEntry {
    id: string;
    data: ArchivedMatchFull;
    accessedAt: number;
}

// ─── DB Init ───

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('accessedAt', 'accessedAt', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ─── Public API ───

/**
 * Get a cached archive by ID.
 * Updates accessedAt in IndexedDB on hit (persisted, not just in-memory).
 */
export async function getFromCache(id: string): Promise<ArchivedMatchFull | null> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite'); // readwrite to persist accessedAt
        const store = tx.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get(id);

            request.onsuccess = () => {
                const entry: CacheEntry | undefined = request.result;
                if (!entry) {
                    resolve(null);
                    return;
                }

                // Persist updated accessedAt (not just in-memory)
                entry.accessedAt = Date.now();
                store.put(entry);

                resolve(entry.data);
            };

            request.onerror = () => reject(request.error);
        });
    } catch {
        // IndexedDB unavailable — fail gracefully
        return null;
    }
}

/**
 * Put an archive into cache.
 * Evicts LRU entry if cache exceeds MAX_ENTRIES.
 */
export async function putInCache(id: string, data: ArchivedMatchFull): Promise<void> {
    try {
        const db = await openDB();

        // Check current count
        const countTx = db.transaction(STORE_NAME, 'readonly');
        const countStore = countTx.objectStore(STORE_NAME);
        const count = await new Promise<number>((resolve, reject) => {
            const req = countStore.count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        // Evict LRU if at capacity
        if (count >= MAX_ENTRIES) {
            await evictLRU(db);
        }

        // Insert new entry
        const insertTx = db.transaction(STORE_NAME, 'readwrite');
        const insertStore = insertTx.objectStore(STORE_NAME);
        const entry: CacheEntry = {
            id,
            data,
            accessedAt: Date.now(),
        };

        await new Promise<void>((resolve, reject) => {
            const req = insertStore.put(entry);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch {
        // IndexedDB unavailable — fail gracefully
    }
}

/**
 * Evict the least-recently-accessed entry.
 */
async function evictLRU(db: IDBDatabase): Promise<void> {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('accessedAt');

    return new Promise((resolve, reject) => {
        // Open cursor on accessedAt index (ascending = oldest first)
        const cursor = index.openCursor();

        cursor.onsuccess = () => {
            const result = cursor.result;
            if (result) {
                // Delete the oldest entry
                result.delete();
            }
            resolve();
        };

        cursor.onerror = () => reject(cursor.error);
    });
}
