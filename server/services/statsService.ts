/**
 * Stats Service - Phase 4 Implementation
 * Handles match result processing and stats updates for both users and guest players
 */

import { prisma } from "../db.js";

// Type for player performance data from frontend
interface PlayerPerformance {
    playerName: string;
    username?: string;        // For registered users - unique username
    guestCode?: string;       // For guest players - 5-char code
    teamId?: string;
    teamName: string;
    runsScored: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    wasDismissed: boolean;
    wicketsTaken: number;
    oversBowled: number;
    runsConceded: number;
    catchesTaken: number;
    runOuts: number;
    isManOfTheMatch: boolean;
}

// Type for extras breakdown
interface ExtrasData {
    byes: number;
    legByes: number;
    wides: number;
    noBalls: number;
    penalty: number;
}

// Type for Fall of Wicket entry
interface FOWEntry {
    wicket: number;
    runs: number;
    overs: number;
    batsman: string;
}

// Type for Partnership entry
interface PartnershipEntry {
    batsman1: string;
    batsman2: string;
    runs: number;
    balls: number;
}

// Type for match data from frontend
interface MatchData {
    homeTeamId?: string;
    homeTeamName: string;
    homeTeamLogo?: string;
    awayTeamId?: string;
    awayTeamName: string;
    awayTeamLogo?: string;
    matchDate: string;
    venue: string;
    matchType?: string;         // "Open Match", "Tournament", "Practice"
    matchFormat?: string;       // "T20", "ODI", "Test"
    result: 'HOME_WIN' | 'AWAY_WIN' | 'DRAW';
    resultDescription?: string; // "won by 6 wickets" or "won by 41 runs"
    homeTeamRuns: number;
    homeTeamWickets: number;
    homeTeamOvers: number;
    awayTeamRuns: number;
    awayTeamWickets: number;
    awayTeamOvers: number;

    // New fields for Match Centre
    firstInningsExtras?: ExtrasData;
    secondInningsExtras?: ExtrasData;
    firstInningsFOW?: FOWEntry[];
    secondInningsFOW?: FOWEntry[];
    firstInningsPartnerships?: PartnershipEntry[];
    secondInningsPartnerships?: PartnershipEntry[];
    ballByBallData?: any[];     // Complete ball-by-ball array

    playerPerformances: PlayerPerformance[];
}

class StatsService {

    /**
     * Validates if a string is a valid MongoDB ObjectID format
     */
    private isValidObjectId(id: string | undefined): boolean {
        if (!id) return false;
        return /^[a-fA-F0-9]{24}$/.test(id);
    }

    /**
     * Check if player ID indicates a guest player
     */
    private isGuestPlayer(playerId: string | undefined): boolean {
        return !!playerId && playerId.startsWith('guest-');
    }

    /**
     * Extract guest code from guest player ID
     */
    private extractGuestCode(playerId: string): string {
        return playerId.replace('guest-', '');
    }

    /**
     * Main entry point: Processes a complete match result
     */
    async processMatchResult(matchData: MatchData): Promise<{ success: boolean; message: string; matchSummaryId?: string }> {
        console.log(`[StatsService] Processing match: ${matchData.homeTeamName} vs ${matchData.awayTeamName}`);

        try {
            // 1. Create MatchSummary record
            const matchSummary = await this.createMatchSummary(matchData);
            console.log(`[StatsService] Created MatchSummary: ${matchSummary.id}`);

            // 2. Process each player's performance
            const players = matchData.playerPerformances || [];
            console.log(`[StatsService] Processing ${players.length} player performances`);

            for (const performance of players) {
                await this.processPlayerPerformance(performance, matchSummary.id);
            }

            return {
                success: true,
                message: `Match stats processed successfully for ${players.length} players`,
                matchSummaryId: matchSummary.id
            };
        } catch (error) {
            console.error("[StatsService] Error processing match:", error);
            throw error;
        }
    }

