import { useEffect } from 'react';
import { useScoringStore } from './scoringStore';
import { connectSocket, disconnectSocket, getSocket } from '../../lib/socket';
import type { MatchDetail } from '../matches/types/domainTypes';

export const useScoringSocket = (matchId: string | null) => {
    const applySocketUpdate = useScoringStore((s) => s.applySocketUpdate);
    const initialize = useScoringStore((s) => s.initialize);
    const storeMatchId = useScoringStore((s) => s.matchId);

    useEffect(() => {
        if (!matchId) return;

        // Ensure store is initialized first
        // In a real app, we might wait for authentication too

        const socket = connectSocket();

        const joinRoom = () => {
            socket.emit('join_match', { matchId });
        };

        if (socket.connected) {
            joinRoom();
        } else {
            socket.on('connect', joinRoom);
        }

        const handleScoreUpdate = (payload: MatchDetail) => {
            console.log('Socket: Score Update', payload);
            applySocketUpdate(payload);
        };

        const handleStatusUpdate = (payload: any) => {
            // For simple status changes
            // applySocketUpdate(payload); 
        };

        socket.on('score_update', handleScoreUpdate);
        socket.on('match_status_update', handleStatusUpdate);

        return () => {
            socket.off('connect', joinRoom);
            socket.off('score_update', handleScoreUpdate);
            socket.off('match_status_update', handleStatusUpdate);

            socket.emit('leave_match', { matchId });
            // Don't fully disconnect if others use it, but for this specific feature/page we might
            // disconnectSocket(); // Optional: kept alive for other features
        };
    }, [matchId, applySocketUpdate]);
};
