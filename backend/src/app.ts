// =============================================================================
// CricScore — Express Application Entry Point
// =============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import http from 'http';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
dotenv.config();

// ---------------------------------------------------------------------------
// Route Imports
// ---------------------------------------------------------------------------
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import scoringRoutes from './routes/scoringRoutes.js';
import matchFinalizationRoutes from './routes/matchFinalizationRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import groundRoutes from './routes/groundRoutes.js';
import inviteRoutes from './routes/inviteRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import tournamentRoutes from './routes/tournamentRoutes.js';
import apiKeyRoutes from './routes/apiKeyRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import hubRoutes from './routes/hubRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import archiveRoutes from './routes/archiveRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

// ---------------------------------------------------------------------------
// Infrastructure Imports
// ---------------------------------------------------------------------------
import { globalLimiter } from './middlewares/rateLimit.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { initSocket } from './socket/index.js';
import { initPushListener } from './listeners/pushListener.js';
import { initProximityListener } from './listeners/proximityListener.js';

// =============================================================================
// App & Server Setup
// =============================================================================

const app = express();
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

// Trust proxy (required for rate-limiting behind reverse proxies / cloud LBs)
app.set('trust proxy', 1);

// Initialize WebSocket layer
initSocket(httpServer);

// =============================================================================
// Middleware Stack (order matters)
// =============================================================================

// 1. Security headers
app.use(helmet());

// 2. CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));

// 3. Request logging
app.use(morgan('dev'));

// 4. Rate limiting (Redis-backed)
app.use(globalLimiter);

// 5. Body parser
app.use(express.json());

// =============================================================================
// Route Mounting
// =============================================================================

// --- Core API Routes ---
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', teamRoutes);
app.use('/api', matchRoutes);
app.use('/api', scoringRoutes);
app.use('/api', matchFinalizationRoutes);
app.use('/api', statsRoutes);
app.use('/api', hubRoutes);

// --- Namespaced API Routes ---
app.use('/api/messages', messageRoutes);
app.use('/api/grounds', groundRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/archive', archiveRoutes);

// --- User Sub-routes ---
app.use('/api/user/locations', locationRoutes);

// --- Public API (no auth) ---
app.use('/public/v1', publicRoutes);

// =============================================================================
// Event Listeners
// =============================================================================

initPushListener();
initProximityListener();

// =============================================================================
// Error Handling
// =============================================================================

// 404 — Catch unmatched routes
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Route not found`,
    });
});

// Global error handler (must be last)
app.use(errorHandler);

// =============================================================================
// Start Server
// =============================================================================

httpServer.listen(PORT, () => {
    console.log(`[CricScore] Server running on port ${PORT}`);
});

export default app;
