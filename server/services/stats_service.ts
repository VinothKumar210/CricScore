
import { prisma } from "../db";

export class StatsService {

    /**
     * Validates if a string is a valid MongoDB ObjectID format
     */
    private isValidObjectId(id: string | undefined): boolean {
        if (!id) return false;
        return /^[a-fA-F0-9]{24}$/.test(id);
    }

    /**
     * Calculate strike rate: (runs / balls) × 100
     */
    private calculateStrikeRate(runs: number, balls: number): number {
        if (balls === 0) return 0;
        return parseFloat(((runs / balls) * 100).toFixed(2));
    }

    /**
     * Calculate economy rate: runsConceded / oversBowled
     */
    private calculateEconomy(runsConceded: number, overs: number): number {
        if (overs === 0) return 0;
        return parseFloat((runsConceded / overs).toFixed(2));
    }

    /**
     * Determine the winning team name based on result
     */
    private determineWinner(matchData: any): string {
        if (matchData.result === 'HOME_WIN') {
            return matchData.homeTeamName;
        } else if (matchData.result === 'AWAY_WIN') {
            return matchData.awayTeamName;
        }
        return 'Draw';
    }

    /**
     * Main entry point: Processes a complete match result
     * Creates all necessary records and updates stats
     */
    async processMatchResult(matchData: any) {
        try {
            console.log(`Processing match result for: ${matchData.homeTeamName} vs ${matchData.awayTeamName}`);

            // 1. Create MatchSummary record
            const matchSummary = await this.createMatchSummary(matchData);
            console.log(`Created MatchSummary: ${matchSummary.id}`);

            // 2. If team match (both teams have IDs), create TeamMatch + update TeamStatistics
            const isTeamMatch = this.isValidObjectId(matchData.homeTeamId) && this.isValidObjectId(matchData.awayTeamId);
            if (isTeamMatch) {
                await this.processTeamMatch(matchData, matchSummary.id);
            }

            // 3. Update individual player stats + create match history
            const players = matchData.playerPerformances || [];
            for (const p of players) {
                await this.updatePlayerStats(p, matchSummary.id);
            }

            return {
                success: true,
                message: "Match stats processed successfully",
                matchSummaryId: matchSummary.id
            };
        } catch (error) {
            console.error("Error processing match stats:", error);
            throw error;
        }
    }

    /**
     * Creates a MatchSummary record with complete match data
     */
    private async createMatchSummary(matchData: any) {
        // Separate performances by team
        const homeTeamPerformances = (matchData.playerPerformances || []).filter(
            (p: any) => p.teamName === matchData.homeTeamName
        );
        const awayTeamPerformances = (matchData.playerPerformances || []).filter(
            (p: any) => p.teamName === matchData.awayTeamName
        );

        // Determine innings order (assuming home team bats first by default)
        const firstInningsTeam = matchData.homeTeamName;
        const secondInningsTeam = matchData.awayTeamName;

        return await prisma.matchSummary.create({
            data: {
                matchDate: new Date(matchData.matchDate),
                venue: matchData.venue || 'Local Ground',
                homeTeamName: matchData.homeTeamName,
                homeTeamId: this.isValidObjectId(matchData.homeTeamId) ? matchData.homeTeamId : null,
                awayTeamName: matchData.awayTeamName,
                awayTeamId: this.isValidObjectId(matchData.awayTeamId) ? matchData.awayTeamId : null,
                result: matchData.result || 'DRAW',
                winningTeam: this.determineWinner(matchData),
                firstInningsTeam,
                firstInningsRuns: matchData.homeTeamRuns || 0,
                firstInningsWickets: matchData.homeTeamWickets || 0,
                firstInningsOvers: matchData.homeTeamOvers || 0,
                secondInningsTeam,
                secondInningsRuns: matchData.awayTeamRuns || 0,
                secondInningsWickets: matchData.awayTeamWickets || 0,
                secondInningsOvers: matchData.awayTeamOvers || 0,
                target: (matchData.homeTeamRuns || 0) + 1,
                totalOvers: 20, // Default, can be passed in payload
                firstInningsBatsmen: homeTeamPerformances.map((p: any) => ({
                    name: p.playerName,
                    runs: p.runsScored || 0,
                    balls: p.ballsFaced || 0,
                    fours: p.fours || 0,
                    sixes: p.sixes || 0,
                    isOut: p.wasDismissed || false
                })),
                firstInningsBowlers: awayTeamPerformances.filter((p: any) => (p.oversBowled || 0) > 0).map((p: any) => ({
                    name: p.playerName,
                    overs: p.oversBowled || 0,
                    runs: p.runsConceded || 0,
                    wickets: p.wicketsTaken || 0
                })),
                secondInningsBatsmen: awayTeamPerformances.map((p: any) => ({
                    name: p.playerName,
                    runs: p.runsScored || 0,
                    balls: p.ballsFaced || 0,
                    fours: p.fours || 0,
                    sixes: p.sixes || 0,
                    isOut: p.wasDismissed || false
                })),
                secondInningsBowlers: homeTeamPerformances.filter((p: any) => (p.oversBowled || 0) > 0).map((p: any) => ({
                    name: p.playerName,
                    overs: p.oversBowled || 0,
                    runs: p.runsConceded || 0,
                    wickets: p.wicketsTaken || 0
                })),
            }
        });
    }

