import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { FullscreenScoringLayout } from '../layouts/FullscreenScoringLayout';
import { AuthGuard } from '../components/AuthGuard';
import { PublicLayout } from '../layouts/PublicLayout';
import { Loader2 } from 'lucide-react';

// ─── Route-level lazy imports (code-split per page) ───

// Auth
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));

// Core pages (Dashboard tabs)
const LiveHubPage = lazy(() => import('../features/hub/components/LiveHubPage').then(m => ({ default: m.LiveHubPage })));
const HomePage = lazy(() => import('../pages/home/HomePage').then(m => ({ default: m.HomePage })));
const MarketPage = lazy(() => import('../features/market/MarketPage').then(m => ({ default: m.MarketPage })));

// Teams
const TeamsPage = lazy(() => import('../pages/teams/TeamsPage').then(m => ({ default: m.TeamsPage })));
const TeamCreatePage = lazy(() => import('../pages/teams/TeamCreatePage').then(m => ({ default: m.TeamCreatePage })));
const TeamDetailPage = lazy(() => import('../pages/teams/TeamDetailPage').then(m => ({ default: m.TeamDetailPage })));

// Profile
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const EditProfilePage = lazy(() => import('../features/profile/EditProfilePage').then(m => ({ default: m.EditProfilePage })));
const PublicProfilePage = lazy(() => import('../features/profile/components/PublicProfilePage').then(m => ({ default: m.PublicProfilePage })));
const LeaderboardPage = lazy(() => import('../features/profile/components/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })));

// Match
const MatchDetailPage = lazy(() => import('../pages/match/MatchDetailPage').then(m => ({ default: m.MatchDetailPage })));
const MatchCreatePage = lazy(() => import('../pages/match/MatchCreatePage').then(m => ({ default: m.MatchCreatePage })));
const ScoringPage = lazy(() => import('../pages/match/ScoringPage').then(m => ({ default: m.ScoringPage })));
const LiveMatchPage = lazy(() => import('../pages/match/LiveMatchPage').then(m => ({ default: m.LiveMatchPage })));

// Match Tabs
const MatchSummaryTab = lazy(() => import('../features/matches/tabs/MatchSummaryTab').then(m => ({ default: m.MatchSummaryTab })));
const MatchScorecardTab = lazy(() => import('../features/matches/tabs/MatchScorecardTab').then(m => ({ default: m.MatchScorecardTab })));
const MatchInfoTab = lazy(() => import('../features/matches/tabs/MatchInfoTab').then(m => ({ default: m.MatchInfoTab })));
const MatchAnalyticsTab = lazy(() => import('../features/matches/tabs/MatchAnalyticsTab').then(m => ({ default: m.MatchAnalyticsTab })));

// Tournaments
const TournamentListPage = lazy(() => import('../features/tournament/components/TournamentListPage').then(m => ({ default: m.TournamentListPage })));
const TournamentDetailPage = lazy(() => import('../pages/tournaments/TournamentDetailPage').then(m => ({ default: m.TournamentDetailPage })));

// Archive
const ArchiveListPage = lazy(() => import('../features/archive/components/ArchiveListPage').then(m => ({ default: m.ArchiveListPage })));
const ArchiveDetailPage = lazy(() => import('../features/archive/components/ArchiveDetailPage').then(m => ({ default: m.ArchiveDetailPage })));

// Messaging & Notifications
const InboxPage = lazy(() => import('../features/messages/InboxPage').then(m => ({ default: m.InboxPage })));
const MessageRoomPage = lazy(() => import('../features/messages/pages/MessageRoomPage').then(m => ({ default: m.MessageRoomPage })));
const NotificationCenterPage = lazy(() => import('../features/notifications/NotificationCenterPage'));
const InviteInboxPage = lazy(() => import('../features/invites/InviteInboxPage').then(m => ({ default: m.InviteInboxPage })));

// Settings & Misc
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SearchPage = lazy(() => import('../features/search/SearchPage').then(m => ({ default: m.SearchPage })));
const ComparePage = lazy(() => import('../features/compare/ComparePage').then(m => ({ default: m.ComparePage })));

// Hub / Spectator / Share
const SpectatorLivePage = lazy(() => import('../pages/hub/SpectatorLivePage').then(m => ({ default: m.SpectatorLivePage })));
const ShareMatchPage = lazy(() => import('../features/share/components/ShareMatchPage').then(m => ({ default: m.ShareMatchPage })));

// ─── Loading Fallback ───

const PageLoader = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-background gap-3">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-medium">Loading...</span>
    </div>
);

const Lazy = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

// ─── Router ───

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/hub" replace />,
    },
    {
        element: <AuthLayout />,
        children: [
            { path: '/login', element: <Lazy><LoginPage /></Lazy> },
        ],
    },
    {
        element: <AuthGuard><DashboardLayout /></AuthGuard>,
        children: [
            { path: '/hub', element: <Lazy><LiveHubPage /></Lazy> },
            { path: '/home', element: <Lazy><HomePage /></Lazy> },
            { path: '/market', element: <Lazy><MarketPage /></Lazy> },
            { path: '/teams', element: <Lazy><TeamsPage /></Lazy> },
            { path: '/teams/create', element: <Lazy><TeamCreatePage /></Lazy> },
            { path: '/teams/:id', element: <Lazy><TeamDetailPage /></Lazy> },
            { path: '/profile', element: <Lazy><ProfilePage /></Lazy> },
            { path: '/profile/edit', element: <Lazy><EditProfilePage /></Lazy> },
            { path: '/tournaments', element: <Lazy><TournamentListPage /></Lazy> },
            { path: '/tournaments/:id', element: <Lazy><TournamentDetailPage /></Lazy> },
            { path: '/match/create', element: <Lazy><MatchCreatePage /></Lazy> },
            { path: '/archive', element: <Lazy><ArchiveListPage /></Lazy> },
            { path: '/archive/:id', element: <Lazy><ArchiveDetailPage /></Lazy> },
            { path: '/leaderboard', element: <Lazy><LeaderboardPage /></Lazy> },
            { path: '/settings', element: <Lazy><SettingsPage /></Lazy> },
            { path: '/inbox', element: <Lazy><InboxPage /></Lazy> },
            { path: '/search', element: <Lazy><SearchPage /></Lazy> },
            { path: '/compare', element: <Lazy><ComparePage /></Lazy> },
            { path: '/notifications', element: <Lazy><NotificationCenterPage /></Lazy> },
            { path: '/invites', element: <Lazy><InviteInboxPage /></Lazy> },
            { path: '/messages/:roomType/:roomId', element: <Lazy><MessageRoomPage /></Lazy> },
            { path: '/u/:username', element: <Lazy><PublicProfilePage /></Lazy> },
            {
                path: '/match/:id',
                element: <Lazy><MatchDetailPage /></Lazy>,
                children: [
                    { index: true, element: <Lazy><MatchSummaryTab /></Lazy> },
                    { path: 'scorecard', element: <Lazy><MatchScorecardTab /></Lazy> },
                    { path: 'analytics', element: <Lazy><MatchAnalyticsTab /></Lazy> },
                    { path: 'info', element: <Lazy><MatchInfoTab /></Lazy> },
                ]
            },
        ],
    },
    {
        element: <AuthGuard><FullscreenScoringLayout /></AuthGuard>,
        children: [
            { path: '/match/:id/score', element: <Lazy><ScoringPage /></Lazy> },
            { path: '/match/:id/live', element: <Lazy><LiveMatchPage /></Lazy> },
            { path: '/live/:matchId', element: <Lazy><SpectatorLivePage /></Lazy> },
        ],
    },
    {
        element: <PublicLayout />,
        children: [
            { path: '/share/:matchId', element: <Lazy><ShareMatchPage /></Lazy> },
        ],
    },
]);
