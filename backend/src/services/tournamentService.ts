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
    }

    return fixturesData;
};

export const getStandings = async (tournamentId: string) => {
    // If we persist standings, fetch them.
    // If not, calculate on fly? 
    // Schema has TournamentStanding model. Use it.
    return prisma.tournamentStanding.findMany({
        where: { tournamentId },
        orderBy: [
            { points: 'desc' },
            { netRunRate: 'desc' }
        ],
        include: { team: true }
    } as any);
};

// -----------------------------------------------------------------------------
// Match Completion Handler
// -----------------------------------------------------------------------------

export const handleMatchCompletion = async (matchId: string) => {
    try {
        // 1. Find fixture linked to this match
        const fixture = await prisma.tournamentFixture.findFirst({
            where: { matchSummaryId: matchId },
            include: { tournament: true }
        } as any);

        if (!fixture) return; // Not a tournament match

        // 2. Get Match Details (Winner, Scores)
        const match = await prisma.matchSummary.findUnique({ where: { id: matchId } });
        if (!match || match.status !== 'COMPLETED') return;

        // 3. Update Fixture (Set Winner)
        let winnerId: string | null = null;
        if (match.result === 'WIN' && match.winningTeamName) {
            if (match.winningTeamName === match.homeTeamName) winnerId = match.homeTeamId;
            else if (match.winningTeamName === match.awayTeamName) winnerId = match.awayTeamId;
        }

        await prisma.tournamentFixture.update({
            where: { id: fixture.id },
            data: {
                status: 'COMPLETED',
                winnerId
            } as any
        });

        // 4. Update Standings (Points)
        if (winnerId) {
            // Winner gets 2 points
            await prisma.tournamentStanding.updateMany({
                where: { tournamentId: fixture.tournamentId, teamId: winnerId },
                data: {
                    played: { increment: 1 },
                    won: { increment: 1 },
                    points: { increment: 2 }
                }
            });

            // Loser
            const loserId = winnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
            if (loserId) {
                await prisma.tournamentStanding.updateMany({
                    where: { tournamentId: fixture.tournamentId, teamId: loserId },
                    data: {
                        played: { increment: 1 },
                        lost: { increment: 1 }
                    }
                });
            }
        } else {
            // Tie/No Result (1 point each)
            if (match.homeTeamId && match.awayTeamId) {
                await prisma.tournamentStanding.updateMany({
                    where: { tournamentId: fixture.tournamentId, teamId: { in: [match.homeTeamId, match.awayTeamId] } },
                    data: {
                        played: { increment: 1 },
                        tied: { increment: 1 },
                        points: { increment: 1 }
                    }
                });
            }
        }

        // 5. Advance Winner (If Knockout) - Placeholder
        if ((fixture as any).tournament.format === 'KNOCKOUT' && winnerId) {
            // TODO: Implement Bracket Advancement
        }
    } catch (error) {
        console.error('Error handling tournament match completion:', error);
    }
};
