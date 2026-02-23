/**
 * Archive types — metadata for list, full data for detail.
 */

export interface ArchivedMatchMeta {
    id: string;
    matchId: string;
    homeTeamName: string;
    awayTeamName: string;
    result: string | null;
    winningTeamName: string | null;
    winMargin: string | null;
    matchDate: string;
    overs: number;
    matchType: string;
    eventCount: number;
    engineVersion: string;
    archivedAt: string;
}

export interface ArchivedMatchFull extends ArchivedMatchMeta {
    events: ArchivedEvent[];
    matchConfig: ArchivedMatchConfig;
    snapshotData: Record<string, unknown>;
}

export interface ArchivedEvent {
    opIndex: number;
    payload: any;
}

export interface ArchivedMatchConfig {
    overs: number;
    ballType?: string;
    powerplayEnabled?: boolean;
    matchType: string;
    homeTeamName: string;
    awayTeamName: string;
}

export interface ArchivePagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export interface ArchiveListResponse {
    archives: ArchivedMatchMeta[];
    pagination: ArchivePagination;
}

export interface ArchiveFiltersState {
    teamName?: string;
    tournament?: string;
}
