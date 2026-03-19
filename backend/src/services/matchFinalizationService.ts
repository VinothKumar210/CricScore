import { prisma } from '../utils/db.js';
import type { MatchState, MatchOpPayload } from '../types/scoringTypes.js';
import type { MatchOp } from '@prisma/client';
import { notificationService } from './notificationService.js';
import { aggregateMatchStats } from './statsAggregationService.js';

export const matchFinalizationService = {
    /**
     * Finalize a match.
     * Converts operations log into permanent records.
     */
    finalizeMatch: async (matchId: string, userId: string) => {
        // 1. Transaction Start
        const txResult = await prisma.$transaction(async (tx: any) => {
            // Check if already finalized (Idempotency)
            const match = await tx.matchSummary.findUnique({ where: { id: matchId } });
            if (!match) throw { statusCode: 404, message: 'Match not found', code: 'NOT_FOUND' };

            if (match.status === 'COMPLETED' && match.result) {
                return { message: 'Match already finalized', match };
            }

            // 2. Reconstruct State
            const ops = await tx.matchOp.findMany({
                where: { matchId },
                orderBy: { opIndex: 'asc' },
            });

            const { reconstructMatchState } = await import('../utils/stateReconstructor.js');

            const inningsOpsv1: MatchOp[] = [];
            const inningsOpsv2: MatchOp[] = [];
            const inningsOpsv3: MatchOp[] = []; // Super Over 1st Inns
            const inningsOpsv4: MatchOp[] = []; // Super Over 2nd Inns
            let currentInn = 0;
            const playerIds = new Set<string>();

            for (const op of ops) {
                const payload = op.payload as any;
                if (payload.type === 'START_INNINGS') {
                    currentInn = payload.inningsNumber;
                }

                if (payload.strikerId) playerIds.add(payload.strikerId);
                if (payload.nonStrikerId) playerIds.add(payload.nonStrikerId);
                if (payload.bowlerId) playerIds.add(payload.bowlerId);
                if (payload.batsmanId) playerIds.add(payload.batsmanId);

                if (currentInn === 1) inningsOpsv1.push(op);
                else if (currentInn === 2) inningsOpsv2.push(op);
                else if (currentInn === 3) inningsOpsv3.push(op);
                else if (currentInn === 4) inningsOpsv4.push(op);
            }

            // Fetch User Names
            const users = await tx.user.findMany({
                where: { id: { in: Array.from(playerIds) } },
                select: { id: true, fullName: true }
            });
            const nameMap = new Map<string, string>(users.map((u: { id: string, fullName: string }) => [u.id, u.fullName]));

            const getName = (id: string | null | undefined): string => {
                if (!id) return 'Unknown';
                return nameMap.get(id) || 'Unknown';
            };

            const state1 = reconstructMatchState(matchId, inningsOpsv1);
            const state2 = reconstructMatchState(matchId, inningsOpsv2);

            // Determine Winner
            let result = 'MATCH_TIED';
            let winnerId: string | null = null;
            let winMargin = 'Tie';
            let isSuperOver = false;

            let score1 = state1.totalRuns;
            let score2 = state2.totalRuns;
            let wickets2 = state2.wickets;

            // Super Over Override
            if (inningsOpsv3.length > 0 && inningsOpsv4.length > 0) {
                const state3 = reconstructMatchState(matchId, inningsOpsv3);
                const state4 = reconstructMatchState(matchId, inningsOpsv4);
                score1 = state3.totalRuns;
                score2 = state4.totalRuns;
                wickets2 = state4.wickets;
                isSuperOver = true;
            }

            if (score2 > score1) {
                winnerId = isSuperOver ? state4?.battingTeamId : state2.battingTeamId; // state4 used below to get battingTeamId requires it exists => we can use ops inspection or assume 2nd team is team 2.
                winnerId = isSuperOver 
                    ? (ops.reverse().find(o => (o.payload as any).type === 'START_INNINGS' && (o.payload as any).inningsNumber === 4) as any)?.payload?.battingTeamId || state2.battingTeamId
                    : state2.battingTeamId;
                winMargin = isSuperOver ? 'Super Over' : `${10 - wickets2} wickets`;
                result = 'WIN';
            } else if (score1 > score2) {
                winnerId = isSuperOver 
                    ? (ops.reverse().find(o => (o.payload as any).type === 'START_INNINGS' && (o.payload as any).inningsNumber === 3) as any)?.payload?.battingTeamId || state1.battingTeamId
                    : state1.battingTeamId;
                winMargin = isSuperOver ? 'Super Over' : `${score1 - score2} runs`;
                result = 'WIN';
            } else {
                result = 'TIE';
                winMargin = 'Tie';
            }

            // 4. Update MatchSummary
            const winningTeamName = winnerId === match.homeTeamId ? match.homeTeamName : match.awayTeamName;

            await tx.matchSummary.update({
                where: { id: matchId },
                data: {
                    status: 'COMPLETED',
                    result,
                    winningTeamName: result === 'WIN' ? winningTeamName : null,
                    winMargin,
                    superOver: isSuperOver,
                }
            });

            // Reliability: Increment matchesConfirmed
            // We use raw update because user might not be owner of both teams, but logic requires both stats updated.
            // This is a system-level update triggered by match completion.
            await tx.team.update({ where: { id: match.homeTeamId }, data: { matchesConfirmed: { increment: 1 } } });
            await tx.team.update({ where: { id: match.awayTeamId }, data: { matchesConfirmed: { increment: 1 } } });

            // 5. Create Innings Records & Stats
            await createInningsRecord(tx, matchId, 1, state1, inningsOpsv1, getName);
            if (inningsOpsv2.length > 0) {
                await createInningsRecord(tx, matchId, 2, state2, inningsOpsv2, getName);
            }
            if (inningsOpsv3.length > 0) {
                const state3 = reconstructMatchState(matchId, inningsOpsv3);
                await createInningsRecord(tx, matchId, 3, state3, inningsOpsv3, getName);
            }
            if (inningsOpsv4.length > 0) {
                const state4 = reconstructMatchState(matchId, inningsOpsv4);
                await createInningsRecord(tx, matchId, 4, state4, inningsOpsv4, getName);
            }

            // 6. Tournament Fixture Linking & Advancement
            let tournamentIdToInvalidate: string | null = null;

            if (match.tournamentFixtureId) {
                const fixture = await tx.tournamentFixture.findUnique({
                    where: { id: match.tournamentFixtureId },
                    include: { tournament: true }
                });

                if (fixture && fixture.status !== 'COMPLETED') {
                    // 1. Link & Complete Fixture
                    await tx.tournamentFixture.update({
                        where: { id: match.tournamentFixtureId },
                        data: {
                            matchSummaryId: matchId,
                            status: 'COMPLETED',
                            winnerId,
                        }
                    });

                    tournamentIdToInvalidate = fixture.tournamentId;

                    // 2. Advance Bracket (Transaction Safe)
                    if (fixture.tournament.format === 'KNOCKOUT' && winnerId) {
                        // Import valid helper
                        const { advanceKnockoutBracket } = await import('./tournamentService.js');
                        await advanceKnockoutBracket(tx, { ...fixture, matchNumber: fixture.matchNumber, round: fixture.round }, winnerId!);
                    }
                }
            }

            return {
                message: 'Match finalized successfully',
                tournamentIdToInvalidate,
                playerIds: Array.from(playerIds),
                winnerId,
                winningTeamName,
                matchName: `${match.homeTeamName} vs ${match.awayTeamName}`
            };
        });

        // Early exit if match was already finalized (idempotency)
        if ((txResult as any).message === 'Match already finalized') {
            return txResult;
        }

        // Trigger Stats Aggregation Asynchronously
        setTimeout(() => {
            aggregateMatchStats(matchId).catch(err => {
                console.error('Stat aggregation failed:', err);
            });
        }, 100);

        // 7. Post-Transaction: Cache Invalidation
        // This is safe because if transaction failed, we threw error and didn't reach here.
        if ((txResult as any).tournamentIdToInvalidate) {
            const { default: redis } = await import('../utils/redis.js');
            const tid = (txResult as any).tournamentIdToInvalidate;
            if (redis) {
                await redis.del(`tournament:${tid}:standings`).catch(console.warn);
            }
        }

        // Remove old hook call
        // const { handleMatchCompletion } = await import('./tournamentService.js');
        // handleMatchCompletion(matchId).catch(console.error);

        // 8. Notifications
        if ((txResult as any).playerIds) {
            const { playerIds, winnerId, winningTeamName, matchName } = txResult as any;
            const resultBody = winningTeamName ? `${winningTeamName} won the match.` : 'The match ended in a tie.';

            Promise.all(playerIds.map((pid: string) =>
                notificationService.createNotification({
                    userId: pid,
                    type: 'MATCH_RESULT',
                    title: `Match Completed: ${matchName}`,
                    body: resultBody,
                    link: `/match/${matchId}/summary`,
                    metadata: { matchId, winnerId }
                })
            )).catch(err => console.error('[MatchFinalization] Failed to send notifications', err));
        }

        // 9. Auto-archive Match Conversation (M7)
        try {
            const { conversationService } = await import('./conversationService.js');
            await conversationService.archiveMatchConversation(matchId);
        } catch (error) {
            console.error('[MatchFinalization] Failed to archive match conversation', error);
        }

        return { message: 'Match finalized successfully' };
    }
};

