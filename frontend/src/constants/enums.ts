export const UserRole = {
    GUEST: 'GUEST',
    USER: 'USER',
    TEAM_MEMBER: 'TEAM_MEMBER',
    TEAM_ADMIN: 'TEAM_ADMIN',
    SCORER: 'SCORER',
    TOURNAMENT_ADMIN: 'TOURNAMENT_ADMIN',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const MatchStatus = {
    SCHEDULED: 'SCHEDULED',
    LIVE: 'LIVE',
    INNINGS_BREAK: 'INNINGS_BREAK',
    COMPLETED: 'COMPLETED',
    ABANDONED: 'ABANDONED',
} as const;

export type MatchStatus = typeof MatchStatus[keyof typeof MatchStatus];
