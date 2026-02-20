/**
 * Milestone Types — Pure TypeScript definitions.
 * No dependencies. No React. No store.
 */

export type MilestoneType =
    | "BATTER_50"
    | "BATTER_100"
    | "BATTER_150"
    | "BOWLER_3W"
    | "BOWLER_5W"
    | "HATTRICK"
    | "PARTNERSHIP_50"
    | "PARTNERSHIP_100"
    | "TEAM_100"
    | "TEAM_200"
    | "TEAM_300";

export interface Milestone {
    /** Deterministic ID: `${eventIndex}-${type}` */
    id: string;
    type: MilestoneType;
    playerId?: string;
    teamId?: string;
    overNumber?: number;
    eventIndex: number;
}
