import { create } from "zustand";
import { deriveLeagueTable } from "./engine/deriveLeagueTable";
import type { CompletedMatch } from "./engine/types";
import { deriveQualificationScenarios } from "./projection/deriveQualificationScenarios";
import type { Fixture, ProjectionConfig } from "./projection/types";
import { deriveKnockoutBracket } from "./bracket/deriveKnockoutBracket";
import type { BracketFormat } from "./bracket/types";
import { resolveBracketProgression } from "./progression/resolveBracketProgression";
import type { PlayoffMatchResult } from "./progression/types";

interface TournamentState {
    // We would typically store matches or fetch them from an API.
    // This is a minimal mock for the engine integration.
    completedMatches: CompletedMatch[];
    setCompletedMatches: (matches: CompletedMatch[]) => void;
}

export const useTournamentStore = create<TournamentState>((set) => ({
    completedMatches: [],

    setCompletedMatches: (matches) => set({ completedMatches: matches }),
}));

/**
 * Derived Pure Selector for League Table.
 * The standings are never stored in the Zustand state itself.
 * They are derived deterministically on-demand to guarantee consistency.
 */
export const getLeagueTable = (state: TournamentState) => {
    return deriveLeagueTable(state.completedMatches);
};

/**
 * Derived Pure Selector for Qualification Projections.
 * Simulates all outcomes of remaining fixtures to determine probability and guaranteed standings.
 */
export const getQualificationProjection = (
    state: TournamentState,
    remainingFixtures: Fixture[],
    config?: Partial<ProjectionConfig>
) => {
    return deriveQualificationScenarios(state.completedMatches, remainingFixtures, config);
};

/**
 * Derived Pure Selector for Auto-Seeding Playoffs.
 * Consumes the dynamically generated league table and translates top seeds 
 * directly into Structural Bracket Match payloads.
 */
export const getBracket = (
    state: TournamentState,
    format: BracketFormat
) => {
    // Rely exclusively on the engine's deterministic sort
    const standings = deriveLeagueTable(state.completedMatches);
    return deriveKnockoutBracket(standings, format);
};

/**
 * Derived Pure Selector for Tournament Progression.
 * Dynamically pipes the structural bracket through playoff outcomes 
 * producing an end-to-end dynamically filled dependency graph.
 */
export const getResolvedBracket = (
    state: TournamentState,
    format: BracketFormat,
    playoffResults: PlayoffMatchResult[]
) => {
    return resolveBracketProgression({
        bracket: getBracket(state, format),
        results: playoffResults
    });
};

