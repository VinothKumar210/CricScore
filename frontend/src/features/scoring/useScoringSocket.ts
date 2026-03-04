/**
 * useScoringSocket — Connects to the live match room for real-time score updates.
 *
 * Event names match the backend scoringHandlers.ts:
 *   join:match, leave:match, score:update, match:status
 *
 * Also exposes connection state for UI indicators.
 */

import { useEffect, useState, useCallback } from 'react';
import { useScoringStore } from './scoringStore';
import { connectSocket } from '../../lib/socket';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export const useScoringSocket = (matchId: string | null) => {
    const applySocketUpdate = useScoringStore((s) => s.applySocketUpdate);
    const refetch = useScoringStore((s) => s.refetch);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

    const handleReconnect = useCallback(() => {
        // After reconnect, refetch full state to avoid missed events
        refetch();
    }, [refetch]);

    useEffect(() => {
        if (!matchId) return;

        const socket = connectSocket();

        // ── Connection State Tracking ──
        const onConnect = () => {
            setConnectionStatus('connected');
            // Join match room (event name matches backend scoringHandlers.ts)
            socket.emit('join:match', matchId);
        };

        const onDisconnect = () => {
            setConnectionStatus('disconnected');
        };

        const onReconnect = () => {
            setConnectionStatus('connected');
            socket.emit('join:match', matchId);
            handleReconnect();
        };

        const onReconnectAttempt = () => {
            setConnectionStatus('reconnecting');
        };

        const onConnectError = () => {
            setConnectionStatus('disconnected');
        };

        // ── Score Events (match backend event names) ──
        const handleScoreUpdate = (payload: any) => {
            console.log('[Socket] score:update received', payload);
            // The backend sends { operation, newVersion }
            // We need to apply the operation to the local store
            if (payload.operation) {
                applySocketUpdate(payload.operation);
            } else {
                // Full state update fallback
                applySocketUpdate(payload);
            }
        };

        const handleMatchStatus = (payload: any) => {
            console.log('[Socket] match:status received', payload);
            // Status changes (innings break, match completed, etc.)
            // Trigger a full refetch to get the complete new state
            refetch();
        };

        const handleError = (error: any) => {
            console.warn('[Socket] Error from server:', error);
        };

        // Attach listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.io.on('reconnect', onReconnect);
        socket.io.on('reconnect_attempt', onReconnectAttempt);
        socket.on('connect_error', onConnectError);
        socket.on('score:update', handleScoreUpdate);
        socket.on('match:status', handleMatchStatus);
        socket.on('error', handleError);

        // If already connected, join immediately
        if (socket.connected) {
            onConnect();
        } else {
            setConnectionStatus('connecting');
        }

        return () => {
            // Clean up listeners
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.io.off('reconnect', onReconnect);
            socket.io.off('reconnect_attempt', onReconnectAttempt);
            socket.off('connect_error', onConnectError);
            socket.off('score:update', handleScoreUpdate);
            socket.off('match:status', handleMatchStatus);
            socket.off('error', handleError);

            // Leave the match room
            socket.emit('leave:match', matchId);
        };
    }, [matchId, applySocketUpdate, refetch, handleReconnect]);

    return connectionStatus;
};
