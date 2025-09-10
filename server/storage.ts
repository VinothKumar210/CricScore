import { prisma } from "./db";
import bcrypt from "bcryptjs";
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

export class PrismaStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });
      return user || undefined;
    } catch {
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });
      return user || undefined;
    } catch {
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const user = await prisma.user.findUnique({
        where: { username }
      });
      return user || undefined;
    } catch {
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const user = await prisma.user.create({
      data: {
        ...insertUser,
        password: hashedPassword,
        profileComplete: false,
      }
    });
    
    // Create initial career stats
    await this.createCareerStats({ userId: user.id });
    
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: updates
      });
      return user;
    } catch {
      return undefined;
    }
  }

  async updateUserProfile(id: string, profile: ProfileSetup): Promise<User | undefined> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          username: profile.username,
          profileName: profile.profileName || "Player",
          description: profile.description,
          role: profile.role,
          battingHand: profile.battingHand,
          bowlingStyle: profile.bowlingStyle,
          profileComplete: true,
        }
      });
      return user;
    } catch {
      return undefined;
    }
  }

  async getCareerStats(userId: string): Promise<CareerStats | undefined> {
    try {
      const stats = await prisma.careerStats.findUnique({
        where: { userId }
      });
      return stats || undefined;
    } catch {
      return undefined;
    }
  }

  async createCareerStats(stats: InsertCareerStats): Promise<CareerStats> {
    return await prisma.careerStats.create({
      data: {
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
      }
    });
  }

  async updateCareerStats(userId: string, updates: Partial<CareerStats>): Promise<CareerStats | undefined> {
    try {
      const stats = await prisma.careerStats.update({
        where: { userId },
        data: updates
      });
      return stats;
    } catch {
      return undefined;
    }
  }

  async getTeam(id: string): Promise<Team | undefined> {
    try {
      const team = await prisma.team.findUnique({
        where: { id }
      });
      return team || undefined;
    } catch {
      return undefined;
    }
  }

  async getTeamsByUser(userId: string): Promise<Team[]> {
    try {
      const teams = await prisma.team.findMany({
        where: {
          OR: [
            { captainId: userId },
            { viceCaptainId: userId },
            {
              members: {
                some: { userId }
              }
            }
          ]
        }
      });
      return teams;
    } catch {
      return [];
    }
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    return await prisma.team.create({
      data: team
    });
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined> {
    try {
      const team = await prisma.team.update({
        where: { id },
        data: updates
      });
      return team;
    } catch {
      return undefined;
    }
  }

  async deleteTeam(id: string): Promise<boolean> {
    try {
      // Delete team members first (if not handled by cascade)
      await prisma.teamMember.deleteMany({
        where: { teamId: id }
      });
      
      // Delete team invitations
      await prisma.teamInvitation.deleteMany({
        where: { teamId: id }
      });
      
      // Delete the team
      await prisma.team.delete({
        where: { id }
      });
      
      return true;
    } catch {
      return false;
    }
  }

  async getTeamMembers(teamId: string): Promise<(TeamMember & { user: User })[]> {
    try {
      const members = await prisma.teamMember.findMany({
        where: { teamId },
        include: { user: true }
      });
      return members;
    } catch {
      return [];
    }
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    return await prisma.teamMember.create({
      data: member
    });
  }

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    try {
      await prisma.teamMember.delete({
        where: {
          teamId_userId: {
            teamId,
            userId
          }
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  async getTeamInvitations(userId: string): Promise<(TeamInvitation & { team: Team, inviter: User })[]> {
    try {
      const invitations = await prisma.teamInvitation.findMany({
        where: {
          invitedUser: userId,
          status: "PENDING"
        },
        include: {
          team: true,
          inviter: true
        }
      });
      return invitations;
    } catch {
      return [];
    }
  }

  async getSentInvitations(teamId: string): Promise<(TeamInvitation & { user: User })[]> {
    try {
      const invitations = await prisma.teamInvitation.findMany({
        where: { teamId },
        include: { invited: true }
      });
      return invitations.map((inv: any) => ({
        ...inv,
        user: inv.invited
      }));
    } catch {
      return [];
    }
  }

  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    return await prisma.teamInvitation.create({
      data: {
        ...invitation,
        status: "PENDING"
      }
    });
  }

  async updateInvitationStatus(id: string, status: "ACCEPTED" | "REJECTED"): Promise<TeamInvitation | undefined> {
    try {
      const invitation = await prisma.teamInvitation.update({
        where: { id },
        data: { status }
      });
      
      // If accepted, add user to team
      if (status === "ACCEPTED") {
        await this.addTeamMember({
          teamId: invitation.teamId,
          userId: invitation.invitedUser,
        });
      }
      
      return invitation;
    } catch {
      return undefined;
    }
  }

  async getMatches(userId: string): Promise<Match[]> {
    try {
      const matches = await prisma.match.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      return matches;
    } catch {
      return [];
    }
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const createdMatch = await prisma.match.create({
      data: match
    });
    
    // Update career stats
    await this.updateCareerStatsFromMatch(match.userId, match);
    
    return createdMatch;
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

  async searchUsers(query: string): Promise<User[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            {
              username: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              profileName: {
                contains: query,
                mode: 'insensitive'
              }
            }
          ],
          profileComplete: true
        },
        select: {
          id: true,
          email: true,
          username: true,
          profileName: true,
          description: true,
          role: true,
          battingHand: true,
          bowlingStyle: true,
          profileComplete: true,
          createdAt: true
        },
        take: 20
      });
      return users as User[];
    } catch {
      return [];
    }
  }

  async validatePassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }
}

export const storage = new PrismaStorage();