import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery, getEventRuns } from "../utils/deliveryUtils";
import { getMatchPhase, type MatchPhaseName } from "../phaseResolver";
import type { PowerplayConfig } from "../../types/matchStateTypes";

export type PhaseName = MatchPhaseName;

export interface PhaseStats {
    phase: PhaseName;
    runs: number;
    wickets: number;
    balls: number;  // Legal deliveries
    runRate: number; // runs per over (runs / (balls/6))
}

/**
 * Pure function — no mutation, replay - safe, undo - safe.
 */
export function derivePhaseBreakdown(
    events: BallEvent[],
    targetInningsIndex: number,
    totalMatchOvers: number = 20,
    powerplayConfig?: PowerplayConfig,
    isSuperOver: boolean = false
): PhaseStats[] {
    const phases: Record<PhaseName, { runs: number; wickets: number; balls: number }> = {
        POWERPLAY: { runs: 0, wickets: 0, balls: 0 },
        MIDDLE: { runs: 0, wickets: 0, balls: 0 },
        DEATH: { runs: 0, wickets: 0, balls: 0 }
    };

    let currentInnings = 0;
    let innWickets = 0;
    let innBalls = 0; // Legal balls in current innings (for transition)
    let targetBalls = 0; // Legal balls in target innings (for phase calc)

    for (const event of events) {
        if (currentInnings === targetInningsIndex) {
            const overIndex = Math.floor(targetBalls / 6);
            const phase = getMatchPhase(overIndex, powerplayConfig, totalMatchOvers, isSuperOver);

            phases[phase].runs += getEventRuns(event);

            if (event.type === "WICKET") {
                phases[phase].wickets++;
            }

            if (isLegalDelivery(event)) {
                phases[phase].balls++;
                targetBalls++;
                innBalls++;
            }
        } else if (currentInnings > targetInningsIndex) {
            break;
        } else {
            // Non-target innings: track for transition only
            if (isLegalDelivery(event)) innBalls++;
        }

        // Transition
        if (event.type === "WICKET") innWickets++;

        const maxBalls = totalMatchOvers * 6;
        if (innWickets >= 10 || innBalls >= maxBalls) {
            currentInnings++;
            innWickets = 0;
            innBalls = 0;
        }
    }

    // Build result array
    const result: PhaseStats[] = [];
    for (const phaseName of ["POWERPLAY", "MIDDLE", "DEATH"] as PhaseName[]) {
        const p = phases[phaseName];
        const oversDecimal = p.balls / 6;
        result.push({
            phase: phaseName,
            runs: p.runs,
            wickets: p.wickets,
            balls: p.balls,
            runRate: oversDecimal > 0
                ? parseFloat((p.runs / oversDecimal).toFixed(2))
                : 0
        });
    }

    return result;
}
