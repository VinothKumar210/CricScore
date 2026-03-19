// Simplified DLS Resource Table for T20 Context
// Value represents the percentage of resources remaining (0.0 to 1.0)
// Rows: Overs Remaining (0 to 20)
// Cols: Wickets Lost (0 to 9)
// Values are approximate generic T20 resource percentages.
const RESOURCE_TABLE: number[][] = [
    // Wickets Lost: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
    [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00], // 0 overs remaining
    [0.06, 0.05, 0.05, 0.04, 0.04, 0.03, 0.03, 0.02, 0.01, 0.01], // 1 over
    [0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.04, 0.03, 0.01], // 2 overs
    [0.18, 0.17, 0.15, 0.14, 0.12, 0.10, 0.08, 0.06, 0.04, 0.02], // 3 overs
    [0.23, 0.22, 0.20, 0.18, 0.16, 0.14, 0.11, 0.08, 0.06, 0.03], // 4 overs
    [0.29, 0.27, 0.25, 0.22, 0.20, 0.17, 0.14, 0.10, 0.07, 0.03], // 5 overs
    [0.34, 0.32, 0.29, 0.27, 0.24, 0.20, 0.16, 0.12, 0.08, 0.04], // 6 overs
    [0.39, 0.37, 0.34, 0.31, 0.27, 0.23, 0.19, 0.14, 0.09, 0.04], // 7 overs
    [0.44, 0.42, 0.38, 0.35, 0.31, 0.26, 0.21, 0.16, 0.10, 0.05], // 8 overs
    [0.49, 0.46, 0.43, 0.39, 0.34, 0.29, 0.23, 0.17, 0.11, 0.05], // 9 overs
    [0.54, 0.51, 0.47, 0.43, 0.38, 0.32, 0.26, 0.19, 0.12, 0.05], // 10 overs
    [0.58, 0.55, 0.51, 0.46, 0.41, 0.35, 0.28, 0.20, 0.13, 0.06], // 11 overs
    [0.63, 0.59, 0.55, 0.50, 0.44, 0.38, 0.30, 0.22, 0.13, 0.06], // 12 overs
    [0.67, 0.64, 0.59, 0.54, 0.47, 0.40, 0.32, 0.23, 0.14, 0.06], // 13 overs
    [0.72, 0.68, 0.63, 0.57, 0.50, 0.43, 0.34, 0.25, 0.15, 0.06], // 14 overs
    [0.76, 0.72, 0.67, 0.60, 0.53, 0.45, 0.36, 0.26, 0.16, 0.06], // 15 overs
    [0.81, 0.76, 0.70, 0.64, 0.56, 0.47, 0.38, 0.27, 0.16, 0.06], // 16 overs
    [0.85, 0.81, 0.74, 0.67, 0.59, 0.49, 0.39, 0.28, 0.17, 0.06], // 17 overs
    [0.90, 0.85, 0.78, 0.70, 0.62, 0.52, 0.41, 0.29, 0.17, 0.06], // 18 overs
    [0.95, 0.89, 0.82, 0.73, 0.64, 0.54, 0.42, 0.30, 0.18, 0.06], // 19 overs
    [1.00, 0.93, 0.85, 0.76, 0.67, 0.56, 0.44, 0.31, 0.18, 0.06]  // 20 overs
];

// Fallback logic for missing exact matches: interpolates array values
function getResourceRemaining(oversLeft: number, wicketsLost: number, totalMatchOvers: number = 20): number {
    const maxOvers = Math.min(20, totalMatchOvers); // scale if different
    const scaledOversLeft = (oversLeft / totalMatchOvers) * maxOvers;
    
    // Bounds check
    if (scaledOversLeft <= 0) return 0;
    if (wicketsLost >= 10) return 0;

    const lowerOver = Math.floor(scaledOversLeft);
    const upperOver = Math.ceil(scaledOversLeft);
    const fractionalOver = scaledOversLeft - lowerOver;

    const w = Math.min(9, Math.max(0, wicketsLost));

    // Linear interpolation between the two whole-over bounds
    const R1 = lowerOver <= 20 ? RESOURCE_TABLE[lowerOver][w] : 1.0;
    const R2 = upperOver <= 20 ? RESOURCE_TABLE[upperOver][w] : 1.0;

    return R1 + (R2 - R1) * fractionalOver;
}

/**
 * Calculates DLS Par Score for Team 2 during a run chase interruption.
 * Team 1 score = Target - 1 (First innings final runs)
 */
export function calculateParScore(
    team1Score: number,
    totalMatchOvers: number,
    oversPlayedTeam2: number,
    wicketsLostTeam2: number
): number {
    const oversLeftTeam2 = totalMatchOvers - oversPlayedTeam2;
    
    // Resources available to Team 2 at start (100% implicitly since they started with 10 overs / 20 overs and 0 wickets lost)
    // Actually, if the match was shortened BEFORE Team 2 started, their R2 is the resource at totalMatchOvers.
    const R1 = getResourceRemaining(totalMatchOvers, 0, totalMatchOvers); // Should be 1.0
    
    // Resources remaining right now for Team 2
    const R2Remaining = getResourceRemaining(oversLeftTeam2, wicketsLostTeam2, totalMatchOvers);
    
    // Resources USED by Team 2
    const R2Used = R1 - R2Remaining;

    // Par score == Team 1 Score * (R2 Used / R1)
    const parScoreFloat = team1Score * (R2Used / R1);
    
    // Floor the par score. A tie requires reaching par score exactly. To win, need parScore + 1.
    return Math.floor(parScoreFloat);
}

/**
 * Calculates Revised Target if the match is shortened mid-innings.
 */
export function calculateRevisedTarget(
    team1Score: number,
    totalMatchOvers: number,
    _originalOversTeam2: number,
    revisedOversTeam2: number
): number {
    const R1 = getResourceRemaining(totalMatchOvers, 0, totalMatchOvers);
    const R2 = getResourceRemaining(revisedOversTeam2, 0, totalMatchOvers);

    if (R2 < R1) {
        // Revised target = Team 1 * (R2 / R1)
        const newTarget = team1Score * (R2 / R1);
        return Math.floor(newTarget) + 1;
    }

    return team1Score + 1;
}
