import { z } from "zod";

// Prisma enums as Zod schemas for validation
export const RoleSchema = z.enum(["BATSMAN", "BOWLER", "ALL_ROUNDER"]);
export const BattingHandSchema = z.enum(["RIGHT", "LEFT"]);
export const BowlingStyleSchema = z.enum(["FAST", "MEDIUM_FAST", "SPIN"]);
export const InvitationStatusSchema = z.enum(["PENDING", "ACCEPTED", "REJECTED"]);

// Username validation - only ASCII letters, numbers, and symbols
const usernameRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;

// Create insert schemas for validation
export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(usernameRegex, "Username can only contain ASCII letters, numbers, and symbols")
    .optional(),
  profileName: z.string().optional(),
  description: z.string().optional(),
  profilePictureUrl: z.string().optional(),
  role: RoleSchema.optional(),
  battingHand: BattingHandSchema.optional(),
  bowlingStyle: BowlingStyleSchema.optional(),
  profileComplete: z.boolean().optional(),
});

export const insertCareerStatsSchema = z.object({
  userId: z.string(),
  matchesPlayed: z.number().int().min(0).optional(),
  totalRuns: z.number().int().min(0).optional(),
  ballsFaced: z.number().int().min(0).optional(),
  strikeRate: z.number().min(0).optional(),
  highestScore: z.number().int().min(0).optional(),
  timesOut: z.number().int().min(0).optional(),
  oversBowled: z.number().min(0).optional(),
  runsConceded: z.number().int().min(0).optional(),
  wicketsTaken: z.number().int().min(0).optional(),
  economy: z.number().min(0).optional(),
  bestBowlingWickets: z.number().int().min(0).optional(),
  bestBowlingRuns: z.number().int().min(0).optional(),
  catchesTaken: z.number().int().min(0).optional(),
  runOuts: z.number().int().min(0).optional(),
  manOfTheMatchAwards: z.number().int().min(0).optional(),
});

export const insertTeamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  captainId: z.string(),
  viceCaptainId: z.string().optional(),
});

export const insertTeamMemberSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
});

export const insertTeamInvitationSchema = z.object({
  teamId: z.string(),
  invitedBy: z.string(),
  invitedUser: z.string(),
  status: InvitationStatusSchema.optional(),
});

export const insertMatchSchema = z.object({
  userId: z.string(),
  opponent: z.string().min(1),
  matchDate: z.date(),
  runsScored: z.number().int().min(0),
  ballsFaced: z.number().int().min(0),
  wasDismissed: z.boolean().default(false),
  oversBowled: z.number().min(0),
  runsConceded: z.number().int().min(0),
  wicketsTaken: z.number().int().min(0),
  catchesTaken: z.number().int().min(0),
  runOuts: z.number().int().min(0).default(0),
  isManOfTheMatch: z.boolean().default(false),
});

