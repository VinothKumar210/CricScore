import type { BallEvent } from "../../../scoring/types/ballEventTypes";
import type { MatchDetail } from "../../../matches/types/domainTypes";

export interface HighlightEntry {
    type: "WICKET" | "BOUNDARY" | "MILESTONE" | "RESULT";
    description: string;
    over?: number;
    ball?: number;
    eventIndex: number; // For time-travel/linking
}

/**
 * Extracts key moments (wickets, 4s, 6s) from events.
 * Note: Provide already derived milestones directly if available to prevent re-computation, 
 * or we just extract raw events.
 */
export function deriveHighlights(events: BallEvent[], matchState: MatchDetail, milestones: any[] = []): HighlightEntry[] {
    const highlights: HighlightEntry[] = [];

    // 1. Extract Wickets and Boundaries
    events.forEach((ev, index) => {
        const overNum = (ev as any).overNumber;
        const ballNum = (ev as any).ballNumber;

        if (ev.type === "WICKET") {
            highlights.push({
                type: "WICKET",
                description: `WICKET! ${ev.dismissalType}`,
                over: overNum,
                ball: ballNum,
                eventIndex: index
            });
        } else if (ev.type === "RUN" && ev.runs != null && ev.runs >= 4) {
            highlights.push({
                type: "BOUNDARY",
                description: ev.runs === 6 ? `SIX! Huge hit!` : `FOUR! Great shot!`,
                over: overNum,
                ball: ballNum,
                eventIndex: index
            });
        }
    });

    // 2. Format and Append Milestones
    milestones.forEach((m) => {
        if (m.isProcessed && m.content) {
            highlights.push({
                type: "MILESTONE",
                description: m.content,
                eventIndex: m.eventIndex || events.length // default to end if no index
            });
        }
    });

    // 3. Append Match Result if completed
    if (matchState?.status === "COMPLETED") {
        const resultText = (() => {
            if (matchState.innings.length > 1) {
                const inn1 = matchState.innings[0];
                const inn2 = matchState.innings[1];
                const t1 = matchState.teamA.id === inn1.battingTeamId ? matchState.teamA.name : matchState.teamB.name;
                const t2 = matchState.teamA.id === inn2.battingTeamId ? matchState.teamA.name : matchState.teamB.name;

                if (inn2.totalRuns > inn1.totalRuns) {
                    return `${t2} won by ${10 - inn2.totalWickets} wickets!`;
                } else if (inn1.totalRuns > inn2.totalRuns) {
                    return `${t1} won by ${inn1.totalRuns - inn2.totalRuns} runs!`;
                }
                return "Match Tied!";
            }
            return "Match Completed";
        })();

        highlights.push({
            type: "RESULT",
            description: resultText,
            eventIndex: events.length
        });
    }

    // Sort chronologically by event index
    highlights.sort((a, b) => a.eventIndex - b.eventIndex);

    return highlights;
}
