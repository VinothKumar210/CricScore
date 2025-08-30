import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { prisma } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Function to verify database connection
async function verifyDatabaseConnection() {
  try {
    log("Verifying MongoDB connection...");
    
    // Test connection by connecting to Prisma
    await prisma.$connect();
    
    // For MongoDB, we can test by trying to count documents or find first
    // This is a lightweight operation that tests the connection
    const result = await prisma.user.count();
    log(`✓ MongoDB connection successful - found ${result} users`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`✗ MongoDB connection failed: ${errorMessage}`);
    
    // Check if it's an authentication error
    if (errorMessage.includes('authentication failed') || errorMessage.includes('bad auth')) {
      log("Error: MongoDB authentication failed. Please verify your DATABASE_URL credentials.");
    }
    
    log("Warning: Starting server without database connection. Some features may not work.");
    return false;
  } finally {
    // Always disconnect after testing to avoid hanging connections
    await prisma.$disconnect().catch(() => {});
  }
}

(async () => {
  // Verify database connection before starting the server
  await verifyDatabaseConnection();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
