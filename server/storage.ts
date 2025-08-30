import { type User, type InsertUser, type CareerStats, type InsertCareerStats, type Team, type InsertTeam, type TeamMember, type InsertTeamMember, type TeamInvitation, type InsertTeamInvitation, type Match, type InsertMatch, type ProfileSetup } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserProfile(id: string, profile: ProfileSetup): Promise<User | undefined>;
  
  // Career stats operations
  getCareerStats(userId: string): Promise<CareerStats | undefined>;
  createCareerStats(stats: InsertCareerStats): Promise<CareerStats>;
  updateCareerStats(userId: string, stats: Partial<CareerStats>): Promise<CareerStats | undefined>;
  
  // Team operations
  getTeam(id: string): Promise<Team | undefined>;
  getTeamsByUser(userId: string): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined>;
  
  // Team member operations
  getTeamMembers(teamId: string): Promise<(TeamMember & { user: User })[]>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  removeTeamMember(teamId: string, userId: string): Promise<boolean>;
  
  // Team invitation operations
  getTeamInvitations(userId: string): Promise<(TeamInvitation & { team: Team, inviter: User })[]>;
  getSentInvitations(teamId: string): Promise<(TeamInvitation & { user: User })[]>;
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  updateInvitationStatus(id: string, status: "accepted" | "rejected"): Promise<TeamInvitation | undefined>;
  
  // Match operations
  getMatches(userId: string): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  
  // Auth operations
  validatePassword(email: string, password: string): Promise<User | null>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private careerStats: Map<string, CareerStats> = new Map();
  private teams: Map<string, Team> = new Map();
  private teamMembers: Map<string, TeamMember> = new Map();
  private teamInvitations: Map<string, TeamInvitation> = new Map();
  private matches: Map<string, Match> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const user: User = {
      ...insertUser,
      id,
      password: hashedPassword,
      profileComplete: false,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    
    // Create initial career stats
    await this.createCareerStats({ userId: id });
    
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserProfile(id: string, profile: ProfileSetup): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      username: profile.username,
      role: profile.role,
      battingHand: profile.battingHand,
      bowlingStyle: profile.bowlingStyle,
      profileComplete: true,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getCareerStats(userId: string): Promise<CareerStats | undefined> {
    return Array.from(this.careerStats.values()).find(stats => stats.userId === userId);
  }

  async createCareerStats(stats: InsertCareerStats): Promise<CareerStats> {
    const id = randomUUID();
    const careerStat: CareerStats = {
      ...stats,
      id,
      matchesPlayed: 0,
      totalRuns: 0,
      ballsFaced: 0,
      strikeRate: "0",
      oversBowled: "0",
      runsConceded: 0,
      wicketsTaken: 0,
      economy: "0",
      catchesTaken: 0,
      updatedAt: new Date(),
    };
    this.careerStats.set(id, careerStat);
    return careerStat;
  }

  async updateCareerStats(userId: string, updates: Partial<CareerStats>): Promise<CareerStats | undefined> {
    const stats = Array.from(this.careerStats.values()).find(s => s.userId === userId);
    if (!stats) return undefined;
    
    const updatedStats = { ...stats, ...updates, updatedAt: new Date() };
    this.careerStats.set(stats.id, updatedStats);
    return updatedStats;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamsByUser(userId: string): Promise<Team[]> {
    const userTeams = Array.from(this.teamMembers.values())
      .filter(member => member.userId === userId)
      .map(member => this.teams.get(member.teamId))
      .filter(Boolean) as Team[];
    
    const captainTeams = Array.from(this.teams.values())
      .filter(team => team.captainId === userId);
    
    // Combine and deduplicate
    const allTeams = [...userTeams, ...captainTeams];
    return Array.from(new Set(allTeams.map(t => t.id))).map(id => allTeams.find(t => t.id === id)!);
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const id = randomUUID();
    const newTeam: Team = {
      ...team,
      id,
      createdAt: new Date(),
    };
    this.teams.set(id, newTeam);
    return newTeam;
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (!team) return undefined;
    
    const updatedTeam = { ...team, ...updates };
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }

  async getTeamMembers(teamId: string): Promise<(TeamMember & { user: User })[]> {
    const members = Array.from(this.teamMembers.values())
      .filter(member => member.teamId === teamId);
    
    return members.map(member => ({
      ...member,
      user: this.users.get(member.userId)!,
    })).filter(m => m.user);
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const id = randomUUID();
    const teamMember: TeamMember = {
      ...member,
      id,
      joinedAt: new Date(),
    };
    this.teamMembers.set(id, teamMember);
    return teamMember;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    const member = Array.from(this.teamMembers.values())
      .find(m => m.teamId === teamId && m.userId === userId);
    
    if (member) {
      this.teamMembers.delete(member.id);
      return true;
    }
    return false;
  }

  async getTeamInvitations(userId: string): Promise<(TeamInvitation & { team: Team, inviter: User })[]> {
    const invitations = Array.from(this.teamInvitations.values())
      .filter(invite => invite.invitedUser === userId && invite.status === "pending");
    
    return invitations.map(invite => ({
      ...invite,
      team: this.teams.get(invite.teamId)!,
      inviter: this.users.get(invite.invitedBy)!,
    })).filter(i => i.team && i.inviter);
  }

  async getSentInvitations(teamId: string): Promise<(TeamInvitation & { user: User })[]> {
    const invitations = Array.from(this.teamInvitations.values())
      .filter(invite => invite.teamId === teamId);
    
    return invitations.map(invite => ({
      ...invite,
      user: this.users.get(invite.invitedUser)!,
    })).filter(i => i.user);
  }

  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    const id = randomUUID();
    const teamInvitation: TeamInvitation = {
      ...invitation,
      id,
      status: "pending",
      createdAt: new Date(),
    };
    this.teamInvitations.set(id, teamInvitation);
    return teamInvitation;
  }

  async updateInvitationStatus(id: string, status: "accepted" | "rejected"): Promise<TeamInvitation | undefined> {
    const invitation = this.teamInvitations.get(id);
    if (!invitation) return undefined;
    
    const updatedInvitation = { ...invitation, status };
    this.teamInvitations.set(id, updatedInvitation);
    
    // If accepted, add user to team
    if (status === "accepted") {
      await this.addTeamMember({
        teamId: invitation.teamId,
        userId: invitation.invitedUser,
      });
    }
    
    return updatedInvitation;
  }

  async getMatches(userId: string): Promise<Match[]> {
    return Array.from(this.matches.values())
      .filter(match => match.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const id = randomUUID();
    const newMatch: Match = {
      ...match,
      id,
      createdAt: new Date(),
    };
    this.matches.set(id, newMatch);
    
    // Update career stats
    await this.updateCareerStatsFromMatch(match.userId, match);
    
    return newMatch;
  }

  private async updateCareerStatsFromMatch(userId: string, match: InsertMatch) {
    const stats = await this.getCareerStats(userId);
    if (!stats) return;

    const newMatchesPlayed = (stats.matchesPlayed || 0) + 1;
    const newTotalRuns = (stats.totalRuns || 0) + match.runsScored;
    const newBallsFaced = (stats.ballsFaced || 0) + match.ballsFaced;
    const newOversBowled = parseFloat(stats.oversBowled || "0") + parseFloat(match.oversBowled.toString());
    const newRunsConceded = (stats.runsConceded || 0) + match.runsConceded;
    const newWicketsTaken = (stats.wicketsTaken || 0) + match.wicketsTaken;
    const newCatchesTaken = (stats.catchesTaken || 0) + match.catchesTaken;

    const strikeRate = newBallsFaced > 0 ? ((newTotalRuns / newBallsFaced) * 100).toFixed(2) : "0";
    const economy = newOversBowled > 0 ? (newRunsConceded / newOversBowled).toFixed(2) : "0";

    await this.updateCareerStats(userId, {
      matchesPlayed: newMatchesPlayed,
      totalRuns: newTotalRuns,
      ballsFaced: newBallsFaced,
      strikeRate,
      oversBowled: newOversBowled.toFixed(1),
      runsConceded: newRunsConceded,
      wicketsTaken: newWicketsTaken,
      economy,
      catchesTaken: newCatchesTaken,
    });
  }

  async validatePassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }
}

export const storage = new MemStorage();
