import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { FullscreenScoringLayout } from '../layouts/FullscreenScoringLayout';

import { LoginPage } from '../pages/auth/LoginPage';
import { HomePage } from '../pages/home/HomePage';
import { MarketPage } from '../pages/marketplace/MarketPage';
import { TeamsPage } from '../pages/teams/TeamsPage';
import { TeamDetailPage } from '../pages/teams/TeamDetailPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { MatchDetailPage } from '../pages/match/MatchDetailPage';
import { ScoringPage } from '../pages/match/ScoringPage';
import { TournamentDetailPage } from '../pages/tournaments/TournamentDetailPage';
import { MatchCreatePage } from '../pages/match/MatchCreatePage';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/home" replace />,
    },
    {
        element: <AuthLayout />,
        children: [
            { path: '/login', element: <LoginPage /> },
        ],
    },
    {
        element: <DashboardLayout />,
        children: [
            { path: '/home', element: <HomePage /> },
            { path: '/market', element: <MarketPage /> },
            { path: '/teams', element: <TeamsPage /> },
            { path: '/teams/:id', element: <TeamDetailPage /> },
            { path: '/profile', element: <ProfilePage /> },
            { path: '/tournaments/:id', element: <TournamentDetailPage /> },
            { path: '/match/create', element: <MatchCreatePage /> },
            { path: '/match/:id', element: <MatchDetailPage /> },
        ],
    },
    {
        element: <FullscreenScoringLayout />,
        children: [
            { path: '/match/:id/score', element: <ScoringPage /> },
        ],
    },
]);
