/**
 * useSpectatorSocket.ts — WebSocket hook for spectator live mode.
 *
 * Uses the new backend scoring handlers:
 * - Emits 'join:match' (matchId as string)
 * - Listens for 'score:update', 'joined', 'error'
 * - Cleans up with 'leave:match' on unmount
 *
 * Does NOT mutate scoringStore — only applies read-only updates.
 */

import { useEffect, useRef } from 'react';
import { connectSocket } from '../../lib/socket';
import { useScoringStore } from '../scoring/scoringStore';

export const useSpectatorSocket = (matchId: string | null) => {
    const applySocketUpdate = useScoringStore((s) => s.applySocketUpdate);
    const errorRef = useRef<string | null>(null);

    useEffect(() => {
        if (!matchId) return;

        const socket = connectSocket();

        const joinRoom = () => {
            // New backend handler expects matchId as plain string
            socket.emit('join:match', matchId);
        };

        if (socket.connected) {
            joinRoom();
        } else {
            socket.on('connect', joinRoom);
        }

        // Score update from backend broadcast
        const handleScoreUpdate = (update: { operation: any; newVersion: number }) => {
            // Apply to scoring store (read-only update path)
            applySocketUpdate(update as any);
        };

        // Join confirmation
        const handleJoined = (data: { matchId: string; status: string }) => {
            console.log(`[Spectator] Joined match ${data.matchId} (${data.status})`);
            errorRef.current = null;
        };

        // Server errors (rate limit, match not found)
        const handleError = (err: { code: string; message: string }) => {
            console.warn(`[Spectator] Socket error: ${err.code} — ${err.message}`);
            errorRef.current = err.code;
        };

        socket.on('score:update', handleScoreUpdate);
        socket.on('joined', handleJoined);
        socket.on('error', handleError);

        return () => {
            socket.off('connect', joinRoom);
            socket.off('score:update', handleScoreUpdate);
            socket.off('joined', handleJoined);
            socket.off('error', handleError);

            // Leave the match room
            socket.emit('leave:match', matchId);
        };
    }, [matchId, applySocketUpdate]);
};
