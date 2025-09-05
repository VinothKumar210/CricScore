import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, profileSetupSchema, insertMatchSchema, insertTeamSchema, insertTeamInvitationSchema, liveMatchFormSchema, insertLiveMatchBallSchema } from "@shared/schema";
import { z } from "zod";

// Global type declaration for push subscriptions
declare global {
  var pushSubscriptions: Map<string, any> | undefined;
}

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

// WebSocket connections for live matches
const liveMatchConnections = new Map<string, Set<WebSocket>>();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Function to broadcast live match updates
  const broadcastLiveMatchUpdate = (matchId: string, update: any) => {
    const connections = liveMatchConnections.get(matchId);
    if (connections) {
      const message = JSON.stringify(update);
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  };
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

  // Live match endpoints
  app.post("/api/live-matches", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = liveMatchFormSchema.parse(req.body);
      
      const liveMatchData = {
        ...validatedData,
        creatorId: req.userId,
        matchDate: new Date(validatedData.matchDate),
      };

      const liveMatch = await storage.createLiveMatch(liveMatchData);
      
      // TODO: Send push notifications to spectators
      // This will be implemented in the next task
      
      res.status(201).json(liveMatch);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/live-matches", authenticateToken, async (req: any, res) => {
    try {
      const liveMatches = await storage.getLiveMatchesByCreator(req.userId);
      res.json(liveMatches);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/live-matches/:id", async (req, res) => {
    try {
      const liveMatch = await storage.getLiveMatch(req.params.id);
      if (!liveMatch) {
        return res.status(404).json({ message: "Live match not found" });
      }
      res.json(liveMatch);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/live-matches/:id", authenticateToken, async (req: any, res) => {
    try {
      const liveMatch = await storage.getLiveMatch(req.params.id);
      if (!liveMatch) {
        return res.status(404).json({ message: "Live match not found" });
      }
      
      if (liveMatch.creatorId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to update this match" });
      }

      const updatedMatch = await storage.updateLiveMatch(req.params.id, req.body);
      
      // Broadcast the update to all connected clients
      broadcastLiveMatchUpdate(req.params.id, {
        type: 'match_update',
        match: updatedMatch
      });
      
      res.json(updatedMatch);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/live-matches/:id/balls", authenticateToken, async (req: any, res) => {
    try {
      const liveMatch = await storage.getLiveMatch(req.params.id);
      if (!liveMatch) {
        return res.status(404).json({ message: "Live match not found" });
      }
      
      if (liveMatch.creatorId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to score this match" });
      }

      const validatedData = insertLiveMatchBallSchema.parse({
        ...req.body,
        liveMatchId: req.params.id,
      });

      const ball = await storage.addLiveMatchBall(validatedData);
      
      // Update match current score based on the ball
      const currentScore = liveMatch.currentScore || { runs: 0, wickets: 0, overs: 0, ballsInOver: 0 };
      const newScore = {
        runs: currentScore.runs + validatedData.runs,
        wickets: currentScore.wickets + (validatedData.isWicket ? 1 : 0),
        overs: validatedData.overNumber - 1,
        ballsInOver: validatedData.ballInOver,
      };

      // Update the match with new score
      await storage.updateLiveMatch(req.params.id, {
        currentScore: newScore
      });

      // Broadcast the ball-by-ball update to all connected clients
      broadcastLiveMatchUpdate(req.params.id, {
        type: 'ball_update',
        ball,
        currentScore: newScore,
        match: await storage.getLiveMatch(req.params.id)
      });
      
      res.status(201).json({ ball, currentScore: newScore });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/live-matches/:id/balls", async (req, res) => {
    try {
      const balls = await storage.getLiveMatchBalls(req.params.id);
      res.json(balls);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/live-matches/:id/spectators", async (req, res) => {
    try {
      const spectators = await storage.getLiveMatchSpectators(req.params.id);
      res.json(spectators);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Push notification subscription endpoints
  app.post("/api/push/subscribe", authenticateToken, async (req: any, res) => {
    try {
      const { subscription, username } = req.body;
      
      if (!subscription || !username) {
        return res.status(400).json({ message: "Subscription and username are required" });
      }

      // For now, store in memory (in production, this would be in database)
      if (!globalThis.pushSubscriptions) {
        globalThis.pushSubscriptions = new Map();
      }
      
      globalThis.pushSubscriptions.set(username, subscription);
      console.log(`Push subscription registered for user: ${username}`);
      
      res.json({ message: "Subscription registered successfully" });
    } catch (error) {
      console.error("Error registering push subscription:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/push/unsubscribe", authenticateToken, async (req: any, res) => {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      if (globalThis.pushSubscriptions) {
        globalThis.pushSubscriptions.delete(username);
        console.log(`Push subscription removed for user: ${username}`);
      }
      
      res.json({ message: "Subscription removed successfully" });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Send push notifications to spectators
  app.post("/api/live-matches/:id/notify", authenticateToken, async (req: any, res) => {
    try {
      const liveMatch = await storage.getLiveMatch(req.params.id);
      if (!liveMatch) {
        return res.status(404).json({ message: "Live match not found" });
      }
      
      if (liveMatch.creatorId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to send notifications for this match" });
      }

      const { title, body, data } = req.body;
      const notificationsSent = [];
      const errors = [];

      // Get push subscriptions for spectators
      if (globalThis.pushSubscriptions) {
        for (const username of liveMatch.spectatorUsernames) {
          const subscription = globalThis.pushSubscriptions.get(username);
          if (subscription) {
            try {
              // In a real implementation, you would use a library like web-push to send notifications
              // For now, we'll just log that we would send the notification
              console.log(`Would send push notification to ${username}:`, {
                title: title || `${liveMatch.matchName} Started!`,
                body: body || `Live match between ${liveMatch.myTeamName} vs ${liveMatch.opponentTeamName} has started`,
                data: {
                  matchId: liveMatch.id,
                  ...data
                }
              });
              
              notificationsSent.push(username);
              
              // Mark spectator as notified
              await storage.updateSpectatorNotification(liveMatch.id, username, true);
              
            } catch (error) {
              console.error(`Error sending notification to ${username}:`, error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              errors.push({ username, error: errorMessage });
            }
          } else {
            console.log(`No push subscription found for user: ${username}`);
            errors.push({ username, error: 'No push subscription found' });
          }
        }
      }

      res.json({
        message: "Notifications processed",
        sent: notificationsSent.length,
        errors: errors.length,
        details: {
          notificationsSent,
          errors
        }
      });
      
    } catch (error) {
      console.error("Error sending push notifications:", error);
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

  // Local match results endpoint - handles comprehensive match data from scoreboard
  app.post("/api/local-match-results", async (req, res) => {
    console.log('Received local match results:', JSON.stringify(req.body, null, 2));
    try {
      const localMatchResultsSchema = z.object({
        matchName: z.string().min(1),
        venue: z.string().min(1),
        matchDate: z.string().transform(str => new Date(str)),
        myTeamPlayers: z.array(z.any()),
        opponentTeamPlayers: z.array(z.any()),
        finalScore: z.object({
          runs: z.number(),
          wickets: z.number(),
          overs: z.number()
        }),
        playerPerformances: z.array(z.object({
          userId: z.string().optional(),
          playerName: z.string(),
          runsScored: z.number().min(0),
          ballsFaced: z.number().min(0),
          oversBowled: z.number().min(0),
          runsConceded: z.number().min(0),
          wicketsTaken: z.number().min(0),
          catchesTaken: z.number().min(0),
          runOuts: z.number().min(0).optional()
        }))
      });

      const validatedData = localMatchResultsSchema.parse(req.body);
      const results = [];
      let playersWithAccounts = 0;

      // Process each player's performance
      for (const performance of validatedData.playerPerformances) {
        // Skip players without user accounts
        if (!performance.userId) {
          continue;
        }

        try {
          // Get user to verify they exist
          const user = await storage.getUser(performance.userId);
          if (!user) {
            results.push({
              userId: performance.userId,
              playerName: performance.playerName,
              status: "error",
              message: "User not found"
            });
            continue;
          }

          // Update career statistics directly without creating match record
          const currentStats = await storage.getCareerStats(performance.userId);
          if (currentStats) {
            const newMatchesPlayed = currentStats.matchesPlayed + 1;
            const newTotalRuns = currentStats.totalRuns + performance.runsScored;
            const newBallsFaced = currentStats.ballsFaced + performance.ballsFaced;
            const newHighestScore = Math.max((currentStats.highestScore || 0), performance.runsScored);
            const newOversBowled = currentStats.oversBowled + performance.oversBowled;
            const newRunsConceded = currentStats.runsConceded + performance.runsConceded;
            const newWicketsTaken = currentStats.wicketsTaken + performance.wicketsTaken;
            const newCatchesTaken = currentStats.catchesTaken + performance.catchesTaken;
            const newRunOuts = (currentStats.runOuts || 0) + (performance.runOuts || 0);

            // Calculate derived stats
            const strikeRate = newBallsFaced > 0 ? (newTotalRuns / newBallsFaced) * 100 : 0;
            // Convert cricket overs to decimal for proper economy calculation
            const convertOversToDecimal = (cricketOvers: number): number => {
              const wholeOvers = Math.floor(cricketOvers);
              const balls = Math.round((cricketOvers - wholeOvers) * 10);
              return wholeOvers + (balls / 6);
            };
            const decimalOversBowled = convertOversToDecimal(newOversBowled);
            const economy = decimalOversBowled > 0 ? newRunsConceded / decimalOversBowled : 0;

            await storage.updateCareerStats(performance.userId, {
              matchesPlayed: newMatchesPlayed,
              totalRuns: newTotalRuns,
              ballsFaced: newBallsFaced,
              strikeRate: parseFloat(strikeRate.toFixed(2)),
              highestScore: newHighestScore,
              oversBowled: parseFloat(newOversBowled.toFixed(1)),
              runsConceded: newRunsConceded,
              wicketsTaken: newWicketsTaken,
              economy: parseFloat(economy.toFixed(2)),
              catchesTaken: newCatchesTaken,
              runOuts: newRunOuts,
            });
          }

          playersWithAccounts++;
          results.push({
            userId: performance.userId,
            playerName: performance.playerName,
            status: "success",
            message: "Career stats updated successfully"
          });

        } catch (error) {
          console.error(`Error processing player ${performance.playerName}:`, error);
          results.push({
            userId: performance.userId,
            playerName: performance.playerName,
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      res.json({
        message: "Local match results processed successfully",
        playersWithAccounts,
        totalPlayers: validatedData.playerPerformances.length,
        results
      });

    } catch (error) {
      console.error('Local match results error:', error);
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
      
      const teams = await storage.searchTeams(q.trim());
      res.json(teams);
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
        playerPerformances,
        myTeamId,
        opponentTeamId
      } = req.body;

      // Basic validation
      if (!matchName || !venue || !matchDate || !myTeamPlayers || !opponentTeamPlayers || !playerPerformances) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check which teams are selected from database (have valid IDs)
      const hasMyTeamId = myTeamId && myTeamId.trim() !== '';
      const hasOpponentTeamId = opponentTeamId && opponentTeamId.trim() !== '';
      const isBothTeamsMatch = hasMyTeamId && hasOpponentTeamId;
      let teamMatchId: string | undefined;

      // Import man of the match calculation
      const { calculateManOfTheMatch } = require('../shared/man-of-the-match');

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
      
      // Handle team statistics based on which teams are selected from database
      try {
        // If both teams are selected from database, create full team match record
        if (isBothTeamsMatch) {
          // Determine match result based on final score
          let result: 'HOME_WIN' | 'AWAY_WIN' | 'DRAW' = 'HOME_WIN';
          
          // Create team match record
          const teamMatchData = {
            homeTeamId: myTeamId,
            awayTeamId: opponentTeamId,
            matchDate: new Date(matchDate),
            venue: venue,
            status: 'COMPLETED' as const,
            result: result,
            homeTeamRuns: finalScore?.runs || 0,
            homeTeamWickets: finalScore?.wickets || 0,
            homeTeamOvers: finalScore?.overs || 0,
            awayTeamRuns: 0, // You might want to calculate this from the match data
            awayTeamWickets: 0,
            awayTeamOvers: 0
          };
          
          const teamMatch = await storage.createTeamMatch(teamMatchData);
          teamMatchId = teamMatch.id;
          
          // Create team match player records for players who participated
          for (const performance of playerPerformances) {
            if (performance.userId) {
              // Determine which team this player belongs to
              const isMyTeamPlayer = myTeamPlayers.some((p: any) => p.userId === performance.userId);
              const teamId = isMyTeamPlayer ? myTeamId : opponentTeamId;
              
              const teamMatchPlayerData = {
                teamMatchId: teamMatch.id,
                userId: performance.userId,
                teamId: teamId,
                runsScored: parseInt(performance.runsScored) || 0,
                ballsFaced: parseInt(performance.ballsFaced) || 0,
                wasDismissed: false, // Default for local matches
                oversBowled: parseFloat(performance.oversBowled) || 0,
                runsConceded: parseInt(performance.runsConceded) || 0,
                wicketsTaken: parseInt(performance.wicketsTaken) || 0,
                catchesTaken: parseInt(performance.catchesTaken) || 0
              };
              
              await storage.createTeamMatchPlayer(teamMatchPlayerData);
            }
          }
        }
        
        // Update team statistics for My Team if it's selected from database
        if (hasMyTeamId) {
          await storage.calculateAndUpdateTeamStatistics(myTeamId);
        }
        
        // Update team statistics for Opponent Team if it's selected from database
        if (hasOpponentTeamId) {
          await storage.calculateAndUpdateTeamStatistics(opponentTeamId);
        }
        
      } catch (error) {
        console.error('Error processing team statistics:', error);
        // Don't fail the entire request if team processing fails
      }

      res.json({
        message: "Local match results processed",
        totalPlayers: playerPerformances.length,
        playersWithAccounts: results.length,
        successfulSaves: results.length,
        errorCount: errors.length,
        manOfTheMatch: manOfTheMatchResult,
        results,
        errors,
        teamMatch: isBothTeamsMatch ? { id: teamMatchId, myTeamId, opponentTeamId } : undefined,
        teamStatsUpdated: {
          myTeam: hasMyTeamId,
          opponentTeam: hasOpponentTeamId
        }
      });
    } catch (error) {
      console.error('Error processing local match results:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket server for live match updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'join_live_match' && data.matchId) {
          // Add connection to live match room
          if (!liveMatchConnections.has(data.matchId)) {
            liveMatchConnections.set(data.matchId, new Set());
          }
          liveMatchConnections.get(data.matchId)!.add(ws);
          
          // Store match ID on the WebSocket for cleanup
          (ws as any).liveMatchId = data.matchId;
          
          console.log(`Client joined live match: ${data.matchId}`);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove connection from live match room
      const matchId = (ws as any).liveMatchId;
      if (matchId && liveMatchConnections.has(matchId)) {
        liveMatchConnections.get(matchId)!.delete(ws);
        if (liveMatchConnections.get(matchId)!.size === 0) {
          liveMatchConnections.delete(matchId);
        }
      }
      console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  return httpServer;
}
