import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import http from 'http';
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
import { errorHandler } from './middlewares/errorHandler.js';
import { initSocket } from './socket/index.js';

dotenv.config();

import { globalLimiter } from './middlewares/rateLimit.js';

// Global Rate Limiter
// const limiter = rateLimit({ ... }); // Removed old in-memory limiter

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Proxy (Required for Rate Limiting behind load balancers/cloud)
app.set('trust proxy', 1);

// Create HTTP Server
const httpServer = http.createServer(app);

// Initialize Socket.io
initSocket(httpServer);

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*', // Allow all in dev, specific in prod
    credentials: true,
}));
app.use(morgan('dev'));
app.use(globalLimiter); // Apply Redis-backed rate limiting
app.use(express.json()); // Essential for parsing JSON bodies

// Routes
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', teamRoutes);
app.use('/api', matchRoutes);
app.use('/api', scoringRoutes);
app.use('/api', matchFinalizationRoutes);
app.use('/api', statsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/grounds', groundRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/user/locations', locationRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/public/v1', publicRoutes);

// Phase 11: Productization routes
app.use('/api', hubRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/archive', archiveRoutes);

import deviceRoutes from './routes/deviceRoutes.js';
app.use('/api/devices', deviceRoutes);

import notificationRoutes from './routes/notificationRoutes.js';
app.use('/api/notifications', notificationRoutes);

import { initPushListener } from './listeners/pushListener.js';
initPushListener();

import { initProximityListener } from './listeners/proximityListener.js';
initProximityListener();

// Global Error Handler
app.use(errorHandler);

import { messageScheduler } from './scheduler/messageScheduler.js';

// Start Server
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    messageScheduler.start();
});

export default app;
