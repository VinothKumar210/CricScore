// =============================================================================
// Head-to-Head Stats Comparison Service
// =============================================================================
//
// Compare any two players across batting, bowling, and match participation.
// Supports seasonal filtering via date range on the parent MatchSummary.
//
// No schema changes required — uses existing BattingPerformance,
// BowlingPerformance, and Innings → MatchSummary relations.
//
// =============================================================================

import { prisma } from '../utils/db.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BattingStats {
    innings: number;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    highestScore: number;
    average: number;       // runs / dismissals
    strikeRate: number;    // (runs / balls) * 100
    fifties: number;
    hundreds: number;
    notOuts: number;
    ducks: number;
}

export interface BowlingStats {
    innings: number;
    overs: number;
    maidens: number;
    runs: number;
    wickets: number;
    economy: number;       // runs / overs
    average: number;       // runs / wickets
    bestFigures: string;   // "5/23"
    fourWickets: number;   // 4+ wicket hauls
    fiveWickets: number;   // 5+ wicket hauls
    dotBalls: number;
}

export interface PlayerSummary {
    id: string;
    fullName: string;
    username: string | null;
    profilePictureUrl: string | null;
    role: string | null;
    battingHand: string | null;
    bowlingStyle: string | null;
}

export interface ComparisonResult {
    player1: PlayerSummary;
    player2: PlayerSummary;
    batting: { player1: BattingStats; player2: BattingStats };
    bowling: { player1: BowlingStats; player2: BowlingStats };
    matches: {
        player1Total: number;
        player2Total: number;
        sharedMatches: number;  // matches where both played
    };
    dateRange: { from: string | null; to: string | null };
}

// ---------------------------------------------------------------------------
// Main Comparison Function
// ---------------------------------------------------------------------------

export async function compareHeadToHead(
    player1Id: string,
    player2Id: string,
    dateRange?: { from?: string | undefined; to?: string | undefined },
): Promise<ComparisonResult> {
    // 1. Fetch player profiles
    const [p1, p2] = await Promise.all([
        prisma.user.findUnique({
            where: { id: player1Id },
            select: {
                id: true, fullName: true, username: true,
                profilePictureUrl: true, role: true, battingHand: true, bowlingStyle: true,
            },
        }),
        prisma.user.findUnique({
            where: { id: player2Id },
            select: {
                id: true, fullName: true, username: true,
                profilePictureUrl: true, role: true, battingHand: true, bowlingStyle: true,
            },
        }),
    ]);

    if (!p1 || !p2) {
        throw new Error('One or both players not found');
    }

    // 2. Build date filter for innings → matchSummary
    const matchDateFilter: any = {};
    if (dateRange?.from) matchDateFilter.gte = new Date(dateRange.from);
    if (dateRange?.to) matchDateFilter.lte = new Date(dateRange.to);
    const hasDateFilter = Object.keys(matchDateFilter).length > 0;

    const inningsWhere = hasDateFilter
        ? { matchSummary: { matchDate: matchDateFilter } }
        : {};

    // 3. Fetch all performances in parallel
    const [bat1, bat2, bowl1, bowl2] = await Promise.all([
        prisma.battingPerformance.findMany({
            where: { userId: player1Id, innings: inningsWhere },
            select: {
                runs: true, balls: true, fours: true, sixes: true,
                strikeRate: true, isOut: true,
                innings: { select: { matchSummaryId: true } },
            },
        }),
        prisma.battingPerformance.findMany({
            where: { userId: player2Id, innings: inningsWhere },
            select: {
                runs: true, balls: true, fours: true, sixes: true,
                strikeRate: true, isOut: true,
                innings: { select: { matchSummaryId: true } },
            },
        }),
        prisma.bowlingPerformance.findMany({
            where: { userId: player1Id, innings: inningsWhere },
            select: {
                overs: true, maidens: true, runs: true, wickets: true,
                economy: true, dotBalls: true,
                innings: { select: { matchSummaryId: true } },
            },
        }),
        prisma.bowlingPerformance.findMany({
            where: { userId: player2Id, innings: inningsWhere },
            select: {
                overs: true, maidens: true, runs: true, wickets: true,
                economy: true, dotBalls: true,
                innings: { select: { matchSummaryId: true } },
            },
        }),
    ]);

    // 4. Aggregate stats
    const batting1 = aggregateBatting(bat1);
    const batting2 = aggregateBatting(bat2);
    const bowling1 = aggregateBowling(bowl1);
    const bowling2 = aggregateBowling(bowl2);

    // 5. Match participation
    const p1MatchIds = new Set([
        ...bat1.map((b: any) => b.innings.matchSummaryId),
        ...bowl1.map((b: any) => b.innings.matchSummaryId),
    ]);
    const p2MatchIds = new Set([
        ...bat2.map((b: any) => b.innings.matchSummaryId),
        ...bowl2.map((b: any) => b.innings.matchSummaryId),
    ]);
    const sharedMatches = [...p1MatchIds].filter(id => p2MatchIds.has(id)).length;

    return {
        player1: mapPlayer(p1),
        player2: mapPlayer(p2),
        batting: { player1: batting1, player2: batting2 },
        bowling: { player1: bowling1, player2: bowling2 },
        matches: {
            player1Total: p1MatchIds.size,
            player2Total: p2MatchIds.size,
            sharedMatches,
        },
        dateRange: {
            from: dateRange?.from || null,
            to: dateRange?.to || null,
        },
    };
}