    /**
     * Creates a MatchSummary record matching the actual schema
     */
    private async createMatchSummary(matchData: MatchData) {
        // Separate home and away team players
        const homePlayers = matchData.playerPerformances.filter(p => p.teamName === matchData.homeTeamName);
        const awayPlayers = matchData.playerPerformances.filter(p => p.teamName === matchData.awayTeamName);

        // Determine winner
        let winningTeam = 'Draw';
        if (matchData.result === 'HOME_WIN') {
            winningTeam = matchData.homeTeamName;
        } else if (matchData.result === 'AWAY_WIN') {
            winningTeam = matchData.awayTeamName;
        }

        // Map result to enum value
        const resultEnum = matchData.result as 'HOME_WIN' | 'AWAY_WIN' | 'DRAW';

        return prisma.matchSummary.create({
            data: {
                matchDate: new Date(matchData.matchDate),
                venue: matchData.venue || 'Local Ground',

                // Team information
                homeTeamId: this.isValidObjectId(matchData.homeTeamId) ? matchData.homeTeamId : undefined,
                homeTeamName: matchData.homeTeamName,
                homeTeamLogo: matchData.homeTeamLogo,
                awayTeamId: this.isValidObjectId(matchData.awayTeamId) ? matchData.awayTeamId : undefined,
                awayTeamName: matchData.awayTeamName,
                awayTeamLogo: matchData.awayTeamLogo,

                // Match classification
                matchType: matchData.matchType || 'Open Match',
                matchFormat: matchData.matchFormat || 'T20',

                // Match result
                result: resultEnum,
                winningTeam,
                resultDescription: matchData.resultDescription,

                // First innings (home team batting first assumed)
                firstInningsTeam: matchData.homeTeamName,
                firstInningsRuns: matchData.homeTeamRuns,
                firstInningsWickets: matchData.homeTeamWickets,
                firstInningsOvers: matchData.homeTeamOvers,

                // Second innings
                secondInningsTeam: matchData.awayTeamName,
                secondInningsRuns: matchData.awayTeamRuns,
                secondInningsWickets: matchData.awayTeamWickets,
                secondInningsOvers: matchData.awayTeamOvers,

                // Target
                target: matchData.homeTeamRuns + 1,

                // Store player data as JSON
                firstInningsBatsmen: homePlayers.map(p => ({
                    playerName: p.playerName,
                    runs: p.runsScored,
                    balls: p.ballsFaced,
                    fours: p.fours,
                    sixes: p.sixes,
                    isOut: p.wasDismissed
                })),
                firstInningsBowlers: awayPlayers.map(p => ({
                    playerName: p.playerName,
                    overs: p.oversBowled,
                    runs: p.runsConceded,
                    wickets: p.wicketsTaken
                })),
                secondInningsBatsmen: awayPlayers.map(p => ({
                    playerName: p.playerName,
                    runs: p.runsScored,
                    balls: p.ballsFaced,
                    fours: p.fours,
                    sixes: p.sixes,
                    isOut: p.wasDismissed
                })),
                secondInningsBowlers: homePlayers.map(p => ({
                    playerName: p.playerName,
                    overs: p.oversBowled,
                    runs: p.runsConceded,
                    wickets: p.wicketsTaken
                })),

                // NEW: Extras breakdown per innings
                firstInningsExtras: matchData.firstInningsExtras || null,
                secondInningsExtras: matchData.secondInningsExtras || null,

                // NEW: Fall of Wickets
                firstInningsFOW: matchData.firstInningsFOW || null,
                secondInningsFOW: matchData.secondInningsFOW || null,

                // NEW: Partnerships
                firstInningsPartnerships: matchData.firstInningsPartnerships || null,
                secondInningsPartnerships: matchData.secondInningsPartnerships || null,

                // NEW: Ball-by-ball data
                ballByBallData: matchData.ballByBallData || null,
            }
        });
    }

