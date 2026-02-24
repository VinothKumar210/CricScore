/**
 * profileService.ts — Profile + Stats API wrapper
 *
 * Wraps:
 * - GET /api/profile (via auth middleware, returns req.user)
 * - PATCH /api/profile (update profile fields)
 * - GET /api/stats/player/:id (career stats)
 * - GET /api/stats/player/:id/form (last 10 matches)
 * - GET /api/stats/leaderboard?category=runs|wickets&limit=10
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

// ─── Types ───

export interface UserProfile {
    id: string;
    fullName: string;
    username: string | null;
    email: string;
    profilePictureUrl: string | null;
    role: string;
    battingHand: string | null;
    battingPosition: string | null;
    bowlingStyle: string | null;
    bowlingSubType: string | null;
    jerseyNumber: number | null;
    city: string | null;
    state: string | null;
    country: string | null;
    description: string | null;
    onboardingComplete: boolean;
    createdAt: string;
}

export interface CareerStats {
    innings: number;
    totalRuns: number;
    highestScore: string;
    battingAverage: number;
    strikeRate: number;
    fifties: number;
    hundreds: number;
    totalWickets: number;
    bowlingAverage: number;
    economy: number;
    bestBowling: string;
    fiveWicketHauls: number;
}

export interface FormEntry {
    date: string;
    runs: number;
    isOut: boolean;
    result: string | null;
    opponent: string;
}

export interface LeaderboardEntry {
    userId: string;
    name: string;
    _sum: {
        runs?: number;
        balls?: number;
        fours?: number;
        sixes?: number;
        wickets?: number;
    };
    _count?: { id: number };
}

// ─── Phase 12A+ Competitive Types (ALL backend-computed) ───

export interface CompetitiveProfile {
    impactRating: number;
    impactScore: number;
    globalRank: number | null;
    totalRankedPlayers: number;
    prestigeTier: string;
    prestigeProgressPercent: number;
    primaryRole: string;
    bestPerformance: {
        type: 'batting' | 'bowling' | 'allround';
        description: string;
        matchId: string | null;
    };
    matchesPlayed: number;
    potmCount: number;
    consistencyScore: number;
    tournamentWins: number;
}

export interface RankedPlayer {
    rank: number;
    userId: string;
    name: string;
    username: string | null;
    profilePictureUrl: string | null;
    impactRating: number;
    matches: number;
    runs: number;
    wickets: number;
    prestigeTier: string;
}

export interface LeaderboardResponse {
    entries: RankedPlayer[];
    total: number;
    page: number;
    limit: number;
}

export interface PublicProfileResponse {
    profile: {
        id: string;
        fullName: string;
        username: string;
        profilePictureUrl: string | null;
        role: string;
        battingHand: string | null;
        bowlingStyle: string | null;
        jerseyNumber: number | null;
        city: string | null;
        state: string | null;
        country: string | null;
        description: string | null;
        createdAt: string;
    };
    stats: CareerStats;
    competitive: CompetitiveProfile;
    form: FormEntry[];
}

// ─── API Calls ───

export async function fetchPlayerStats(userId: string): Promise<CareerStats> {
    const res = await fetch(`${API_BASE}/api/stats/player/${userId}`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
    const json = await res.json();
    return json.data || json;
}

export async function fetchPlayerForm(userId: string): Promise<FormEntry[]> {
    const res = await fetch(`${API_BASE}/api/stats/player/${userId}/form`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch form: ${res.status}`);
    const json = await res.json();
    return json.data || json;
}

export async function fetchLeaderboard(
    category: 'runs' | 'wickets',
    limit: number = 10
): Promise<LeaderboardEntry[]> {
    const res = await fetch(
        `${API_BASE}/api/stats/leaderboard?category=${category}&limit=${limit}`,
        { headers: getAuthHeaders() }
    );
    if (!res.ok) throw new Error(`Failed to fetch leaderboard: ${res.status}`);
    const json = await res.json();
    return json.data || json;
}

export async function updateProfile(
    data: Partial<UserProfile>
): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/api/profile`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Failed to update profile: ${res.status}`);
    }
    const json = await res.json();
    return json.data?.user || json;
}

// ─── Phase 12A+ Competitive API Calls ───

export async function fetchCompetitiveProfile(userId: string): Promise<CompetitiveProfile> {
    const res = await fetch(`${API_BASE}/api/stats/player/${userId}/competitive`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch competitive profile: ${res.status}`);
    const json = await res.json();
    return json.data || json;
}

export async function fetchImpactLeaderboard(
    page: number = 1,
    limit: number = 20
): Promise<LeaderboardResponse> {
    const res = await fetch(
        `${API_BASE}/api/stats/leaderboard/impact?page=${page}&limit=${limit}`,
        { headers: getAuthHeaders() }
    );
    if (!res.ok) throw new Error(`Failed to fetch leaderboard: ${res.status}`);
    const json = await res.json();
    return json.data || json;
}

export async function fetchPublicProfile(username: string): Promise<PublicProfileResponse | null> {
    const res = await fetch(`${API_BASE}/api/profile/public/${encodeURIComponent(username)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch public profile: ${res.status}`);
    const json = await res.json();
    return json.data || json;
}
