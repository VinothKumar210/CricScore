// import { TournamentFixture } from '@prisma/client';

/**
 * Generate Round Robin Fixtures
 * Each team plays every other team once.
 */
export const generateRoundRobinFixtures = (
    tournamentId: string,
    teamIds: string[]
) => {
    const fixtures: any[] = [];
    const n = teamIds.length;
    if (n < 2) return [];

    // Round Robin Logic (Circle Method or Simple Pairing)
    // Simple approach: Iterate all pairs
    let matchNumber = 1;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            fixtures.push({
                tournamentId,
                round: 'Group Stage',
                matchNumber: matchNumber++,
                homeTeamId: teamIds[i],
                awayTeamId: teamIds[j],
                status: 'UPCOMING'
            });
        }
    }
    return fixtures;
};

/**
 * Generate Knockout Bracket
 * Powers of 2 (2, 4, 8, 16, 32...). If not, some teams get byes (not implemented yet, assuming power of 2 for simplicity or simply creating matches for next round).
 * Actually, for initial round, we pair them up.
 */
export const generateKnockoutFixtures = (
    tournamentId: string,
    teamIds: string[]
) => {
    const fixtures: any[] = [];
    const n = teamIds.length;

    // Sort logic? Random for now or based on seeds if provided (omitted)

    // Round 1 (e.g. Quarter Finals)
    let matchNumber = 1;
    let roundName = 'Round 1';
    if (n === 2) roundName = 'Final';
    else if (n === 4) roundName = 'Semi-Final';
    else if (n === 8) roundName = 'Quarter-Final';

    for (let i = 0; i < n; i += 2) {
        if (i + 1 < n) {
            fixtures.push({
                tournamentId,
                round: roundName,
                matchNumber: matchNumber++,
                homeTeamId: teamIds[i],
                awayTeamId: teamIds[i + 1],
                status: 'UPCOMING'
            });
        } else {
            // Bye (Odd number of teams)
            // Create a BYE fixture (Away Team NULL)
            fixtures.push({
                tournamentId,
                round: roundName,
                matchNumber: matchNumber++,
                homeTeamId: teamIds[i],
                awayTeamId: null, // Bye
                status: 'SCHEDULED' // Will be auto-advanced
            });
        }
    }

    // Creating placeholder slots for future rounds is harder without "winner of match X" logic.
    // We will generate future rounds DYNAMICALLY when round completed.

    return fixtures;
};
