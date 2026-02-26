import { api } from '../../lib/api';

export interface WagonWheelShot {
    ballId: string;
    overNumber: number;
    ballNumber: number;
    runs: number;
    shotZone: string | null;
    shotAngle: number | null;
    shotDistance: number | null;
    isBoundary: boolean;
    isSix: boolean;
    isWicket: boolean;
    bowlerName: string;
    extraType: string | null;
}

export interface ZoneSummary {
    zone: string;
    shotCount: number;
    totalRuns: number;
    boundaries: number;
    percentage: number;
}

export interface WagonWheelData {
    matchId: string;
    batsmanId: string;
    batsmanName: string;
    totalShots: number;
    totalRuns: number;
    boundaries: number;
    sixes: number;
    shots: WagonWheelShot[];
    zoneSummary: ZoneSummary[];
}

export async function fetchWagonWheel(matchId: string, batsmanId: string): Promise<WagonWheelData | null> {
    const res = await api.get(`/api/wagon-wheel/${matchId}/${batsmanId}`);
    if (res.status === 204) return null;
    return res.data?.data ?? res.data;
}
