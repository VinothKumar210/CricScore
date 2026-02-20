export interface Fixture {
    teamAId: string;
    teamBId: string;
}

export interface QualificationResult {
    teamId: string;
    guaranteedQualified: boolean;
    guaranteedEliminated: boolean;
    qualificationProbability: number; // 0 to 1 float
    totalScenarios: number;
    qualifiedScenarios: number;
}

export interface ProjectionConfig {
    qualificationSpots: number; // default 4
    maxFixturesAllowed: number; // default 6 (to prevent 2^n combinatoric explosions)
}
