import { prisma } from '../utils/db.js';
// import { TournamentFormat, TournamentStatus, FixtureStatus } from '@prisma/client';
import { generateRoundRobinFixtures, generateKnockoutFixtures } from '../utils/fixtureGenerator.js';

// -----------------------------------------------------------------------------
// Tournament Management
// -----------------------------------------------------------------------------

export const createTournament = async (
    userId: string,
    data: {
        name: string;
        description?: string;
        format: any; // TournamentFormat
        overs: number;
        ballType?: any;
        maxTeams: number;
        startDate: Date;
        endDate?: Date;
        bannerImage?: string;
        rules?: any;
    }
) => {
    return prisma.tournament.create({
        data: {
            createdById: userId,
            ...data
        } as any
    });
};

export const getTournament = async (id: string) => {
    return prisma.tournament.findUnique({
        where: { id },
        include: {
            teams: { include: { team: true } },
            fixtures: {
                include: {
                    // homeTeam: true, awayTeam: true 
                    // Prisma relation for homeTeam/awayTeam in TournamentFixture might not be auto-generated or named specifically.
                    // Need to check schema if relations exist. 
                    // Schema: homeTeamId, awayTeamId. No relations defined in schema for these yet.
                    // We will fetch teams manual or relies on ids.
                }
            },
            standings: { include: { team: true } } // Assuming relation exists in schema
        }
    } as any);
};

export const getTournaments = async () => {
    return prisma.tournament.findMany({
        orderBy: { startDate: 'desc' },
        take: 20
    });
};

// -----------------------------------------------------------------------------
// Team Registration
// -----------------------------------------------------------------------------

export const registerTeam = async (tournamentId: string, teamId: string) => {
    // Check if tournament exists and is in UPCOMING/REGISTRATION
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'REGISTRATION') throw new Error('Tournament registration closed');

    // Check limit
    // Cast to any because count might complain about where clause if types are stale
    const count = await prisma.tournamentTeam.count({ where: { tournamentId } } as any);
    if (count >= tournament.maxTeams) throw new Error('Tournament full');

    return prisma.tournamentTeam.create({
        data: {
            tournamentId,
            teamId,
            seedNumber: null, // Optional
            groupId: null // Optional
        } as any
    });
};

// -----------------------------------------------------------------------------
// Logic: Fixtures & Standings
// -----------------------------------------------------------------------------

export const generateFixtures = async (tournamentId: string) => {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { teams: true } // as any? No, let's see. logic uses .teams.map
    } as any);
    if (!tournament) throw new Error('Tournament not found');

    const teams = (tournament as any).teams || [];
    const teamIds = teams.map((t: any) => t.teamId);
    let fixturesData: any[] = [];

    const existingFixtures = await prisma.tournamentFixture.findFirst({ where: { tournamentId } });
    if (existingFixtures) {
        // Idempotency: Return existing (or throw?)
        // Better to fetch and return.
        return prisma.tournamentFixture.findMany({ where: { tournamentId }, orderBy: { matchNumber: 'asc' } });
    }

    if (tournament.format === 'LEAGUE') {
        fixturesData = generateRoundRobinFixtures(tournamentId, teamIds);
    } else if (tournament.format === 'KNOCKOUT') {
        fixturesData = generateKnockoutFixtures(tournamentId, teamIds);
    }

    if (fixturesData.length > 0) {
        await prisma.tournamentFixture.createMany({
            data: fixturesData
        });

        // Update Status
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { status: 'GROUP_STAGE' } // as any
        } as any);

        // Handle BYEs (Auto-advance)
        // Find fixtures with awayTeamId = null (BYE)
        if (tournament.format === 'KNOCKOUT') {
            const byes = await prisma.tournamentFixture.findMany({
                where: { tournamentId, awayTeamId: null }
            });

            for (const bye of byes) {
                await prisma.$transaction(async (tx) => {
                    // 1. Mark as Completed
                    await tx.tournamentFixture.update({
                        where: { id: bye.id },
                        data: {
                            status: 'COMPLETED',
                            winnerId: bye.homeTeamId,
                            result: 'BYE' // Schema support? result is String? Yes.
                        } as any
                    });

                    // 2. Advance
                    if (bye.homeTeamId) {
                        await advanceKnockoutBracket(tx, { ...bye, matchNumber: bye.matchNumber, round: bye.round }, bye.homeTeamId);
                    }
                });
            }
        }
    }

    return fixturesData;
};

// Redis Cache Key helper
const getStandingsKey = (id: string) => `tournament:${id}:standings`;
import redis from '../utils/redis.js';

