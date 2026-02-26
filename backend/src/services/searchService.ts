// =============================================================================
// Global Search Service — Users, Teams, Matches, Tournaments
// =============================================================================
//
// Uses MongoDB regex for partial matching on indexed text fields.
// Results are categorized by entity type and returned with relevance hints.
//
// =============================================================================

import { prisma } from '../utils/db.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResult {
    id: string;
    type: 'USER' | 'TEAM' | 'MATCH' | 'TOURNAMENT';
    title: string;
    subtitle: string | null;
    imageUrl: string | null;
    metadata: Record<string, unknown>;
}

export interface SearchResponse {
    query: string;
    results: SearchResult[];
    categories: {
        users: number;
        teams: number;
        matches: number;
        tournaments: number;
    };
    total: number;
    hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Main Search Function
// ---------------------------------------------------------------------------

export async function globalSearch(
    query: string,
    options: {
        limit?: number;
        offset?: number;
        category?: 'USER' | 'TEAM' | 'MATCH' | 'TOURNAMENT' | undefined;
    } = {},
): Promise<SearchResponse> {
    const { limit = 20, offset = 0, category } = options;
    const q = query.trim();

    if (q.length < 2) {
        return emptyResponse(q);
    }

    // Build regex pattern for partial matching (case-insensitive)
    const regex = { contains: q, mode: 'insensitive' as const };

    // Run all searches in parallel (or filtered by category)
    const [users, teams, matches, tournaments] = await Promise.all([
        !category || category === 'USER' ? searchUsers(q, regex, limit, offset) : Promise.resolve([]),
        !category || category === 'TEAM' ? searchTeams(q, regex, limit, offset) : Promise.resolve([]),
        !category || category === 'MATCH' ? searchMatches(q, regex, limit, offset) : Promise.resolve([]),
        !category || category === 'TOURNAMENT' ? searchTournaments(q, regex, limit, offset) : Promise.resolve([]),
    ]);

    // Merge and sort by relevance (exact match first, then partial)
    let allResults = [...users, ...teams, ...matches, ...tournaments];

    // Sort: exact starts-with first, then alphabetical
    const qLower = q.toLowerCase();
    allResults.sort((a, b) => {
        const aStarts = a.title.toLowerCase().startsWith(qLower) ? 0 : 1;
        const bStarts = b.title.toLowerCase().startsWith(qLower) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.title.localeCompare(b.title);
    });

    // Apply global pagination if searching all categories
    if (!category) {
        allResults = allResults.slice(0, limit);
    }

    return {
        query: q,
        results: allResults,
        categories: {
            users: users.length,
            teams: teams.length,
            matches: matches.length,
            tournaments: tournaments.length,
        },
        total: users.length + teams.length + matches.length + tournaments.length,
        hasMore: allResults.length >= limit,
    };
}

// ---------------------------------------------------------------------------
// Individual Entity Searches
// ---------------------------------------------------------------------------

type TextFilter = { contains: string; mode: 'insensitive' };

async function searchUsers(q: string, regex: TextFilter, limit: number, offset: number): Promise<SearchResult[]> {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { fullName: regex },
                { username: regex },
                { email: regex },
                { phoneNumber: regex },
            ],
        },
        select: {
            id: true,
            fullName: true,
            username: true,
            profilePictureUrl: true,
            role: true,
            city: true,
        },
        take: limit,
        skip: offset,
        orderBy: { fullName: 'asc' },
    });

    return users.map(u => ({
        id: u.id,
        type: 'USER' as const,
        title: u.fullName,
        subtitle: u.username ? `@${u.username}` : u.role || null,
        imageUrl: u.profilePictureUrl,
        metadata: { role: u.role, city: u.city },
    }));
}

async function searchTeams(q: string, regex: TextFilter, limit: number, offset: number): Promise<SearchResult[]> {
    const teams = await prisma.team.findMany({
        where: {
            OR: [
                { name: regex },
                { shortName: regex },
                { city: regex },
            ],
        },
        select: {
            id: true,
            name: true,
            shortName: true,
            logoUrl: true,
            city: true,
            _count: { select: { members: true } },
        },
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
    });

    return teams.map(t => ({
        id: t.id,
        type: 'TEAM' as const,
        title: t.name,
        subtitle: [t.shortName, t.city].filter(Boolean).join(' · ') || null,
        imageUrl: t.logoUrl,
        metadata: { memberCount: t._count.members, shortName: t.shortName },
    }));
}

async function searchMatches(q: string, regex: TextFilter, limit: number, offset: number): Promise<SearchResult[]> {
    const matches = await prisma.matchSummary.findMany({
        where: {
            OR: [
                { homeTeamName: regex },
                { awayTeamName: regex },
                { venue: regex },
                { result: regex },
            ],
        },
        select: {
            id: true,
            homeTeamName: true,
            awayTeamName: true,
            status: true,
            result: true,
            matchDate: true,
            overs: true,
            venue: true,
        },
        take: limit,
        skip: offset,
        orderBy: { matchDate: 'desc' },
    });

    return matches.map(m => ({
        id: m.id,
        type: 'MATCH' as const,
        title: `${m.homeTeamName} vs ${m.awayTeamName}`,
        subtitle: m.result || m.status,
        imageUrl: null,
        metadata: {
            status: m.status,
            matchDate: m.matchDate.toISOString(),
            overs: m.overs,
            venue: m.venue,
        },
    }));
}

async function searchTournaments(q: string, regex: TextFilter, limit: number, offset: number): Promise<SearchResult[]> {
    const tournaments = await prisma.tournament.findMany({
        where: {
            OR: [
                { name: regex },
                { description: regex },
            ],
        },
        select: {
            id: true,
            name: true,
            format: true,
            status: true,
            startDate: true,
            bannerImage: true,
            _count: { select: { teams: true } },
        },
        take: limit,
        skip: offset,
        orderBy: { startDate: 'desc' },
    });

    return tournaments.map(t => ({
        id: t.id,
        type: 'TOURNAMENT' as const,
        title: t.name,
        subtitle: `${t.format} · ${t.status} · ${t._count.teams} teams`,
        imageUrl: t.bannerImage,
        metadata: {
            format: t.format,
            status: t.status,
            startDate: t.startDate.toISOString(),
            teamCount: t._count.teams,
        },
    }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyResponse(query: string): SearchResponse {
    return {
        query,
        results: [],
        categories: { users: 0, teams: 0, matches: 0, tournaments: 0 },
        total: 0,
        hasMore: false,
    };
}
