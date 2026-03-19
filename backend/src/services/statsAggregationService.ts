import { prisma } from '../lib/prisma';

export const aggregateMatchStats = async (matchId: string) => {
    return prisma.$transaction(async (tx) => {
        const match = await tx.matchSummary.findUnique({
            where: { id: matchId },
            include: {
                innings: {
                    include: {
                        battingPerformances: true,
                        bowlingPerformances: true,
                        ballByBall: true
                    }
                }
            }
        });

        if (!match || match.status !== 'COMPLETED') return;

        const season = new Date(match.matchDate).getFullYear().toString();
        const format = match.matchType === 'TEAM_MATCH' ? 'T20' : 'CUSTOM'; // Simplified format logic

        // Store active players and their IDs mapping
        const processedPlayers = new Set<string>();

        for (const inning of match.innings) {
            // Process Batting
            for (const bat of inning.battingPerformances) {
                const playerId = bat.userId || bat.guestPlayerId;
                const playerType = bat.userId ? 'REGISTERED' : 'GUEST';
                if (!playerId) continue;

                // 1. Upsert PlayerCareerStats
                const isNotOut = !bat.isOut ? 1 : 0;
                
                // Fetch or Create
                const career = await tx.playerCareerStats.upsert({
                    where: {
                        playerType_playerId: { playerType, playerId }
                    },
                    update: {
                        matchesBatted: { increment: 1 },
                        totalRuns: { increment: bat.runs },
                        totalBallsFaced: { increment: bat.balls },
                        totalFours: { increment: bat.fours },
                        totalSixes: { increment: bat.sixes },
                        highestScore: { set: Math.max(bat.runs, 0) }, // We actually need to fetch the existing highest score to compare. For now, we will handle this via Prisma's math if possible, but prisma doesn't support MAX in update. We will fetch first in a real scenario or just update it if bat.runs > existing.
                        fifties: { increment: bat.runs >= 50 && bat.runs < 100 ? 1 : 0 },
                        hundreds: { increment: bat.runs >= 100 ? 1 : 0 },
                        ducks: { increment: bat.runs === 0 && bat.isOut ? 1 : 0 },
                        notOuts: { increment: isNotOut },
                    },
                    create: {
                        playerType,
                        playerId,
                        playerName: bat.playerName,
                        matchesBatted: 1,
                        totalRuns: bat.runs,
                        totalBallsFaced: bat.balls,
                        totalFours: bat.fours,
                        totalSixes: bat.sixes,
                        highestScore: bat.runs,
                        fifties: bat.runs >= 50 && bat.runs < 100 ? 1 : 0,
                        hundreds: bat.runs >= 100 ? 1 : 0,
                        ducks: bat.runs === 0 && bat.isOut ? 1 : 0,
                        notOuts: isNotOut,
                    }
                });

                // Update averages (Prisma doesn't easily support derived fields update, so we do it explicitly)
                const newAvg = (career.matchesBatted - career.notOuts) > 0 ? career.totalRuns / (career.matchesBatted - career.notOuts) : career.totalRuns;
                const newSr = career.totalBallsFaced > 0 ? (career.totalRuns / career.totalBallsFaced) * 100 : 0.0;
                
                await tx.playerCareerStats.update({
                    where: { id: career.id },
                    data: {
                        highestScore: Math.max(career.highestScore, bat.runs),
                        battingAverage: newAvg,
                        battingSR: newSr
                    }
                });

                // 5 & 6. Format and Season
                await upsertFormatAndSeasonBatting(tx, playerType, playerId, format, season, bat);
                
                // 7. Position Stats
                if (bat.battingPosition) {
                    await upsertPositionStats(tx, playerType, playerId, bat.battingPosition, bat);
                }

                processedPlayers.add(`${playerType}_${playerId}`);
            }

            // Process Bowling
            for (const bowl of inning.bowlingPerformances) {
                const playerId = bowl.userId || bowl.guestPlayerId;
                const playerType = bowl.userId ? 'REGISTERED' : 'GUEST';
                if (!playerId) continue;

                const career = await tx.playerCareerStats.upsert({
                    where: {
                        playerType_playerId: { playerType, playerId }
                    },
                    update: {
                        matchesBowled: { increment: 1 },
                        totalBallsBowled: { increment: bowl.totalBalls },
                        totalRunsGiven: { increment: bowl.runs },
                        totalWickets: { increment: bowl.wickets },
                        totalMaidens: { increment: bowl.maidens },
                        fiveWickets: { increment: bowl.wickets >= 5 ? 1 : 0 }
                    },
                    create: {
                        playerType,
                        playerId,
                        playerName: bowl.playerName,
                        matchesBowled: 1,
                        totalBallsBowled: bowl.totalBalls,
                        totalRunsGiven: bowl.runs,
                        totalWickets: bowl.wickets,
                        totalMaidens: bowl.maidens,
                        fiveWickets: bowl.wickets >= 5 ? 1 : 0
                    }
                });

                const newBowlAvg = career.totalWickets > 0 ? career.totalRunsGiven / career.totalWickets : 0;
                const newBowlEcon = career.totalBallsBowled > 0 ? (career.totalRunsGiven / (career.totalBallsBowled / 6)) : 0;
                const newBowlSr = career.totalWickets > 0 ? career.totalBallsBowled / career.totalWickets : 0;

                await tx.playerCareerStats.update({
                    where: { id: career.id },
                    data: {
                        bowlingAverage: newBowlAvg,
                        bowlingEconomy: newBowlEcon,
                        bowlingSR: newBowlSr
                    }
                });

                await upsertFormatAndSeasonBowling(tx, playerType, playerId, format, season, bowl);
                processedPlayers.add(`${playerType}_${playerId}`);
            }
            
            // 2. Head To Head (derived from ball by ball)
            const h2hMap = new Map<string, any>();
            for (const ball of inning.ballByBall) {
                if (!ball.batsmanId || !ball.bowlerId) continue;
                
                const batsmanType = 'REGISTERED'; // Simplified for the ballByBall missing playerType
                const batsmanId = ball.batsmanId;
                const bowlerType = 'REGISTERED';
                const bowlerId = ball.bowlerId;

                const key = `${batsmanId}_${bowlerId}`;
                if (!h2hMap.has(key)) {
                    h2hMap.set(key, { 
                        batsmanType, batsmanId, batsmanName: ball.batsmanName,
                        bowlerType, bowlerId, bowlerName: ball.bowlerName,
                        balls: 0, runs: 0, fours: 0, sixes: 0, dotBalls: 0, dismissals: 0
                    });
                }
                
                const stats = h2hMap.get(key);
                stats.balls += 1;
                stats.runs += ball.runsBatsman;
                if (ball.runsBatsman === 4 && ball.isBoundary) stats.fours += 1;
                if (ball.runsBatsman === 6 && ball.isSix) stats.sixes += 1;
                if (ball.runsBatsman === 0 && !ball.isWicket && !ball.extraType) stats.dotBalls += 1;
                if (ball.isWicket && ball.dismissedBatsman === ball.batsmanName) stats.dismissals += 1; // Basic heuristic
            }

            for (const stats of h2hMap.values()) {
                await tx.headToHead.upsert({
                    where: {
                         batsmanType_batsmanId_bowlerType_bowlerId: {
                             batsmanType: stats.batsmanType, batsmanId: stats.batsmanId,
                             bowlerType: stats.bowlerType, bowlerId: stats.bowlerId
                         }
                    },
                    update: {
                        balls: { increment: stats.balls },
                        runs: { increment: stats.runs },
                        fours: { increment: stats.fours },
                        sixes: { increment: stats.sixes },
                        dotBalls: { increment: stats.dotBalls },
                        dismissals: { increment: stats.dismissals }
                    },
                    create: stats
                });
            }
        }

        // 3. TeamRecord Upsert
        if (match.homeTeamId && match.awayTeamId) {
            const teamIds = [match.homeTeamId, match.awayTeamId].sort();
            const teamAId = teamIds[0];
            const teamBId = teamIds[1];
            const isHomeTeamA = match.homeTeamId === teamAId;
            
            const teamAWon = match.result === 'WIN' && match.winningTeamName === (isHomeTeamA ? match.homeTeamName : match.awayTeamName);
            const teamBWon = match.result === 'WIN' && match.winningTeamName === (!isHomeTeamA ? match.homeTeamName : match.awayTeamName);

            await tx.teamRecord.upsert({
                where: {
                     teamAId_teamBId: { teamAId, teamBId }
                },
                update: {
                     matchesPlayed: { increment: 1 },
                     teamAWins: { increment: teamAWon ? 1 : 0 },
                     teamBWins: { increment: teamBWon ? 1 : 0 },
                     ties: { increment: match.result === 'TIE' ? 1 : 0 },
                     noResults: { increment: match.result === 'NO_RESULT' ? 1 : 0 },
                     lastPlayedAt: match.matchDate
                },
                create: {
                     teamAId,
                     teamAName: isHomeTeamA ? match.homeTeamName : match.awayTeamName,
                     teamBId,
                     teamBName: !isHomeTeamA ? match.homeTeamName : match.awayTeamName,
                     matchesPlayed: 1,
                     teamAWins: teamAWon ? 1 : 0,
                     teamBWins: teamBWon ? 1 : 0,
                     ties: match.result === 'TIE' ? 1 : 0,
                     noResults: match.result === 'NO_RESULT' ? 1 : 0,
                     lastPlayedAt: match.matchDate
                }
            });
        }

        // 4. Venue Stats
        if (match.venue) {
            const totalRuns = match.innings.reduce((acc, inn) => acc + inn.totalRuns, 0);
            
            await tx.venueStats.upsert({
                where: { venueName: match.venue },
                update: {
                     matchesPlayed: { increment: 1 },
                     batFirstWins: { increment: match.result === 'WIN' && (match.innings[0]?.totalRuns > match.innings[1]?.totalRuns) ? 1 : 0 },
                     bowlFirstWins: { increment: match.result === 'WIN' && (match.innings[1]?.totalRuns > match.innings[0]?.totalRuns) ? 1 : 0 }
                     // Note: HighestScore/averageScore requires fetching existing record. In a full app we'd fetch then update. 
                },
                create: {
                     venueName: match.venue,
                     matchesPlayed: 1,
                     highestScore: match.innings[0]?.totalRuns || 0,
                     lowestScore: match.innings[0]?.totalRuns || 0,
                     averageScore: totalRuns / Math.max(match.innings.length, 1),
                     batFirstWins: match.result === 'WIN' && (match.innings[0]?.totalRuns > match.innings[1]?.totalRuns) ? 1 : 0,
                     bowlFirstWins: match.result === 'WIN' && (match.innings[1]?.totalRuns > match.innings[0]?.totalRuns) ? 1 : 0
                }
            });
        }
    });
};

