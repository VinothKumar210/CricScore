import type { MatchState, InningsState, BatterState, BowlerState } from "../types/matchStateTypes";
import type { BallEvent } from "../types/ballEventTypes";
import { deriveMatchResult } from "./deriveMatchResult";

// Utility for deep cloning to ensure purity
function cloneState(state: MatchState): MatchState {
    return JSON.parse(JSON.stringify(state));
}

export function applyEvent(originalState: MatchState, event: BallEvent): MatchState {
    const state = cloneState(originalState);

    // 🛑 STOP: If match is already decided (Terminal State)
    // We ignore further events.
    if (state.matchResult) {
        return state;
    }

    const innIdx = state.currentInningsIndex;
    const innings = state.innings[innIdx];

    if (!innings) return state; // Should not happen

    // --- Process Runs & Extras ---
    let runsScored = 0;
    let isLegal = true;
    let isWide = false;
    let isNoBall = false;

    if (event.type === "RUN") {
        runsScored = event.runs;
        innings.totalRuns += runsScored;
    } else if (event.type === "EXTRA") {
        if (event.extraType === "WIDE") {
            isWide = true;
            isLegal = false;
            runsScored = 1 + (event.additionalRuns || 0); // 1 wide + extras
            innings.extras.wides += 1 + (event.additionalRuns || 0);
            innings.totalRuns += runsScored;
        } else if (event.extraType === "NO_BALL") {
            isNoBall = true;
            isLegal = false;
            const batRuns = event.runsOffBat || 0;
            const extras = 1 + (event.additionalRuns || 0);
            runsScored = batRuns + extras; // Total added to score

            innings.extras.noBalls += 1;
            innings.totalRuns += runsScored;

            // Runs off bat logic: credited to batter
            if (innings.strikerId && batRuns > 0) {
                updateBatterStats(innings, innings.strikerId, batRuns, 1); // 1 ball faced (NB counts as faced usually? rules vary. Standard: Yes)
            }
        } else if (event.extraType === "BYE") {
            runsScored = event.additionalRuns || 0; // Usually recorded as runs but separate type
            // Wait, BallEvent BYE definition might map to runs differently.
            // Assuming event.runs handles total?
            // User definition: `type: "EXTRA", extraType: "BYE", additionalRuns: ...`
            // Let's assume additionalRuns is the bye amount.
            innings.extras.byes += (event.additionalRuns || 0) + (event.runsOffBat || 0); // Defensive
            innings.totalRuns += (event.additionalRuns || 0);
        } else if (event.extraType === "LEG_BYE") {
            innings.extras.legByes += (event.additionalRuns || 0);
            innings.totalRuns += (event.additionalRuns || 0);
        }
    } else if (event.type === "WICKET") {
        innings.totalWickets += 1;
        // Wicket is legal unless it's a special case (e.g. Mankad? usually legal)
        // Check for specific wicket types if needed.
    }

    // --- Batter Stats (Runs) ---
    if (event.type === "RUN" && innings.strikerId) {
        updateBatterStats(innings, innings.strikerId, event.runs, 1);
    }
    // Wicket facing logic?
    if (event.type === "WICKET" && innings.strikerId) {
        const batter = getOrCreateBatter(innings, innings.strikerId);
        batter.ballsFaced += 1;
        batter.isOut = true;
        batter.dismissal = event.dismissalType;
        batter.fielderId = event.fielderId;
        batter.bowlerId = innings.currentBowlerId || undefined;
    }

    // --- Bowler Stats ---
    if (innings.currentBowlerId) {
        const bowler = getOrCreateBowler(innings, innings.currentBowlerId);
        if (isLegal) {
            bowler.overs += 1; // Count in balls
            innings.totalBalls += 1;
        }
        // Runs conceded: generally everything except byes/legbyes
        // Wides properties?
        if (event.type === "RUN") bowler.runsConceded += event.runs;
        if (isWide || isNoBall) bowler.runsConceded += runsScored; // Simplified
        if (event.type === "WICKET" && event.dismissalType !== "RUN_OUT") {
            bowler.wickets += 1;
        }
    }

    // --- Partnerships / Rotation ---
    // Swap ends if odd runs
    // Note: Wides/NoBalls might involve running.
    // Logic: Look at physical runs.
    let physicalRuns = 0;
    if (event.type === "RUN") physicalRuns = event.runs;
    if (event.type === "EXTRA") {
        if (isWide) physicalRuns = event.additionalRuns || 0; // The ran part
        if (isNoBall) physicalRuns = (event.runsOffBat || 0) + (event.additionalRuns || 0); // Ran part
        if (event.extraType === "BYE" || event.extraType === "LEG_BYE") physicalRuns = event.additionalRuns || 0;
    }

    // Check for swap
    // Standard rule: odd runs = swap.
    // Also: Over end = swap.
    // BUT: If wicket falls, new batsman handling takes precedence over swap?
    // Rules are complex. Simplified:

    if (physicalRuns % 2 !== 0) {
        swapBatsmen(innings);
    }

    // --- Wicket Handling ---
    if (event.type === "WICKET") {
        // If caught/bowled, user is out.
        // Striker is usually the one out (except run out at non-striker end - not handled by simple model)
        // Assume Striker is Out
        // New batsman comes to crease
        // Who takes strike? depends on "crossed". We ignore "crossed" for now and assume:
        // If odd runs ran before wicket? Hard to track.
        // Simplified: New batsman replaces the OUT batsman.
        // Does new batsman take strike? Depends on end of over or crossing.
        // We will assume simpler logic: New batsman behaves like the previous one unless swapped?

        if (event.newBatsmanId) {
            // Replace striker
            innings.strikerId = event.newBatsmanId;
            getOrCreateBatter(innings, event.newBatsmanId);
            // Reset isOut for new batter (just created)
        } else {
            innings.strikerId = null; // All out?
        }
    }

    // --- Over End ---
    // If legal balls % 6 === 0 AND legal balls > 0
    if (isLegal && innings.totalBalls % 6 === 0 && innings.totalBalls > 0) {
        swapBatsmen(innings);
    }

    // --- Innings Completion Check ---
    const totalMatchBalls = state.totalMatchOvers * 6;
    if (innings.totalWickets >= 10 || innings.totalBalls >= totalMatchBalls) {
        innings.isCompleted = true;
    }

    // --- Win Detection ---
    state.matchResult = deriveMatchResult(state);

    state.version += 1;
    return state;
}

// Helpers
function getOrCreateBatter(innings: InningsState, id: string): BatterState {
    if (!innings.batters[id]) {
        innings.batters[id] = { playerId: id, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false };
    }
    return innings.batters[id];
}

function getOrCreateBowler(innings: InningsState, id: string): BowlerState {
    if (!innings.bowlers[id]) {
        innings.bowlers[id] = { playerId: id, overs: 0, maidens: 0, runsConceded: 0, wickets: 0 };
    }
    return innings.bowlers[id];
}

function updateBatterStats(innings: InningsState, id: string, runs: number, balls: number) {
    const b = getOrCreateBatter(innings, id);
    b.runs += runs;
    b.ballsFaced += balls;
    if (runs === 4) b.fours++;
    if (runs === 6) b.sixes++;
}

function swapBatsmen(innings: InningsState) {
    const temp = innings.strikerId;
    innings.strikerId = innings.nonStrikerId;
    innings.nonStrikerId = temp;
}
