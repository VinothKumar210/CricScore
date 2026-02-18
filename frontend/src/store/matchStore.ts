import { create } from 'zustand';
import { MatchStatus } from '../constants/enums';

interface MatchState {
    currentMatch: any | null; // Replace 'any' with Match type later
    matchStatus: MatchStatus;
    expectedVersion: number;
    setMatch: (match: any) => void;
    setStatus: (status: MatchStatus) => void;
    setVersion: (version: number) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
    currentMatch: null,
    matchStatus: MatchStatus.SCHEDULED,
    expectedVersion: 0,
    setMatch: (match) => set({ currentMatch: match }),
    setStatus: (status) => set({ matchStatus: status }),
    setVersion: (version) => set({ expectedVersion: version }),
}));
