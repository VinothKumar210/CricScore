import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, profileSetupSchema, insertMatchSchema, insertTeamSchema, insertTeamInvitationSchema, insertLocalMatchSchema, insertMatchSpectatorSchema, teamMatchResultsSchema, insertMatchSummarySchema, insertPlayerMatchHistorySchema, insertGuestPlayerSchema, linkGuestPlayerSchema, transferCaptainSchema, insertFixtureSchema } from "@shared/schema";
import { calculateManOfTheMatch } from "../shared/man-of-the-match";
import { processBall, initialMatchState } from "@shared/scoring";
import { z } from "zod";
import { verifyFirebaseToken } from "./firebase-admin";
import { statsService } from "./services/statsService.js";
import { uploadImage, deleteImage } from "./services/cloudinary";
import { prisma } from "./db.js";

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

      // Handle profile picture upload to Cloudinary
      let profilePictureUrl = (currentUser as any).profilePictureUrl;
      console.log('[Profile Update] Current profilePictureUrl:', profilePictureUrl);
      console.log('[Profile Update] Received profilePictureUrl:', validatedData.profilePictureUrl?.substring(0, 50));

      if (validatedData.profilePictureUrl && validatedData.profilePictureUrl.startsWith('data:')) {
        console.log('[Profile Update] Uploading to Cloudinary...');
        try {
          const uploadResult = await uploadImage(
            validatedData.profilePictureUrl,
            'profiles',
            `user_${req.userId}`
          );
          profilePictureUrl = uploadResult.url;
          console.log('[Profile Update] Cloudinary upload successful:', profilePictureUrl);
        } catch (uploadError) {
          console.error('[Profile Update] Profile picture upload failed:', uploadError);
          // Continue without updating picture if upload fails
        }
      } else if (validatedData.profilePictureUrl) {
        // Already a URL, use directly
        profilePictureUrl = validatedData.profilePictureUrl;
        console.log('[Profile Update] Using existing URL:', profilePictureUrl);
      }

      // Create a profile update object with username preserved
      const profileData = {
        username: currentUser.username!,
        profileName: validatedData.profileName !== undefined ? validatedData.profileName : currentUser.profileName || undefined,
        description: validatedData.description !== undefined ? validatedData.description : (currentUser as any).description || undefined,
        role: validatedData.role !== undefined ? validatedData.role : currentUser.role!,
        battingHand: validatedData.battingHand !== undefined ? validatedData.battingHand : currentUser.battingHand!,
        bowlingStyle: validatedData.bowlingStyle !== undefined ? validatedData.bowlingStyle : currentUser.bowlingStyle || undefined,
        profilePictureUrl: profilePictureUrl,
      };

      const user = await storage.updateUserProfile(req.userId, profileData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log('[Profile Update] Updated user profilePictureUrl:', (user as any).profilePictureUrl);
      res.json({ ...user, password: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Image upload endpoint (for profile pics, team logos, etc.)
  app.post("/api/upload/image", authenticateToken, async (req: any, res) => {
    try {
      const { image, folder = 'general', publicId } = req.body;

      if (!image) {
        return res.status(400).json({ message: "Image data is required" });
      }

      // Validate image is base64
      if (!image.startsWith('data:image/')) {
        return res.status(400).json({ message: "Invalid image format. Must be base64 data URL" });
      }

      const result = await uploadImage(image, folder, publicId);
      res.json({ url: result.url, publicId: result.publicId });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Team logo upload endpoint
  app.patch("/api/teams/:teamId/logo", authenticateToken, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const { logoUrl } = req.body;

      if (!logoUrl) {
        return res.status(400).json({ message: "Logo image is required" });
      }

      // Get team and verify user is captain or creator
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      if (team.createdById !== req.userId && team.captainId !== req.userId) {
        return res.status(403).json({ message: "Only team creator or captain can update logo" });
      }

      // Upload to Cloudinary if base64
      let finalLogoUrl = logoUrl;
      if (logoUrl.startsWith('data:')) {
        try {
          const uploadResult = await uploadImage(logoUrl, 'teams', `team_${teamId}`);
          finalLogoUrl = uploadResult.url;
        } catch (uploadError) {
          console.error('Team logo upload failed:', uploadError);
          return res.status(500).json({ message: "Failed to upload logo" });
        }
      }

      // Update team with new logo
      const updatedTeam = await storage.updateTeam(teamId, { logoUrl: finalLogoUrl });
      res.json(updatedTeam);
    } catch (error) {
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
      const isViceCaptain = team.viceCaptainId === req.userId;
      const isCreator = guestPlayer.addedByUserId === req.userId;

      if (!isCaptain && !isViceCaptain && !isCreator) {
        return res.status(403).json({ message: "Only captain, vice-captain, or creator can link guest player" });
      }

      const result = await statsService.linkGuestToUser(guestId, userId);
      res.json(result);
    } catch (error: any) {
      console.error("Link guest error:", error);
      if (error.message) {
        return res.status(400).json({ message: error.message });
      }
      return handleDatabaseError(error, res);
    }
  });

  // ========================================
  // Guest Player Search APIs (Phase 3)
  // ========================================

  // Get guest player by code (case-insensitive, public)
  app.get("/api/guest/:code", async (req, res) => {
    try {
      const { code } = req.params;

      // Validate code format
      if (!/^[a-zA-Z0-9]{5}$/.test(code)) {
        return res.status(400).json({ message: "Invalid guest code format" });
      }

      const guest = await storage.getGuestByCode(code.toLowerCase());

      if (!guest) {
        return res.status(404).json({ message: "Guest player not found" });
      }

      // If guest is linked to a user, return redirect info
      if (guest.linkedUserId) {
        return res.json({
          ...guest,
          redirectToUser: true,
          linkedUser: guest.linkedUser,
        });
      }

      res.json(guest);
    } catch (error) {
      console.error("Error fetching guest by code:", error);
      return res.status(500).json({ message: "Failed to fetch guest player" });
    }
  });

  // Link guest player to user by guestCode
  // Auth: Captain or Vice-Captain of the guest's team
  app.post("/api/guest/:code/link", authenticateToken, async (req: any, res) => {
    try {
      const { code } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }

      // Validate code format
      if (!/^[a-zA-Z0-9]{5}$/.test(code)) {
        return res.status(400).json({ message: "Invalid guest code format" });
      }

      // Find the guest by code to check authorization
      const guest = await prisma.guestPlayer.findFirst({
        where: { guestCode: code.toLowerCase() }
      });

      if (!guest) {
        return res.status(404).json({ message: "Guest player not found" });
      }

      if (guest.linkedUserId) {
        return res.status(400).json({ message: "Guest player is already linked to a user" });
      }

      // Check authorization: must be captain or vice-captain of the guest's team
      const team = await storage.getTeam(guest.teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const isCaptain = team.captainId === req.userId;
      const isViceCaptain = team.viceCaptainId === req.userId;
      const isCreator = guest.addedByUserId === req.userId;
      const isSelfClaim = userId === req.userId; // User claiming their own stats

      if (!isCaptain && !isViceCaptain && !isCreator && !isSelfClaim) {
        return res.status(403).json({ message: "Only team captain, vice-captain, or the guest creator can link players" });
      }

      const result = await statsService.linkGuestByCode(code, userId);
      res.json(result);
    } catch (error: any) {
      console.error("Link guest by code error:", error);
      if (error.message) {
        return res.status(400).json({ message: error.message });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Get guest player stats by code
  app.get("/api/guest/:code/stats", async (req, res) => {
    try {
      const { code } = req.params;

      if (!/^[a-zA-Z0-9]{5}$/.test(code)) {
        return res.status(400).json({ message: "Invalid guest code format" });
      }

      const guest = await storage.getGuestByCode(code.toLowerCase());

      if (!guest) {
        return res.status(404).json({ message: "Guest player not found" });
      }

      // Return stats from guest player record
      const stats = {
        id: guest.id,
        name: guest.name,
        guestCode: guest.guestCode,
        matchesPlayed: guest.matchesPlayed,
        batting: {
          totalRuns: guest.totalRuns,
          ballsFaced: guest.ballsFaced,
          fours: guest.fours,
          sixes: guest.sixes,
          strikeRate: guest.ballsFaced > 0
            ? ((guest.totalRuns / guest.ballsFaced) * 100).toFixed(2)
            : "0.00",
          average: guest.matchesPlayed > 0
            ? (guest.totalRuns / guest.matchesPlayed).toFixed(2)
            : "0.00",
        },
        bowling: {
          wicketsTaken: guest.wicketsTaken,
          runsConceded: guest.runsConceded,
          oversBowled: guest.oversBowled,
          economy: guest.oversBowled > 0
            ? (guest.runsConceded / guest.oversBowled).toFixed(2)
            : "0.00",
        },
        fielding: {
          catchesTaken: guest.catchesTaken,
          runOuts: guest.runOuts,
        },
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching guest stats:", error);
      return res.status(500).json({ message: "Failed to fetch guest stats" });
    }
  });

  // Get guest player match history by code
  app.get("/api/guest/:code/matches", async (req, res) => {
    try {
      const { code } = req.params;

      if (!/^[a-zA-Z0-9]{5}$/.test(code)) {
        return res.status(400).json({ message: "Invalid guest code format" });
      }

      const guest = await storage.getGuestByCode(code.toLowerCase());

      if (!guest) {
        return res.status(404).json({ message: "Guest player not found" });
      }

      // Get match history for this guest player
      const matchHistory = await storage.getGuestMatchHistory(guest.id);

      res.json({
        matches: matchHistory,
        totalCount: matchHistory.length,
      });
    } catch (error) {
      console.error("Error fetching guest match history:", error);
      return res.status(500).json({ message: "Failed to fetch match history" });
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



      // Calculate man of the match
      const manOfTheMatchResult = calculateManOfTheMatch(playerPerformances, 'T20'); // Default to T20 format

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
            // Determine if this player is man of the match
            const isManOfTheMatch = manOfTheMatchResult &&
              (manOfTheMatchResult.playerId === userId ||
                (manOfTheMatchResult.playerName === playerName && !manOfTheMatchResult.playerId));

            // Create match record for this player
            const matchData = {
              userId,
              opponent: `Local Match vs ${myTeamPlayers.some((p: any) => p.userId === userId) ? 'Opponent Team' : 'My Team'}`,
              matchDate: new Date(matchDate),
              runsScored: parseInt(runsScored) || 0,
              ballsFaced: parseInt(ballsFaced) || 0,
              wasDismissed: false, // Default to false for local matches
              oversBowled: parseFloat(oversBowled) || 0,
              runsConceded: parseInt(runsConceded) || 0,
              wicketsTaken: parseInt(wicketsTaken) || 0,
              catchesTaken: parseInt(catchesTaken) || 0,
              runOuts: 0, // Default to 0 for local matches
              isManOfTheMatch: isManOfTheMatch || false
            };

            const match = await storage.createMatch(matchData);

            // Update career statistics for this player (includes MOTM)
            await storage.updateCareerStatsFromMatch(userId, matchData);

            results.push({
              playerName,
              userId,
              matchId: match.id,
              status: 'success',
              isManOfTheMatch: isManOfTheMatch
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
        manOfTheMatch: manOfTheMatchResult,
        results,
        errors
      });
    } catch (error) {
      console.error('Error processing local match results:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Team match results endpoint - handles team vs team matches with database teams
  app.post("/api/team-match-results", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = teamMatchResultsSchema.parse(req.body);
      const results = [];
      let teamMatchId = null;

      console.log('Processing team match results:', {
        homeTeam: validatedData.homeTeamName,
        awayTeam: validatedData.awayTeamName,
        homeTeamId: validatedData.homeTeamId,
        awayTeamId: validatedData.awayTeamId,
        playerCount: validatedData.playerPerformances.length
      });



      // Calculate man of the match from player performances
      const manOfTheMatchResult = calculateManOfTheMatch(validatedData.playerPerformances, 'T20');

      // 1. Create team match record only if both teams are from database
      if (validatedData.homeTeamId && validatedData.awayTeamId) {
        console.log('Creating formal team match: both teams from database');
        const teamMatch = await storage.createTeamMatch({
          homeTeamId: validatedData.homeTeamId,
          awayTeamId: validatedData.awayTeamId,
          matchDate: validatedData.matchDate,
          venue: validatedData.venue,
          status: "COMPLETED",
          result: validatedData.result,
          homeTeamRuns: validatedData.homeTeamRuns,
          homeTeamWickets: validatedData.homeTeamWickets,
          homeTeamOvers: validatedData.homeTeamOvers,
          awayTeamRuns: validatedData.awayTeamRuns,
          awayTeamWickets: validatedData.awayTeamWickets,
          awayTeamOvers: validatedData.awayTeamOvers
        });
        teamMatchId = teamMatch?.id;
      } else if (validatedData.homeTeamId || validatedData.awayTeamId) {
        console.log('Mixed team scenario - skipping formal team match creation but processing individual stats and team statistics');
      }

      // 2. Process each player's performance
      for (const performance of validatedData.playerPerformances) {
        // Skip players without user accounts
        if (!performance.userId) {
          console.log(`Skipping player ${performance.playerName} - no user account`);
          continue;
        }

        try {
          // Track original teamId for guest player scenarios
          const originalTeamId = performance.teamId;
          let isTeamMember = false;

          // Validate team membership if player belongs to a database team
          if (performance.teamId) {
            isTeamMember = await storage.isTeamMember(performance.teamId, performance.userId);
            if (!isTeamMember) {
              console.log(`Player ${performance.playerName} is not a formal member of team ${performance.teamId} - treating as guest player`);
              console.log(`Guest player will still contribute to team statistics but not formal team match records`);
              // Keep teamId for team statistics calculation, but mark as guest
              // performance.teamId stays as is for team stats calculation
            } else {
              console.log(`Player ${performance.playerName} is a validated member of team ${performance.teamId}`);
            }
          }

          // Ensure player has career stats
          const careerStats = await storage.ensureCareerStats(performance.userId);
          if (!careerStats) {
            results.push({
              userId: performance.userId,
              playerName: performance.playerName,
              status: "error",
              message: "Could not initialize career stats"
            });
            continue;
          }

          // Determine if this player is man of the match
          const isManOfTheMatch = manOfTheMatchResult &&
            (manOfTheMatchResult.playerId === performance.userId ||
              (manOfTheMatchResult.playerName === performance.playerName && !manOfTheMatchResult.playerId));

          // Create team match player record ONLY if:
          // 1. We created a formal team match AND
          // 2. Player has a teamId (database team) AND  
          // 3. Player is a formal team member (not guest)
          let teamMatchPlayerId = null;
          if (teamMatchId && performance.teamId && isTeamMember) {
            const teamMatchPlayer = await storage.createTeamMatchPlayer({
              teamMatchId: teamMatchId,
              userId: performance.userId,
              teamId: performance.teamId,
              runsScored: performance.runsScored,
              ballsFaced: performance.ballsFaced,
              wasDismissed: performance.wasDismissed,
              oversBowled: performance.oversBowled,
              runsConceded: performance.runsConceded,
              wicketsTaken: performance.wicketsTaken,
              catchesTaken: performance.catchesTaken
            });
            teamMatchPlayerId = teamMatchPlayer?.id;
            console.log(`Created team match player record for member ${performance.playerName}`);
          } else if (teamMatchId && performance.teamId && !isTeamMember) {
            console.log(`Skipping team match player record for guest player ${performance.playerName}`);
          }

          // ALWAYS create individual match record for career stats with both innings data
          const opponentName = performance.teamName === validatedData.homeTeamName
            ? validatedData.awayTeamName
            : validatedData.homeTeamName;

          const individualMatch = await storage.createMatch({
            userId: performance.userId,
            opponent: `vs ${opponentName}`,
            matchDate: validatedData.matchDate,
            runsScored: performance.runsScored,
            ballsFaced: performance.ballsFaced,
            wasDismissed: performance.wasDismissed,
            oversBowled: performance.oversBowled,
            runsConceded: performance.runsConceded,
            wicketsTaken: performance.wicketsTaken,
            catchesTaken: performance.catchesTaken,
            runOuts: performance.runOuts || 0,
            isManOfTheMatch: isManOfTheMatch || false
          });

          // Career stats are automatically updated by createMatch()

          results.push({
            userId: performance.userId,
            playerName: performance.playerName,
            teamMatchPlayerId,
            individualMatchId: individualMatch?.id,
            isTeamMember: isTeamMember,
            isGuestPlayer: !!originalTeamId && !isTeamMember,
            teamId: originalTeamId, // Keep original for debugging
            isManOfTheMatch: isManOfTheMatch || false,
            status: "success"
          });

        } catch (error) {
          console.error(`Error processing performance for ${performance.playerName}:`, error);
          results.push({
            userId: performance.userId,
            playerName: performance.playerName,
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      // 3. Update team statistics ONLY for database teams
      const statisticsUpdates: Promise<void>[] = [];
      const updatedTeamIds: string[] = [];

      if (validatedData.homeTeamId) {
        console.log(`Updating statistics for home team: ${validatedData.homeTeamId}`);
        statisticsUpdates.push(
          storage.calculateAndUpdateTeamStatistics(validatedData.homeTeamId!)
            .then(() => {
              updatedTeamIds.push(validatedData.homeTeamId!);
              console.log(`Successfully updated statistics for home team: ${validatedData.homeTeamId}`);
            })
            .catch(error => {
              console.error(`Failed to update statistics for home team ${validatedData.homeTeamId}:`, error);
              throw error;
            })
        );
      }

      if (validatedData.awayTeamId) {
        console.log(`Updating statistics for away team: ${validatedData.awayTeamId}`);
        statisticsUpdates.push(
          storage.calculateAndUpdateTeamStatistics(validatedData.awayTeamId!)
            .then(() => {
              updatedTeamIds.push(validatedData.awayTeamId!);
              console.log(`Successfully updated statistics for away team: ${validatedData.awayTeamId}`);
            })
            .catch(error => {
              console.error(`Failed to update statistics for away team ${validatedData.awayTeamId}:`, error);
              throw error;
            })
        );
      }

      // Execute team statistics updates
      let teamStatsError = null;
      if (statisticsUpdates.length > 0) {
        try {
          await Promise.all(statisticsUpdates);
          console.log(`Team statistics updated for ${updatedTeamIds.length} teams:`, updatedTeamIds);
        } catch (error) {
          console.error('Error updating team statistics:', error);
          teamStatsError = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      const scenario = getMatchScenario(validatedData);
      console.log(`Match processing completed. Scenario: ${scenario}, Players processed: ${results.length}`);

      res.json({
        message: "Team match results processed successfully",
        scenario,
        teamMatchId,
        results,
        playersProcessed: results.length,
        updatedTeamIds,
        teamsUpdated: updatedTeamIds.length,
        teamStatsError,
        manOfTheMatch: manOfTheMatchResult
      });

    } catch (error) {
      console.error('Team match results error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return handleDatabaseError(error, res);
    }
  });

  // Helper function to identify the match scenario
  function getMatchScenario(data: any): string {
    const hasHomeTeam = !!data.homeTeamId;
    const hasAwayTeam = !!data.awayTeamId;

    if (hasHomeTeam && hasAwayTeam) {
      return "both_teams_from_database";
    } else if (hasHomeTeam && !hasAwayTeam) {
      return "only_home_team_from_database";
    } else if (!hasHomeTeam && hasAwayTeam) {
      return "only_away_team_from_database";
    } else {
      return "both_teams_local";
    }
  }

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
        runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false, isRetired: false, canReturn: false
      }));
      initialState.team2Batting = validatedData.opponentTeamPlayers.map((p: any) => ({
        id: p.id || Math.random().toString(36).substring(7),
        name: p.name,
        runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false, isRetired: false, canReturn: false
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

  // Search users for spectators
  app.get("/api/users/search", authenticateToken, async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query parameter 'q' required" });
      }

      if (q.trim().length < 3) {
        return res.status(400).json({ message: "Search query must be at least 3 characters" });
      }

      const users = await storage.searchUsers(q.trim());
      res.json(users);
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

  // --- Stats & Guest Linking Routes ---

  app.post("/api/teams/:id/guest-players", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, role } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      const team = await storage.getTeam(id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Check permissions - allow captain, vice-captain, or any team member to add guests
      const isCaptainOrVice = team.captainId === req.userId || team.viceCaptainId === req.userId;
      const isTeamMember = await storage.isTeamMember(id, req.userId);

      if (!isCaptainOrVice && !isTeamMember) {
        return res.status(403).json({ message: "Not authorized to add guest players to this team" });
      }

      const guest = await storage.createGuestPlayer({
        teamId: id,
        name,
        addedByUserId: req.userId,
        matchesPlayed: 0,
        totalRuns: 0,
        ballsFaced: 0,
        oversBowled: 0,
        runsConceded: 0,
        wicketsTaken: 0,
        catchesTaken: 0,
        runOuts: 0,
        fours: 0,
        sixes: 0
      });

      res.status(201).json(guest);
    } catch (error) {
      // Check for unique constraint violation if relevant
      return handleDatabaseError(error, res);
    }
  });

  // Submit match results and update stats
  app.post("/api/matches/submit-result", async (req, res) => {
    try {
      const matchData = req.body;

      // Basic validation
      if (!matchData.homeTeamName || !matchData.awayTeamName) {
        return res.status(400).json({ error: 'Team names are required' });
      }

      console.log('[Routes] Processing match result:', matchData.homeTeamName, 'vs', matchData.awayTeamName);

      // Process match using stats service
      const result = await statsService.processMatchResult(matchData);

      res.json(result);
    } catch (error) {
      console.error('[Routes] Stats submission error:', error);
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

  // Get user career stats by userId
  app.get("/api/stats/:userId", authenticateToken, async (req: any, res) => {
    try {
      const { userId } = req.params;

      // Get user to check if exists and get career stats
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          careerStats: true
        }
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.careerStats) {
        // Return default empty stats
        return res.json({
          matchesPlayed: 0,
          totalRuns: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          highestScore: 0,
          oversBowled: 0,
          runsConceded: 0,
          wicketsTaken: 0,
          bestBowling: null,
          catches: 0,
          runOuts: 0,
          manOfTheMatch: 0,
          timesOut: 0,
        });
      }

      res.json(user.careerStats);
    } catch (error) {
      console.error("Get user stats error:", error);
      return handleDatabaseError(error, res);
    }
  });

  // Get user match history by userId
  app.get("/api/matches/:userId", authenticateToken, async (req: any, res) => {
    try {
      const { userId } = req.params;

      // Get match history for the user
      const matchHistory = await prisma.playerMatchHistory.findMany({
        where: { userId },
        include: {
          matchSummary: true
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      // Return match summaries
      const matches = matchHistory.map(h => h.matchSummary);
      res.json(matches);
    } catch (error) {
      console.error("Get user matches error:", error);
      return handleDatabaseError(error, res);
    }
  });

  // Get match summary by ID (for Match Centre)
  app.get("/api/match-summary/:id", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;

      const matchSummary = await prisma.matchSummary.findUnique({
        where: { id },
        include: {
          manOfTheMatchUser: {
            select: {
              id: true,
              username: true,
            }
          }
        }
      });

      if (!matchSummary) {
        return res.status(404).json({ message: "Match not found" });
      }

      res.json(matchSummary);
    } catch (error) {
      console.error("Get match summary error:", error);
      return handleDatabaseError(error, res);
    }
  });

  // Get user match history with pagination
  app.get("/api/user-match-history/:userId", authenticateToken, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // Get total count
      const total = await prisma.playerMatchHistory.count({
        where: { userId }
      });

      // Get match history for the user with pagination
      const matchHistory = await prisma.playerMatchHistory.findMany({
        where: { userId },
        include: {
          matchSummary: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });

      res.json({
        matches: matchHistory.map(h => ({
          matchSummary: h.matchSummary,
          userPerformance: {
            runs: h.runsScored,
            balls: h.ballsFaced,
            wickets: h.wicketsTaken,
            overs: h.oversBowled,
            runsConceded: h.runsConceded,
          }
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Get user match history error:", error);
      return handleDatabaseError(error, res);
    }
  });
  app.get("/api/user-match-history-disabled/:userId", authenticateToken, async (req: any, res) => {
    res.status(404).json({ message: "Stats system decommissioned" });
  });

  // Get team statistics - Stats decommissioned
  app.get("/api/teams/:id/statistics-disabled", authenticateToken, async (req: any, res) => {
    res.status(404).json({ message: "Stats system decommissioned" });
  });

  // ============================================================
  // Phase 9: Location-Based Match Invites
  // ============================================================

  // --- Ground CRUD ---

  // Create ground
  app.post("/api/grounds", authenticateToken, async (req: any, res) => {
    try {
      const { teamId, groundName, latitude, longitude, address, isFavorite } = req.body;
      if (!teamId || !groundName || latitude == null || longitude == null) {
        return res.status(400).json({ message: "teamId, groundName, latitude, longitude are required" });
      }
      // Verify user is captain/creator of the team
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || (team.createdById !== req.userId && team.captainId !== req.userId)) {
        return res.status(403).json({ message: "Only team creator or captain can add grounds" });
      }
      const ground = await prisma.ground.create({
        data: { teamId, groundName, latitude, longitude, address, isFavorite: isFavorite || false, createdBy: req.userId }
      });
      res.status(201).json(ground);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // List grounds for a team
  app.get("/api/grounds", authenticateToken, async (req: any, res) => {
    try {
      const { teamId } = req.query;
      if (!teamId) return res.status(400).json({ message: "teamId query is required" });
      const grounds = await prisma.ground.findMany({
        where: { teamId: teamId as string },
        orderBy: [{ isFavorite: 'desc' }, { groundName: 'asc' }]
      });
      res.json(grounds);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Update ground
  app.put("/api/grounds/:id", authenticateToken, async (req: any, res) => {
    try {
      const ground = await prisma.ground.findUnique({ where: { id: req.params.id }, include: { team: true } });
      if (!ground) return res.status(404).json({ message: "Ground not found" });
      if (ground.team.createdById !== req.userId && ground.team.captainId !== req.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const updated = await prisma.ground.update({
        where: { id: req.params.id },
        data: req.body
      });
      res.json(updated);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Delete ground (blocked if active invites)
  app.delete("/api/grounds/:id", authenticateToken, async (req: any, res) => {
    try {
      const ground = await prisma.ground.findUnique({
        where: { id: req.params.id },
        include: { team: true, invites: { where: { status: 'OPEN' } } }
      });
      if (!ground) return res.status(404).json({ message: "Ground not found" });
      if (ground.team.createdById !== req.userId && ground.team.captainId !== req.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (ground.invites.length > 0) {
        return res.status(409).json({ message: "Cannot delete ground with active invites" });
      }
      await prisma.ground.delete({ where: { id: req.params.id } });
      res.json({ message: "Ground deleted" });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // --- Match Invites ---

  // Create invite
  app.post("/api/invites", authenticateToken, async (req: any, res) => {
    try {
      const { teamId, groundId, matchDate, matchTime, overs, description, expiresAt } = req.body;
      if (!teamId || !groundId || !matchDate || !matchTime) {
        return res.status(400).json({ message: "teamId, groundId, matchDate, matchTime are required" });
      }
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || (team.createdById !== req.userId && team.captainId !== req.userId)) {
        return res.status(403).json({ message: "Only team captain or creator can create invites" });
      }
      const invite = await prisma.matchInvite.create({
        data: {
          teamId, groundId, createdBy: req.userId,
          matchDate: new Date(matchDate), matchTime,
          overs: overs || 10, description,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        },
        include: { team: true, ground: true, responses: true }
      });
      res.status(201).json(invite);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // List nearby invites (with distance filtering)
  app.get("/api/invites", authenticateToken, async (req: any, res) => {
    try {
      const { lat, lon, radius } = req.query;
      const userLat = parseFloat(lat as string);
      const userLon = parseFloat(lon as string);
      const radiusKm = parseFloat(radius as string) || 50; // default 50km

      // Fetch all open invites with ground coordinates
      const invites = await prisma.matchInvite.findMany({
        where: {
          status: 'OPEN',
          matchDate: { gte: new Date() } // Only future matches
        },
        include: {
          team: { select: { id: true, name: true, logoUrl: true } },
          ground: true,
          creator: { select: { id: true, username: true, profileName: true } },
          responses: {
            include: {
              fromUser: { select: { id: true, username: true, profileName: true } }
            }
          }
        },
        orderBy: { matchDate: 'asc' }
      });

      // If user provided location, filter by distance
      if (!isNaN(userLat) && !isNaN(userLon)) {
        const { filterByDistance } = await import("./services/locationService.js");
        // Map invites to have lat/lon at top level for filtering
        const invitesWithCoords = invites.map(inv => ({
          ...inv,
          latitude: inv.ground.latitude,
          longitude: inv.ground.longitude
        }));
        const filtered = filterByDistance(invitesWithCoords, userLat, userLon, radiusKm);
        return res.json(filtered);
      }

      res.json(invites);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Get single invite detail
  app.get("/api/invites/:id", authenticateToken, async (req: any, res) => {
    try {
      const invite = await prisma.matchInvite.findUnique({
        where: { id: req.params.id },
        include: {
          team: { select: { id: true, name: true, logoUrl: true } },
          ground: true,
          creator: { select: { id: true, username: true, profileName: true } },
          responses: {
            include: {
              fromUser: { select: { id: true, username: true, profileName: true } }
            }
          }
        }
      });
      if (!invite) return res.status(404).json({ message: "Invite not found" });
      res.json(invite);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Respond to invite
  app.post("/api/invites/:id/respond", authenticateToken, async (req: any, res) => {
    try {
      const { responseType, message, fromTeamId, fromTeamName } = req.body;
      if (!responseType) return res.status(400).json({ message: "responseType is required" });

      const invite = await prisma.matchInvite.findUnique({ where: { id: req.params.id } });
      if (!invite) return res.status(404).json({ message: "Invite not found" });
      if (invite.status !== 'OPEN') return res.status(400).json({ message: "Invite is no longer open" });

      // Check if user already responded
      const existing = await prisma.inviteResponse.findFirst({
        where: { inviteId: req.params.id, fromUserId: req.userId }
      });
      if (existing) {
        // Update existing response
        const updated = await prisma.inviteResponse.update({
          where: { id: existing.id },
          data: { responseType, message, fromTeamId, fromTeamName }
        });
        return res.json(updated);
      }

      const response = await prisma.inviteResponse.create({
        data: {
          inviteId: req.params.id, fromUserId: req.userId,
          responseType, message, fromTeamId, fromTeamName
        },
        include: { fromUser: { select: { id: true, username: true, profileName: true } } }
      });
      res.status(201).json(response);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Confirm invite (creator only)
  app.post("/api/invites/:id/confirm", authenticateToken, async (req: any, res) => {
    try {
      const invite = await prisma.matchInvite.findUnique({ where: { id: req.params.id } });
      if (!invite) return res.status(404).json({ message: "Invite not found" });
      if (invite.createdBy !== req.userId) return res.status(403).json({ message: "Only invite creator can confirm" });

      const updated = await prisma.matchInvite.update({
        where: { id: req.params.id },
        data: { status: 'CONFIRMED' },
        include: { team: true, ground: true, responses: true }
      });
      res.json(updated);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Cancel invite (creator only)
  app.delete("/api/invites/:id", authenticateToken, async (req: any, res) => {
    try {
      const invite = await prisma.matchInvite.findUnique({ where: { id: req.params.id } });
      if (!invite) return res.status(404).json({ message: "Invite not found" });
      if (invite.createdBy !== req.userId) return res.status(403).json({ message: "Only invite creator can cancel" });

      await prisma.matchInvite.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' }
      });
      res.json({ message: "Invite cancelled" });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Update user home location
  app.put("/api/users/location", authenticateToken, async (req: any, res) => {
    try {
      const { latitude, longitude } = req.body;
      if (latitude == null || longitude == null) {
        return res.status(400).json({ message: "latitude and longitude are required" });
      }
      const updated = await prisma.user.update({
        where: { id: req.userId },
        data: { homeLatitude: latitude, homeLongitude: longitude }
      });
      res.json({ homeLatitude: updated.homeLatitude, homeLongitude: updated.homeLongitude });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });
  // ============================================================
  // Phase 10: Messaging System
  // ============================================================

  // List user's conversations with last message & unread count
  app.get("/api/conversations", authenticateToken, async (req: any, res) => {
    try {
      const memberships = await prisma.conversationMember.findMany({
        where: { userId: req.userId },
        include: {
          conversation: {
            include: {
              members: {
                include: { user: { select: { id: true, username: true, profileName: true, profilePictureUrl: true } } }
              },
              messages: {
                where: { isDeleted: false },
                take: 1,
                orderBy: { createdAt: 'desc' },
                include: { sender: { select: { id: true, profileName: true } } }
              }
            }
          }
        },
        orderBy: { conversation: { updatedAt: 'desc' } }
      });

      const conversations = memberships.map(m => {
        const conv = m.conversation;
        const lastMessage = conv.messages[0] || null;
        const unreadCount = 0; // Will be computed below
        return { ...conv, lastMessage, unreadCount, myMembership: { lastReadAt: m.lastReadAt, isMuted: m.isMuted } };
      });

      // Compute unread counts
      for (const conv of conversations) {
        const membership = memberships.find(m => m.conversationId === conv.id);
        if (membership) {
          conv.unreadCount = await prisma.message.count({
            where: {
              conversationId: conv.id,
              createdAt: { gt: membership.lastReadAt },
              senderId: { not: req.userId },
              isDeleted: false
            }
          });
        }
      }

      res.json(conversations);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Get or create DM conversation
  app.post("/api/conversations/direct/:userId", authenticateToken, async (req: any, res) => {
    try {
      const otherUserId = req.params.userId;
      if (otherUserId === req.userId) return res.status(400).json({ message: "Cannot message yourself" });

      const { getOrCreateDirectConversation } = await import("./services/messageService.js");
      const conversation = await getOrCreateDirectConversation(req.userId, otherUserId);
      res.json(conversation);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Get or create Team conversation
  app.post("/api/conversations/team/:teamId", authenticateToken, async (req: any, res) => {
    try {
      const team = await prisma.team.findUnique({ where: { id: req.params.teamId } });
      if (!team) return res.status(404).json({ message: "Team not found" });

      // Verify user is a member of the team
      const isMember = await prisma.teamMember.findFirst({
        where: { teamId: req.params.teamId, userId: req.userId }
      });
      const isCreator = team.createdById === req.userId;
      if (!isMember && !isCreator) return res.status(403).json({ message: "Not a team member" });

      const { getOrCreateTeamConversation } = await import("./services/messageService.js");
      const conversation = await getOrCreateTeamConversation(req.params.teamId, team.name, team.logoUrl || undefined);
      res.json(conversation);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Get or create Invite conversation
  app.post("/api/conversations/invite/:inviteId", authenticateToken, async (req: any, res) => {
    try {
      const { getOrCreateInviteConversation } = await import("./services/messageService.js");
      const conversation = await getOrCreateInviteConversation(req.params.inviteId, req.userId);
      res.json(conversation);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Get paginated messages for a conversation
  app.get("/api/conversations/:id/messages", authenticateToken, async (req: any, res) => {
    try {
      // Verify user is member
      const membership = await prisma.conversationMember.findFirst({
        where: { conversationId: req.params.id, userId: req.userId }
      });
      if (!membership) return res.status(403).json({ message: "Not a member of this conversation" });

      const cursor = req.query.cursor as string | undefined;
      const limit = parseInt(req.query.limit as string) || 30;

      const messages = await prisma.message.findMany({
        where: { conversationId: req.params.id },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, username: true, profileName: true, profilePictureUrl: true } },
          reactions: {
            include: { user: { select: { id: true, profileName: true } } }
          }
        }
      });

      const hasMore = messages.length > limit;
      if (hasMore) messages.pop();

      res.json({ messages, hasMore, nextCursor: messages.length > 0 ? messages[messages.length - 1].id : null });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Send a message
  app.post("/api/conversations/:id/messages", authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.conversationMember.findFirst({
        where: { conversationId: req.params.id, userId: req.userId }
      });
      if (!membership) return res.status(403).json({ message: "Not a member of this conversation" });

      const { content, type, mediaData, replyToId } = req.body;
      if (!content && !mediaData) return res.status(400).json({ message: "Message content or media is required" });

      let mediaUrl: string | null = null;

      // Handle media upload (base64 image/audio)
      if (mediaData && (type === 'IMAGE' || type === 'AUDIO')) {
        const { uploadImage } = await import("./services/cloudinary.js");
        const folder = type === 'IMAGE' ? 'chat-images' : 'chat-audio';
        const result = await uploadImage(mediaData, folder);
        mediaUrl = result.url;
      }

      const message = await prisma.message.create({
        data: {
          conversationId: req.params.id,
          senderId: req.userId,
          type: type || 'TEXT',
          content: content || null,
          mediaUrl,
          replyToId: replyToId || null
        },
        include: {
          sender: { select: { id: true, username: true, profileName: true, profilePictureUrl: true } },
          reactions: true
        }
      });

      // Update conversation updatedAt
      await prisma.conversation.update({
        where: { id: req.params.id },
        data: { updatedAt: new Date() }
      });

      res.status(201).json(message);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Mark conversation as read
  app.post("/api/conversations/:id/read", authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.conversationMember.findFirst({
        where: { conversationId: req.params.id, userId: req.userId }
      });
      if (!membership) return res.status(403).json({ message: "Not a member" });

      await prisma.conversationMember.update({
        where: { id: membership.id },
        data: { lastReadAt: new Date() }
      });

      res.json({ success: true });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Add/remove emoji reaction
  app.post("/api/messages/:id/react", authenticateToken, async (req: any, res) => {
    try {
      const { emoji } = req.body;
      if (!emoji) return res.status(400).json({ message: "emoji is required" });

      // Check if user already reacted with this emoji
      const existing = await prisma.messageReaction.findFirst({
        where: { messageId: req.params.id, userId: req.userId, emoji }
      });

      if (existing) {
        // Toggle off
        await prisma.messageReaction.delete({ where: { id: existing.id } });
        return res.json({ removed: true, emoji });
      }

      // Add reaction
      const reaction = await prisma.messageReaction.create({
        data: { messageId: req.params.id, userId: req.userId, emoji },
        include: { user: { select: { id: true, profileName: true } } }
      });
      res.status(201).json(reaction);
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  // Delete own message (soft delete)
  app.delete("/api/messages/:id", authenticateToken, async (req: any, res) => {
    try {
      const message = await prisma.message.findUnique({ where: { id: req.params.id } });
      if (!message) return res.status(404).json({ message: "Message not found" });
      if (message.senderId !== req.userId) return res.status(403).json({ message: "Can only delete your own messages" });

      await prisma.message.update({
        where: { id: req.params.id },
        data: { isDeleted: true, content: null, mediaUrl: null }
      });
      res.json({ deleted: true });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
