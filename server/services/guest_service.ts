import { nanoid } from 'nanoid';
import { prisma as db } from '../db';

/**
 * Generates a unique 5-character alphanumeric guest code
 * Format: lowercase alphanumeric (e.g., "g7x3k", "a2b4c")
 */
export async function generateGuestCode(): Promise<string> {
    const maxAttempts = 10;

    for (let i = 0; i < maxAttempts; i++) {
        // Generate 5-char code using nanoid with custom alphabet
        const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
        let code = '';
        for (let j = 0; j < 5; j++) {
            code += alphabet[Math.floor(Math.random() * alphabet.length)];
        }

        // Check if code already exists
        const existing = await db.guestPlayer.findFirst({
            where: { guestCode: code }
        });

        if (!existing) {
            return code;
        }
    }

    // Fallback to nanoid if all attempts fail
    return nanoid(5).toLowerCase();
}

/**
 * Find a guest player by their guest code
 */
export async function findGuestByCode(guestCode: string) {
    return await db.guestPlayer.findFirst({
        where: { guestCode: guestCode.toLowerCase() },
        include: {
            team: true,
            addedBy: {
                select: {
                    id: true,
                    username: true,
                    profileName: true,
                }
            },
            linkedUser: {
                select: {
                    id: true,
                    username: true,
                    profileName: true,
                    profilePictureUrl: true,
                }
            }
        }
    });
}

/**
 * Get match history for a guest player
 */
export async function getGuestMatchHistory(guestPlayerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [matches, totalCount] = await Promise.all([
        db.playerMatchHistory.findMany({
            where: { guestPlayerId },
            include: {
                matchSummary: true,
                team: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        db.playerMatchHistory.count({
            where: { guestPlayerId }
        })
    ]);

    return {
        matches,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit)
    };
}

/**
 * Calculate aggregate stats for a guest player from match history
 */
export async function calculateGuestStats(guestPlayerId: string) {
    const matchHistory = await db.playerMatchHistory.findMany({
        where: { guestPlayerId }
    });

    if (matchHistory.length === 0) {
        return null;
    }

    // Aggregate batting stats
    const totalRuns = matchHistory.reduce((sum: number, m: any) => sum + m.runsScored, 0);
    const totalBalls = matchHistory.reduce((sum: number, m: any) => sum + m.ballsFaced, 0);
    const totalFours = matchHistory.reduce((sum: number, m: any) => sum + m.fours, 0);
    const totalSixes = matchHistory.reduce((sum: number, m: any) => sum + m.sixes, 0);
    const timesOut = matchHistory.filter((m: any) => m.wasDismissed).length;
    const highestScore = Math.max(...matchHistory.map((m: any) => m.runsScored));

    // Aggregate bowling stats
    const totalWickets = matchHistory.reduce((sum: number, m: any) => sum + m.wicketsTaken, 0);
    const totalRunsConceded = matchHistory.reduce((sum: number, m: any) => sum + m.runsConceded, 0);
    const totalOvers = matchHistory.reduce((sum: number, m: any) => sum + m.oversBowled, 0);
    const totalMaidens = matchHistory.reduce((sum: number, m: any) => sum + m.maidenOvers, 0);

    // Aggregate fielding stats
    const totalCatches = matchHistory.reduce((sum: number, m: any) => sum + m.catchesTaken, 0);
    const totalRunOuts = matchHistory.reduce((sum: number, m: any) => sum + m.runOuts, 0);

    // Calculate rates
    const strikeRate = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0;
    // If never out, average is total runs
    const battingAverage = timesOut > 0 ? totalRuns / timesOut : totalRuns;

    // Convert overs to decimal for economy calculation
    const convertOversToDecimal = (cricketOvers: number): number => {
        const wholeOvers = Math.floor(cricketOvers);
        const balls = Math.round((cricketOvers - wholeOvers) * 10);
        return wholeOvers + (balls / 6);
    };
    const decimalOvers = convertOversToDecimal(totalOvers);
    const economy = decimalOvers > 0 ? totalRunsConceded / decimalOvers : 0;
    const bowlingAverage = totalWickets > 0 ? totalRunsConceded / totalWickets : 0;

    return {
        matchesPlayed: matchHistory.length,
        // Batting
        totalRuns,
        ballsFaced: totalBalls,
        fours: totalFours,
        sixes: totalSixes,
        highestScore,
        strikeRate: parseFloat(strikeRate.toFixed(2)),
        battingAverage: parseFloat(battingAverage.toFixed(2)),
        timesOut,
        // Bowling
        wicketsTaken: totalWickets,
        runsConceded: totalRunsConceded,
        oversBowled: totalOvers,
        maidenOvers: totalMaidens,
        economy: parseFloat(economy.toFixed(2)),
        bowlingAverage: parseFloat(bowlingAverage.toFixed(2)),
        // Fielding
        catchesTaken: totalCatches,
        runOuts: totalRunOuts,
        // Man of the Match
        manOfTheMatchAwards: matchHistory.filter((m: any) => m.isManOfTheMatch).length,
    };
}

export const guestService = {
    generateGuestCode,
    findGuestByCode,
    getGuestMatchHistory,
    calculateGuestStats,
};
