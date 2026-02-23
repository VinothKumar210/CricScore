/**
 * archiveService.ts — Match Archive Persistence Service
 *
 * Creates archive snapshots inside prisma.$transaction (called from matchFinalizationService).
 * Idempotent: checks for existing archive before creating.
 * Hard-fails on event limit exceeded (transaction rollback).
 */

import { prisma } from '../utils/db.js';
import { cacheDel } from '../utils/redisHelpers.js';

const ENGINE_VERSION = '1.0';
const MAX_ARCHIVE_EVENTS = 5000;

export const archiveService = {

    /**
     * Create archive snapshot from finalized match.
     * Called INSIDE prisma.$transaction from matchFinalizationService.
     *
     * @param tx - Prisma transaction client
     * @param matchId - Match to archive
     * @param userId - User creating the archive (for ownership)
     */
    createArchive: async (tx: any, matchId: string, userId: string) => {
        // Idempotency: matchSummaryId is @unique
        const existing = await tx.archivedMatch.findUnique({
            where: { matchSummaryId: matchId }
        });
        if (existing) return existing;

        // Fetch match summary
        const match = await tx.matchSummary.findUnique({
            where: { id: matchId },
            include: {
                homeTeam: { select: { id: true, name: true } },
                awayTeam: { select: { id: true, name: true } }
            }
        });

        if (!match) {
            throw new Error(`Archive failed: match ${matchId} not found`);
        }

        // Fetch operations
        const ops = await tx.matchOp.findMany({
            where: { matchId },
            orderBy: { opIndex: 'asc' }
        });

        // HARD FAIL on event limit — never silently degrade replay
        if (ops.length > MAX_ARCHIVE_EVENTS) {
            throw new Error(
                `Archive rejected: match ${matchId} has ${ops.length} events (max ${MAX_ARCHIVE_EVENTS}). ` +
                `Transaction will rollback. Investigate event inflation.`
            );
        }

        // Convert MatchOps to BallEvent-like structure
        const events = ops.map((op: any) => ({
            version: op.opIndex,
            type: op.payload?.type || 'UNKNOWN',
            payload: op.payload,
            timestamp: op.createdAt
        }));

        // Build match config
        const matchConfig = {
            overs: match.overs,
            matchType: match.matchType,
            ballType: match.ballType,
            powerplayEnabled: match.powerplayEnabled,
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            homeTeamName: match.homeTeamName,
            awayTeamName: match.awayTeamName,
        };

        // Compute denormalized scores
        const scoreA = match.homeScore
            ? { runs: match.homeScore, wickets: match.homeWickets, overs: match.homeOvers }
            : null;
        const scoreB = match.awayScore
            ? { runs: match.awayScore, wickets: match.awayWickets, overs: match.awayOvers }
            : null;

        // Create archive
        const archive = await tx.archivedMatch.create({
            data: {
                matchSummaryId: matchId,
                homeTeamName: match.homeTeamName,
                awayTeamName: match.awayTeamName,
                homeTeamId: match.homeTeamId,
                awayTeamId: match.awayTeamId,
                scoreA: scoreA || undefined,
                scoreB: scoreB || undefined,
                result: match.result || 'UNKNOWN',
                matchDate: match.matchDate,
                overs: match.overs,
                tournamentName: match.tournamentName || null,
                events,
                matchConfig,
                eventCount: events.length,
                engineVersion: ENGINE_VERSION,
                createdById: userId,
            }
        });

        return archive;
    },

    /**
     * Invalidate archive-related caches for a user.
     * Called after archive creation succeeds (outside transaction).
     */
    invalidateArchiveCaches: async (userId: string) => {
        // Delete all pages of the user's archive list cache
        await cacheDel(
            `archive:list:${userId}:1`,
            `archive:list:${userId}:2`,
            `archive:list:${userId}:3`,
            `hub:feed:${userId}`
        );
    }
};