    /**
     * Process team match: creates TeamMatch, TeamMatchPlayer records, updates TeamStatistics
     */
    private async processTeamMatch(matchData: any, matchSummaryId: string) {
        // Create TeamMatch record
        const teamMatch = await prisma.teamMatch.create({
            data: {
                homeTeamId: matchData.homeTeamId,
                awayTeamId: matchData.awayTeamId,
                matchDate: new Date(matchData.matchDate),
                venue: matchData.venue || 'Local Ground',
                status: 'COMPLETED',
                result: matchData.result,
                homeTeamRuns: matchData.homeTeamRuns || 0,
                homeTeamWickets: matchData.homeTeamWickets || 0,
                homeTeamOvers: matchData.homeTeamOvers || 0,
                awayTeamRuns: matchData.awayTeamRuns || 0,
                awayTeamWickets: matchData.awayTeamWickets || 0,
                awayTeamOvers: matchData.awayTeamOvers || 0,
            }
        });

        console.log(`Created TeamMatch: ${teamMatch.id}`);

        // Create TeamMatchPlayer records for each player with valid userId
        const players = matchData.playerPerformances || [];
        for (const p of players) {
            if (this.isValidObjectId(p.userId) && this.isValidObjectId(p.teamId)) {
                await prisma.teamMatchPlayer.create({
                    data: {
                        teamMatchId: teamMatch.id,
                        userId: p.userId,
                        teamId: p.teamId,
                        runsScored: p.runsScored || 0,
                        ballsFaced: p.ballsFaced || 0,
                        wasDismissed: p.wasDismissed || false,
                        oversBowled: p.oversBowled || 0,
                        runsConceded: p.runsConceded || 0,
                        wicketsTaken: p.wicketsTaken || 0,
                        catchesTaken: p.catchesTaken || 0,
                    }
                });
            }
        }

        // Update TeamStatistics for both teams
        const homeWon = matchData.result === 'HOME_WIN';
        const awayWon = matchData.result === 'AWAY_WIN';
        const isDraw = matchData.result === 'DRAW';

        await this.updateTeamStatistics(matchData.homeTeamId, homeWon, awayWon, isDraw, players);
        await this.updateTeamStatistics(matchData.awayTeamId, awayWon, homeWon, isDraw, players);
    }

