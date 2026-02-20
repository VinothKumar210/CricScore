/**
 * deriveMilestones — Pure milestone detection engine.
 *
 * Derives milestones entirely from the event stream in a single O(n) pass.
 * Pure. Replay-safe. Undo-safe. Offline-safe. No store. No mutations.
 */
import type { BallEvent } from "../types/ballEventTypes";
import type { Milestone, MilestoneType } from "./types/milestoneTypes";

// ─── Internal Helpers (isolated, no imports from store) ───

function getEventRuns(event: BallEvent): number {
    switch (event.type) {
        case "RUN":
            return event.runs;
        case "EXTRA": {
            const base = event.additionalRuns ?? 0;
            if (event.extraType === "WIDE") return 1 + base;
            if (event.extraType === "NO_BALL") return 1 + (event.runsOffBat ?? 0) + base;
            if (event.extraType === "BYE" || event.extraType === "LEG_BYE") return base;
            return 0;
        }
        case "WICKET":
            return 0;
        default:
            return 0;
    }
}

function getBatsmanRuns(event: BallEvent): number {
    if (event.type === "RUN") return event.runs;
    if (event.type === "EXTRA" && event.extraType === "NO_BALL") return event.runsOffBat ?? 0;
    return 0;
}

function isLegalDelivery(event: BallEvent): boolean {
    if (event.type === "EXTRA") {
        return event.extraType === "BYE" || event.extraType === "LEG_BYE";
    }
    return true; // RUN and WICKET are legal
}

// ─── Main Engine ───

export function deriveMilestones(events: BallEvent[]): Milestone[] {
    const milestones: Milestone[] = [];

    // ── Batter tracking ──
    const batterRuns = new Map<string, number>();
    const batterEmitted = new Map<string, Set<MilestoneType>>();

    // ── Bowler tracking ──
    const bowlerWickets = new Map<string, number>();
    const bowlerEmitted = new Map<string, Set<MilestoneType>>();

    // ── Hat-trick tracking ──
    // Per bowler: array of consecutive wicket-taking legal deliveries (event indices)
    const bowlerConsecWickets = new Map<string, number>();

    // ── Partnership tracking ──
    let partnershipRuns = 0;
    const partnershipEmitted = new Set<MilestoneType>();

    // ── Team tracking ──
    let teamRuns = 0;
    const teamEmitted = new Set<MilestoneType>();

    // ── Innings tracking (reset team/partnership on innings change) ──
    let currentInnings = 0;
    let innWickets = 0;

    const BATTER_THRESHOLDS: [number, MilestoneType][] = [
        [50, "BATTER_50"],
        [100, "BATTER_100"],
        [150, "BATTER_150"],
    ];

    const BOWLER_THRESHOLDS: [number, MilestoneType][] = [
        [3, "BOWLER_3W"],
        [5, "BOWLER_5W"],
    ];

    const TEAM_THRESHOLDS: [number, MilestoneType][] = [
        [100, "TEAM_100"],
        [200, "TEAM_200"],
        [300, "TEAM_300"],
    ];

    const PARTNERSHIP_THRESHOLDS: [number, MilestoneType][] = [
        [50, "PARTNERSHIP_50"],
        [100, "PARTNERSHIP_100"],
    ];

    function emit(index: number, type: MilestoneType, playerId?: string, overNumber?: number) {
        milestones.push({
            id: `${index}-${type}`,
            type,
            eventIndex: index,
            ...(playerId !== undefined && { playerId }),
            ...(overNumber !== undefined && { overNumber }),
        });
    }

    function resetInnings() {
        teamRuns = 0;
        teamEmitted.clear();
        partnershipRuns = 0;
        partnershipEmitted.clear();
        batterRuns.clear();
        batterEmitted.clear();
        bowlerWickets.clear();
        bowlerEmitted.clear();
        bowlerConsecWickets.clear();
        innWickets = 0;
    }

    // ── Single pass O(n) ──
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const overNum = event.overNumber;

        // ── 1) Batter runs ──
        const bRuns = getBatsmanRuns(event);
        if (bRuns > 0 && event.batsmanId) {
            const prev = batterRuns.get(event.batsmanId) ?? 0;
            const next = prev + bRuns;
            batterRuns.set(event.batsmanId, next);

            if (!batterEmitted.has(event.batsmanId)) {
                batterEmitted.set(event.batsmanId, new Set());
            }
            const emittedSet = batterEmitted.get(event.batsmanId)!;

            for (const [threshold, type] of BATTER_THRESHOLDS) {
                if (next >= threshold && prev < threshold && !emittedSet.has(type)) {
                    emittedSet.add(type);
                    emit(i, type, event.batsmanId, overNum);
                }
            }
        }

        // ── 2) Team runs ──
        const totalRuns = getEventRuns(event);
        teamRuns += totalRuns;

        for (const [threshold, type] of TEAM_THRESHOLDS) {
            if (teamRuns >= threshold && (teamRuns - totalRuns) < threshold && !teamEmitted.has(type)) {
                teamEmitted.add(type);
                emit(i, type, undefined, overNum);
            }
        }

        // ── 3) Partnership runs ──
        partnershipRuns += totalRuns;

        for (const [threshold, type] of PARTNERSHIP_THRESHOLDS) {
            if (
                partnershipRuns >= threshold &&
                (partnershipRuns - totalRuns) < threshold &&
                !partnershipEmitted.has(type)
            ) {
                partnershipEmitted.add(type);
                emit(i, type, undefined, overNum);
            }
        }

        // ── 4) Bowler wickets ──
        if (event.type === "WICKET" && event.bowlerId) {
            const bowlerId = event.bowlerId;

            // Credited dismissals for bowler stats
            const creditedTypes = ["BOWLED", "CAUGHT", "LBW", "STUMPED", "HIT_WICKET"];
            const isCredited = creditedTypes.includes(event.dismissalType || "");

            if (isCredited) {
                const prevW = bowlerWickets.get(bowlerId) ?? 0;
                const nextW = prevW + 1;
                bowlerWickets.set(bowlerId, nextW);

                if (!bowlerEmitted.has(bowlerId)) {
                    bowlerEmitted.set(bowlerId, new Set());
                }
                const emittedSet = bowlerEmitted.get(bowlerId)!;

                for (const [threshold, type] of BOWLER_THRESHOLDS) {
                    if (nextW >= threshold && prevW < threshold && !emittedSet.has(type)) {
                        emittedSet.add(type);
                        emit(i, type, bowlerId, overNum);
                    }
                }

                // ── Hat-trick tracking ──
                const consec = (bowlerConsecWickets.get(bowlerId) ?? 0) + 1;
                bowlerConsecWickets.set(bowlerId, consec);

                if (consec >= 3) {
                    emit(i, "HATTRICK", bowlerId, overNum);
                    // Reset to allow overlapping hat-tricks (4 in a row = 2 hat-tricks)
                    bowlerConsecWickets.set(bowlerId, 0);
                }
            }

            // Reset partnership on any wicket
            partnershipRuns = 0;
            partnershipEmitted.clear();

            // Innings change detection
            innWickets++;
            if (innWickets >= 10) {
                currentInnings++;
                resetInnings();
            }
        } else if (isLegalDelivery(event) && event.bowlerId) {
            // Legal non-wicket delivery breaks hat-trick streak
            bowlerConsecWickets.set(event.bowlerId, 0);
        }
        // Wides and no-balls do NOT reset hat-trick streak (they are not legal deliveries)
    }

    return milestones;
}
