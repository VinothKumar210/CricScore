import type { PowerplayConfig } from "../types/matchStateTypes";

export type MatchPhaseName = "POWERPLAY" | "MIDDLE" | "DEATH";

/**
 * Pure function to determine the phase of a given over.
 * @param overNumber The 0-indexed over number (e.g., 0 for the first over).
 * @param config Optional PowerplayConfig from the match settings.
 * @param totalOvers The current effective total overs for the innings.
 * @param isSuperOver Boolean indicating if this is a super over.
 * @returns The phase name.
 */
export function getMatchPhase(
    overNumber: number,
    config?: PowerplayConfig,
    totalOvers: number = 20,
    isSuperOver: boolean = false
): MatchPhaseName {
    // Super overs are entirely DEATH phase implicitly
    if (isSuperOver) {
        return "DEATH";
    }

    // Default T20 config if none provided, scaled down if totalOvers is small
    const ppLimit = config?.powerplayOvers ?? Math.ceil(totalOvers * 0.3); // e.g., 6 for 20
    const midLimit = config?.middleOversEnd ?? Math.ceil(totalOvers * 0.75); // e.g., 15 for 20

    // Clamp effective limits against actual match length
    const actualPP = Math.min(ppLimit, totalOvers);
    const actualMid = Math.max(actualPP, Math.min(midLimit, totalOvers));

    if (overNumber < actualPP) {
        return "POWERPLAY";
    }

    if (overNumber < actualMid) {
        return "MIDDLE";
    }

    return "DEATH";
}
