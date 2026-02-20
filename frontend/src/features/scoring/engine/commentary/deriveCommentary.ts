import type { BallEvent } from "../../types/ballEventTypes";
import type { CommentaryEntry } from "./commentaryTypes";
import { generateCommentaryLine } from "./generateCommentaryLine";

/**
 * deriveCommentary — O(n) pass over events to produce reverse-chronological commentary
 */
export function deriveCommentary(events: BallEvent[]): CommentaryEntry[] {
    const commentary: CommentaryEntry[] = [];

    // Simple state to track overs if we want deterministic overLabel
    let ballsInOver = 0;
    let completedOvers = 0;

    for (let i = 0; i < events.length; i++) {
        const event = events[i];

        // Is it a legal delivery for over counting?
        let isLegal = true;
        if (event.type === "EXTRA" && (event.extraType === "WIDE" || event.extraType === "NO_BALL")) {
            isLegal = false;
        }

        if (isLegal) {
            ballsInOver++;
        }

        // Determine label: if we have event.overNumber, we could use that, 
        // but often we want the ball-by-ball label "Over 0.1, 0.2", etc.
        // The domain often provides `overNumber`, `ballNumber` on `event`.
        // Let's use internal state to be strictly deterministic array-bound.
        const currentBallDisplay = isLegal ? ballsInOver : ballsInOver; // wide ball still displays current tally

        const overLabel = event.overNumber !== undefined && event.ballNumber !== undefined
            ? `${event.overNumber}.${event.ballNumber}`
            : `${completedOvers}.${currentBallDisplay}`;

        const text = generateCommentaryLine(event, i);

        commentary.push({
            id: `comm-${i}`,
            eventIndex: i,
            overLabel,
            text,
        });

        if (isLegal && ballsInOver >= 6) {
            completedOvers++;
            ballsInOver = 0;
        }
    }

    return commentary.reverse(); // Reverse chronological for UI display
}