export const insertTeamMatchSchema = z.object({
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  matchDate: z.date(),
  venue: z.string().min(1),
  status: z.enum(["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]).default("COMPLETED"),
  result: z.enum(["HOME_WIN", "AWAY_WIN", "DRAW"]).optional(),
  homeTeamRuns: z.number().int().min(0).default(0),
  homeTeamWickets: z.number().int().min(0).max(10).default(0),
  homeTeamOvers: z.number().min(0).default(0),
  awayTeamRuns: z.number().int().min(0).default(0),
  awayTeamWickets: z.number().int().min(0).max(10).default(0),
  awayTeamOvers: z.number().min(0).default(0),
});

export const insertTeamMatchPlayerSchema = z.object({
  teamMatchId: z.string(),
  userId: z.string(),
  teamId: z.string(),
  runsScored: z.number().int().min(0).default(0),
  ballsFaced: z.number().int().min(0).default(0),
  wasDismissed: z.boolean().default(false),
  oversBowled: z.number().min(0).default(0),
  runsConceded: z.number().int().min(0).default(0),
  wicketsTaken: z.number().int().min(0).default(0),
  catchesTaken: z.number().int().min(0).default(0),
});

export const insertTeamStatisticsSchema = z.object({
  teamId: z.string(),
  matchesPlayed: z.number().int().min(0).default(0),
  matchesWon: z.number().int().min(0).default(0),
  matchesLost: z.number().int().min(0).default(0),
  matchesDrawn: z.number().int().min(0).default(0),
  winRatio: z.number().min(0).max(1).default(0),
  topRunScorerId: z.string().optional(),
  topRunScorerRuns: z.number().int().min(0).default(0),
  topWicketTakerId: z.string().optional(),
  topWicketTakerWickets: z.number().int().min(0).default(0),
  bestStrikeRatePlayerId: z.string().optional(),
  bestStrikeRate: z.number().min(0).default(0),
  bestEconomyPlayerId: z.string().optional(),
  bestEconomy: z.number().min(0).default(0),
  mostManOfTheMatchPlayerId: z.string().optional(),
  mostManOfTheMatchAwards: z.number().int().min(0).default(0),
});

// Frontend form schema for match input
export const matchFormSchema = insertMatchSchema.omit({ userId: true }).extend({
  matchDate: z.string().transform(str => new Date(str)),
});

// Local match player schema
export const localPlayerSchema = z.object({
  name: z.string().min(1, "Player name is required"),
  hasAccount: z.boolean().default(false),
  username: z.string().optional(), // Username if player has account
  userId: z.string().optional(), // Only present if hasAccount is true
  teamSide: z.enum(["my", "opponent"]).optional(), // Which team this player belongs to
});

// Local match schema
export const insertLocalMatchSchema = z.object({
  creatorId: z.string(),
  matchName: z.string().min(1, "Match name is required"),
  venue: z.string().min(1, "Venue is required"),
  matchDate: z.date(),
  overs: z.number().int().min(1).max(50).default(20),
  myTeamName: z.string().optional(),
  myTeamId: z.string().optional(),
  opponentTeamName: z.string().optional(),
  opponentTeamId: z.string().optional(),
  myTeamPlayers: z.array(localPlayerSchema).min(1, "Each team must have at least 1 player"),
  opponentTeamPlayers: z.array(localPlayerSchema).min(1, "Each team must have at least 1 player"),
  allowSpectators: z.boolean().default(false),
  isRoomMatch: z.boolean().default(false),
  roomPassword: z.string().optional(),
});

// Match spectator schema
export const insertMatchSpectatorSchema = z.object({
  localMatchId: z.string(),
  userId: z.string(),
  addedBy: z.string(),
});

// Over history schema  
export const insertOverHistorySchema = z.object({
  localMatchId: z.string(),
  overNumber: z.number().int().min(0),
  innings: z.number().int().min(1).max(2),
  balls: z.array(z.any()), // Ball-by-ball data as JSON
  totalRuns: z.number().int().min(0).default(0),
  wickets: z.number().int().min(0).default(0),
});

// Frontend form schema for local match
export const localMatchFormSchema = insertLocalMatchSchema.omit({ creatorId: true }).extend({
  matchDate: z.string().transform(str => new Date(str)),
});

// Profile setup schema
export const profileSetupSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(usernameRegex, "Username can only contain ASCII letters, numbers, and symbols"),
  profileName: z.string().optional(),
  description: z.string().optional(),
  profilePictureUrl: z.string().optional(),
  role: z.enum(["BATSMAN", "BOWLER", "ALL_ROUNDER"]),
  battingHand: z.enum(["RIGHT", "LEFT"]),
  bowlingStyle: z.enum(["FAST", "MEDIUM_FAST", "SPIN"]).optional(),
});