    /**
     * Process a single player's performance
     * Uses username for registered users, guestCode for guests
     * Falls back to name-based matching if neither is provided
     */
    private async processPlayerPerformance(performance: PlayerPerformance, matchSummaryId: string) {
        console.log(`[StatsService] Processing player: ${performance.playerName}`);

        // Priority 1: Check if guest player (has guestCode)
        if (performance.guestCode) {
            console.log(`[StatsService] -> Guest player with code: ${performance.guestCode}`);
            await this.updateGuestStats(performance.guestCode, performance, matchSummaryId);
            return;
        }

        // Priority 2: Check if registered user (has username)
        if (performance.username) {
            console.log(`[StatsService] -> Registered user: @${performance.username}`);
            await this.updateUserStatsByUsername(performance.username, performance, matchSummaryId);
            return;
        }

        // Priority 3: Fallback - try to match by playerName
        console.log(`[StatsService] -> No username/guestCode, trying name match for: ${performance.playerName}`);

        // Try to find user by username (case-insensitive exact match)
        const user = await prisma.user.findFirst({
            where: {
                username: { equals: performance.playerName, mode: 'insensitive' }
            }
        });

        if (user) {
            console.log(`[StatsService] -> Name matched to user: @${user.username} (ID: ${user.id})`);
            await this.updateUserStats(user.id, performance, matchSummaryId);
            return;
        }

        // Try to find guest player by name (case-insensitive)
        const guest = await prisma.guestPlayer.findFirst({
            where: {
                name: { equals: performance.playerName, mode: 'insensitive' }
            }
        });

        if (guest) {
            console.log(`[StatsService] -> Name matched to guest: ${guest.guestCode}`);
            await this.updateGuestStats(guest.guestCode, performance, matchSummaryId);
            return;
        }

        console.log(`[StatsService] Skipping ${performance.playerName}: no match found by username, guestCode, or name`);
    }

    /**
     * Update stats for a registered user (by username)
     */
    private async updateUserStatsByUsername(username: string, performance: PlayerPerformance, matchSummaryId: string) {
        console.log(`[StatsService] Looking up user by username: ${username}`);

        // Lookup user by username
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            console.error(`[StatsService] User not found with username: ${username}`);
            return;
        }

        console.log(`[StatsService] Found user: ${user.profileName || user.username} (ID: ${user.id})`);

