import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import type {
  User,
  CareerStats,
  Team,
  TeamMember,
  TeamInvitation,
  Match,
  InsertUser,
  InsertCareerStats,
  InsertTeam,
  InsertTeamMember,
  InsertTeamInvitation,
  InsertMatch,
  ProfileSetup,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  searchUsers(query: string): Promise<User[]>;
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
  deleteTeam(id: string): Promise<boolean>;
  
  // Team member operations
  getTeamMembers(teamId: string): Promise<(TeamMember & { user: User })[]>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  removeTeamMember(teamId: string, userId: string): Promise<boolean>;
  
  // Team invitation operations
  getTeamInvitations(userId: string): Promise<(TeamInvitation & { team: Team, inviter: User })[]>;
  getSentInvitations(teamId: string): Promise<(TeamInvitation & { user: User })[]>;
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  updateInvitationStatus(id: string, status: "ACCEPTED" | "REJECTED"): Promise<TeamInvitation | undefined>;
  
  // Match operations
  getMatches(userId: string): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  
  // Auth operations
  validatePassword(email: string, password: string): Promise<User | null>;
}

export class MemoryStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private careerStats: Map<string, CareerStats> = new Map();
  private teams: Map<string, Team> = new Map();
  private teamMembers: Map<string, TeamMember> = new Map();
  private teamInvitations: Map<string, TeamInvitation> = new Map();
  private matches: Map<string, Match> = new Map();

  constructor() {
    this.initializeTestData();
  }

  private initializeTestData() {
    // Create some test users
    const testUsers = [
      {
        id: "68b2c19643dc182fbd13f273",
        email: "player1@test.com",
        password: "$2a$10$KqGGGzYbfGGXlxLxJJq7rO7RQvQzJYqJYqJYqJYqJYqJYqJYqJYqJ", // "password123"
        username: "player1",
        profileName: "Test Player 1",
        description: "A cricket enthusiast",
        role: "ALL_ROUNDER" as const,
        battingHand: "RIGHT" as const,
        bowlingStyle: "MEDIUM_FAST" as const,
        profileComplete: true,
        createdAt: new Date(),
      },
      {
        id: "68b2c19643dc182fbd13f274",
        email: "player2@test.com",
        password: "$2a$10$KqGGGzYbfGGXlxLxJJq7rO7RQvQzJYqJYqJYqJYqJYqJYqJYqJYqJ", // "password123"
        username: "player2",
        profileName: "Test Player 2",
        description: "Fast bowler",
        role: "BOWLER" as const,
        battingHand: "RIGHT" as const,
        bowlingStyle: "FAST" as const,
        profileComplete: true,
        createdAt: new Date(),
      },
      {
        id: "68b2c19643dc182fbd13f275",
        email: "player3@test.com",
        password: "$2a$10$KqGGGzYbfGGXlxLxJJq7rO7RQvQzJYqJYqJYqJYqJYqJYqJYqJYqJ", // "password123"
        username: "player3",
        profileName: "Test Player 3",
        description: "Opening batsman",
        role: "BATSMAN" as const,
        battingHand: "LEFT" as const,
        bowlingStyle: "SPIN" as const,
        profileComplete: true,
        createdAt: new Date(),
      },
    ];

    testUsers.forEach(user => {
      this.users.set(user.id, user);
      // Create initial career stats
      const stats: CareerStats = {
        id: nanoid(),
        userId: user.id,
        matchesPlayed: 0,
        totalRuns: 0,
        ballsFaced: 0,
        strikeRate: 0,
        oversBowled: 0,
        runsConceded: 0,
        wicketsTaken: 0,
        economy: 0,
        catchesTaken: 0,
        updatedAt: new Date(),
      };
      this.careerStats.set(user.id, stats);
    });

    // Create a test team
    const testTeam: Team = {
      id: "68b2c2de43dc182fbd13f275",
      name: "kovai busters",
      description: "Test team for cricket",
      captainId: "68b2c19643dc182fbd13f273",
      viceCaptainId: "68b2c19643dc182fbd13f274",
      createdAt: new Date(),
    };
    this.teams.set(testTeam.id, testTeam);

    // Add team members
    const teamMember1: TeamMember = {
      id: nanoid(),
      teamId: testTeam.id,
      userId: "68b2c19643dc182fbd13f273",
      joinedAt: new Date(),
    };
    const teamMember2: TeamMember = {
      id: nanoid(),
      teamId: testTeam.id,
      userId: "68b2c19643dc182fbd13f274",
      joinedAt: new Date(),
    };
    this.teamMembers.set(teamMember1.id, teamMember1);
    this.teamMembers.set(teamMember2.id, teamMember2);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async searchUsers(query: string): Promise<User[]> {
    const queryLower = query.toLowerCase();
    return Array.from(this.users.values())
      .filter(user => 
        user.profileComplete && (
          user.username?.toLowerCase().includes(queryLower) ||
          user.profileName?.toLowerCase().includes(queryLower)
        )
      )
      .slice(0, 20)
      .map(user => ({
        ...user,
        password: "" // Don't return password in search results
      }));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const user: User = {
      id: nanoid(),
      email: insertUser.email,
      password: hashedPassword,
      username: insertUser.username,
      profileName: insertUser.profileName,
      description: insertUser.description,
      role: insertUser.role,
      battingHand: insertUser.battingHand,
      bowlingStyle: insertUser.bowlingStyle,
      profileComplete: insertUser.profileComplete || false,
      createdAt: new Date(),
    };
    
    this.users.set(user.id, user);
    
    // Create initial career stats
    await this.createCareerStats({ userId: user.id });
    
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
    
    const updatedUser: User = {
      ...user,
      username: profile.username,
      profileName: profile.profileName || "Player",
      description: profile.description,
      role: profile.role,
      battingHand: profile.battingHand,
      bowlingStyle: profile.bowlingStyle,
      profileComplete: true,
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getCareerStats(userId: string): Promise<CareerStats | undefined> {
    return this.careerStats.get(userId);
  }

  async createCareerStats(stats: InsertCareerStats): Promise<CareerStats> {
    const careerStats: CareerStats = {
      id: nanoid(),
      userId: stats.userId,
      matchesPlayed: 0,
      totalRuns: 0,
      ballsFaced: 0,
      strikeRate: 0,
      oversBowled: 0,
      runsConceded: 0,
      wicketsTaken: 0,
      economy: 0,
      catchesTaken: 0,
      updatedAt: new Date(),
    };
    
    this.careerStats.set(stats.userId, careerStats);
    return careerStats;
  }

  async updateCareerStats(userId: string, updates: Partial<CareerStats>): Promise<CareerStats | undefined> {
    const stats = this.careerStats.get(userId);
    if (!stats) return undefined;
    
    const updatedStats = { ...stats, ...updates, updatedAt: new Date() };
    this.careerStats.set(userId, updatedStats);
    return updatedStats;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamsByUser(userId: string): Promise<Team[]> {
    return Array.from(this.teams.values()).filter(team => 
      team.captainId === userId || 
      team.viceCaptainId === userId ||
      Array.from(this.teamMembers.values()).some(member => 
        member.teamId === team.id && member.userId === userId
      )
    );
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const newTeam: Team = {
      id: nanoid(),
      name: team.name,
      description: team.description,
      captainId: team.captainId,
      viceCaptainId: team.viceCaptainId,
      createdAt: new Date(),
    };
    
    this.teams.set(newTeam.id, newTeam);
    return newTeam;
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (!team) return undefined;
    
    const updatedTeam = { ...team, ...updates };
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }

  async deleteTeam(id: string): Promise<boolean> {
    // Delete team members
    Array.from(this.teamMembers.entries())
      .filter(([_, member]) => member.teamId === id)
      .forEach(([memberKey]) => this.teamMembers.delete(memberKey));
    
    // Delete team invitations
    Array.from(this.teamInvitations.entries())
      .filter(([_, invitation]) => invitation.teamId === id)
      .forEach(([invitationKey]) => this.teamInvitations.delete(invitationKey));
    
    // Delete the team
    return this.teams.delete(id);
  }

  async getTeamMembers(teamId: string): Promise<(TeamMember & { user: User })[]> {
    const members = Array.from(this.teamMembers.values())
      .filter(member => member.teamId === teamId);
    
    const membersWithUsers: (TeamMember & { user: User })[] = [];
    for (const member of members) {
      const user = this.users.get(member.userId);
      if (user) {
        membersWithUsers.push({
          ...member,
          user: { ...user, password: "" } // Don't include password
        });
      }
    }
    
    return membersWithUsers;
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const teamMember: TeamMember = {
      id: nanoid(),
      teamId: member.teamId,
      userId: member.userId,
      joinedAt: new Date(),
    };
    
    this.teamMembers.set(teamMember.id, teamMember);
    return teamMember;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    const memberEntry = Array.from(this.teamMembers.entries())
      .find(([_, member]) => member.teamId === teamId && member.userId === userId);
    
    if (memberEntry) {
      this.teamMembers.delete(memberEntry[0]);
      return true;
    }
    
    return false;
  }

  async getTeamInvitations(userId: string): Promise<(TeamInvitation & { team: Team, inviter: User })[]> {
    const invitations = Array.from(this.teamInvitations.values())
      .filter(invitation => invitation.invitedUser === userId && invitation.status === "PENDING");
    
    const invitationsWithDetails: (TeamInvitation & { team: Team, inviter: User })[] = [];
    for (const invitation of invitations) {
      const team = this.teams.get(invitation.teamId);
      const inviter = this.users.get(invitation.invitedBy);
      
      if (team && inviter) {
        invitationsWithDetails.push({
          ...invitation,
          team,
          inviter: { ...inviter, password: "" }
        });
      }
    }
    
    return invitationsWithDetails;
  }

  async getSentInvitations(teamId: string): Promise<(TeamInvitation & { user: User })[]> {
    const invitations = Array.from(this.teamInvitations.values())
      .filter(invitation => invitation.teamId === teamId);
    
    const invitationsWithUsers: (TeamInvitation & { user: User })[] = [];
    for (const invitation of invitations) {
      const user = this.users.get(invitation.invitedUser);
      if (user) {
        invitationsWithUsers.push({
          ...invitation,
          user: { ...user, password: "" }
        });
      }
    }
    
    return invitationsWithUsers;
  }

  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    const teamInvitation: TeamInvitation = {
      id: nanoid(),
      teamId: invitation.teamId,
      invitedBy: invitation.invitedBy,
      invitedUser: invitation.invitedUser,
      status: "PENDING",
      createdAt: new Date(),
    };
    
    this.teamInvitations.set(teamInvitation.id, teamInvitation);
    return teamInvitation;
  }

  async updateInvitationStatus(id: string, status: "ACCEPTED" | "REJECTED"): Promise<TeamInvitation | undefined> {
    const invitation = this.teamInvitations.get(id);
    if (!invitation) return undefined;
    
    const updatedInvitation = { ...invitation, status };
    this.teamInvitations.set(id, updatedInvitation);
    
    // If accepted, add user to team
    if (status === "ACCEPTED") {
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
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const newMatch: Match = {
      id: nanoid(),
      userId: match.userId,
      opponent: match.opponent,
      matchDate: match.matchDate,
      runsScored: match.runsScored,
      ballsFaced: match.ballsFaced,
      oversBowled: match.oversBowled,
      runsConceded: match.runsConceded,
      wicketsTaken: match.wicketsTaken,
      catchesTaken: match.catchesTaken,
      createdAt: new Date(),
    };
    
    this.matches.set(newMatch.id, newMatch);
    
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
    const newOversBowled = (stats.oversBowled || 0) + match.oversBowled;
    const newRunsConceded = (stats.runsConceded || 0) + match.runsConceded;
    const newWicketsTaken = (stats.wicketsTaken || 0) + match.wicketsTaken;
    const newCatchesTaken = (stats.catchesTaken || 0) + match.catchesTaken;

    const strikeRate = newBallsFaced > 0 ? (newTotalRuns / newBallsFaced) * 100 : 0;
    const economy = newOversBowled > 0 ? newRunsConceded / newOversBowled : 0;

    await this.updateCareerStats(userId, {
      matchesPlayed: newMatchesPlayed,
      totalRuns: newTotalRuns,
      ballsFaced: newBallsFaced,
      strikeRate: parseFloat(strikeRate.toFixed(2)),
      oversBowled: parseFloat(newOversBowled.toFixed(1)),
      runsConceded: newRunsConceded,
      wicketsTaken: newWicketsTaken,
      economy: parseFloat(economy.toFixed(2)),
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

export const storage = new MemoryStorage();