    /**
     * Updates or creates TeamStatistics for a team
     */
    private async updateTeamStatistics(teamId: string, won: boolean, lost: boolean, draw: boolean, players: any[]) {
        const teamPlayers = players.filter((p: any) => p.teamId === teamId && this.isValidObjectId(p.userId));

        let teamStats = await prisma.teamStatistics.findUnique({
            where: { teamId }
        });

        const matchesPlayed = (teamStats?.matchesPlayed || 0) + 1;
        const matchesWon = (teamStats?.matchesWon || 0) + (won ? 1 : 0);
        const matchesLost = (teamStats?.matchesLost || 0) + (lost ? 1 : 0);
        const matchesDrawn = (teamStats?.matchesDrawn || 0) + (draw ? 1 : 0);
        const winRatio = matchesPlayed > 0 ? matchesWon / matchesPlayed : 0;

        // Find top performers from this match
        const topRunScorer = teamPlayers.reduce((max: any, p: any) =>
            (p.runsScored || 0) > (max?.runsScored || 0) ? p : max, null);
        const topWicketTaker = teamPlayers.reduce((max: any, p: any) =>
            (p.wicketsTaken || 0) > (max?.wicketsTaken || 0) ? p : max, null);

        if (!teamStats) {
            // Create new TeamStatistics
            await prisma.teamStatistics.create({
                data: {
                    teamId,
                    matchesPlayed: 1,
                    matchesWon: won ? 1 : 0,
                    matchesLost: lost ? 1 : 0,
                    matchesDrawn: draw ? 1 : 0,
                    winRatio,
                    topRunScorerId: topRunScorer?.userId,
                    topRunScorerRuns: topRunScorer?.runsScored || 0,
                    topWicketTakerId: topWicketTaker?.userId,
                    topWicketTakerWickets: topWicketTaker?.wicketsTaken || 0,
                }
            });
        } else {
            // Update existing - only update top performers if new ones are better
            const updateData: any = {
                matchesPlayed,
                matchesWon,
                matchesLost,
                matchesDrawn,
                winRatio,
            };

            if (topRunScorer && (topRunScorer.runsScored || 0) > (teamStats.topRunScorerRuns || 0)) {
                updateData.topRunScorerId = topRunScorer.userId;
                updateData.topRunScorerRuns = topRunScorer.runsScored;
            }

            if (topWicketTaker && (topWicketTaker.wicketsTaken || 0) > (teamStats.topWicketTakerWickets || 0)) {
                updateData.topWicketTakerId = topWicketTaker.userId;
                updateData.topWicketTakerWickets = topWicketTaker.wicketsTaken;
            }

            await prisma.teamStatistics.update({
                where: { teamId },
                data: updateData
            });
        }
    }

    /**
     * Updates stats for a single player (User or Guest) + creates match history
     */
    private async updatePlayerStats(performance: any, matchSummaryId: string) {
        const { userId, playerName, teamId, teamName } = performance;

        if (userId && this.isValidObjectId(userId)) {
            // Registered User
            await this.updateUserCareerStats(userId, performance);
            await this.createPlayerMatchHistory(userId, matchSummaryId, performance);
        } else if (playerName) {
            // Guest Player
            await this.updateGuestPlayerStats(playerName, teamId, performance);
        }
    }

    /**
     * Creates PlayerMatchHistory record for tracking individual match performances
     */
    private async createPlayerMatchHistory(userId: string, matchSummaryId: string, p: any) {
        try {
            await prisma.playerMatchHistory.create({
                data: {
                    userId,
                    matchSummaryId,
                    teamName: p.teamName || 'Unknown',
                    teamId: this.isValidObjectId(p.teamId) ? p.teamId : null,
                    playerName: p.playerName || 'Unknown',
                    runsScored: p.runsScored || 0,
                    ballsFaced: p.ballsFaced || 0,
                    wicketsTaken: p.wicketsTaken || 0,
                    oversBowled: p.oversBowled || 0,
                    isManOfTheMatch: false, // Removed MoM feature
                }
            });
        } catch (error) {
            // Ignore duplicate key errors (player already has history for this match)
            console.log(`PlayerMatchHistory may already exist for user ${userId} in match ${matchSummaryId}`);
        }
    }