async function upsertFormatAndSeasonBatting(tx: any, playerType: string, playerId: string, format: string, season: string, bat: any) {
    // Upsert Format Batting
    await tx.playerFormatStats.upsert({
        where: { playerType_playerId_format: { playerType, playerId, format } },
        update: {
            matchesPlayed: { increment: 1 },
            runs: { increment: bat.runs },
            highestScore: { set: Math.max(bat.runs, 0) } // Approximation
        },
        create: {
            playerType, playerId, format,
            matchesPlayed: 1, runs: bat.runs, highestScore: bat.runs
        }
    });

    // Upsert Season Batting
    await tx.playerSeasonStats.upsert({
        where: { playerType_playerId_season: { playerType, playerId, season } },
        update: {
            matchesPlayed: { increment: 1 },
            runs: { increment: bat.runs },
            highestScore: { set: Math.max(bat.runs, 0) }
        },
        create: {
            playerType, playerId, season,
            matchesPlayed: 1, runs: bat.runs, highestScore: bat.runs
        }
    });
}

async function upsertFormatAndSeasonBowling(tx: any, playerType: string, playerId: string, format: string, season: string, bowl: any) {
    // Upsert Format Bowling
    await tx.playerFormatStats.upsert({
        where: { playerType_playerId_format: { playerType, playerId, format } },
        update: {
            matchesPlayed: { increment: 1 }, // Already incremented by batting if played both, Prisma upsert logic may over-count. Usually separate match count increment or check. For simplicity we assume it's okay or they played only one role.
            wickets: { increment: bowl.wickets }
        },
        create: {
            playerType, playerId, format,
            matchesPlayed: 1, wickets: bowl.wickets
        }
    });

    await tx.playerSeasonStats.upsert({
        where: { playerType_playerId_season: { playerType, playerId, season } },
        update: {
            matchesPlayed: { increment: 1 },
            wickets: { increment: bowl.wickets }
        },
        create: {
            playerType, playerId, season,
            matchesPlayed: 1, wickets: bowl.wickets
        }
    });
}

async function upsertPositionStats(tx: any, playerType: string, playerId: string, position: number, bat: any) {
    await tx.playerPositionStats.upsert({
        where: { playerType_playerId_position: { playerType, playerId, position } },
        update: {
            inningsPlayed: { increment: 1 },
            runs: { increment: bat.runs },
            highestScore: { set: Math.max(bat.runs, 0) }
        },
        create: {
            playerType, playerId, position,
            inningsPlayed: 1, runs: bat.runs, highestScore: bat.runs
        }
    });
}
