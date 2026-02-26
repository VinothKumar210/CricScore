// =============================================================================
// Wagon Wheel Service — Shot placement visualization data
// =============================================================================
//
// Queries BallRecord for a batsman in a match, returns angle + distance + runs
// for rendering a wagon wheel (polar plot of shot placement).
//
// Redis cache: "ww:<matchId>:<batsmanId>" — TTL 5 min.
// Cache is invalidated on new ball delivery via cacheDel.
//
// =============================================================================

import { prisma } from '../utils/db.js';
import { cacheGet, cacheSet, cacheDel } from '../utils/redisHelpers.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WagonWheelShot {
    ballId: string;
    overNumber: number;
    ballNumber: number;
    runs: number;
    shotZone: string | null;
    shotAngle: number | null;     // 0–360 degrees
    shotDistance: number | null;   // 0–1 normalized
    isBoundary: boolean;
    isSix: boolean;
    isWicket: boolean;
    bowlerName: string;
    extraType: string | null;
}

export interface WagonWheelData {
    matchId: string;
    batsmanId: string;
    batsmanName: string;
    totalShots: number;
    totalRuns: number;
    boundaries: number;
    sixes: number;
    shots: WagonWheelShot[];
    zoneSummary: ZoneSummary[];
}

export interface ZoneSummary {
    zone: string;
    shotCount: number;
    totalRuns: number;
    boundaries: number;
    percentage: number;  // % of total shots
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_PREFIX = 'ww';
const CACHE_TTL_SECONDS = 300; // 5 minutes

const VALID_ZONES = [
    'FINE_LEG', 'SQUARE_LEG', 'MID_WICKET', 'LONG_ON', 'STRAIGHT',
    'LONG_OFF', 'COVER', 'POINT', 'THIRD_MAN',
] as const;

// ---------------------------------------------------------------------------
// Core Service
// ---------------------------------------------------------------------------

/**
 * Get wagon wheel data for a batsman in a match.
 *
 * @param matchId  - MatchSummary ID
 * @param batsmanId - User ID of the batsman
 * @returns WagonWheelData or null if no data
 * @throws Error with statusCode for validation failures
 */
export async function getWagonWheel(
    matchId: string,
    batsmanId: string,
): Promise<WagonWheelData | null> {
    // ── Validation ──
    if (!matchId || typeof matchId !== 'string' || matchId.length < 12) {
        throw Object.assign(new Error('Invalid matchId'), { statusCode: 400, code: 'INVALID_PARAM' });
    }
    if (!batsmanId || typeof batsmanId !== 'string' || batsmanId.length < 12) {
        throw Object.assign(new Error('Invalid batsmanId'), { statusCode: 400, code: 'INVALID_PARAM' });
    }

    // ── Cache check ──
    const cacheKey = `${CACHE_PREFIX}:${matchId}:${batsmanId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        try {
            return JSON.parse(cached) as WagonWheelData;
        } catch {
            // Corrupted cache — proceed to DB
        }
    }

    // ── Verify match exists ──
    const match = await prisma.matchSummary.findUnique({
        where: { id: matchId },
        select: { id: true },
    });
    if (!match) {
        throw Object.assign(new Error('Match not found'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    // ── Fetch batsman name ──
    const user = await prisma.user.findUnique({
        where: { id: batsmanId },
        select: { fullName: true },
    });
    if (!user) {
        throw Object.assign(new Error('Batsman not found'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    // ── Fetch innings for this match ──
    const innings = await prisma.innings.findMany({
        where: { matchSummaryId: matchId },
        select: { id: true },
    });
    const inningsIds = innings.map(i => i.id);

    if (inningsIds.length === 0) {
        return null; // Match has no innings data yet
    }

    // ── Fetch ball records ──
    const balls: any[] = await prisma.ballRecord.findMany({
        where: {
            inningsId: { in: inningsIds },
            batsmanId: batsmanId,
        },
        orderBy: [
            { overNumber: 'asc' },
            { ballNumber: 'asc' },
        ],
    });

    if (balls.length === 0) {
        // No balls found — might also try name-based fallback
        const ballsByName = await prisma.ballRecord.findMany({
            where: {
                inningsId: { in: inningsIds },
                batsmanName: user.fullName,
            },
            orderBy: [
                { overNumber: 'asc' },
                { ballNumber: 'asc' },
            ],
        });

        if (ballsByName.length === 0) {
            return null;
        }

        // Use name-based results
        return buildResult(matchId, batsmanId, user.fullName, ballsByName, cacheKey);
    }

    return buildResult(matchId, batsmanId, user.fullName, balls, cacheKey);
}

/**
 * Invalidate wagon wheel cache for a match (call after scoring a ball).
 */
export async function invalidateWagonWheelCache(matchId: string, batsmanId?: string): Promise<void> {
    if (batsmanId) {
        await cacheDel(`${CACHE_PREFIX}:${matchId}:${batsmanId}`);
    }
    // Also try pattern-based invalidation via known batsman IDs
    // For simplicity, individual cache keys are invalidated per batsman
}

/**
 * Validate a shot zone value.
 */
export function isValidShotZone(zone: string): boolean {
    return (VALID_ZONES as readonly string[]).includes(zone);
}

/**
 * Validate angle is within 0–360 range.
 */
export function isValidAngle(angle: number): boolean {
    return typeof angle === 'number' && angle >= 0 && angle <= 360;
}

/**
 * Validate distance is within 0–1 range.
 */
export function isValidDistance(distance: number): boolean {
    return typeof distance === 'number' && distance >= 0 && distance <= 1;
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

async function buildResult(
    matchId: string,
    batsmanId: string,
    batsmanName: string,
    balls: any[],
    cacheKey: string,
): Promise<WagonWheelData> {
    // Map to WagonWheelShot
    const shots: WagonWheelShot[] = balls.map(b => ({
        ballId: b.id,
        overNumber: b.overNumber,
        ballNumber: b.ballNumber,
        runs: b.runs ?? 0,
        shotZone: b.shotZone ?? null,
        shotAngle: b.shotAngle ?? null,
        shotDistance: b.shotDistance ?? null,
        isBoundary: b.isBoundary ?? false,
        isSix: b.isSix ?? false,
        isWicket: b.isWicket ?? false,
        bowlerName: b.bowlerName,
        extraType: b.extraType ?? null,
    }));

    // Aggregate
    const totalRuns = shots.reduce((s, sh) => s + sh.runs, 0);
    const boundaries = shots.filter(sh => sh.isBoundary && !sh.isSix).length;
    const sixes = shots.filter(sh => sh.isSix).length;

    // Zone summary
    const zoneMap = new Map<string, { count: number; runs: number; boundaries: number }>();
    for (const shot of shots) {
        if (!shot.shotZone) continue;
        const z = zoneMap.get(shot.shotZone) || { count: 0, runs: 0, boundaries: 0 };
        z.count++;
        z.runs += shot.runs;
        if (shot.isBoundary || shot.isSix) z.boundaries++;
        zoneMap.set(shot.shotZone, z);
    }

    const zoneSummary: ZoneSummary[] = Array.from(zoneMap.entries()).map(([zone, data]) => ({
        zone,
        shotCount: data.count,
        totalRuns: data.runs,
        boundaries: data.boundaries,
        percentage: shots.length > 0 ? Math.round((data.count / shots.length) * 100) : 0,
    }));

    // Sort zones by shot count descending
    zoneSummary.sort((a, b) => b.shotCount - a.shotCount);

    const result: WagonWheelData = {
        matchId,
        batsmanId,
        batsmanName,
        totalShots: shots.length,
        totalRuns,
        boundaries,
        sixes,
        shots,
        zoneSummary,
    };

    // ── Cache the result ──
    await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL_SECONDS);

    return result;
}