        // Now use their ObjectId for database operations
        await this.updateUserStats(user.id, performance, matchSummaryId);
    }

    /**
     * Update stats for a registered user
     */
    private async updateUserStats(userId: string, performance: PlayerPerformance, matchSummaryId: string) {
        console.log(`[StatsService] Updating user stats for: ${userId}`);

        // 1. Create PlayerMatchHistory record
        await prisma.playerMatchHistory.create({
            data: {
                matchSummaryId,
                userId,
                teamId: this.isValidObjectId(performance.teamId) ? performance.teamId : undefined,
                teamName: performance.teamName,
                playerName: performance.playerName,
                runsScored: performance.runsScored,
                ballsFaced: performance.ballsFaced,
                fours: performance.fours,
                sixes: performance.sixes,
                wasDismissed: performance.wasDismissed,
                wicketsTaken: performance.wicketsTaken,
                oversBowled: performance.oversBowled,
                runsConceded: performance.runsConceded,
                catchesTaken: performance.catchesTaken,
                runOuts: performance.runOuts,
                isManOfTheMatch: performance.isManOfTheMatch,
            }
        });

        // 2. Update or create CareerStats
        const existingStats = await prisma.careerStats.findUnique({ where: { userId } });

        if (existingStats) {
            // Calculate new highest score
            const newHighestScore = Math.max(existingStats.highestScore, performance.runsScored);

            // Calculate new best bowling (compare wickets, then runs if equal)
            let newBestBowlingWickets = existingStats.bestBowlingWickets;
            let newBestBowlingRuns = existingStats.bestBowlingRuns;
            if (performance.wicketsTaken > existingStats.bestBowlingWickets ||
                (performance.wicketsTaken === existingStats.bestBowlingWickets &&
                    performance.runsConceded < existingStats.bestBowlingRuns)) {
                newBestBowlingWickets = performance.wicketsTaken;
                newBestBowlingRuns = performance.runsConceded;
            }

            await prisma.careerStats.update({
                where: { userId },
                data: {
                    matchesPlayed: { increment: 1 },
                    totalRuns: { increment: performance.runsScored },
                    ballsFaced: { increment: performance.ballsFaced },
                    fours: { increment: performance.fours },
                    sixes: { increment: performance.sixes },
                    highestScore: newHighestScore,
                    timesOut: performance.wasDismissed ? { increment: 1 } : undefined,
                    wicketsTaken: { increment: performance.wicketsTaken },
                    oversBowled: { increment: performance.oversBowled },
                    runsConceded: { increment: performance.runsConceded },
                    bestBowlingWickets: newBestBowlingWickets,
                    bestBowlingRuns: newBestBowlingRuns,
                    catchesTaken: { increment: performance.catchesTaken },
                    runOuts: { increment: performance.runOuts },
                }
            });
        } else {
            // Create new CareerStats
            await prisma.careerStats.create({
                data: {
                    userId,
                    matchesPlayed: 1,
                    totalRuns: performance.runsScored,
                    ballsFaced: performance.ballsFaced,
                    fours: performance.fours,
                    sixes: performance.sixes,
                    highestScore: performance.runsScored,
                    timesOut: performance.wasDismissed ? 1 : 0,
                    wicketsTaken: performance.wicketsTaken,
                    oversBowled: performance.oversBowled,
                    runsConceded: performance.runsConceded,
                    bestBowlingWickets: performance.wicketsTaken,
                    bestBowlingRuns: performance.runsConceded,
                    catchesTaken: performance.catchesTaken,
                    runOuts: performance.runOuts,
                }
            });
        }

        console.log(`[StatsService] Updated CareerStats for user: ${userId}`);
    }

    /**
     * Update stats for a guest player
     */
    private async updateGuestStats(guestCode: string, performance: PlayerPerformance, matchSummaryId: string) {
        console.log(`[StatsService] Updating guest stats for code: ${guestCode}`);

        // Find guest by code
        const guest = await prisma.guestPlayer.findUnique({ where: { guestCode } });

        if (!guest) {
            console.error(`[StatsService] Guest not found with code: ${guestCode}`);
            return;
        }

        // 1. Create PlayerMatchHistory record
        await prisma.playerMatchHistory.create({
            data: {
                matchSummaryId,
                guestPlayerId: guest.id,
                teamId: guest.teamId,
                teamName: performance.teamName,
                playerName: performance.playerName,
                runsScored: performance.runsScored,
                ballsFaced: performance.ballsFaced,
                fours: performance.fours,
                sixes: performance.sixes,
                wasDismissed: performance.wasDismissed,
                wicketsTaken: performance.wicketsTaken,
                oversBowled: performance.oversBowled,
                runsConceded: performance.runsConceded,
                catchesTaken: performance.catchesTaken,
                runOuts: performance.runOuts,
                isManOfTheMatch: performance.isManOfTheMatch,
            }
        });

        // 2. Update GuestPlayer stats (aggregate on the model itself)
        await prisma.guestPlayer.update({
            where: { id: guest.id },
            data: {
                matchesPlayed: { increment: 1 },
                totalRuns: { increment: performance.runsScored },
                ballsFaced: { increment: performance.ballsFaced },
                fours: { increment: performance.fours },
                sixes: { increment: performance.sixes },
                wicketsTaken: { increment: performance.wicketsTaken },
                oversBowled: { increment: performance.oversBowled },
                runsConceded: { increment: performance.runsConceded },
                catchesTaken: { increment: performance.catchesTaken },
                runOuts: { increment: performance.runOuts },
            }
        });
        console.log(`[StatsService] Updated GuestPlayer stats for: ${guest.name} (${guestCode})`);
    }

    /**
 * Links a Guest Player to a Real User and merges stats.
 * - Merges CareerStats (sums all values)
 * - Transfers PlayerMatchHistory records
 * - Adds user to team as full member (if not already)
 * - Handles multiple guest profiles for same user
 * - Archives guest profile (sets linkedUserId)
 */
    async linkGuestToUser(guestId: string, userId: string) {
        console.log(`[StatsService] Linking guest ${guestId} to user ${userId}`);

        const guest = await prisma.guestPlayer.findUnique({ where: { id: guestId } });
        if (!guest) {
            throw new Error('Guest player not found');
        }

        if (guest.linkedUserId) {
            throw new Error('Guest player is already linked to a user');
        }

        // Verify the target user exists
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            throw new Error('Target user not found');
        }

        // Get or create user's career stats
        let userStats = await prisma.careerStats.findUnique({ where: { userId } });

        if (userStats) {
            // Merge guest stats into existing career stats
            await prisma.careerStats.update({
                where: { userId },
                data: {
                    matchesPlayed: { increment: guest.matchesPlayed },
                    totalRuns: { increment: guest.totalRuns },
                    ballsFaced: { increment: guest.ballsFaced },
                    fours: { increment: guest.fours },
                    sixes: { increment: guest.sixes },
                    wicketsTaken: { increment: guest.wicketsTaken },
                    oversBowled: { increment: guest.oversBowled },
                    runsConceded: { increment: guest.runsConceded },
                    catchesTaken: { increment: guest.catchesTaken },
                    runOuts: { increment: guest.runOuts },
                }
            });
        } else {
            // Create new career stats from guest
            await prisma.careerStats.create({
                data: {
                    userId,
                    matchesPlayed: guest.matchesPlayed,
                    totalRuns: guest.totalRuns,
                    ballsFaced: guest.ballsFaced,
                    fours: guest.fours,
                    sixes: guest.sixes,
                    wicketsTaken: guest.wicketsTaken,
                    oversBowled: guest.oversBowled,
                    runsConceded: guest.runsConceded,
                    catchesTaken: guest.catchesTaken,
                    runOuts: guest.runOuts,
                }
            });
        }

        // Transfer guest's match history records to the user
        await prisma.playerMatchHistory.updateMany({
            where: { guestPlayerId: guestId },
            data: { userId, guestPlayerId: null }
        });

        // Add user to guest's team as a full member (if not already)
        const existingMember = await prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId: guest.teamId,
                    userId
                }
            }
        });

        if (!existingMember) {
            await prisma.teamMember.create({
                data: {
                    teamId: guest.teamId,
                    userId
                }
            });
            console.log(`[StatsService] Added user ${userId} to team ${guest.teamId}`);
        }

        // Archive guest profile (set linkedUserId, don't delete)
        await prisma.guestPlayer.update({
            where: { id: guestId },
            data: { linkedUserId: userId }
        });

        // Check for other guest profiles for the same user on different teams
        // (e.g., user was added as guest to multiple teams before registering)
        const otherGuests = await prisma.guestPlayer.findMany({
            where: {
                name: { equals: guest.name, mode: 'insensitive' },
                linkedUserId: null,
                id: { not: guestId }
            }
        });

        if (otherGuests.length > 0) {
            console.log(`[StatsService] Found ${otherGuests.length} other guest profiles with name "${guest.name}"`);
            // Note: We don't auto-link other profiles - captain must explicitly link each one
        }

        console.log(`[StatsService] Successfully linked guest ${guest.name} to user ${targetUser.username}`);
        return {
            success: true,
            linkedGuestName: guest.name,
            linkedToUsername: targetUser.username,
            addedToTeam: !existingMember,
            otherPossibleGuests: otherGuests.length
        };
    }

    /**
     * Links a guest player by guestCode (instead of guestId)
     */
    async linkGuestByCode(guestCode: string, userId: string) {
        const guest = await prisma.guestPlayer.findFirst({
            where: { guestCode: guestCode.toLowerCase() }
        });

        if (!guest) {
            throw new Error('Guest player not found with the given code');
        }

        return this.linkGuestToUser(guest.id, userId);
    }
}

export const statsService = new StatsService();
