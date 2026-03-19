import Dexie, { type Table } from 'dexie';

export interface LocalBallEvent {
    localId?: number; // Auto-incremented primary key for Dexie
    matchId: string;
    timestamp: number;
    
    // Core event data
    type: 'BALL' | 'UNDO' | 'OVER_COMPLETE' | 'INNINGS_BREAK' | 'MATCH_COMPLETE';
    runs: number;
    batsmanId: string;
    bowlerId: string;
    nonStrikerId: string;
    
    // Extras
    extraType?: 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY';
    extraRuns?: number;
    
    // Wicket
    isWicket?: boolean;
    wicketType?: 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET' | 'OBSTRUCTING' | 'RETIRED_HURT';
    dismissedBatsmanId?: string;
    fielderId?: string;

    // Wagon Wheel
    shotZone?: number;
    shotAngle?: number;
    shotDistance?: number;

    // Sync state
    syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
    clientOpId: string; // UUID to prevent duplicating events on backend
    serverVersion?: number; 
}

export interface LocalMatchState {
    matchId: string;
    stateJson: string; // The fully derived match state
    updatedAt: number;
}

export class MatchDatabase extends Dexie {
    matchEvents!: Table<LocalBallEvent, number>;
    matchState!: Table<LocalMatchState, string>;

    constructor() {
        super('CricScoreDB');
        
        // Define tables and indexes
        this.version(1).stores({
            matchEvents: '++localId, matchId, syncStatus, clientOpId',
            matchState: 'matchId' // Primary key is matchId
            // Indexes used: localId (PK), matchId, syncStatus (for quick offline queries)
        });
    }
}

export const matchDB = new MatchDatabase();