    /**
     * Updates (or creates) CareerStats for a registered User
     * Now includes fours, sixes, stumpings and calculated rates
     */
    private async updateUserCareerStats(userId: string, p: any) {
        const stats = await prisma.careerStats.findUnique({
            where: { userId },
        });

        const runsScored = p.runsScored || 0;
        const ballsFaced = p.ballsFaced || 0;
        const wicketsTaken = p.wicketsTaken || 0;
        const runsConceded = p.runsConceded || 0;
        const oversBowled = p.oversBowled || 0;
        const fours = p.fours || 0;
        const sixes = p.sixes || 0;

        if (!stats) {
            // Create new CareerStats
            const strikeRate = this.calculateStrikeRate(runsScored, ballsFaced);
            const economy = this.calculateEconomy(runsConceded, oversBowled);

            await prisma.careerStats.create({
                data: {
                    userId,
                    matchesPlayed: 1,
                    totalRuns: runsScored,
                    ballsFaced,
                    highestScore: runsScored,
                    timesOut: p.wasDismissed ? 1 : 0,
                    fours,
                    sixes,
                    strikeRate,
                    oversBowled,
                    runsConceded,
                    wicketsTaken,
                    economy,
                    bestBowlingWickets: wicketsTaken,
                    bestBowlingRuns: runsConceded,
                    catchesTaken: p.catchesTaken || 0,
                    runOuts: p.runOuts || 0,
                    stumpings: p.stumpings || 0,
                },
            });
        } else {
            // Update existing CareerStats
            const newTotalRuns = stats.totalRuns + runsScored;
            const newBallsFaced = stats.ballsFaced + ballsFaced;
            const newOversBowled = stats.oversBowled + oversBowled;
            const newRunsConceded = stats.runsConceded + runsConceded;

            // Recalculate rates
            const strikeRate = this.calculateStrikeRate(newTotalRuns, newBallsFaced);
            const economy = this.calculateEconomy(newRunsConceded, newOversBowled);

            // Best bowling logic
            let newBestWickets = stats.bestBowlingWickets || 0;
            let newBestRuns = stats.bestBowlingRuns || 0;
            if (wicketsTaken > newBestWickets || (wicketsTaken === newBestWickets && runsConceded < newBestRuns)) {
                newBestWickets = wicketsTaken;
                newBestRuns = runsConceded;
            }

            await prisma.careerStats.update({
                where: { userId },
                data: {
                    matchesPlayed: { increment: 1 },
                    totalRuns: { increment: runsScored },
                    ballsFaced: { increment: ballsFaced },
                    highestScore: Math.max(stats.highestScore || 0, runsScored),
                    timesOut: p.wasDismissed ? { increment: 1 } : undefined,
                    fours: { increment: fours },
                    sixes: { increment: sixes },
                    strikeRate,
                    oversBowled: { increment: oversBowled },
                    runsConceded: { increment: runsConceded },
                    wicketsTaken: { increment: wicketsTaken },
                    economy,
                    bestBowlingWickets: newBestWickets,
                    bestBowlingRuns: newBestRuns,
                    catchesTaken: { increment: p.catchesTaken || 0 },
                    runOuts: { increment: p.runOuts || 0 },
                    stumpings: { increment: p.stumpings || 0 },
                },
            });
        }
    }

