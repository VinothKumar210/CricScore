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
  log("Skipping MongoDB connection verification for development...");
  log("Warning: Starting server without database connection. Some features may not work.");
  return false;
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

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`serving on port ${port}`);
    });
})();