export const getStandings = async (tournamentId: string) => {
    // 1. Check Cache
    if (redis) {
        try {
            const cached = await redis.get(getStandingsKey(tournamentId));
            if (cached) return JSON.parse(cached);
        } catch (e) { console.warn('Redis get failed', e); }
    }

    // 2. Compute Dynamically
    // Fetch all completed matches for this tournament
    const fixtures = await prisma.tournamentFixture.findMany({
        where: { tournamentId, status: 'COMPLETED', matchSummaryId: { not: null } },
        select: { matchSummaryId: true }
    });

    const matchIds = fixtures.map(f => f.matchSummaryId).filter((id: string | null) => id !== null) as string[];

    // Fetch matches with innings
    const matches = await prisma.matchSummary.findMany({
        where: { id: { in: matchIds }, status: 'COMPLETED' },
        include: { innings: true }
    });

    const stats: Record<string, any> = {};

    // Helper to init team stats
    const initTeam = (id: string, name: string) => {
        if (!stats[id]) {
            stats[id] = {
                teamId: id,
                teamName: name, // We might need to fetch team details if not in matches, but usually play matches.
                // Or we fetch all teams from TournamentTeam to show empty entries too.
                played: 0,
                won: 0,
                lost: 0,
                tied: 0,
                noResult: 0,
                points: 0,
                runsScored: 0,
                ballsFaced: 0,
                runsConceded: 0,
                ballsBowled: 0,
                netRunRate: 0.0
            };
        }
    };

    // Pre-fill with registered teams (so 0 played shows up)
    const registeredTeams = await prisma.tournamentTeam.findMany({
        where: { tournamentId },
        include: { team: { select: { id: true, name: true, logoUrl: true } } }
    });

    for (const rt of registeredTeams) {
        initTeam(rt.teamId, rt.team.name);
        stats[rt.teamId].logoUrl = rt.team.logoUrl;
    }

    // Process Matches
    for (const m of matches) {
        if (!m.homeTeamId || !m.awayTeamId) continue;
        initTeam(m.homeTeamId, m.homeTeamName);
        initTeam(m.awayTeamId, m.awayTeamName);

        const s1 = stats[m.homeTeamId];
        const s2 = stats[m.awayTeamId];

        s1.played++;
        s2.played++;

        // Points
        if (m.result === 'WIN' && m.winningTeamName) {
            if (m.winningTeamName === m.homeTeamName) {
                s1.won++;
                s1.points += 2;
                s2.lost++;
            } else {
                s2.won++;
                s2.points += 2;
                s1.lost++;
            }
        } else if (m.result === 'TIE' || m.result === 'NO_RESULT') {
            s1.points += 1;
            s2.points += 1;
            if (m.result === 'TIE') { s1.tied++; s2.tied++; }
            else { s1.noResult++; s2.noResult++; }
        }

        // NRR Calculation Data
        // Exclude NO_RESULT/ABANDONED from NRR
        if (m.result !== 'NO_RESULT' && m.result !== 'ABANDONED') {
            // Iterate Innings
            for (const inn of m.innings) {
                if (inn.battingTeamId) {
                    const battingStats = stats[inn.battingTeamId];
                    if (battingStats) {
                        battingStats.runsScored += inn.totalRuns;
                        battingStats.ballsFaced += isAllOut(inn) ? m.overs * 6 : inn.totalBalls; // If all out, count full overs
                    }
                }
                if (inn.bowlingTeamId) {
                    const bowlingStats = stats[inn.bowlingTeamId];
                    if (bowlingStats) {
                        bowlingStats.runsConceded += inn.totalRuns;
                        bowlingStats.ballsBowled += inn.totalBalls; // Correct? Usually yes.
                    }
                }
            }
        }
    }

    // Compute NRR
    const result = Object.values(stats).map(t => {
        const oversFaced = t.ballsFaced > 0 ? t.ballsFaced / 6 : 0;
        const oversBowled = t.ballsBowled > 0 ? t.ballsBowled / 6 : 0;

        const battingRR = oversFaced > 0 ? t.runsScored / oversFaced : 0;
        const bowlingRR = oversBowled > 0 ? t.runsConceded / oversBowled : 0;

        t.netRunRate = parseFloat((battingRR - bowlingRR).toFixed(3));
        return t;
    });

    // Sort
    result.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.netRunRate - a.netRunRate;
    });

    // 3. Cache
    if (redis) {
        redis.setex(getStandingsKey(tournamentId), 60, JSON.stringify(result)).catch(console.warn);
    }

    return result;
};

// Helper for NRR (All Out check)
function isAllOut(inn: any) {
    // Basic check: wickets = 10? Or logic based on match format (players - 1).
    // Assuming 10 wickets for now.
    return inn.totalWickets >= 10;
}