// Flexible team match results schema - handles mixed team scenarios with both innings
export const teamMatchResultsSchema = z.object({
  // Team information - optional if team is not from database
  homeTeamId: z.string().optional(), // null if local team
  homeTeamName: z.string().min(1),   // always required for display
  awayTeamId: z.string().optional(), // null if local team  
  awayTeamName: z.string().min(1),   // always required for display
  
  matchDate: z.string().transform(str => new Date(str)),
  venue: z.string().min(1),
  result: z.enum(["HOME_WIN", "AWAY_WIN", "DRAW"]),
  
  // Match score details
  homeTeamRuns: z.number().int().min(0),
  homeTeamWickets: z.number().int().min(0).max(10),
  homeTeamOvers: z.number().min(0),
  awayTeamRuns: z.number().int().min(0),
  awayTeamWickets: z.number().int().min(0).max(10),
  awayTeamOvers: z.number().min(0),
  
  playerPerformances: z.array(z.object({
    userId: z.string().optional(),     // null if player has no account
    playerName: z.string().min(1),     // always required
    teamId: z.string().optional(),     // null if not database team
    teamName: z.string().min(1),       // always required (home/away team name)
    
    // Batting stats (combined across both innings)
    runsScored: z.number().int().min(0).default(0),
    ballsFaced: z.number().int().min(0).default(0),
    wasDismissed: z.boolean().default(false),
    fours: z.number().int().min(0).default(0),
    sixes: z.number().int().min(0).default(0),
    
    // Bowling stats (combined across both innings)
    oversBowled: z.number().min(0).default(0),
    runsConceded: z.number().int().min(0).default(0),
    wicketsTaken: z.number().int().min(0).default(0),
    
    // Fielding stats (combined across both innings)
    catchesTaken: z.number().int().min(0).default(0),
    runOuts: z.number().int().min(0).default(0),
    
    // Match awards
    isManOfTheMatch: z.boolean().default(false)
  }))
});

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Types - these will be generated by Prisma, but we define them for TypeScript compatibility
export type Role = z.infer<typeof RoleSchema>;
export type BattingHand = z.infer<typeof BattingHandSchema>;
export type BowlingStyle = z.infer<typeof BowlingStyleSchema>;
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCareerStats = z.infer<typeof insertCareerStatsSchema>;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type InsertTeamMatch = z.infer<typeof insertTeamMatchSchema>;
export type InsertTeamMatchPlayer = z.infer<typeof insertTeamMatchPlayerSchema>;
export type InsertTeamStatistics = z.infer<typeof insertTeamStatisticsSchema>;
export type LocalPlayer = z.infer<typeof localPlayerSchema>;
export type InsertLocalMatch = z.infer<typeof insertLocalMatchSchema>;
export type LocalMatchForm = z.infer<typeof localMatchFormSchema>;
export type InsertMatchSpectator = z.infer<typeof insertMatchSpectatorSchema>;
export type InsertOverHistory = z.infer<typeof insertOverHistorySchema>;
export type ProfileSetup = z.infer<typeof profileSetupSchema>;
export type TeamMatchResults = z.infer<typeof teamMatchResultsSchema>;
export type InsertMatchSummary = z.infer<typeof insertMatchSummarySchema>;
export type InsertPlayerMatchHistory = z.infer<typeof insertPlayerMatchHistorySchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;

// Match summary schema - comprehensive match data storage
export const insertMatchSummarySchema = z.object({
  id: z.string().optional(), // Will be generated
  matchDate: z.string().transform(str => new Date(str)),
  venue: z.string().min(1),
  
  // Team information
  homeTeamName: z.string().min(1),
  homeTeamId: z.string().optional(), // null if local team
  awayTeamName: z.string().min(1),
  awayTeamId: z.string().optional(), // null if local team
  
  // Match result
  result: z.enum(["HOME_WIN", "AWAY_WIN", "DRAW"]),
  winningTeam: z.string().min(1),
  
  // Innings scores
  firstInningsTeam: z.string().min(1), // team name
  firstInningsRuns: z.number().int().min(0),
  firstInningsWickets: z.number().int().min(0).max(10),
  firstInningsOvers: z.number().min(0),
  
  secondInningsTeam: z.string().min(1), // team name  
  secondInningsRuns: z.number().int().min(0),
  secondInningsWickets: z.number().int().min(0).max(10),
  secondInningsOvers: z.number().min(0),
  
  // Match context
  target: z.number().int().min(0).optional(),
  totalOvers: z.number().int().min(1).max(50).default(20),
  
  // Man of the match
  manOfTheMatchPlayerName: z.string().optional(),
  manOfTheMatchUserId: z.string().optional(),
  manOfTheMatchStats: z.any().optional(), // JSON object of stats
  
  // Complete player data (JSON)
  firstInningsBatsmen: z.any(), // JSON array of batting stats
  firstInningsBowlers: z.any(), // JSON array of bowling stats
  secondInningsBatsmen: z.any(), // JSON array of batting stats  
  secondInningsBowlers: z.any(), // JSON array of bowling stats
});

// Player match participation schema - links players to match summaries
export const insertPlayerMatchHistorySchema = z.object({
  userId: z.string(),
  matchSummaryId: z.string(),
  teamName: z.string().min(1), // which team they played for
  teamId: z.string().optional(), // null if local team
  playerName: z.string().min(1),
  
  // Performance summary
  runsScored: z.number().int().min(0).default(0),
  ballsFaced: z.number().int().min(0).default(0),
  wicketsTaken: z.number().int().min(0).default(0),
  oversBowled: z.number().min(0).default(0),
  isManOfTheMatch: z.boolean().default(false),
});

// Re-export Prisma model types
export type { User, CareerStats, Team, TeamMember, TeamInvitation, Match, TeamMatch, TeamMatchPlayer, TeamStatistics, LocalMatch, MatchSpectator, OverHistory, MatchSummary, PlayerMatchHistory } from "@prisma/client";