import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, profileSetupSchema, insertMatchSchema, insertTeamSchema, insertTeamInvitationSchema, insertLocalMatchSchema, insertMatchSpectatorSchema, teamMatchResultsSchema, insertMatchSummarySchema, insertPlayerMatchHistorySchema, insertGuestPlayerSchema, linkGuestPlayerSchema, transferCaptainSchema, insertFixtureSchema } from "@shared/schema";
import { calculateManOfTheMatch } from "../shared/man-of-the-match";
import { processBall, initialMatchState } from "@shared/scoring";
import { z } from "zod";
import { verifyFirebaseToken } from "./firebase-admin";
import { statsService } from "./services/stats_service";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Helper function to handle database errors consistently
function handleDatabaseError(error: unknown, res: any) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  // Check if it's a database connection error
  if (errorMessage.includes('authentication failed') ||
    errorMessage.includes('ConnectorError') ||
    errorMessage.includes('SCRAM failure')) {
    return res.status(503).json({
      message: "Database connection unavailable. Please try again later.",
      details: "Database authentication failed"
    });
  }

  return res.status(500).json({ message: "Internal server error", details: errorMessage });
}

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(validatedData);
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        user: { ...user, password: undefined },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }

      return handleDatabaseError(error, res);
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      const result = await storage.validatePassword(validatedData.email, validatedData.password);
      if (!result.user) {
        if (result.errorType === 'EMAIL_NOT_FOUND') {
          return res.status(401).json({ message: "No account found with this email address", field: "email" });
        } else if (result.errorType === 'WRONG_PASSWORD') {
          return res.status(401).json({ message: "Incorrect password", field: "password" });
        }
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: result.user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        user: { ...result.user, password: undefined },
        token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Firebase authentication routes
  app.post("/api/auth/firebase-login", async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ message: "ID token required" });
      }

      const decodedToken = await verifyFirebaseToken(idToken);
      const email = decodedToken.email;

      if (!email) {
        return res.status(400).json({ message: "Email not found in token" });
      }

      let user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "No account found with this email. Please register first." });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        user: { ...user, password: undefined },
        token
      });
    } catch (error) {
      console.error('Firebase login error:', error);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  });

  app.post("/api/auth/firebase-register", async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ message: "ID token required" });
      }

      const decodedToken = await verifyFirebaseToken(idToken);
      const email = decodedToken.email;

      if (!email) {
        return res.status(400).json({ message: "Email not found in token" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // User already exists - log them in instead
        const token = jwt.sign({ userId: existingUser.id }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({
          user: { ...existingUser, password: undefined },
          token
        });
      }

      const user = await storage.createUser({
        email,
        password: `firebase_${decodedToken.uid}`,
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        user: { ...user, password: undefined },
        token
      });
    } catch (error) {
      console.error('Firebase register error:', error);
      return handleDatabaseError(error, res);
    }
  });

  app.post("/api/auth/firebase-google", async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ message: "ID token required" });
      }

      const decodedToken = await verifyFirebaseToken(idToken);
      const email = decodedToken.email;

      if (!email) {
        return res.status(400).json({ message: "Email not found in token" });
      }

      let user = await storage.getUserByEmail(email);

      if (!user) {
        user = await storage.createUser({
          email,
          password: `google_${decodedToken.uid}`,
        });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        user: { ...user, password: undefined },
        token
      });
    } catch (error) {
      console.error('Firebase Google auth error:', error);
      return handleDatabaseError(error, res);
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ ...user, password: undefined });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Profile routes
  app.put("/api/profile", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = profileSetupSchema.parse(req.body);

      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser && existingUser.id !== req.userId) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const user = await storage.updateUserProfile(req.userId, validatedData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ ...user, password: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/profile", authenticateToken, async (req: any, res) => {
    try {
      // Use a partial profile schema for updating (without username)
      const updateSchema = profileSetupSchema.omit({ username: true }).partial();
      const validatedData = updateSchema.parse(req.body);

      // Get current user to preserve unchanged fields
      const currentUser = await storage.getUser(req.userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create a profile update object with username preserved
      const profileData = {
        username: currentUser.username!,
        profileName: validatedData.profileName !== undefined ? validatedData.profileName : currentUser.profileName || undefined,
        description: validatedData.description !== undefined ? validatedData.description : (currentUser as any).description || undefined,
        role: validatedData.role !== undefined ? validatedData.role : currentUser.role!,
        battingHand: validatedData.battingHand !== undefined ? validatedData.battingHand : currentUser.battingHand!,
        bowlingStyle: validatedData.bowlingStyle !== undefined ? validatedData.bowlingStyle : currentUser.bowlingStyle || undefined,
      };

      const user = await storage.updateUserProfile(req.userId, profileData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ ...user, password: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Career stats routes
  app.get("/api/stats", authenticateToken, async (req: any, res) => {
    try {
      const stats = await storage.getCareerStats(req.userId);
      if (!stats) {
        return res.status(404).json({ message: "Stats not found" });
      }

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get career stats by user ID (for viewing other players)
  app.get("/api/users/:id/stats", authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getCareerStats(req.params.id);
      if (!stats) {
        return res.status(404).json({ message: "Stats not found" });
      }

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get matches by user ID (for viewing other players)
  app.get("/api/users/:id/matches", authenticateToken, async (req, res) => {
    try {
      const matches = await storage.getMatches(req.params.id);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Match routes
  app.get("/api/matches", authenticateToken, async (req: any, res) => {
    try {
      const matches = await storage.getMatches(req.userId);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/matches", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertMatchSchema.parse({
        ...req.body,
        userId: req.userId,
      });

      const match = await storage.createMatch(validatedData);
      res.status(201).json(match);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Local match statistics saving endpoint
  app.post("/api/matches/local-stats", async (req, res) => {
    try {
      const localMatchStatsSchema = z.object({
        playerStats: z.array(z.object({
          username: z.string(),
          // Batting stats
          runs: z.number().int().min(0),
          ballsFaced: z.number().int().min(0),
          fours: z.number().int().min(0),
          sixes: z.number().int().min(0),
          // Bowling stats
          oversBowled: z.number().min(0),
          runsConceded: z.number().int().min(0),
          wicketsTaken: z.number().int().min(0),
          // Fielding stats
          catchesTaken: z.number().int().min(0),
          // Match info
          matchDate: z.string().transform(str => new Date(str)),
          opponent: z.string()
        }))
      });

      const validatedData = localMatchStatsSchema.parse(req.body);
      const results = [];

      // Process each player's stats
      for (const playerStat of validatedData.playerStats) {
        try {
          // Find user by username
          const user = await storage.getUserByUsername(playerStat.username);
          if (!user) {
            results.push({
              username: playerStat.username,
              status: "error",
              message: "User not found"
            });
            continue;
          }

          // Create match record
          const match = await storage.createMatch({
            userId: user.id,
            opponent: playerStat.opponent,
            matchDate: playerStat.matchDate,
            runsScored: playerStat.runs,
            ballsFaced: playerStat.ballsFaced,
            wasDismissed: false, // Default to false
            oversBowled: playerStat.oversBowled,
            runsConceded: playerStat.runsConceded,
            wicketsTaken: playerStat.wicketsTaken,
            catchesTaken: playerStat.catchesTaken,
            runOuts: 0, // Default to 0
            isManOfTheMatch: false // Default to false for this endpoint
          });

          // Update career stats
          const currentStats = await storage.getCareerStats(user.id);
          if (currentStats) {
            const newMatchesPlayed = currentStats.matchesPlayed + 1;
            const newTotalRuns = currentStats.totalRuns + playerStat.runs;
            const newBallsFaced = currentStats.ballsFaced + playerStat.ballsFaced;
            const newOversBowled = currentStats.oversBowled + playerStat.oversBowled;
            const newRunsConceded = currentStats.runsConceded + playerStat.runsConceded;
            const newWicketsTaken = currentStats.wicketsTaken + playerStat.wicketsTaken;
            const newCatchesTaken = currentStats.catchesTaken + playerStat.catchesTaken;

            // Calculate derived stats
            const newStrikeRate = newBallsFaced > 0 ? (newTotalRuns / newBallsFaced) * 100 : 0;
            const newEconomy = newOversBowled > 0 ? newRunsConceded / newOversBowled : 0;

            await storage.updateCareerStats(user.id, {
              matchesPlayed: newMatchesPlayed,
              totalRuns: newTotalRuns,
              ballsFaced: newBallsFaced,
              strikeRate: newStrikeRate,
              oversBowled: newOversBowled,
              runsConceded: newRunsConceded,
              wicketsTaken: newWicketsTaken,
              economy: newEconomy,
              catchesTaken: newCatchesTaken
            });
          }

          results.push({
            username: playerStat.username,
            status: "success",
            matchId: match.id
          });

        } catch (error) {
          results.push({
            username: playerStat.username,
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      res.json({
        message: "Local match statistics processed",
        results
      });

    } catch (error) {
      console.error('Local match stats error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Team routes
  app.get("/api/teams", authenticateToken, async (req: any, res) => {
    try {
      const teams = await storage.getTeamsByUser(req.userId);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/teams/search", authenticateToken, async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query parameter 'q' required" });
      }

      if (q.trim().length < 1) {
        return res.status(400).json({ message: "Search query must be at least 1 character" });
      }

      const teams = await storage.searchTeamsByCode(q.trim());
      res.json(teams);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  app.get("/api/teams/by-code/:code", authenticateToken, async (req, res) => {
    try {
      const team = await storage.getTeamByCode(req.params.code);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  app.post("/api/teams", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertTeamSchema.parse({
        ...req.body,
        captainId: req.userId,
      });

      const team = await storage.createTeam(validatedData);

      await storage.addTeamMember({
        teamId: team.id,
        userId: req.userId
      });

      res.status(201).json(team);
    } catch (error) {
      console.error('Team creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Get specific team by ID
  app.get("/api/teams/:id", authenticateToken, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update team information (captain and vice captain can edit)
  app.put("/api/teams/:id", authenticateToken, async (req: any, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Check if user is captain or vice captain
      if (team.captainId !== req.userId && team.viceCaptainId !== req.userId) {
        return res.status(403).json({ message: "Only team captain or vice captain can edit team information" });
      }

      // Validate request body
      const updateSchema = z.object({
        name: z.string().min(1).max(50).optional(),
        description: z.string().max(500).optional()
      });

      const validatedData = updateSchema.parse(req.body);

      // Update the team
      const updatedTeam = await storage.updateTeam(req.params.id, validatedData);
      if (!updatedTeam) {
        return res.status(500).json({ message: "Failed to update team" });
      }

      res.json(updatedTeam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Delete team by ID (only captain can delete)
  app.delete("/api/teams/:id", authenticateToken, async (req: any, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Check if user is the captain
      if (team.captainId !== req.userId) {
        return res.status(403).json({ message: "Only the team captain can delete the team" });
      }

      // Delete the team (this should cascade delete team members and invitations)
      const deleted = await storage.deleteTeam(req.params.id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete team" });
      }

      res.json({ message: "Team deleted successfully" });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Get team statistics
  app.get("/api/teams/:id/statistics", authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getTeamStatistics(req.params.id);

      if (!stats) {
        // Return empty statistics if none exist
        return res.json({
          matchesPlayed: 0,
          matchesWon: 0,
          matchesLost: 0,
          matchesDrawn: 0,
          winRatio: 0,
          topRunScorer: null,
          topRunScorerRuns: 0,
          topWicketTaker: null,
          topWicketTakerWickets: 0,
          bestStrikeRatePlayer: null,
          bestStrikeRate: 0,
          bestEconomyPlayer: null,
          bestEconomy: 0,
          mostManOfTheMatchPlayer: null,
          mostManOfTheMatchAwards: 0,
        });
      }

      res.json(stats);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  app.get("/api/teams/:id/members", authenticateToken, async (req, res) => {
    try {
      const members = await storage.getTeamMembers(req.params.id);
      // Flatten the user data for frontend compatibility
      const flattenedMembers = members.map(member => ({
        ...member.user,
        password: undefined, // Remove password from response
        teamMemberId: member.id // Keep team member ID if needed
      }));
      res.json(flattenedMembers);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Remove team member
  app.delete("/api/teams/:id/members/:memberId", authenticateToken, async (req: any, res) => {
    try {
      const { id: teamId, memberId } = req.params;

      // Get team to check permissions
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Check if user has permission to remove members
      const isCaptain = team.captainId === req.userId;
      const isViceCaptain = team.viceCaptainId === req.userId;

      if (!isCaptain && !isViceCaptain) {
        return res.status(403).json({ message: "Only captain and vice captain can remove members" });
      }

      // Vice captain cannot remove captain or vice captain
      if (isViceCaptain && !isCaptain) {
        if (memberId === team.captainId || memberId === team.viceCaptainId) {
          return res.status(403).json({ message: "Vice captain cannot remove captain or vice captain" });
        }
      }

      // Captain cannot remove themselves
      if (isCaptain && memberId === team.captainId) {
        return res.status(400).json({ message: "Captain cannot remove themselves" });
      }

      const success = await storage.removeTeamMember(teamId, memberId);
      if (!success) {
        return res.status(404).json({ message: "Member not found in team" });
      }

      // If removing vice captain, update team
      if (memberId === team.viceCaptainId) {
        await storage.updateTeam(teamId, { viceCaptainId: null });
      }

      res.json({ message: "Member removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Promote member to vice captain
  app.put("/api/teams/:id/promote-vice-captain", authenticateToken, async (req: any, res) => {
    try {
      const { id: teamId } = req.params;
      const { memberId } = req.body;

      // Get team to check permissions
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Only captain and vice captain can promote members
      const isCaptain = team.captainId === req.userId;
      const isViceCaptain = team.viceCaptainId === req.userId;

      if (!isCaptain && !isViceCaptain) {
        return res.status(403).json({ message: "Only captain and vice captain can promote members" });
      }

      // Update team with new vice captain
      const updatedTeam = await storage.updateTeam(teamId, { viceCaptainId: memberId });
      if (!updatedTeam) {
        return res.status(404).json({ message: "Failed to update team" });
      }

      res.json({ message: "Member promoted to vice captain successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Demote vice captain to member
  app.put("/api/teams/:id/demote-vice-captain", authenticateToken, async (req: any, res) => {
    try {
      const { id: teamId } = req.params;

      // Get team to check permissions
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Only captain and vice captain can demote vice captain
      const isCaptain = team.captainId === req.userId;
      const isViceCaptain = team.viceCaptainId === req.userId;

      if (!isCaptain && !isViceCaptain) {
        return res.status(403).json({ message: "Only captain and vice captain can demote vice captain" });
      }

      // Update team to remove vice captain
      const updatedTeam = await storage.updateTeam(teamId, { viceCaptainId: null });
      if (!updatedTeam) {
        return res.status(404).json({ message: "Failed to update team" });
      }

      res.json({ message: "Vice captain demoted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Transfer captaincy to another member
  app.put("/api/teams/:id/transfer-captaincy", authenticateToken, async (req: any, res) => {
    try {
      const { id: teamId } = req.params;
      const { memberId } = req.body;

      // Get team to check permissions
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Only captain can transfer captaincy
      if (team.captainId !== req.userId) {
        return res.status(403).json({ message: "Only captain can transfer captaincy" });
      }

      // Cannot transfer to current captain
      if (memberId === team.captainId) {
        return res.status(400).json({ message: "Cannot transfer captaincy to current captain" });
      }

      // Update team: new member becomes captain, old captain becomes vice captain
      const updatedTeam = await storage.updateTeam(teamId, {
        captainId: memberId,
        viceCaptainId: req.userId
      });

      if (!updatedTeam) {
        return res.status(404).json({ message: "Failed to transfer captaincy" });
      }

      res.json({ message: "Captaincy transferred successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Guest player routes
  app.get("/api/teams/:id/guest-players", authenticateToken, async (req, res) => {
    try {
      const guestPlayers = await storage.getGuestPlayers(req.params.id);
      res.json(guestPlayers);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  app.post("/api/teams/:id/guest-players", authenticateToken, async (req: any, res) => {
    try {
      const teamId = req.params.id;

      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const isMember = await storage.isTeamMember(teamId, req.userId);
      const isCaptain = team.captainId === req.userId;
      const isViceCaptain = team.viceCaptainId === req.userId;

      if (!isMember && !isCaptain && !isViceCaptain) {
        return res.status(403).json({ message: "Only team members can add guest players" });
      }

      const validatedData = insertGuestPlayerSchema.parse({
        ...req.body,
        teamId,
        addedByUserId: req.userId,
      });

      const guestPlayer = await storage.createGuestPlayer(validatedData);
      res.status(201).json(guestPlayer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  app.put("/api/teams/:teamId/guest-players/:guestId", authenticateToken, async (req: any, res) => {
    try {
      const { teamId, guestId } = req.params;

      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const guestPlayer = await storage.getGuestPlayer(guestId);
      if (!guestPlayer || guestPlayer.teamId !== teamId) {
        return res.status(404).json({ message: "Guest player not found" });
      }

      const isCaptain = team.captainId === req.userId;
      const isCreator = guestPlayer.addedByUserId === req.userId;

      if (!isCaptain && !isCreator) {
        return res.status(403).json({ message: "Only captain or creator can update guest player" });
      }

      const updated = await storage.updateGuestPlayer(guestId, req.body);
      if (!updated) {
        return res.status(500).json({ message: "Failed to update guest player" });
      }

      res.json(updated);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  app.delete("/api/teams/:teamId/guest-players/:guestId", authenticateToken, async (req: any, res) => {
    try {
      const { teamId, guestId } = req.params;

      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const guestPlayer = await storage.getGuestPlayer(guestId);
      if (!guestPlayer || guestPlayer.teamId !== teamId) {
        return res.status(404).json({ message: "Guest player not found" });
      }

      const isCaptain = team.captainId === req.userId;
      const isCreator = guestPlayer.addedByUserId === req.userId;

      if (!isCaptain && !isCreator) {
        return res.status(403).json({ message: "Only captain or creator can delete guest player" });
      }

      const deleted = await storage.deleteGuestPlayer(guestId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete guest player" });
      }

      res.json({ message: "Guest player deleted successfully" });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  app.post("/api/teams/:teamId/guest-players/:guestId/link", authenticateToken, async (req: any, res) => {
    try {
      const { teamId, guestId } = req.params;
      const { userId } = req.body;

      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const guestPlayer = await storage.getGuestPlayer(guestId);
      if (!guestPlayer || guestPlayer.teamId !== teamId) {
        return res.status(404).json({ message: "Guest player not found" });
      }

      const isCaptain = team.captainId === req.userId;
      const isCreator = guestPlayer.addedByUserId === req.userId;

      if (!isCaptain && !isCreator) {
        return res.status(403).json({ message: "Only captain or creator can link guest player" });
      }

      const result = await storage.linkGuestPlayerToUser(guestId, userId);
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      res.json({ message: result.message });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // User search route
  app.get("/api/users/search", authenticateToken, async (req, res) => {
    try {
      const { q, limit } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query parameter 'q' required" });
      }

      if (q.trim().length < 1) {
        return res.status(400).json({ message: "Search query must be at least 1 character" });
      }

      const users = await storage.searchUsers(q.trim());

      // Apply limit if provided (for suggestions)
      const limitNum = limit && typeof limit === 'string' ? parseInt(limit, 10) : undefined;
      const limitedUsers = limitNum ? users.slice(0, limitNum) : users;

      // Remove passwords from all results
      const safeUsers = limitedUsers.map(user => ({ ...user, password: undefined }));
      res.json(safeUsers);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Username availability check route (public - no auth required) - MUST come before /:id route
  app.get("/api/users/check-username", async (req, res) => {
    try {
      const { username } = req.query;

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: "Username parameter required" });
      }

      // Validate username format first
      const usernameRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
      if (username.length < 3 || username.length > 30 || !usernameRegex.test(username)) {
        return res.json({
          available: false,
          message: "Username must be 3-30 characters and contain only ASCII letters, numbers, and symbols"
        });
      }

      const existingUser = await storage.getUserByUsername(username);
      const available = !existingUser;

      res.json({
        available,
        message: available ? "Username is available" : "Username is already taken"
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public route for getting basic user info by username (for local match setup)
  app.get("/api/users/lookup-username", async (req, res) => {
    try {
      const { username } = req.query;

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: "Username parameter required" });
      }

      const user = await storage.getUserByUsername(username);

      if (user) {
        // Return only safe, public information needed for local match setup
        return res.json({
          found: true,
          user: {
            id: user.id,
            username: user.username,
            profileName: user.profileName
          }
        });
      } else {
        return res.json({
          found: false,
          message: "Username not found"
        });
      }
    } catch (error) {
      console.error("Error looking up username:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user by ID route
  app.get("/api/users/:id", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "User ID required" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      res.json({ ...user, password: undefined });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Team invitation routes
  app.get("/api/invitations", authenticateToken, async (req: any, res) => {
    try {
      const invitations = await storage.getTeamInvitations(req.userId);
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/invitations", authenticateToken, async (req: any, res) => {
    try {
      const { teamId, username } = req.body;

      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const invitation = await storage.createTeamInvitation({
        teamId,
        invitedBy: req.userId,
        invitedUser: user.id,
      });

      res.status(201).json(invitation);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/invitations/:id", authenticateToken, async (req: any, res) => {
    try {
      const { status } = req.body;

      if (!["ACCEPTED", "REJECTED"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const invitation = await storage.updateInvitationStatus(req.params.id, status);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      res.json(invitation);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============== DEPRECATED ENDPOINTS ==============
  // These endpoints are deprecated and will be removed in a future version.
  // Use /api/matches/submit-result instead.

  /**
   * @deprecated Use POST /api/matches/submit-result instead
   * This endpoint is kept for backward compatibility but will be removed.
   */
  app.post("/api/local-match-results", authenticateToken, async (req: any, res) => {
    console.warn('DEPRECATED: /api/local-match-results is deprecated. Use /api/matches/submit-result instead.');
    
    // Return deprecation warning with redirect guidance
    return res.status(410).json({
      message: "This endpoint is deprecated",
      deprecated: true,
      useInstead: "POST /api/matches/submit-result",
      documentation: "Please update your client to use the centralized /api/matches/submit-result endpoint which handles all match types (local, team, mixed) consistently."
    });
  });

  /**
   * @deprecated Use POST /api/matches/submit-result instead
   * This endpoint is kept for backward compatibility but will be removed.
   */
  app.post("/api/team-match-results", authenticateToken, async (req: any, res) => {
    console.warn('DEPRECATED: /api/team-match-results is deprecated. Use /api/matches/submit-result instead.');
    
    // Return deprecation warning with redirect guidance
    return res.status(410).json({
      message: "This endpoint is deprecated",
      deprecated: true,
      useInstead: "POST /api/matches/submit-result",
      documentation: "Please update your client to use the centralized /api/matches/submit-result endpoint which handles all match types (local, team, mixed) consistently."
    });
  });

  // ============== SPECTATOR AND LIVE MATCH ROUTES ==============

  // Create local match with spectators
  app.post("/api/local-matches", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertLocalMatchSchema.parse({
        ...req.body,
        creatorId: req.userId,
        matchDate: new Date(req.body.matchDate)
      });

      const initialState = initialMatchState(validatedData.overs, true);
      // Pre-fill players
      initialState.team1Batting = validatedData.myTeamPlayers.map((p: any) => ({
        id: p.id || Math.random().toString(36).substring(7),
        name: p.name,
        runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false
      }));
      initialState.team2Batting = validatedData.opponentTeamPlayers.map((p: any) => ({
        id: p.id || Math.random().toString(36).substring(7),
        name: p.name,
        runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false
      }));

      const localMatch = await storage.createLocalMatch({
        ...validatedData,
        fullState: initialState as any
      });


      // Add spectators if provided
      if (req.body.selectedSpectators && Array.isArray(req.body.selectedSpectators)) {
        for (const spectatorId of req.body.selectedSpectators) {
          try {
            await storage.addMatchSpectator({
              localMatchId: localMatch.id,
              userId: spectatorId,
              addedBy: req.userId
            });
          } catch (error) {
            console.error(`Error adding spectator ${spectatorId}:`, error);
          }
        }

        // Send notification to spectators about the new match
        try {
          const creator = await storage.getUser(req.userId);
          const notificationData = {
            title: `🏏 New Match Invitation`,
            body: `${creator?.profileName || creator?.username || 'A cricket player'} has invited you to watch ${localMatch.matchName} at ${localMatch.venue}`,
            matchId: localMatch.id,
            spectatorIds: req.body.selectedSpectators
          };

          // Store notification data for spectators to retrieve
          console.log(`Match created - notification data prepared for ${req.body.selectedSpectators.length} spectators about match: ${localMatch.matchName}`);
        } catch (notificationError) {
          console.error('Error preparing spectator notifications:', notificationError);
        }
      }

      res.status(201).json(localMatch);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Get matches where user is a spectator
  app.get("/api/local-matches/spectator", authenticateToken, async (req: any, res) => {
    try {
      const matches = await storage.getSpectatorMatches(req.userId);
      res.json(matches);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Get all ongoing matches for discovery
  app.get("/api/local-matches/ongoing", authenticateToken, async (req: any, res) => {
    try {
      const matches = await storage.getOngoingMatches();
      res.json(matches);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Get specific local match details for spectators
  app.get("/api/local-matches/:id", authenticateToken, async (req, res) => {
    try {
      const match = await storage.getLocalMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Get pending notifications for spectator
  app.get("/api/notifications/pending", authenticateToken, async (req: any, res) => {
    try {
      const pendingNotifications = await storage.getPendingNotifications(req.userId);
      res.json(pendingNotifications);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Mark notifications as read
  app.post("/api/notifications/mark-read", authenticateToken, async (req: any, res) => {
    try {
      const { matchIds } = req.body;
      if (!Array.isArray(matchIds)) {
        return res.status(400).json({ message: "matchIds must be an array" });
      }

      await storage.markNotificationsAsRead(req.userId, matchIds);
      res.json({ message: "Notifications marked as read" });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Add spectator to match
  app.post("/api/local-matches/:id/spectators", authenticateToken, async (req: any, res) => {
    try {
      // Get the match to check if it's a room match
      const match = await storage.getLocalMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // If it's a room match, validate the password
      if (match.isRoomMatch) {
        const { password } = req.body;

        if (!password) {
          return res.status(400).json({ message: "Password required for this match room" });
        }

        if (password !== match.roomPassword) {
          return res.status(403).json({ message: "Incorrect password" });
        }
      }

      const spectatorData = insertMatchSpectatorSchema.parse({
        ...req.body,
        localMatchId: req.params.id,
        userId: req.userId,
        addedBy: req.userId
      });

      const spectator = await storage.addMatchSpectator(spectatorData);
      res.status(201).json(spectator);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Remove spectator from match
  app.delete("/api/local-matches/:id/spectators/:userId", authenticateToken, async (req: any, res) => {
    try {
      // Only match creator or the spectator themselves can remove
      const match = await storage.getLocalMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.creatorId !== req.userId && req.params.userId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to remove this spectator" });
      }

      const removed = await storage.removeMatchSpectator(req.params.id, req.params.userId);
      if (!removed) {
        return res.status(404).json({ message: "Spectator not found" });
      }

      res.json({ message: "Spectator removed successfully" });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Record a ball for a local match
  app.post("/api/local-matches/:id/ball", authenticateToken, async (req: any, res) => {
    try {
      const match = await storage.getLocalMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.creatorId !== req.userId) {
        return res.status(403).json({ message: "Only match creator can record balls" });
      }

      const ballInputSchema = z.object({
        completedRuns: z.number().int().min(0),
        extraType: z.enum(['none', 'wide', 'noball', 'bye', 'legbye']),
        wicket: z.object({
          type: z.enum(['bowled', 'caught', 'lbw', 'stumped', 'run_out', 'hit_wicket']),
          dismissedBatsman: z.enum(['striker', 'non-striker']),
          dismissedAtEnd: z.enum(['striker-end', 'non-striker-end']),
          runsBeforeDismissal: z.number().int().min(0),
          fielder: z.string().optional()
        }).nullable(),
        isBoundary: z.boolean().optional()
      });

      const ballInput = ballInputSchema.parse(req.body);

      // Reconstruct or initialize state
      let state = match.fullState as any;
      if (!state) {
        return res.status(400).json({ message: "Match state not initialized" });
      }

      const newState = processBall(state, ballInput);

      // Update database
      const lastBall = newState.ballHistory[newState.ballHistory.length - 1];
      await storage.saveBall(match.id, lastBall, lastBall.overNumber, newState.currentInnings);

      const updates: any = {
        fullState: newState,
        currentInnings: newState.currentInnings,
        status: newState.isMatchComplete ? 'COMPLETED' : 'ONGOING',
        myTeamScore: newState.team1Score.runs,
        myTeamWickets: newState.team1Score.wickets,
        myTeamOvers: (newState.team1Score.balls / 6) + (newState.team1Score.balls % 6) / 10,
        opponentTeamScore: newState.team2Score.runs,
        opponentTeamWickets: newState.team2Score.wickets,
        opponentTeamOvers: (newState.team2Score.balls / 6) + (newState.team2Score.balls % 6) / 10,
      };

      await storage.updateLocalMatch(match.id, updates);

      res.json(newState);
    } catch (error) {
      console.error('Error recording ball:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update match status and score (for match creators during live scoring)
  app.patch("/api/local-matches/:id", authenticateToken, async (req: any, res) => {

    try {
      const match = await storage.getLocalMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Only match creator can update
      if (match.creatorId !== req.userId) {
        return res.status(403).json({ message: "Only match creator can update match" });
      }

      const updateSchema = z.object({
        status: z.enum(["CREATED", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
        currentInnings: z.number().int().min(1).max(2).optional(),
        currentOver: z.number().min(0).optional(),
        currentBall: z.number().int().min(0).max(5).optional(),
        myTeamScore: z.number().int().min(0).optional(),
        myTeamWickets: z.number().int().min(0).max(10).optional(),
        myTeamOvers: z.number().min(0).optional(),
        opponentTeamScore: z.number().int().min(0).optional(),
        opponentTeamWickets: z.number().int().min(0).max(10).optional(),
        opponentTeamOvers: z.number().min(0).optional()
      });

      const validatedData = updateSchema.parse(req.body);
      const updatedMatch = await storage.updateLocalMatch(req.params.id, validatedData);

      if (!updatedMatch) {
        return res.status(500).json({ message: "Failed to update match" });
      }

      res.json(updatedMatch);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Send notification to spectators
  app.post("/api/live-matches/:id/notify", authenticateToken, async (req: any, res) => {
    try {
      const { title, body } = req.body;

      if (!title || !body) {
        return res.status(400).json({ message: "Title and body are required" });
      }

      const match = await storage.getLocalMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Only match creator can send notifications
      if (match.creatorId !== req.userId) {
        return res.status(403).json({ message: "Only match creator can send notifications" });
      }

      // Get all spectators for this match
      const spectators = await storage.getMatchSpectators(req.params.id);

      res.json({
        message: "Notification request processed",
        spectatorCount: spectators.length,
        notificationData: { title, body, matchId: req.params.id }
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // Match Summary API routes

  // Create match summary (allow without auth for local matches)
  app.post("/api/match-summary", async (req: any, res) => {
    try {
      const validatedData = insertMatchSummarySchema.parse(req.body);
      const matchSummary = await storage.createMatchSummary(validatedData);
      res.status(201).json(matchSummary);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Get specific match summary (allow without auth for local matches)
  app.get("/api/match-summary/:id", async (req, res) => {
    try {
      const matchSummary = await storage.getMatchSummary(req.params.id);
      if (!matchSummary) {
        return res.status(404).json({ message: "Match summary not found" });
      }

      // Helper function to format overs in cricket format (O.B)
      const formatOversForDisplay = (overs: number): number => {
        const wholeOvers = Math.floor(overs);
        const balls = Math.round((overs - wholeOvers) * 6);
        const clampedBalls = Math.min(Math.max(balls, 0), 5);
        return parseFloat(`${wholeOvers}.${clampedBalls}`);
      };

      // Map innings data to home/away team format for UI compatibility
      // Check which team batted in which innings to correctly map the data
      const homeTeamBattedFirst = matchSummary.firstInningsTeam === matchSummary.homeTeamName;

      const mappedData = {
        ...matchSummary,
        // Map home team data based on which innings they batted in
        homeTeamRuns: homeTeamBattedFirst ? matchSummary.firstInningsRuns : matchSummary.secondInningsRuns,
        homeTeamWickets: homeTeamBattedFirst ? matchSummary.firstInningsWickets : matchSummary.secondInningsWickets,
        homeTeamOvers: formatOversForDisplay(homeTeamBattedFirst ? matchSummary.firstInningsOvers : matchSummary.secondInningsOvers),
        // Map away team data based on which innings they batted in
        awayTeamRuns: homeTeamBattedFirst ? matchSummary.secondInningsRuns : matchSummary.firstInningsRuns,
        awayTeamWickets: homeTeamBattedFirst ? matchSummary.secondInningsWickets : matchSummary.firstInningsWickets,
        awayTeamOvers: formatOversForDisplay(homeTeamBattedFirst ? matchSummary.secondInningsOvers : matchSummary.firstInningsOvers),
        // Remove "Local Ground" if it's the default venue
        venue: matchSummary.venue === 'Local Ground' ? '' : matchSummary.venue,
        // Fix match result mapping
        winningTeam: matchSummary.result === 'HOME_WIN'
          ? matchSummary.homeTeamName
          : matchSummary.result === 'AWAY_WIN'
            ? matchSummary.awayTeamName
            : 'Draw'
      };

      res.json(mappedData);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Get user match history with pagination
  app.get("/api/user-match-history/:userId", authenticateToken, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await storage.getUserMatchHistory(req.params.userId, page, limit);
      res.json(result);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Get team match history with pagination
  app.get("/api/team-match-history/:teamId", authenticateToken, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await storage.getTeamMatchHistory(req.params.teamId, page, limit);
      res.json(result);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Create player match history (allow without auth for local matches)
  app.post("/api/player-match-history", async (req: any, res) => {
    try {
      const validatedData = insertPlayerMatchHistorySchema.parse(req.body);
      const playerHistory = await storage.createPlayerMatchHistory(validatedData);
      res.status(201).json(playerHistory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Get player histories for a match
  app.get("/api/player-match-histories/:matchSummaryId", authenticateToken, async (req, res) => {
    try {
      const histories = await storage.getPlayerMatchHistories(req.params.matchSummaryId);
      res.json(histories);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // ============== FIXTURE ROUTES ==============

  // Get all fixtures for the authenticated user
  app.get("/api/fixtures", authenticateToken, async (req: any, res) => {
    try {
      const fixtures = await storage.getFixturesByUser(req.userId);
      res.json(fixtures);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Get a specific fixture
  app.get("/api/fixtures/:id", authenticateToken, async (req: any, res) => {
    try {
      const fixture = await storage.getFixture(req.params.id);
      if (!fixture) {
        return res.status(404).json({ message: "Fixture not found" });
      }
      if (fixture.userId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to access this fixture" });
      }
      res.json(fixture);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Create a new fixture
  app.post("/api/fixtures", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertFixtureSchema.parse({
        ...req.body,
        userId: req.userId,
      });
      const fixture = await storage.createFixture(validatedData);
      res.status(201).json(fixture);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Update a fixture
  app.put("/api/fixtures/:id", authenticateToken, async (req: any, res) => {
    try {
      const fixture = await storage.getFixture(req.params.id);
      if (!fixture) {
        return res.status(404).json({ message: "Fixture not found" });
      }
      if (fixture.userId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to update this fixture" });
      }

      const updatedFixture = await storage.updateFixture(req.params.id, req.body);
      if (!updatedFixture) {
        return res.status(500).json({ message: "Failed to update fixture" });
      }
      res.json(updatedFixture);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Delete a fixture
  app.delete("/api/fixtures/:id", authenticateToken, async (req: any, res) => {
    try {
      const fixture = await storage.getFixture(req.params.id);
      if (!fixture) {
        return res.status(404).json({ message: "Fixture not found" });
      }
      if (fixture.userId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to delete this fixture" });
      }

      const deleted = await storage.deleteFixture(req.params.id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete fixture" });
      }
      res.json({ message: "Fixture deleted successfully" });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // ============== CENTRALIZED STATS SUBMISSION ==============
  // This is the ONLY endpoint that should be used for submitting match results

  /**
   * Centralized match result submission endpoint
   * Handles all match types: local matches, team matches, mixed matches
   * Creates MatchSummary, updates CareerStats, TeamStatistics, PlayerMatchHistory
   */
  app.post("/api/matches/submit-result", authenticateToken, async (req, res) => {
    try {
      const matchData = teamMatchResultsSchema.parse(req.body);
      // Process match result - creates MatchSummary, updates CareerStats, TeamStatistics, etc.
      const result = await statsService.processMatchResult(matchData);
      res.json(result);
    } catch (error) {
      console.error("Stats submission error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  app.post("/api/stats/link-guest", authenticateToken, async (req, res) => {
    try {
      const { guestPlayerId, userId } = linkGuestPlayerSchema.parse(req.body);
      const result = await statsService.linkGuestToUser(guestPlayerId, userId);
      res.json(result);
    } catch (error) {
      console.error("Link guest error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
