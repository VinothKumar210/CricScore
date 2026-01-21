import { useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface PendingGuestPlayer {
  teamId: string;
  name: string;
  role: string;
  timestamp: number;
}

const PENDING_GUEST_PLAYERS_KEY = 'pendingGuestPlayers';

export function useGuestPlayerSync() {
  const isSyncing = useRef(false);

  const getPendingPlayers = useCallback((): PendingGuestPlayer[] => {
    try {
      const stored = localStorage.getItem(PENDING_GUEST_PLAYERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const savePendingPlayers = useCallback((players: PendingGuestPlayer[]) => {
    localStorage.setItem(PENDING_GUEST_PLAYERS_KEY, JSON.stringify(players));
  }, []);

  const addPendingPlayer = useCallback((player: Omit<PendingGuestPlayer, 'timestamp'>) => {
    const pending = getPendingPlayers();
    pending.push({ ...player, timestamp: Date.now() });
    savePendingPlayers(pending);
  }, [getPendingPlayers, savePendingPlayers]);

  const removePendingPlayer = useCallback((teamId: string, name: string) => {
    const pending = getPendingPlayers();
    const filtered = pending.filter(p => !(p.teamId === teamId && p.name === name));
    savePendingPlayers(filtered);
  }, [getPendingPlayers, savePendingPlayers]);

  const syncGuestPlayerToTeam = useCallback(async (
    teamId: string,
    name: string,
    role: string = 'all-rounder'
  ): Promise<boolean> => {
    if (!teamId || !name) return false;

    if (navigator.onLine) {
      try {
        await apiRequest('POST', `/api/teams/${teamId}/guest-players`, { name, role });
        removePendingPlayer(teamId, name);
        return true;
      } catch (error: any) {
        if (error?.message?.includes('already exists')) {
          removePendingPlayer(teamId, name);
          return true;
        }
        addPendingPlayer({ teamId, name, role });
        return false;
      }
    } else {
      addPendingPlayer({ teamId, name, role });
      return false;
    }
  }, [addPendingPlayer, removePendingPlayer]);

  const syncPendingPlayers = useCallback(async () => {
    if (isSyncing.current || !navigator.onLine) return;
    
    isSyncing.current = true;
    const pending = getPendingPlayers();
    
    for (const player of pending) {
      try {
        await apiRequest('POST', `/api/teams/${player.teamId}/guest-players`, {
          name: player.name,
          role: player.role
        });
        removePendingPlayer(player.teamId, player.name);
      } catch (error: any) {
        if (error?.message?.includes('already exists')) {
          removePendingPlayer(player.teamId, player.name);
        }
      }
    }
    
    isSyncing.current = false;
  }, [getPendingPlayers, removePendingPlayer]);

  useEffect(() => {
    const handleOnline = () => {
      syncPendingPlayers();
    };

    window.addEventListener('online', handleOnline);
    
    if (navigator.onLine) {
      syncPendingPlayers();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncPendingPlayers]);

  return {
    syncGuestPlayerToTeam,
    syncPendingPlayers,
    getPendingPlayers,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
  };
}