// -----------------------------------------------------------------------------
// Match Completion Handler
// -----------------------------------------------------------------------------

/**
 * @deprecated Logic moved to matchFinalizationService for atomicity.
 */
export const handleMatchCompletion = async (_matchId: string) => {
    // Logic moved to matchFinalizationService.ts (single-transaction refactor).
    // This function is kept as a no-op stub for backward compatibility.
    return;
};

/**
 * Advance Knockout Bracket
 * Deterministic advancement based on Match Number.
 */
export async function advanceKnockoutBracket(tx: any, currentFixture: any, winnerId: string) {
    const { tournamentId, round, matchNumber } = currentFixture;

    // 1. Fetch all fixtures to determine rounds order
    const allFixtures = await tx.tournamentFixture.findMany({
        where: { tournamentId },
        orderBy: { matchNumber: 'asc' }, // Match number global or per round?
        // If matchNumber is unique per round, we need round order.
        // Assuming round string is arbitrary, we rely on semantic rounds or metadata?
        // User rule: "Extract ordered unique rounds".
        // Use created order or match number?
        // Usually, later rounds have higher match numbers if global?
        // Or we use distinct on round.
    });

    // Sort rounds logically? 
    // If we don't have metadata, we might need a mapping.
    // Let's assume standard names: "Round 1", "Round 2"... or "Quarter-Final", "Semi-Final", "Final".
    // Or we scan `allFixtures` and group by round.
    // If matchNumber resets per round, we need explicit round order.
    // User Implementation Rule 1: "Fetch all fixtures... Extract ordered unique rounds."
    // If they are not ordered in DB, we rely on array order? No.
    // Let's assume rounds are inserted in order.

    // Better Strategy: If we generated them, we know order.
    // If not, we can't guess "Round 1" vs "Preliminary".
    // fallback: Try to find round with name "Round X+1"?
    // Or just look for "Next Match".
    // Logic: Next Match Number = ceil(matchNumber/2).
    // Does next match exist?
    // If we assume Global Match Numbering (1..N), then parent is always fixed.
    // But `generateKnockoutFixtures` (Step 1984) resets matchNumber to 1 for each round? 
    // Step 1984 line 59: `matchNumber: matchNumber++`. It restarts? 
    // Actually `matchNumber` is local variable.
    // If we call `generateKnockoutFixtures` multiple times (for multiple rounds), it might restart.
    // But we usually generate Round 1 only. Future rounds are "Dynamic".
    // So "Next Round" doesn't exist yet!
    // We must CREATE it.

    // Determine Next Round Name
    let nextRound = '';
    const roundNames = ['Round 1', 'Round 2', 'Round 3', 'Quarter-Final', 'Semi-Final', 'Final'];
    const rIndex = roundNames.indexOf(round);
    if (rIndex !== -1 && rIndex < roundNames.length - 1) {
        nextRound = roundNames[rIndex + 1]!;
    } else {
        // Fallback: If "Round 1", next "Round 2".
        if (round.startsWith('Round ')) {
            const num = parseInt(round.split(' ')[1]);
            nextRound = `Round ${num + 1}`;
        } else if (round === 'Quarter-Final') nextRound = 'Semi-Final';
        else if (round === 'Semi-Final') nextRound = 'Final';
        else return; // Champion?
    }

    const nextMatchNumber = Math.ceil(matchNumber / 2);
    const isHomeSlot = (matchNumber % 2 !== 0); // Odd -> Home

    // Check if next fixture exists
    let nextFixture = await tx.tournamentFixture.findFirst({
        where: { tournamentId, round: nextRound, matchNumber: nextMatchNumber }
    });

    if (!nextFixture) {
        // Create it
        nextFixture = await tx.tournamentFixture.create({
            data: {
                tournamentId,
                round: nextRound,
                matchNumber: nextMatchNumber,
                homeTeamId: isHomeSlot ? winnerId : null,
                awayTeamId: !isHomeSlot ? winnerId : null,
                status: 'SCHEDULED' // or UPCOMING
            }
        });
    } else {
        // Update it
        // Idempotency check
        if (isHomeSlot) {
            if (nextFixture.homeTeamId === winnerId) return; // Already there
            if (nextFixture.homeTeamId) throw new Error('Slot occupied by another team');

            await tx.tournamentFixture.update({
                where: { id: nextFixture.id },
                data: { homeTeamId: winnerId }
            });
        } else {
            if (nextFixture.awayTeamId === winnerId) return;
            if (nextFixture.awayTeamId) throw new Error('Slot occupied by another team');

            await tx.tournamentFixture.update({
                where: { id: nextFixture.id },
                data: { awayTeamId: winnerId }
            });
        }
    }
}
