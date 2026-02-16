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
import { errorHandler } from './middlewares/errorHandler.js';
import { initSocket } from './socket/index.js';

dotenv.config();

import rateLimit from 'express-rate-limit';

// Global Rate Limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const app = express();
const PORT = process.env.PORT || 5000;

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
app.use(limiter); // Apply rate limiting
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

// Global Error Handler
app.use(errorHandler);

// Start Server
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
