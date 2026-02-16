import type { MatchOp } from '@prisma/client';
import { type MatchState, type MatchOpPayload, INITIAL_MATCH_STATE } from '../types/scoringTypes.js';

/**
 * Reconstructs the match state by replaying operations.
 * Handles UNDO by strictly ignoring undone operations.
 */
export const reconstructMatchState = (matchId: string, ops: MatchOp[]): MatchState => {
    // 1. Sort operations by index (should be already sorted from DB, but safety first)
    const sortedOps = [...ops].sort((a, b) => a.opIndex - b.opIndex);

    // 2. Filter out UNDO operations
    // UNDO logic: An UNDO op has a payload pointing to the `clientOpId` or `opIndex` it undoes?
    // Simplified: An UNDO op conceptually removes the *previous* valid operation.
    // Or: UNDO payload contains { targetOpIndex: number }.
    // Let's assume UNDO removes the *immediately preceding* valid operation for simplicity unless payload specifies otherwise.
    // Actually, robust undo usually targets specific op.
    // Let's implement: "Undo Last Action".

    const validOps: MatchOp[] = [];
    const undoneOpIndices = new Set<number>();

    // Iterate backwards to identify UNDO chains? 
    // Easier: Iterate forward. If we see UNDO, pop the last valid op.
    // Valid ops stack.

    for (const op of sortedOps) {
        // Parse payload safely
        let payload: MatchOpPayload;
        try {
            payload = op.payload as any; // JSON type cast
        } catch (e) {
            console.error(`Invalid payload for op ${op.id}`, op.payload);
            continue;
        }

        if (payload.type === 'UNDO') {
            // Remove the last valid operation from the stack
            if (validOps.length > 0) {
                validOps.pop();
            }
        } else {
            validOps.push(op);
        }
    }

    // 3. Replay valid operations
    let state: MatchState = { ...INITIAL_MATCH_STATE, matchId };

    for (const op of validOps) {
        const payload = op.payload as any as MatchOpPayload;
        state = applyOperation(state, payload);
    }

    return state;
};

/**
 * Pure function to apply a single operation to the state.
 */
const applyOperation = (state: MatchState, payload: MatchOpPayload): MatchState => {
    // Clone state to avoid mutation side-effects (simple shallow copy ok for now if we replace nested objects)
    const newState = JSON.parse(JSON.stringify(state)); // Deep clone for safety in draft

    switch (payload.type) {
        case 'START_INNINGS':
            newState.currentInnings = payload.inningsNumber || 1;
            newState.battingTeamId = payload.battingTeamId;
            newState.bowlingTeamId = payload.bowlingTeamId;
            newState.strikerId = payload.strikerId;
            newState.nonStrikerId = payload.nonStrikerId;
            newState.currentBowlerId = payload.bowlerId;
            newState.status = 'LIVE';
            break;

        case 'DELIVER_BALL':
            return applyDeliverBall(newState, payload);

        case 'WICKET':
            // Usually WICKET is part of DELIVER_BALL result or separate?
            // If separate, it modifies the last ball or current state.
            // Let's assume DELIVER_BALL handles runs + wicket info in payload.
            break;

        case 'END_INNINGS':
            newState.isInningsComplete = true;
            newState.status = 'INNINGS_BREAK';
            break;

        // ... Handle other types
    }

    return newState;
};

const applyDeliverBall = (state: MatchState, payload: any): MatchState => {
    // Basic logic for placeholder - Step 8 does the heavy stats calculation.
    // Step 7 focuses on the engine loop.

    // Update Runs
    const runs = payload.runs || 0;
    const isWide = payload.isWide;
    const isNoBall = payload.isNoBall;
    const isWicket = payload.isWicket;

    // Total Score
    state.totalRuns += runs;
    if (isWide || isNoBall) state.totalRuns += 1; // Basic extra logic

    // Balls Bowled (Legal)
    if (!isWide && !isNoBall) {
        state.ballsBowled += 1;
        // Overs calculation: 0.1, 0.2...
        // Use ball count for strict math
    }

    // Wickets
    if (isWicket) {
        state.wickets += 1;
        state.strikerId = null; // Needs replacement
    }

    // Swap Strike (Rotation)
    if (runs % 2 !== 0) {
        const temp = state.strikerId;
        state.strikerId = state.nonStrikerId;
        state.nonStrikerId = temp;
    }

    // Append to log
    let ballDesc = `${runs}`;
    if (isWicket) ballDesc = 'W';
    if (isWide) ballDesc = 'Wd';
    state.lastBalls.push(ballDesc);
    if (state.lastBalls.length > 6) state.lastBalls.shift(); // Keep last 6

    return state;
};
