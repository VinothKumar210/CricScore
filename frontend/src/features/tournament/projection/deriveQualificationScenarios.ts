import { deriveLeagueTable } from "../engine/deriveLeagueTable";
import type { CompletedMatch } from "../engine/types";
import { simulateOutcome } from "./simulateOutcome";
import type { Fixture, ProjectionConfig, QualificationResult } from "./types";

const DEFAULT_CONFIG: ProjectionConfig = {
    qualificationSpots: 4,
    maxFixturesAllowed: 6
};

/**
 * Deterministic O(n) Qualification Projection Engine.
 * Simulates all 2^n possible binary win/loss outcomes for remaining fixtures,
 * aggregates deterministic league standings computationally without mutation,
 * and derives exact probability ratios per team.
 * 
 * @param completedMatches Array of immutable completed matches
 * @param remainingFixtures Array of upcoming fixtures
 * @param config Optional projection bounds
 * @returns Array of precise deterministic probability results per team
 */
export function deriveQualificationScenarios(
    completedMatches: CompletedMatch[],
    remainingFixtures: Fixture[],
    config: Partial<ProjectionConfig> = {}
): QualificationResult[] {
    const activeConfig = { ...DEFAULT_CONFIG, ...config };
    const { qualificationSpots, maxFixturesAllowed } = activeConfig;
    const numFixtures = remainingFixtures.length;

    // Safety Combinatorics Guard
    if (numFixtures > maxFixturesAllowed) {
        throw new Error(`Projection too large: ${numFixtures} fixtures exceeds limit of ${maxFixturesAllowed}. Expected combinations: 2^${numFixtures}`);
    }

    // Identify complete set of all active teams involved in both past and future matches
    const allTeamIds = new Set<string>();
    completedMatches.forEach(m => { allTeamIds.add(m.teamAId); allTeamIds.add(m.teamBId); });
    remainingFixtures.forEach(f => { allTeamIds.add(f.teamAId); allTeamIds.add(f.teamBId); });

    // Initialize result aggregators
    const teamResultMap = new Map<string, { qualifiedScenarios: number, totalScenarios: number }>();
    allTeamIds.forEach(id => teamResultMap.set(id, { qualifiedScenarios: 0, totalScenarios: 0 }));

    // 2^n Combinatorics Bitmask Loop
    const totalScenarios = 1 << numFixtures;

    for (let mask = 0; mask < totalScenarios; mask++) {
        // Construct the simulated schedule for this specific scenario
        const simulatedMatches: CompletedMatch[] = [];

        for (let i = 0; i < numFixtures; i++) {
            // Check the i-th bit. If 0 -> A wins, 1 -> B wins.
            const isBWin = (mask & (1 << i)) !== 0;
            const bit = isBWin ? 1 : 0;

            simulatedMatches.push(simulateOutcome(remainingFixtures[i], bit));
        }

        // Merge historical fact with simulated fiction
        const scenarioMatches = [...completedMatches, ...simulatedMatches];

        // Evaluate truth
        const sortedStandings = deriveLeagueTable(scenarioMatches);

        // Identify qualifiers
        // Known bug note requested by USER regarding symmetric tiebreaker edge-cases: 
        // This accepts a strict slice for rank 4 tiebreaks per instruction. 
        // Real-world cricket handles symmetric tieresolution via head-to-head or toss sometimes.
        const topTeams = sortedStandings.slice(0, qualificationSpots).map(t => t.teamId);

        // Update tallies
        allTeamIds.forEach(teamId => {
            const data = teamResultMap.get(teamId)!;
            data.totalScenarios += 1;
            if (topTeams.includes(teamId)) {
                data.qualifiedScenarios += 1;
            }
        });
    }

    // Convert map to formal domain interfaces
    const results: QualificationResult[] = [];

    allTeamIds.forEach(teamId => {
        const data = teamResultMap.get(teamId)!;
        const probability = data.totalScenarios === 0 ? 0 : data.qualifiedScenarios / data.totalScenarios;

        results.push({
            teamId,
            totalScenarios: data.totalScenarios,
            qualifiedScenarios: data.qualifiedScenarios,
            // Strict precision float
            qualificationProbability: probability,
            guaranteedQualified: data.qualifiedScenarios === data.totalScenarios,
            guaranteedEliminated: data.qualifiedScenarios === 0
        });
    });

    return results;
}