async function createInningsRecord(tx: any, matchId: string, inningsNumber: number, state: MatchState, ops: MatchOp[], getName: (id: string) => string) {
    // Create Innings
    const innings = await tx.innings.create({
        data: {
            matchSummaryId: matchId,
            inningsNumber,
            battingTeamName: 'Team ' + (state.battingTeamId || '?'), // Ideally fetch name
            battingTeamId: state.battingTeamId,
            bowlingTeamName: 'Team ' + (state.bowlingTeamId || '?'),
            bowlingTeamId: state.bowlingTeamId,
            totalRuns: state.totalRuns,
            totalWickets: state.wickets,
            totalBalls: state.ballsBowled,
            overs: parseFloat(`${Math.floor(state.ballsBowled / 6)}.${state.ballsBowled % 6}`),
            extras: state.extras,
            fallOfWickets: [] // Parse from ops if needed
        }
    });

    // Batting Performances
    for (const [playerId, pState] of Object.entries(state.batsmen)) {
        await tx.battingPerformance.create({
            data: {
                inningsId: innings.id,
                userId: playerId, // Assuming UserID
                playerName: getName(playerId),
                // Currently State doesn't have names. Workaround: "Unknown" or fetch.
                // Ideally `PlayerState` should have `playerName`.
                runs: pState.runs,
                balls: pState.balls,
                fours: pState.fours,
                sixes: pState.sixes,
                strikeRate: pState.balls > 0 ? (pState.runs / pState.balls) * 100 : 0,
                isOut: pState.isOut,
                dismissalType: pState.outType,
                dismissedBy: pState.bowlerId ? getName(pState.bowlerId) : null,
                fielder: pState.fielderId ? getName(pState.fielderId) : null
            }
        });

        // Highlights (Batting)
        if (pState.runs >= 100) {
            await createHighlight(tx, matchId, 'CENTURY', 0, `${getName(playerId)} scored a Century! (${pState.runs})`, getName(playerId), `${pState.runs}`);
            await createAutoPost(tx, playerId, matchId, 'CENTURY', `${getName(playerId)} scored a magnificent Century! (${pState.runs} runs)`);
        } else if (pState.runs >= 50) {
            await createHighlight(tx, matchId, 'FIFTY', 0, `${getName(playerId)} scored a Fifty! (${pState.runs})`, getName(playerId), `${pState.runs}`);
            await createAutoPost(tx, playerId, matchId, 'FIFTY', `${getName(playerId)} scored a brilliant Fifty! (${pState.runs} runs)`);
        }
    }

    // Bowling Performances
    for (const [playerId, bState] of Object.entries(state.bowlers)) {
        await tx.bowlingPerformance.create({
            data: {
                inningsId: innings.id,
                userId: playerId,
                playerName: getName(playerId),
                overs: parseFloat(`${Math.floor(bState.balls / 6)}.${bState.balls % 6}`),
                maidens: bState.maidens,
                runs: bState.runsConceded,
                wickets: bState.wickets,
                economy: bState.balls > 0 ? (bState.runsConceded / (bState.balls / 6)) : 0,
                dotBalls: bState.dotBalls || 0, // Need to track dots
                wides: bState.wides || 0, // Need to track
                noBalls: bState.noBalls || 0
            }
        });

        // Highlights (Bowling)
        if (bState.wickets >= 5) {
            await createHighlight(tx, matchId, 'FIVE_WICKET_HAUL', 0, `${getName(playerId)} took 5 wickets!`, getName(playerId), `${bState.wickets}/${bState.runsConceded}`);
            await createAutoPost(tx, playerId, matchId, 'FIVE_WICKET', `${getName(playerId)} took a spectacular 5-wicket haul! (${bState.wickets}/${bState.runsConceded})`);
        }
    }

    // Generate BallRecords
    // Iterate ops and find DELIVER_BALL
    const ballRecords = [];
    let ballCount = 0;

    // Simple Partnership Logic
    // Active Tuple: [Batsman1, Batsman2]
    // Map<Key, {runs, balls}> where Key = sorted(id1, id2).join('-')
    const partnerships = new Map<string, { runs: number, balls: number, p1: string, p2: string }>();

    // We need to track who is at crease to know current partnership
    // Ops stream needs to be replayed carefully to track partnerships.
    // Actually, BallRecord only needs static data. Partnership needs accumulation.
    // Let's iterate ops linearly.

    let strikerId: string | null = null;
    let nonStrikerId: string | null = null;

    for (const op of ops) {
        const payload = op.payload as any;

        if (payload.type === 'START_INNINGS') {
            strikerId = payload.strikerId;
            nonStrikerId = payload.nonStrikerId;
        } else if (payload.type === 'DELIVER_BALL') {
            ballCount++;

            // Partnership
            if (strikerId && nonStrikerId) {
                const pKey = [strikerId, nonStrikerId].sort().join('-');
                if (!partnerships.has(pKey)) partnerships.set(pKey, { runs: 0, balls: 0, p1: strikerId, p2: nonStrikerId });
                const p = partnerships.get(pKey)!;
                p.runs += (payload.runs || 0);
                p.balls += 1;
            }

            // Ball Record
            ballRecords.push({
                inningsId: innings.id,
                overNumber: Math.floor((ballCount - 1) / 6) + 1,
                ballNumber: (ballCount - 1) % 6 + 1,
                batsmanName: getName(strikerId!),
                bowlerName: getName(payload.bowlerId),
                runs: payload.runs || 0,
                isWicket: !!payload.isWicket,
                isBoundary: (payload.runs === 4 || payload.runs === 6),
                isSix: payload.runs === 6
            });

            // Wicket? Update crease
            if (payload.isWicket) {
                // Wicket logic is complex (who got out?). Assuming Striker for simple MVP unless payload specifies.
                // In real engine, WICKET op specifies batsmanId.
                // Helper: If striker out, replace. 
                // We need to know who came in? SWAP_BATSMAN op?
                // For now, simple partnership tracking best effort.
                strikerId = null; // Break partnership
            }
        } else if (payload.type === 'SWAP_BATSMAN') { // New batsman incoming
            if (!strikerId) strikerId = payload.batsmanId;
            else if (!nonStrikerId) nonStrikerId = payload.batsmanId;
        }
    }

    if (ballRecords.length > 0) {
        await tx.ballRecord.createMany({ data: ballRecords });
    }

    // Save Partnerships
    for (const [key, p] of partnerships.entries()) {
        await tx.partnership.create({
            data: {
                inningsId: innings.id,
                wicketNumber: 0, // todo: track order
                batsman1Name: getName(p.p1),
                batsman2Name: getName(p.p2),
                runs: p.runs,
                balls: p.balls
            }
        });
    }
}

async function createHighlight(tx: any, matchSummaryId: string, type: string, overNumber: number, description: string, playerName: string, score: string) {
    await tx.matchHighlight.create({
        data: {
            matchSummaryId,
            type,
            overNumber,
            description,
            playerName,
            score
        }
    });
}

async function createAutoPost(tx: any, authorId: string, matchId: string, eventType: string, content: string) {
    if (!authorId || !authorId.match(/^[0-9a-fA-F]{24}$/)) return;
    const existing = await tx.post.findFirst({
        where: { authorId, matchId, eventType, type: 'AUTO_MILESTONE' }
    });
    if (!existing) {
        await tx.post.create({
            data: { authorId, type: 'AUTO_MILESTONE', eventType, matchId, content, visibility: 'PUBLIC' }
        });
    }
}
