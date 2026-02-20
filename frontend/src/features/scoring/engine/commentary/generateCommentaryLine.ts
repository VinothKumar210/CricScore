import type { BallEvent } from "../../types/ballEventTypes";
import { runTemplates, wicketTemplates, extraTemplates } from "./commentaryTemplates";

/**
 * Deterministically picks a template based on eventIndex.
 * Replay-safe, Undo-safe, no Math.random().
 */
function pickDeterministic(templates: string[], index: number): string {
    if (!templates || templates.length === 0) return "";
    return templates[index % templates.length];
}

export function generateCommentaryLine(event: BallEvent, eventIndex: number): string {
    const bowler = event.bowlerId ? event.bowlerId : "The bowler";
    const batter = event.batsmanId ? event.batsmanId : "the batter";

    if (event.type === "RUN") {
        const text = pickDeterministic(runTemplates[event.runs] || runTemplates[0], eventIndex);
        return `${bowler} to ${batter}: ${text}`;
    }

    if (event.type === "EXTRA") {
        let text = "";
        const typeStr = event.extraType;

        text = pickDeterministic(extraTemplates[typeStr] || ["Extra delivered."], eventIndex);

        if (event.extraType === "NO_BALL" && event.runsOffBat) {
            const hits = pickDeterministic(runTemplates[event.runsOffBat] || ["Runs off the bat."], eventIndex + 1);
            text += ` ${hits}`;
        }

        return `${bowler} to ${batter}: ${text}`;
    }

    if (event.type === "WICKET") {
        const outPlayer = event.batsmanId; // Technically could be striker but close enough for auto commentary
        const templates = wicketTemplates[event.dismissalType];

        if (templates && templates.length > 0) {
            const text = pickDeterministic(templates, eventIndex);
            return `WICKET! ${bowler} gets ${outPlayer}. ${text}`;
        } else {
            return `WICKET! ${outPlayer} is out (${event.dismissalType}).`;
        }
    }

    return `${bowler} bowls...`;
}
