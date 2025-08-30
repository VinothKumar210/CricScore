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
      res.status(201).json(team);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/teams/:id/members", authenticateToken, async (req, res) => {
    try {
      const members = await storage.getTeamMembers(req.params.id);
      res.json(members);
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

  const httpServer = createServer(app);
  return httpServer;
}
