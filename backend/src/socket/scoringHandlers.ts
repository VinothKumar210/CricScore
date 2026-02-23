/**
 * scoringHandlers.ts — WebSocket Scoring Broadcast
 *
 * Manages match rooms for real-time score updates.
 * Uses dependency injection (no global.io).
 * Includes per-socket join rate limiting.
 */

import type { Server, Socket } from 'socket.io';
import { prisma } from '../utils/db.js';

// ─── Module-Scoped IO (Dependency Injection) ───

let _io: Server | null = null;

export function initScoringBroadcast(io: Server): void {
    _io = io;
}

/**
 * Broadcast a score update to all clients watching a match.
 * Called from scoringEngine.addOperation() after successful DB write.
 * Graceful no-op if socket not initialized.
 */
export function broadcastScoreUpdate(matchId: string, update: {
    operation: any;
    newVersion: number;
}): void {
    if (!_io) return;
    _io.to(`match:${matchId}`).emit('score:update', update);
}

// ─── Join Rate Limiter ───

const JOIN_RATE_LIMIT = 5;
const JOIN_RATE_WINDOW_MS = 1_000;
const joinTimestamps = new Map<string, number[]>();

function isJoinRateLimited(socketId: string): boolean {
    const now = Date.now();
    const timestamps = joinTimestamps.get(socketId) || [];
    const recent = timestamps.filter(t => now - t < JOIN_RATE_WINDOW_MS);
    if (recent.length >= JOIN_RATE_LIMIT) return true;
    recent.push(now);
    joinTimestamps.set(socketId, recent);
    return false;
}

// ─── Handler Registration ───

export function registerScoringHandlers(io: Server): void {
    // Use default namespace for scoring (separate from /chat namespace)
    io.on('connection', (socket: Socket) => {

        socket.on('join:match', async (matchId: string) => {
            // Rate guard
            if (isJoinRateLimited(socket.id)) {
                socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many join requests' });
                return;
            }

            // Validate match exists
            try {
                const match = await prisma.matchSummary.findUnique({
                    where: { id: matchId },
                    select: { id: true, status: true }
                });

                if (!match) {
                    socket.emit('error', { code: 'MATCH_NOT_FOUND', message: 'Match does not exist' });
                    return;
                }

                socket.join(`match:${matchId}`);
                socket.emit('joined', { matchId, status: match.status });
            } catch (err) {
                socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to join match room' });
            }
        });

        socket.on('leave:match', (matchId: string) => {
            socket.leave(`match:${matchId}`);
        });

        socket.on('disconnect', () => {
            joinTimestamps.delete(socket.id);
        });
    });
}
