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
    });
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
    const count = await prisma.tournamentTeam.count({ where: { tournamentId } });
    if (count >= tournament.maxTeams) throw new Error('Tournament full');

    return prisma.tournamentTeam.create({
        data: {
            tournamentId,
            teamId
        }
    });
};

// -----------------------------------------------------------------------------
// Logic: Fixtures & Standings
// -----------------------------------------------------------------------------

export const generateFixtures = async (tournamentId: string) => {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { teams: true }
    });
    if (!tournament) throw new Error('Tournament not found');

    const teamIds = tournament.teams.map(t => t.teamId);
    let fixturesData = [];

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
            data: { status: 'GROUP_STAGE' as any } // or whatever status
        });
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
        include: { team: true } // Assuming relation exists? Schema had: teamId String. Relation: team Team.
    });
};
