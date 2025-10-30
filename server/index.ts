import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { prisma } from "./db";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Prevent HTML caching in development to fix preview refresh issues
if (app.get("env") === "development") {
  app.use((req, res, next) => {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
    }
    next();
  });
}

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
    
    // Check for specific MongoDB errors
    if (errorMessage.includes('authentication failed') || errorMessage.includes('bad auth')) {
      log("Error: MongoDB authentication failed. Please verify your DATABASE_URL credentials.");
    } else if (errorMessage.includes('empty database name not allowed')) {
      log("Error: DATABASE_URL is missing database name. Please add '/database_name' to your connection string.");
      log("Example: mongodb+srv://user:pass@cluster.mongodb.net/your_database_name?options");
    } else if (errorMessage.includes('ConnectorError')) {
      log("Error: MongoDB connection error. Please check your DATABASE_URL configuration.");
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
  
  // Add nuclear cache-clearing endpoint for development
  if (app.get("env") === "development") {
    app.get('/__nuke', (req, res) => {
      const timestamp = Date.now();
      res.set('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Cache Nuke</title></head>
        <body>
          <h3>🧹 Clearing all caches...</h3>
          <script>
            (async () => {
              console.log('🧹 Nuclear cache clearing started...');
              
              // Unregister all service workers
              if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                  await registration.unregister();
                  console.log('🗑️ Unregistered SW:', registration.scope);
                }
              }
              
              // Clear all caches
              if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                  await caches.delete(cacheName);
                  console.log('🗑️ Deleted cache:', cacheName);
                }
              }
              
              // Clear storage
              localStorage.clear();
              sessionStorage.clear();
              
              console.log('✅ Cache clearing complete! Redirecting...');
              
              // Redirect to fresh path
              setTimeout(() => {
                location.replace('/__rpv_${timestamp}/');
              }, 500);
            })();
          </script>
        </body>
        </html>
      `);
    });
  }

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
