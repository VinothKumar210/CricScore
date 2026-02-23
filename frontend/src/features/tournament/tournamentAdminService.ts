/**
 * tournamentAdminService.ts — API calls for tournament CRUD
 *
 * Rules:
 * - Authenticated requests
 * - No domain transformation
 * - No engine logic
 * - Typed error handling
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

// ─── Types (API response shapes, NOT engine types) ───

export interface TournamentMeta {
    id: string;
    name: string;
    format: string;
    overs: number;
    maxTeams: number;
    status: string;
    startDate: string;
    createdById: string;
    _count?: { teams: number };
}

export interface TournamentTeam {
    id: string;
    teamId: string;
    team: { id: string; name: string; };
}

export interface TournamentFixture {
    id: string;
    matchNumber: number;
    round: number;
    homeTeamId: string | null;
    awayTeamId: string | null;
    status: string;
    winnerId: string | null;
    matchId: string | null;
}

export interface TournamentStanding {
    id: string;
    teamId: string;
    team: { id: string; name: string; };
    played: number;
    won: number;
    lost: number;
    tied: number;
    noResult: number;
    points: number;
    netRunRate: number;
}

export interface TournamentDetail extends TournamentMeta {
    description: string | null;
    ballType: string | null;
    endDate: string | null;
    bannerImage: string | null;
    teams: TournamentTeam[];
    fixtures: TournamentFixture[];
    standings: TournamentStanding[];
}

export interface CreateTournamentInput {
    name: string;
    format: string;
    overs: number;
    maxTeams: number;
    startDate: string;
    description?: string;
    ballType?: string;
}

// ─── API Calls ───

export async function fetchTournamentList(): Promise<TournamentMeta[]> {
    const res = await fetch(`${API_BASE}/api/tournaments`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to load tournaments: ${res.status}`);
    return res.json();
}

export async function fetchTournamentDetail(id: string): Promise<TournamentDetail> {
    const res = await fetch(`${API_BASE}/api/tournaments/${id}`, {
        headers: getAuthHeaders(),
    });
    if (res.status === 404) throw new Error('Tournament not found');
    if (!res.ok) throw new Error(`Failed to load tournament: ${res.status}`);
    return res.json();
}

export async function createTournament(data: CreateTournamentInput): Promise<TournamentMeta> {
    const res = await fetch(`${API_BASE}/api/tournaments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) throw new Error(`Failed to create tournament: ${res.status}`);
    return res.json();
}

export async function registerTeamAPI(tournamentId: string, teamId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ teamId }),
    });
    if (res.status === 401) throw new Error('Unauthorized');
    if (res.status === 403) throw new Error('You must be Owner or Captain to register this team');
    if (!res.ok) throw new Error(`Failed to register team: ${res.status}`);
}

export async function generateFixturesAPI(tournamentId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/fixtures/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    if (res.status === 401) throw new Error('Unauthorized');
    if (res.status === 403) throw new Error('Only the tournament creator can generate fixtures');
    if (!res.ok) throw new Error(`Failed to generate fixtures: ${res.status}`);
}
