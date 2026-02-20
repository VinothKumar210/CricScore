export interface TeamStanding {
    teamId: string;
    played: number;
    won: number;
    lost: number;
    tied: number;
    noResult: number;
    points: number;
    runsFor: number;
    runsAgainst: number;
    oversFaced: number;
    oversBowled: number;
    netRunRate: number;
}

export interface CompletedMatch {
    teamAId: string;
    teamBId: string;
    teamARuns: number;
    teamAOvers: number;
    teamAAllOut: boolean;
    teamBRuns: number;
    teamBOvers: number;
    teamBAllOut: boolean;
    result: "A_WIN" | "B_WIN" | "TIE" | "NO_RESULT";
    isSuperOverWin?: "A" | "B";
    matchOversLimit: number; // The scheduled or rain-revised overs for the match/innings
    isRainAffected?: boolean;
}
