import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  username: text("username").unique(),
  role: text("role", { enum: ["batsman", "bowler", "all-rounder"] }),
  battingHand: text("batting_hand", { enum: ["right", "left"] }),
  bowlingStyle: text("bowling_style", { enum: ["fast", "medium-fast", "spin"] }),
  profileComplete: boolean("profile_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const careerStats = pgTable("career_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  matchesPlayed: integer("matches_played").default(0),
  // Batting stats
  totalRuns: integer("total_runs").default(0),
  ballsFaced: integer("balls_faced").default(0),
  strikeRate: decimal("strike_rate", { precision: 5, scale: 2 }).default("0"),
  // Bowling stats
  oversBowled: decimal("overs_bowled", { precision: 8, scale: 1 }).default("0"),
  runsConceded: integer("runs_conceded").default(0),
  wicketsTaken: integer("wickets_taken").default(0),
  economy: decimal("economy", { precision: 5, scale: 2 }).default("0"),
  // Fielding stats
  catchesTaken: integer("catches_taken").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  captainId: varchar("captain_id").references(() => users.id).notNull(),
  viceCaptainId: varchar("vice_captain_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const teamInvitations = pgTable("team_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id).notNull(),
  invitedBy: varchar("invited_by").references(() => users.id).notNull(),
  invitedUser: varchar("invited_user").references(() => users.id).notNull(),
  status: text("status", { enum: ["pending", "accepted", "rejected"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  opponent: text("opponent").notNull(),
  matchDate: timestamp("match_date").notNull(),
  // Batting performance
  runsScored: integer("runs_scored").notNull(),
  ballsFaced: integer("balls_faced").notNull(),
  // Bowling performance
  oversBowled: decimal("overs_bowled", { precision: 4, scale: 1 }).notNull(),
  runsConceded: integer("runs_conceded").notNull(),
  wicketsTaken: integer("wickets_taken").notNull(),
  // Fielding performance
  catchesTaken: integer("catches_taken").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCareerStatsSchema = createInsertSchema(careerStats).omit({
  id: true,
  updatedAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).omit({
  id: true,
  createdAt: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
});

// Profile setup schema
export const profileSetupSchema = z.object({
  username: z.string().min(3).max(30),
  role: z.enum(["batsman", "bowler", "all-rounder"]),
  battingHand: z.enum(["right", "left"]),
  bowlingStyle: z.enum(["fast", "medium-fast", "spin"]).optional(),
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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCareerStats = z.infer<typeof insertCareerStatsSchema>;
export type CareerStats = typeof careerStats.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;
export type ProfileSetup = z.infer<typeof profileSetupSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
