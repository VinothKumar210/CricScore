import { prisma } from "./db";
import bcrypt from "bcryptjs";
import type {
  User,
  CareerStats,
  Team,
  TeamMember,
  TeamInvitation,
  Match,
  TeamMatch,
  TeamMatchPlayer,
  TeamStatistics,
  LocalMatch,
  MatchSpectator,
  OverHistory,
  MatchSummary,
  PlayerMatchHistory,
  GuestPlayer,
  Fixture,
} from "@prisma/client";
import type {
  InsertUser,
  InsertCareerStats,
  InsertTeam,
  InsertTeamMember,
  InsertTeamInvitation,
  InsertMatch,
  InsertTeamMatch,
  InsertTeamMatchPlayer,
  InsertTeamStatistics,
  InsertLocalMatch,
  InsertMatchSpectator,
  InsertOverHistory,
  InsertMatchSummary,
  InsertPlayerMatchHistory,
  InsertGuestPlayer,
  InsertFixture,
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
  updateCareerStatsFromMatch(userId: string, match: InsertMatch): Promise<void>;
  ensureCareerStats(userId: string): Promise<CareerStats | undefined>;
  
  // Team operations
  getTeam(id: string): Promise<Team | undefined>;
  getTeamsByUser(userId: string): Promise<(Team & { captain: User, viceCaptain?: User })[]>;
  searchTeams(query: string): Promise<(Team & { captain: User, viceCaptain?: User })[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<boolean>;
  
  // Team member operations
  getTeamMembers(teamId: string): Promise<(TeamMember & { user: User })[]>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  removeTeamMember(teamId: string, userId: string): Promise<boolean>;
  isTeamMember(teamId: string, userId: string): Promise<boolean>;
  
  // Guest player operations
  getGuestPlayers(teamId: string): Promise<(GuestPlayer & { addedBy: User })[]>;
  getGuestPlayer(id: string): Promise<GuestPlayer | undefined>;
  createGuestPlayer(guestPlayer: InsertGuestPlayer): Promise<GuestPlayer>;
  updateGuestPlayer(id: string, updates: Partial<GuestPlayer>): Promise<GuestPlayer | undefined>;
  deleteGuestPlayer(id: string): Promise<boolean>;
  linkGuestPlayerToUser(guestPlayerId: string, userId: string): Promise<{ success: boolean; message: string }>;
  
  // Captain operations
  transferCaptain(teamId: string, newCaptainId: string, currentCaptainId: string): Promise<Team | undefined>;
  
  // Team invitation operations
  getTeamInvitations(userId: string): Promise<(TeamInvitation & { team: Team, inviter: User })[]>;
  getSentInvitations(teamId: string): Promise<(TeamInvitation & { user: User })[]>;
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  updateInvitationStatus(id: string, status: "ACCEPTED" | "REJECTED"): Promise<TeamInvitation | undefined>;
  
  // Match operations
  getMatches(userId: string): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  
  // Auth operations
  validatePassword(email: string, password: string): Promise<{ user: User | null; errorType?: 'EMAIL_NOT_FOUND' | 'WRONG_PASSWORD' }>;
  
  // Team match operations
  createTeamMatch(teamMatch: InsertTeamMatch): Promise<TeamMatch>;
  getTeamMatch(id: string): Promise<TeamMatch | undefined>;
  getTeamMatches(teamId: string): Promise<TeamMatch[]>;
  
  // Team match player operations
  createTeamMatchPlayer(player: InsertTeamMatchPlayer): Promise<TeamMatchPlayer>;
  getTeamMatchPlayers(teamMatchId: string): Promise<(TeamMatchPlayer & { user: User })[]>;
  
  // Team statistics operations
  getTeamStatistics(teamId: string): Promise<TeamStatistics | undefined>;
  createTeamStatistics(stats: InsertTeamStatistics): Promise<TeamStatistics>;
  updateTeamStatistics(teamId: string, stats: Partial<TeamStatistics>): Promise<TeamStatistics | undefined>;
  calculateAndUpdateTeamStatistics(teamId: string): Promise<void>;

  // Local match operations
  createLocalMatch(match: InsertLocalMatch): Promise<LocalMatch>;
  getLocalMatch(id: string): Promise<LocalMatch | undefined>;
  updateLocalMatch(id: string, updates: Partial<LocalMatch>): Promise<LocalMatch | undefined>;
  saveBall(localMatchId: string, ball: any, overNumber: number, innings: number): Promise<void>;
  getMatchState(id: string): Promise<any>;
  getSpectatorMatches(userId: string): Promise<LocalMatch[]>;
  getOngoingMatches(): Promise<LocalMatch[]>;

  // Match spectator operations
  addMatchSpectator(spectator: InsertMatchSpectator): Promise<MatchSpectator>;
  removeMatchSpectator(localMatchId: string, userId: string): Promise<boolean>;
  getMatchSpectators(localMatchId: string): Promise<(MatchSpectator & { user: User })[]>;
  getPendingNotifications(userId: string): Promise<(MatchSpectator & { localMatch: LocalMatch })[]>;
  markNotificationsAsRead(userId: string, matchIds: string[]): Promise<void>;

  // Over history operations
  createOverHistory(overHistory: InsertOverHistory): Promise<OverHistory>;
  getOverHistory(localMatchId: string): Promise<OverHistory[]>;

  // Match summary operations
  createMatchSummary(matchSummary: InsertMatchSummary): Promise<MatchSummary>;
  getMatchSummary(id: string): Promise<(MatchSummary & { homeTeam: Team | null, awayTeam: Team | null, manOfTheMatchUser: User | null, playerHistory: (PlayerMatchHistory & { user: User, team: Team | null })[] }) | undefined>;
  getUserMatchHistory(userId: string, page?: number, limit?: number): Promise<{ matches: { matchSummary: MatchSummary & { homeTeam: Team | null, awayTeam: Team | null, manOfTheMatchUser: User | null }, userPerformance: { runsScored: number, ballsFaced: number, wicketsTaken: number, oversBowled: number, isManOfTheMatch: boolean, teamName: string, playerName: string } }[], totalCount: number }>;
  getTeamMatchHistory(teamId: string, page?: number, limit?: number): Promise<{ matches: (MatchSummary & { homeTeam: Team | null, awayTeam: Team | null, manOfTheMatchUser: User | null, playerHistory: (PlayerMatchHistory & { user: User, team: Team | null })[] })[], totalCount: number }>;
  
  // Player match history operations
  createPlayerMatchHistory(playerHistory: InsertPlayerMatchHistory): Promise<PlayerMatchHistory>;
  getPlayerMatchHistories(matchSummaryId: string): Promise<(PlayerMatchHistory & { user: User, team: Team | null })[]>;

  // Fixture operations
  createFixture(fixture: InsertFixture): Promise<Fixture>;
  getFixturesByUser(userId: string): Promise<Fixture[]>;
  getFixture(id: string): Promise<Fixture | undefined>;
  updateFixture(id: string, updates: Partial<InsertFixture>): Promise<Fixture | undefined>;
  deleteFixture(id: string): Promise<boolean>;
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
        highestScore: 0,
        oversBowled: 0,
        runsConceded: 0,
        wicketsTaken: 0,
        economy: 0,
        catchesTaken: 0,
        runOuts: 0,
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

  async ensureCareerStats(userId: string): Promise<CareerStats | undefined> {
    try {
      let stats = await this.getCareerStats(userId);
      if (!stats) {
        stats = await prisma.careerStats.create({
          data: {
            userId,
            matchesPlayed: 0,
            totalRuns: 0,
            ballsFaced: 0,
            strikeRate: 0,
            highestScore: 0,
            timesOut: 0,
            oversBowled: 0,
            runsConceded: 0,
            wicketsTaken: 0,
            economy: 0,
            bestBowlingWickets: 0,
            bestBowlingRuns: 0,
            catchesTaken: 0,
            runOuts: 0,
            manOfTheMatchAwards: 0
          }
        });
      }
      return stats;
    } catch (error) {
      console.error('Error ensuring career stats:', error);
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

  async getTeamByCode(teamCode: string): Promise<Team | undefined> {
    try {
      const team = await prisma.team.findUnique({
        where: { teamCode }
      });
      return team || undefined;
    } catch {
      return undefined;
    }
  }

  async searchTeamsByCode(query: string): Promise<(Team & { captain: User, viceCaptain?: User })[]> {
    try {
      const teams = await prisma.team.findMany({
        where: {
          OR: [
            {
              teamCode: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              name: {
                contains: query,
                mode: 'insensitive'
              }
            }
          ]
        },
        include: {
          captain: {
            select: {
              id: true,
              username: true,
              profileName: true,
              email: true,
              description: true,
              role: true,
              battingHand: true,
              bowlingStyle: true,
              profileComplete: true,
              createdAt: true
            }
          },
          viceCaptain: {
            select: {
              id: true,
              username: true,
              profileName: true,
              email: true,
              description: true,
              role: true,
              battingHand: true,
              bowlingStyle: true,
              profileComplete: true,
              createdAt: true
            }
          }
        },
        take: 10
      });
      return teams as (Team & { captain: User, viceCaptain?: User })[];
    } catch {
      return [];
    }
  }

  async getTeamsByUser(userId: string): Promise<(Team & { captain: User, viceCaptain?: User })[]> {
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
        },
        include: {
          captain: {
            select: {
              id: true,
              username: true,
              profileName: true,
              email: true,
              description: true,
              role: true,
              battingHand: true,
              bowlingStyle: true,
              profileComplete: true,
              createdAt: true
            }
          },
          viceCaptain: {
            select: {
              id: true,
              username: true,
              profileName: true,
              email: true,
              description: true,
              role: true,
              battingHand: true,
              bowlingStyle: true,
              profileComplete: true,
              createdAt: true
            }
          }
        }
      });
      return teams as (Team & { captain: User, viceCaptain?: User })[];
    } catch {
      return [];
    }
  }

  async searchTeams(query: string): Promise<(Team & { captain: User, viceCaptain?: User })[]> {
    try {
      const teams = await prisma.team.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive'
          }
        },
        include: {
          captain: {
            select: {
              id: true,
              username: true,
              profileName: true,
              email: true,
              description: true,
              role: true,
              battingHand: true,
              bowlingStyle: true,
              profileComplete: true,
              createdAt: true
            }
          },
          viceCaptain: {
            select: {
              id: true,
              username: true,
              profileName: true,
              email: true,
              description: true,
              role: true,
              battingHand: true,
              bowlingStyle: true,
              profileComplete: true,
              createdAt: true
            }
          }
        },
        take: 20
      });
      return teams as (Team & { captain: User, viceCaptain?: User })[];
    } catch {
      return [];
    }
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const count = await prisma.team.count();
    const teamCode = `ctid${count + 1}`;
    
    return await prisma.team.create({
      data: {
        ...team,
        teamCode,
        createdById: team.captainId,
      }
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

  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    try {
      const member = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId
          }
        }
      });
      return !!member;
    } catch {
      return false;
    }
  }

  // Guest player operations
  async getGuestPlayers(teamId: string): Promise<(GuestPlayer & { addedBy: User })[]> {
    try {
      const guestPlayers = await prisma.guestPlayer.findMany({
        where: { teamId },
        include: { addedBy: true }
      });
      return guestPlayers;
    } catch {
      return [];
    }
  }

  async getGuestPlayer(id: string): Promise<GuestPlayer | undefined> {
    try {
      const guestPlayer = await prisma.guestPlayer.findUnique({
        where: { id }
      });
      return guestPlayer || undefined;
    } catch {
      return undefined;
    }
  }

  async createGuestPlayer(guestPlayer: InsertGuestPlayer): Promise<GuestPlayer> {
    return await prisma.guestPlayer.create({
      data: guestPlayer
    });
  }

  async updateGuestPlayer(id: string, updates: Partial<GuestPlayer>): Promise<GuestPlayer | undefined> {
    try {
      const guestPlayer = await prisma.guestPlayer.update({
        where: { id },
        data: updates
      });
      return guestPlayer;
    } catch {
      return undefined;
    }
  }

  async deleteGuestPlayer(id: string): Promise<boolean> {
    try {
      await prisma.guestPlayer.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }

  async linkGuestPlayerToUser(guestPlayerId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const guestPlayer = await prisma.guestPlayer.findUnique({
        where: { id: guestPlayerId }
      });
      
      if (!guestPlayer) {
        return { success: false, message: "Guest player not found" };
      }

      if (guestPlayer.linkedUserId) {
        return { success: false, message: "Guest player is already linked to a user" };
      }

      const existingMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: guestPlayer.teamId,
            userId
          }
        }
      });

      if (existingMember) {
        return { success: false, message: "User is already a member of this team" };
      }

      const userCareerStats = await this.ensureCareerStats(userId);
      if (userCareerStats) {
        await this.updateCareerStats(userId, {
          matchesPlayed: userCareerStats.matchesPlayed + guestPlayer.matchesPlayed,
          totalRuns: userCareerStats.totalRuns + guestPlayer.totalRuns,
          ballsFaced: userCareerStats.ballsFaced + guestPlayer.ballsFaced,
          wicketsTaken: userCareerStats.wicketsTaken + guestPlayer.wicketsTaken,
          runsConceded: userCareerStats.runsConceded + guestPlayer.runsConceded,
          oversBowled: userCareerStats.oversBowled + guestPlayer.oversBowled,
          catchesTaken: userCareerStats.catchesTaken + guestPlayer.catchesTaken,
          runOuts: userCareerStats.runOuts + guestPlayer.runOuts,
        });
      }

      await this.addTeamMember({
        teamId: guestPlayer.teamId,
        userId
      });

      await prisma.guestPlayer.delete({
        where: { id: guestPlayerId }
      });

      return { success: true, message: "Guest player linked successfully and stats transferred" };
    } catch (error) {
      console.error('Error linking guest player:', error);
      return { success: false, message: "Failed to link guest player" };
    }
  }

  // Captain operations
  async transferCaptain(teamId: string, newCaptainId: string, currentCaptainId: string): Promise<Team | undefined> {
    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId }
      });

      if (!team) {
        return undefined;
      }

      if (team.captainId !== currentCaptainId) {
        return undefined;
      }

      const isMember = await this.isTeamMember(teamId, newCaptainId);
      if (!isMember && team.createdById !== newCaptainId) {
        return undefined;
      }

      const updatedTeam = await prisma.team.update({
        where: { id: teamId },
        data: { captainId: newCaptainId }
      });

      return updatedTeam;
    } catch {
      return undefined;
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

  // Helper function to convert cricket overs (e.g., 1.2) to decimal overs (e.g., 1.333)
  private convertOversToDecimal(cricketOvers: number): number {
    const wholeOvers = Math.floor(cricketOvers);
    const balls = Math.round((cricketOvers - wholeOvers) * 10); // Extract the ball count
    return wholeOvers + (balls / 6);
  }

  async updateCareerStatsFromMatch(userId: string, match: InsertMatch) {
    const stats = await this.getCareerStats(userId);
    if (!stats) return;

    const newMatchesPlayed = (stats.matchesPlayed || 0) + 1;
    const newTotalRuns = (stats.totalRuns || 0) + match.runsScored;
    const newBallsFaced = (stats.ballsFaced || 0) + match.ballsFaced;
    const newHighestScore = Math.max((stats.highestScore || 0), match.runsScored);
    const newTimesOut = (stats.timesOut || 0) + (match.wasDismissed ? 1 : 0);
    const newOversBowled = (stats.oversBowled || 0) + match.oversBowled;
    const newRunsConceded = (stats.runsConceded || 0) + match.runsConceded;
    const newWicketsTaken = (stats.wicketsTaken || 0) + match.wicketsTaken;
    const newCatchesTaken = (stats.catchesTaken || 0) + match.catchesTaken;
    const newRunOuts = (stats.runOuts || 0) + match.runOuts;
    const newManOfTheMatchAwards = (stats.manOfTheMatchAwards || 0) + (match.isManOfTheMatch ? 1 : 0);

    const strikeRate = newBallsFaced > 0 ? (newTotalRuns / newBallsFaced) * 100 : 0;
    // Convert cricket overs to decimal for proper economy calculation
    const decimalOversBowled = this.convertOversToDecimal(newOversBowled);
    const economy = decimalOversBowled > 0 ? newRunsConceded / decimalOversBowled : 0;

    // Update best bowling figures if this match's bowling performance is better
    const hasBestFigures = (stats as any).bestBowlingWickets != null && (stats as any).bestBowlingRuns != null;
    let updatedBestFigures: { wickets: number; runs: number } | null = null;
    
    // Only consider updating if the player bowled in this match (wickets taken or runs conceded > 0)
    if (match.wicketsTaken > 0 || match.runsConceded > 0) {
      // Update if:
      // 1. No previous best figures, OR
      // 2. More wickets than current best, OR  
      // 3. Same wickets but fewer runs conceded
      if (!hasBestFigures || 
          match.wicketsTaken > (stats as any).bestBowlingWickets || 
          (match.wicketsTaken === (stats as any).bestBowlingWickets && match.runsConceded < (stats as any).bestBowlingRuns)) {
        updatedBestFigures = {
          wickets: match.wicketsTaken,
          runs: match.runsConceded
        };
      }
    }

    const updateData: any = {
      matchesPlayed: newMatchesPlayed,
      totalRuns: newTotalRuns,
      ballsFaced: newBallsFaced,
      strikeRate: parseFloat(strikeRate.toFixed(2)),
      highestScore: newHighestScore,
      timesOut: newTimesOut,
      oversBowled: parseFloat(newOversBowled.toFixed(1)),
      runsConceded: newRunsConceded,
      wicketsTaken: newWicketsTaken,
      economy: parseFloat(economy.toFixed(2)),
      catchesTaken: newCatchesTaken,
      runOuts: newRunOuts,
      manOfTheMatchAwards: newManOfTheMatchAwards,
    };

    // Only include best bowling fields if there's an update
    if (updatedBestFigures) {
      updateData.bestBowlingWickets = updatedBestFigures.wickets;
      updateData.bestBowlingRuns = updatedBestFigures.runs;
    }

    await this.updateCareerStats(userId, updateData);
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

  async validatePassword(email: string, password: string): Promise<{ user: User | null; errorType?: 'EMAIL_NOT_FOUND' | 'WRONG_PASSWORD' }> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return { user: null, errorType: 'EMAIL_NOT_FOUND' };
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { user: null, errorType: 'WRONG_PASSWORD' };
    }
    
    return { user };
  }

  // Team match operations
  async createTeamMatch(teamMatch: InsertTeamMatch): Promise<TeamMatch> {
    return await prisma.teamMatch.create({
      data: teamMatch
    });
  }

  async getTeamMatch(id: string): Promise<TeamMatch | undefined> {
    try {
      const match = await prisma.teamMatch.findUnique({
        where: { id }
      });
      return match || undefined;
    } catch {
      return undefined;
    }
  }

  async getTeamMatches(teamId: string): Promise<TeamMatch[]> {
    try {
      const matches = await prisma.teamMatch.findMany({
        where: {
          OR: [
            { homeTeamId: teamId },
            { awayTeamId: teamId }
          ]
        },
        include: {
          homeTeam: true,
          awayTeam: true
        },
        orderBy: { matchDate: 'desc' }
      });
      return matches;
    } catch {
      return [];
    }
  }

  // Team match player operations
  async createTeamMatchPlayer(player: InsertTeamMatchPlayer): Promise<TeamMatchPlayer> {
    return await prisma.teamMatchPlayer.create({
      data: player
    });
  }

  async getTeamMatchPlayers(teamMatchId: string): Promise<(TeamMatchPlayer & { user: User })[]> {
    try {
      const players = await prisma.teamMatchPlayer.findMany({
        where: { teamMatchId },
        include: { user: true }
      });
      return players;
    } catch {
      return [];
    }
  }

  // Team statistics operations
  async getTeamStatistics(teamId: string): Promise<TeamStatistics | undefined> {
    try {
      const stats = await prisma.teamStatistics.findUnique({
        where: { teamId },
        include: {
          topRunScorer: true,
          topWicketTaker: true,
          bestStrikeRatePlayer: true,
          bestEconomyPlayer: true,
          mostManOfTheMatchPlayer: true
        }
      });
      return stats || undefined;
    } catch {
      return undefined;
    }
  }

  async createTeamStatistics(stats: InsertTeamStatistics): Promise<TeamStatistics> {
    return await prisma.teamStatistics.create({
      data: stats
    });
  }

  async updateTeamStatistics(teamId: string, stats: Partial<TeamStatistics>): Promise<TeamStatistics | undefined> {
    try {
      const updatedStats = await prisma.teamStatistics.update({
        where: { teamId },
        data: stats
      });
      return updatedStats;
    } catch {
      return undefined;
    }
  }

  // ============== LOCAL MATCH OPERATIONS ==============

  async createLocalMatch(match: InsertLocalMatch): Promise<LocalMatch> {
    return await prisma.localMatch.create({
      data: match
    });
  }

  async getLocalMatch(id: string): Promise<LocalMatch | undefined> {
    try {
      const match = await prisma.localMatch.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              profileName: true,
              email: true,
              description: true,
              role: true,
              battingHand: true,
              bowlingStyle: true,
              profileComplete: true,
              createdAt: true
            }
          },
          myTeam: {
            select: {
              id: true,
              name: true
            }
          },
          opponentTeam: {
            select: {
              id: true,
              name: true
            }
          },
          spectators: {
            include: {
              user: true
            }
          },
          overHistory: {
            orderBy: {
              overNumber: 'asc'
            }
          }
        }
      });
      return match || undefined;
    } catch {
      return undefined;
    }
  }

  async updateLocalMatch(id: string, updates: Partial<LocalMatch>): Promise<LocalMatch | undefined> {
    try {
      const match = await prisma.localMatch.update({
        where: { id },
        data: updates
      });
      return match;
    } catch {
      return undefined;
    }
  }

  async saveBall(localMatchId: string, ball: any, overNumber: number, innings: number): Promise<void> {
    const existingOver = await prisma.overHistory.findFirst({
      where: { localMatchId, overNumber, innings }
    });

    if (existingOver) {
      const balls = existingOver.balls as any[];
      balls.push(ball);
      await prisma.overHistory.update({
        where: { id: existingOver.id },
        data: {
          balls,
          totalRuns: existingOver.totalRuns + (ball.completedRuns + ball.automaticRuns),
          wickets: existingOver.wickets + (ball.wicket ? 1 : 0)
        }
      });
    } else {
      await prisma.overHistory.create({
        data: {
          localMatchId,
          overNumber,
          innings,
          balls: [ball],
          totalRuns: ball.completedRuns + ball.automaticRuns,
          wickets: ball.wicket ? 1 : 0
        }
      });
    }
  }

  async getMatchState(id: string): Promise<any> {
    const match = await prisma.localMatch.findUnique({
      where: { id }
    });
    return match?.fullState;
  }

  async getSpectatorMatches(userId: string): Promise<LocalMatch[]> {
    try {
      const matches = await prisma.localMatch.findMany({
        where: {
          spectators: {
            some: {
              userId: userId
            }
          },
          status: {
            in: ["ONGOING", "CREATED"]
          }
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              profileName: true,
              email: true,
              description: true,
              role: true,
              battingHand: true,
              bowlingStyle: true,
              profileComplete: true,
              createdAt: true
            }
          },
          myTeam: {
            select: {
              id: true,
              name: true
            }
          },
          opponentTeam: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          matchDate: 'desc'
        }
      });
      return matches;
    } catch {
      return [];
    }
  }

  async getOngoingMatches(): Promise<LocalMatch[]> {
    try {
      const matches = await prisma.localMatch.findMany({
        where: {
          status: {
            in: ["ONGOING", "CREATED"]
          },
          allowSpectators: true
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              profileName: true,
              email: true,
              description: true,
              role: true,
              battingHand: true,
              bowlingStyle: true,
              profileComplete: true,
              createdAt: true
            }
          },
          myTeam: {
            select: {
              id: true,
              name: true
            }
          },
          opponentTeam: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          matchDate: 'desc'
        }
      });
      return matches;
    } catch {
      return [];
    }
  }

  // ============== MATCH SPECTATOR OPERATIONS ==============

  async addMatchSpectator(spectator: InsertMatchSpectator): Promise<MatchSpectator> {
    return await prisma.matchSpectator.create({
      data: spectator
    });
  }

  async removeMatchSpectator(localMatchId: string, userId: string): Promise<boolean> {
    try {
      await prisma.matchSpectator.delete({
        where: {
          localMatchId_userId: {
            localMatchId,
            userId
          }
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  async getMatchSpectators(localMatchId: string): Promise<(MatchSpectator & { user: User })[]> {
    try {
      const spectators = await prisma.matchSpectator.findMany({
        where: { localMatchId },
        include: { user: true }
      });
      return spectators;
    } catch {
      return [];
    }
  }

  async getPendingNotifications(userId: string): Promise<any[]> {
    try {
      const notifications = await prisma.matchSpectator.findMany({
        where: {
          userId,
          notified: false,
          localMatch: {
            status: {
              in: ["CREATED", "ONGOING"]
            }
          }
        },
        include: {
          localMatch: {
            include: {
              creator: {
                select: {
                  id: true,
                  username: true,
                  profileName: true,
                  email: true,
                  description: true,
                  role: true,
                  battingHand: true,
                  bowlingStyle: true,
                  profileComplete: true,
                  createdAt: true
                }
              }
            }
          }
        }
      });
      return notifications;
    } catch {
      return [];
    }
  }

  async markNotificationsAsRead(userId: string, matchIds: string[]): Promise<void> {
    try {
      await prisma.matchSpectator.updateMany({
        where: {
          userId,
          localMatchId: {
            in: matchIds
          }
        },
        data: {
          notified: true
        }
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  // ============== OVER HISTORY OPERATIONS ==============

  async createOverHistory(overHistory: InsertOverHistory): Promise<OverHistory> {
    return await prisma.overHistory.create({
      data: overHistory
    });
  }

  async getOverHistory(localMatchId: string): Promise<OverHistory[]> {
    try {
      const history = await prisma.overHistory.findMany({
        where: { localMatchId },
        orderBy: [
          { innings: 'asc' },
          { overNumber: 'asc' }
        ]
      });
      return history;
    } catch {
      return [];
    }
  }

  // Helper function to create canonical match key
  private createCanonicalMatchKey(opponent: string, matchDate: Date): string {
    const dateKey = matchDate.toISOString().split('T')[0]; // YYYY-MM-DD
    // Normalize opponent: lowercase, remove non-alphanumerics, remove common suffixes
    const opponentKey = opponent.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .replace(/(cc|club|team|cricket)$/g, '')
      .trim();
    return `${opponentKey}-${dateKey}`;
  }

  async calculateAndUpdateTeamStatistics(teamId: string): Promise<void> {
    try {
      // Step 1: Get all team members
      const teamMembers = await this.getTeamMembers(teamId);
      if (teamMembers.length === 0) {
        return;
      }
      const memberUserIds = teamMembers.map(m => m.userId);

      // Step 2: Get formal team matches with opponent names
      const teamMatches = await prisma.teamMatch.findMany({
        where: {
          OR: [
            { homeTeamId: teamId },
            { awayTeamId: teamId }
          ],
          status: 'COMPLETED'
        },
        include: {
          homeTeam: true,
          awayTeam: true
        }
      });

      // Step 3: Build formal match index and calculate win/loss from formal matches only
      const formalMatchKeys = new Set<string>();
      let formalMatchesPlayed = 0;
      let formalMatchesWon = 0;
      let formalMatchesLost = 0;
      let formalMatchesDrawn = 0;

      // Get formal team match player stats
      const teamMatchIds = teamMatches.map(m => m.id);
      const formalTeamStats = teamMatchIds.length > 0 ? await prisma.teamMatchPlayer.findMany({
        where: {
          teamMatchId: { in: teamMatchIds },
          teamId: teamId
        },
        include: { user: true }
      }) : [];

      for (const match of teamMatches) {
        // Determine opponent name relative to this team
        const opponentName = match.homeTeamId === teamId ? match.awayTeam.name : match.homeTeam.name;
        const matchKey = this.createCanonicalMatchKey(opponentName, match.matchDate);
        formalMatchKeys.add(matchKey);
        
        formalMatchesPlayed++;
        
        if (match.result === 'HOME_WIN' && match.homeTeamId === teamId) {
          formalMatchesWon++;
        } else if (match.result === 'AWAY_WIN' && match.awayTeamId === teamId) {
          formalMatchesWon++;
        } else if (match.result === 'DRAW') {
          formalMatchesDrawn++;
        } else {
          formalMatchesLost++;
        }
      }

      // Step 4: Calculate totals (initially from formal team matches)
      let totalMatchesPlayed = formalMatchesPlayed;
      const winRatio = formalMatchesPlayed > 0 ? formalMatchesWon / formalMatchesPlayed : 0;

      // Calculate top performers
      let topRunScorerId: string | undefined;
      let topRunScorerRuns = 0;
      let topWicketTakerId: string | undefined;
      let topWicketTakerWickets = 0;
      let bestStrikeRatePlayerId: string | undefined;
      let bestStrikeRate = 0;
      let bestEconomyPlayerId: string | undefined;
      let bestEconomy = Infinity;

      // Aggregate stats by player from team-specific matches only
      const playerAggregates = new Map<string, {
        runs: number;
        ballsFaced: number;
        wickets: number;
        oversBowled: number;
        runsConceded: number;
      }>();

      // Add stats from formal team matches only (team-specific performance)
      for (const stat of formalTeamStats) {
        const existing = playerAggregates.get(stat.userId) || {
          runs: 0,
          ballsFaced: 0,
          wickets: 0,
          oversBowled: 0,
          runsConceded: 0
        };
        
        existing.runs += stat.runsScored;
        existing.ballsFaced += stat.ballsFaced;
        existing.wickets += stat.wicketsTaken;
        existing.oversBowled += stat.oversBowled;
        existing.runsConceded += stat.runsConceded;
        
        playerAggregates.set(stat.userId, existing);
      }

      // ALSO include individual matches from team members (for mixed scenarios)
      // Get all individual matches from team members (no time limit for consistency)
      const memberIndividualMatches = await prisma.match.findMany({
        where: {
          userId: { in: memberUserIds }
        },
        orderBy: { matchDate: 'desc' }
      });

      // Create a set of already processed formal matches to avoid duplication
      const processedMatches = new Set<string>();
      for (const match of teamMatches) {
        const opponentName = match.homeTeamId === teamId ? match.awayTeam.name : match.homeTeam.name;
        const matchKey = this.createCanonicalMatchKey(opponentName, match.matchDate);
        processedMatches.add(matchKey);
      }

      // Deduplicate individual matches by creating unique match keys
      const uniqueIndividualMatches = new Set<string>();
      const individualMatchPlayerMap = new Map<string, any[]>(); // matchKey -> player records
      
      for (const match of memberIndividualMatches) {
        const opponentKey = match.opponent.replace(/^vs\s+/i, '').trim();
        const matchKey = this.createCanonicalMatchKey(opponentKey, match.matchDate);
        
        // Skip if this match was already processed as a formal team match
        if (!processedMatches.has(matchKey)) {
          uniqueIndividualMatches.add(matchKey);
          
          // Group player records by match for proper aggregation
          if (!individualMatchPlayerMap.has(matchKey)) {
            individualMatchPlayerMap.set(matchKey, []);
          }
          individualMatchPlayerMap.get(matchKey)!.push(match);
        }
      }

      // Add stats from unique individual matches
      for (const matchKey of Array.from(uniqueIndividualMatches)) {
        const playerRecords = individualMatchPlayerMap.get(matchKey)!;
        
        // Add stats for each player in this match (avoid double counting per player per match)
        for (const match of playerRecords) {
          const existing = playerAggregates.get(match.userId) || {
            runs: 0,
            ballsFaced: 0,
            wickets: 0,
            oversBowled: 0,
            runsConceded: 0
          };
          
          existing.runs += match.runsScored;
          existing.ballsFaced += match.ballsFaced;
          existing.wickets += match.wicketsTaken;
          existing.oversBowled += match.oversBowled;
          existing.runsConceded += match.runsConceded;
          
          playerAggregates.set(match.userId, existing);
        }
      }

      const uniqueIndividualMatchCount = uniqueIndividualMatches.size;
      console.log(`Team stats calculation: ${formalMatchesPlayed} formal matches + ${uniqueIndividualMatchCount} unique individual matches`);
      
      // Update total matches played to include both formal and unique individual matches
      totalMatchesPlayed = formalMatchesPlayed + uniqueIndividualMatchCount;

      // Find top performers
      for (const userId of Array.from(playerAggregates.keys())) {
        const stats = playerAggregates.get(userId)!;
        // Top run scorer
        if (stats.runs > topRunScorerRuns) {
          topRunScorerRuns = stats.runs;
          topRunScorerId = userId;
        }

        // Top wicket taker
        if (stats.wickets > topWicketTakerWickets) {
          topWicketTakerWickets = stats.wickets;
          topWicketTakerId = userId;
        }

        // Best strike rate (minimum 20 runs)
        if (stats.runs >= 20 && stats.ballsFaced > 0) {
          const strikeRate = (stats.runs / stats.ballsFaced) * 100;
          if (strikeRate > bestStrikeRate) {
            bestStrikeRate = strikeRate;
            bestStrikeRatePlayerId = userId;
          }
        }

        // Best economy (minimum 2 overs)
        if (stats.oversBowled >= 2) {
          const decimalOvers = this.convertOversToDecimal(stats.oversBowled);
          const economy = stats.runsConceded / decimalOvers;
          if (economy < bestEconomy) {
            bestEconomy = economy;
            bestEconomyPlayerId = userId;
          }
        }
      }

      // Create or update team statistics
      const existingStats = await this.getTeamStatistics(teamId);
      
      if (existingStats) {
        await this.updateTeamStatistics(teamId, {
          matchesPlayed: totalMatchesPlayed,
          matchesWon: formalMatchesWon,
          matchesLost: formalMatchesLost,
          matchesDrawn: formalMatchesDrawn,
          winRatio: parseFloat(winRatio.toFixed(3)),
          topRunScorerId,
          topRunScorerRuns,
          topWicketTakerId,
          topWicketTakerWickets,
          bestStrikeRatePlayerId,
          bestStrikeRate: parseFloat(bestStrikeRate.toFixed(2)),
          bestEconomyPlayerId,
          bestEconomy: bestEconomy === Infinity ? 0 : parseFloat(bestEconomy.toFixed(2)),
          mostManOfTheMatchPlayerId: undefined,
          mostManOfTheMatchAwards: 0,
        });
      } else {
        await this.createTeamStatistics({
          teamId,
          matchesPlayed: totalMatchesPlayed,
          matchesWon: formalMatchesWon,
          matchesLost: formalMatchesLost,
          matchesDrawn: formalMatchesDrawn,
          winRatio: parseFloat(winRatio.toFixed(3)),
          topRunScorerId,
          topRunScorerRuns,
          topWicketTakerId,
          topWicketTakerWickets,
          bestStrikeRatePlayerId,
          bestStrikeRate: parseFloat(bestStrikeRate.toFixed(2)),
          bestEconomyPlayerId,
          bestEconomy: bestEconomy === Infinity ? 0 : parseFloat(bestEconomy.toFixed(2)),
          mostManOfTheMatchPlayerId: undefined,
          mostManOfTheMatchAwards: 0,
        });
      }
    } catch (error) {
      console.error('Error calculating team statistics:', error);
    }
  }

  // Match summary operations
  async createMatchSummary(matchSummary: InsertMatchSummary): Promise<any> {
    try {
      // Handle nullable fields and ensure all required fields are present
      const dataToCreate = {
        ...matchSummary,
        homeTeamId: matchSummary.homeTeamId || null,
        awayTeamId: matchSummary.awayTeamId || null,
        manOfTheMatchUserId: matchSummary.manOfTheMatchUserId || null,
        target: matchSummary.target || null,
        // Ensure required JSON fields have default values
        firstInningsBatsmen: matchSummary.firstInningsBatsmen || [],
        firstInningsBowlers: matchSummary.firstInningsBowlers || [],
        secondInningsBatsmen: matchSummary.secondInningsBatsmen || [],
        secondInningsBowlers: matchSummary.secondInningsBowlers || [],
        manOfTheMatchStats: matchSummary.manOfTheMatchStats || null,
      };
      
      const result = await prisma.matchSummary.create({
        data: dataToCreate
      });
      return result;
    } catch (error) {
      console.error('Error creating match summary:', error);
      throw error;
    }
  }

  async getMatchSummary(id: string): Promise<any | undefined> {
    try {
      const matchSummary = await prisma.matchSummary.findUnique({
        where: { id },
        include: {
          homeTeam: true,
          awayTeam: true,
          manOfTheMatchUser: true,
          playerHistory: {
            include: {
              user: true,
              team: true
            }
          }
        }
      });
      return matchSummary || undefined;
    } catch (error) {
      console.error('Error getting match summary:', error);
      return undefined;
    }
  }

  async getUserMatchHistory(userId: string, page: number = 1, limit: number = 10): Promise<{ matches: any[], totalCount: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const [matches, totalCount] = await Promise.all([
        prisma.playerMatchHistory.findMany({
          where: { userId },
          include: {
            matchSummary: {
              include: {
                homeTeam: true,
                awayTeam: true,
                manOfTheMatchUser: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.playerMatchHistory.count({
          where: { userId }
        })
      ]);

      return {
        matches: matches.map(m => ({
          matchSummary: m.matchSummary,
          userPerformance: {
            runsScored: m.runsScored,
            ballsFaced: m.ballsFaced,
            wicketsTaken: m.wicketsTaken,
            oversBowled: m.oversBowled,
            isManOfTheMatch: m.isManOfTheMatch,
            teamName: m.teamName,
            playerName: m.playerName
          }
        })),
        totalCount
      };
    } catch (error) {
      console.error('Error getting user match history:', error);
      return { matches: [], totalCount: 0 };
    }
  }

  async getTeamMatchHistory(teamId: string, page: number = 1, limit: number = 10): Promise<{ matches: any[], totalCount: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const [matches, totalCount] = await Promise.all([
        prisma.matchSummary.findMany({
          where: {
            OR: [
              { homeTeamId: teamId },
              { awayTeamId: teamId }
            ]
          },
          include: {
            homeTeam: true,
            awayTeam: true,
            manOfTheMatchUser: true,
            playerHistory: {
              include: {
                user: true,
                team: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.matchSummary.count({
          where: {
            OR: [
              { homeTeamId: teamId },
              { awayTeamId: teamId }
            ]
          }
        })
      ]);

      return { matches, totalCount };
    } catch (error) {
      console.error('Error getting team match history:', error);
      return { matches: [], totalCount: 0 };
    }
  }

  // Player match history operations
  async createPlayerMatchHistory(playerHistory: InsertPlayerMatchHistory): Promise<any> {
    try {
      const result = await prisma.playerMatchHistory.create({
        data: playerHistory
      });
      return result;
    } catch (error) {
      console.error('Error creating player match history:', error);
      throw error;
    }
  }

  async getPlayerMatchHistories(matchSummaryId: string): Promise<any[]> {
    try {
      const histories = await prisma.playerMatchHistory.findMany({
        where: { matchSummaryId },
        include: {
          user: true,
          team: true
        }
      });
      return histories;
    } catch (error) {
      console.error('Error getting player match histories:', error);
      return [];
    }
  }

  // ============== FIXTURE OPERATIONS ==============

  async createFixture(fixture: InsertFixture): Promise<Fixture> {
    return await prisma.fixture.create({
      data: {
        userId: fixture.userId,
        teamAId: fixture.teamAId || null,
        teamAName: fixture.teamAName,
        teamALogo: fixture.teamALogo || null,
        teamAPlayers: fixture.teamAPlayers as any,
        teamBId: fixture.teamBId || null,
        teamBName: fixture.teamBName,
        teamBLogo: fixture.teamBLogo || null,
        teamBPlayers: fixture.teamBPlayers as any,
        overs: fixture.overs,
        venue: fixture.venue || null,
      }
    });
  }

  async getFixturesByUser(userId: string): Promise<Fixture[]> {
    try {
      const fixtures = await prisma.fixture.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      return fixtures;
    } catch {
      return [];
    }
  }

  async getFixture(id: string): Promise<Fixture | undefined> {
    try {
      const fixture = await prisma.fixture.findUnique({
        where: { id }
      });
      return fixture || undefined;
    } catch {
      return undefined;
    }
  }

  async updateFixture(id: string, updates: Partial<InsertFixture>): Promise<Fixture | undefined> {
    try {
      const fixture = await prisma.fixture.update({
        where: { id },
        data: {
          ...(updates.teamAId !== undefined && { teamAId: updates.teamAId || null }),
          ...(updates.teamAName !== undefined && { teamAName: updates.teamAName }),
          ...(updates.teamALogo !== undefined && { teamALogo: updates.teamALogo || null }),
          ...(updates.teamAPlayers !== undefined && { teamAPlayers: updates.teamAPlayers as any }),
          ...(updates.teamBId !== undefined && { teamBId: updates.teamBId || null }),
          ...(updates.teamBName !== undefined && { teamBName: updates.teamBName }),
          ...(updates.teamBLogo !== undefined && { teamBLogo: updates.teamBLogo || null }),
          ...(updates.teamBPlayers !== undefined && { teamBPlayers: updates.teamBPlayers as any }),
          ...(updates.overs !== undefined && { overs: updates.overs }),
          ...(updates.venue !== undefined && { venue: updates.venue || null }),
        }
      });
      return fixture;
    } catch {
      return undefined;
    }
  }

  async deleteFixture(id: string): Promise<boolean> {
    try {
      await prisma.fixture.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const storage = new PrismaStorage();
