import { useEffect } from 'react';
import { useInviteStore } from './inviteStore';
import { getSocket } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';

export const useInviteSocket = () => {
    const { updateInviteSafe, fetchInvites, activeTab } = useInviteStore();
    const { user } = useAuthStore();
    const socket = getSocket();

    // Socket safe updates
    useEffect(() => {
        if (!socket || !user) return;

        const handleInviteUpdated = (updatedInvite: any) => {
            // Strictly mutate only the single item inside store by ID
            updateInviteSafe(updatedInvite);
        };

        socket.on('invite:updated', handleInviteUpdated);

        return () => {
            socket.off('invite:updated', handleInviteUpdated);
        };
    }, [socket, user, updateInviteSafe]);

    // Disconnect Polling Fallback (Only if page visible)
    useEffect(() => {
        if (!user || !socket) return;

        let interval: ReturnType<typeof setInterval> | null = null;

        const handleVisibilityAndPoll = () => {
            if (!socket.connected && document.visibilityState === 'visible') {
                fetchInvites(activeTab);
            }
        };

        const startPolling = () => {
            if (!interval && !socket.connected) {
                handleVisibilityAndPoll();
                interval = setInterval(handleVisibilityAndPoll, 30000);
            }
        };

        const stopPolling = () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        };

        // Start polling immediately if already disconnected
        if (!socket.connected) {
            startPolling();
        }

        // Attach listeners to sync polling with socket lifecycle
        socket.on('disconnect', startPolling);
        socket.on('connect', stopPolling);

        return () => {
            stopPolling();
            socket.off('disconnect', startPolling);
            socket.off('connect', stopPolling);
        };
    }, [socket, user, fetchInvites, activeTab]);
};
