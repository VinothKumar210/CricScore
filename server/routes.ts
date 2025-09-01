import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, profileSetupSchema, insertMatchSchema, insertTeamSchema, insertTeamInvitationSchema } from "@shared/schema";
import { z } from "zod";

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
      
      const user = await storage.validatePassword(validatedData.email, validatedData.password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({ 
        user: { ...user, password: undefined }, 
        token 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
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
            oversBowled: playerStat.oversBowled,
            runsConceded: playerStat.runsConceded,
            wicketsTaken: playerStat.wicketsTaken,
            catchesTaken: playerStat.catchesTaken
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

  app.post("/api/teams", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertTeamSchema.parse({
        ...req.body,
        captainId: req.userId,
      });

      const team = await storage.createTeam(validatedData);
      
      // Automatically add the team creator as a team member
      await storage.addTeamMember({
        teamId: team.id,
        userId: req.userId
      });
      
      res.status(201).json(team);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
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

  // Username availability check route (public - no auth required)
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

  // Save local match results and update career stats
  app.post("/api/local-match-results", authenticateToken, async (req: any, res) => {
    try {
      const { 
        matchName,
        venue,
        matchDate,
        myTeamPlayers,
        opponentTeamPlayers,
        finalScore,
        playerPerformances
      } = req.body;

      // Basic validation
      if (!matchName || !venue || !matchDate || !myTeamPlayers || !opponentTeamPlayers || !playerPerformances) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const results = [];
      const errors = [];

      // Process performances for players with valid userIds
      for (const performance of playerPerformances) {
        const { 
          userId, 
          playerName,
          runsScored = 0, 
          ballsFaced = 0, 
          oversBowled = 0, 
          runsConceded = 0, 
          wicketsTaken = 0, 
          catchesTaken = 0 
        } = performance;

        // Only process if player has a valid userId (meaning they have an account)
        if (userId) {
          try {
            // Create match record for this player
            const matchData = {
              userId,
              opponent: `Local Match vs ${myTeamPlayers.some((p: any) => p.userId === userId) ? 'Opponent Team' : 'My Team'}`,
              matchDate: new Date(matchDate),
              runsScored: parseInt(runsScored) || 0,
              ballsFaced: parseInt(ballsFaced) || 0,
              oversBowled: parseFloat(oversBowled) || 0,
              runsConceded: parseInt(runsConceded) || 0,
              wicketsTaken: parseInt(wicketsTaken) || 0,
              catchesTaken: parseInt(catchesTaken) || 0
            };

            const match = await storage.createMatch(matchData);
            results.push({
              playerName,
              userId,
              matchId: match.id,
              status: 'success'
            });
          } catch (error) {
            console.error(`Error saving match for player ${playerName}:`, error);
            errors.push({
              playerName,
              userId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      res.json({
        message: "Local match results processed",
        totalPlayers: playerPerformances.length,
        playersWithAccounts: results.length,
        successfulSaves: results.length,
        errorCount: errors.length,
        results,
        errors
      });
    } catch (error) {
      console.error('Error processing local match results:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