    /**
     * Updates (or creates) a GuestPlayer record
     */
    private async updateGuestPlayerStats(name: string, teamId: string | undefined, p: any) {
        if (!name) return;
        if (!teamId || !this.isValidObjectId(teamId)) return;

        let guest = await prisma.guestPlayer.findFirst({
            where: { name, teamId },
        });

        if (guest) {
            await prisma.guestPlayer.update({
                where: { id: guest.id },
                data: {
                    matchesPlayed: { increment: 1 },
                    totalRuns: { increment: p.runsScored || 0 },
                    ballsFaced: { increment: p.ballsFaced || 0 },
                    wicketsTaken: { increment: p.wicketsTaken || 0 },
                    runsConceded: { increment: p.runsConceded || 0 },
                    oversBowled: { increment: p.oversBowled || 0 },
                    catchesTaken: { increment: p.catchesTaken || 0 },
                    runOuts: { increment: p.runOuts || 0 },
                    fours: { increment: p.fours || 0 },
                    sixes: { increment: p.sixes || 0 },
                },
            });
        } else {
            const team = await prisma.team.findUnique({ where: { id: teamId } });
            if (team && team.captainId) {
                await prisma.guestPlayer.create({
                    data: {
                        name,
                        teamId,
                        addedByUserId: team.captainId,
                        matchesPlayed: 1,
                        totalRuns: p.runsScored || 0,
                        ballsFaced: p.ballsFaced || 0,
                        wicketsTaken: p.wicketsTaken || 0,
                        runsConceded: p.runsConceded || 0,
                        oversBowled: p.oversBowled || 0,
                        catchesTaken: p.catchesTaken || 0,
                        runOuts: p.runOuts || 0,
                        fours: p.fours || 0,
                        sixes: p.sixes || 0
                    },
                });
            }
        }
    }

    /**
     * Links a Guest Player to a Real User and merges stats
     * Now includes fours, sixes, stumpings merge
     */
    async linkGuestToUser(guestId: string, userId: string) {
        return await prisma.$transaction(async (tx) => {
            const guest = await tx.guestPlayer.findUnique({ where: { id: guestId } });
            if (!guest) throw new Error("Guest player not found");

            let userStats = await tx.careerStats.findUnique({ where: { userId } });

            if (!userStats) {
                // Create new CareerStats from guest data
                const strikeRate = this.calculateStrikeRate(guest.totalRuns, guest.ballsFaced);
                const economy = this.calculateEconomy(guest.runsConceded, guest.oversBowled);

                await tx.careerStats.create({
                    data: {
                        userId,
                        matchesPlayed: guest.matchesPlayed,
                        totalRuns: guest.totalRuns,
                        ballsFaced: guest.ballsFaced,
                        fours: guest.fours,
                        sixes: guest.sixes,
                        strikeRate,
                        wicketsTaken: guest.wicketsTaken,
                        oversBowled: guest.oversBowled,
                        runsConceded: guest.runsConceded,
                        economy,
                        catchesTaken: guest.catchesTaken,
                        runOuts: guest.runOuts,
                        stumpings: 0, // GuestPlayer doesn't have stumpings tracked
                    },
                });
            } else {
                // Merge guest stats into existing user stats
                const newTotalRuns = userStats.totalRuns + guest.totalRuns;
                const newBallsFaced = userStats.ballsFaced + guest.ballsFaced;
                const newOversBowled = userStats.oversBowled + guest.oversBowled;
                const newRunsConceded = userStats.runsConceded + guest.runsConceded;

                const strikeRate = this.calculateStrikeRate(newTotalRuns, newBallsFaced);
                const economy = this.calculateEconomy(newRunsConceded, newOversBowled);

                await tx.careerStats.update({
                    where: { userId },
                    data: {
                        matchesPlayed: { increment: guest.matchesPlayed },
                        totalRuns: { increment: guest.totalRuns },
                        ballsFaced: { increment: guest.ballsFaced },
                        fours: { increment: guest.fours },
                        sixes: { increment: guest.sixes },
                        strikeRate,
                        wicketsTaken: { increment: guest.wicketsTaken },
                        oversBowled: { increment: guest.oversBowled },
                        runsConceded: { increment: guest.runsConceded },
                        economy,
                        catchesTaken: { increment: guest.catchesTaken },
                        runOuts: { increment: guest.runOuts },
                    },
                });
            }

            // Link (not delete) the guest player to user for reference
            await tx.guestPlayer.update({
                where: { id: guestId },
                data: { linkedUserId: userId }
            });

            return { success: true, message: `Linked ${guest.name} to user and merged stats` };
        });
    }
}

export const statsService = new StatsService();
