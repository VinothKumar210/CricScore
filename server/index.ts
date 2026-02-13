import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { log } from "./logging";
import { serveStatic } from "./static";
import { prisma } from "./db";

const app = express();

const SEPARATE_MODE = process.env.SEPARATE_MODE === "true" || process.env.NODE_ENV === "production";

// ... (keep middleware and log logic same)

if (!SEPARATE_MODE) {
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
} else {
  log("Running in SEPARATE MODE - frontend on port 3000, backend on port 5000");
}
const port = parseInt(process.env.PORT || '5000', 10);
server.listen(port, "0.0.0.0", () => {
  log(`serving on port ${port}`);
});
}) ();