// ---------------------------------------------------------------------------
// Aggregation Helpers
// ---------------------------------------------------------------------------

function aggregateBatting(perfs: any[]): BattingStats {
    if (perfs.length === 0) return zeroBatting();

    const innings = perfs.length;
    const runs = sum(perfs, 'runs');
    const balls = sum(perfs, 'balls');
    const fours = sum(perfs, 'fours');
    const sixes = sum(perfs, 'sixes');
    const dismissals = perfs.filter(p => p.isOut).length;
    const notOuts = innings - dismissals;
    const highestScore = Math.max(...perfs.map(p => p.runs));
    const average = dismissals > 0 ? round(runs / dismissals) : runs;
    const strikeRate = balls > 0 ? round((runs / balls) * 100) : 0;
    const fifties = perfs.filter(p => p.runs >= 50 && p.runs < 100).length;
    const hundreds = perfs.filter(p => p.runs >= 100).length;
    const ducks = perfs.filter(p => p.runs === 0 && p.isOut).length;

    return {
        innings, runs, balls, fours, sixes, highestScore,
        average, strikeRate, fifties, hundreds, notOuts, ducks,
    };
}

function aggregateBowling(perfs: any[]): BowlingStats {
    if (perfs.length === 0) return zeroBowling();

    const innings = perfs.length;
    const overs = round(sum(perfs, 'overs'));
    const maidens = sum(perfs, 'maidens');
    const runs = sum(perfs, 'runs');
    const wickets = sum(perfs, 'wickets');
    const dotBalls = sum(perfs, 'dotBalls');
    const economy = overs > 0 ? round(runs / overs) : 0;
    const average = wickets > 0 ? round(runs / wickets) : 0;

    // Best figures
    const sorted = [...perfs].sort((a, b) =>
        b.wickets - a.wickets || a.runs - b.runs,
    );
    const best = sorted[0];
    const bestFigures = best ? `${best.wickets}/${best.runs}` : '-';

    const fourWickets = perfs.filter(p => p.wickets >= 4).length;
    const fiveWickets = perfs.filter(p => p.wickets >= 5).length;

    return {
        innings, overs, maidens, runs, wickets, economy,
        average, bestFigures, fourWickets, fiveWickets, dotBalls,
    };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sum(arr: any[], key: string): number {
    return arr.reduce((acc, item) => acc + (item[key] || 0), 0);
}

function round(n: number, decimals = 2): number {
    return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function mapPlayer(u: any): PlayerSummary {
    return {
        id: u.id,
        fullName: u.fullName,
        username: u.username,
        profilePictureUrl: u.profilePictureUrl,
        role: u.role,
        battingHand: u.battingHand,
        bowlingStyle: u.bowlingStyle,
    };
}

function zeroBatting(): BattingStats {
    return {
        innings: 0, runs: 0, balls: 0, fours: 0, sixes: 0,
        highestScore: 0, average: 0, strikeRate: 0,
        fifties: 0, hundreds: 0, notOuts: 0, ducks: 0,
    };
}

function zeroBowling(): BowlingStats {
    return {
        innings: 0, overs: 0, maidens: 0, runs: 0, wickets: 0,
        economy: 0, average: 0, bestFigures: '-',
        fourWickets: 0, fiveWickets: 0, dotBalls: 0,
    };
}
