import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { FullscreenScoringLayout } from '../layouts/FullscreenScoringLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { HomePage } from '../pages/home/HomePage';
import { MarketPage } from '../features/market/MarketPage';
import { TeamsPage } from '../pages/teams/TeamsPage';
import { TeamDetailPage } from '../pages/teams/TeamDetailPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { EditProfilePage } from '../features/profile/EditProfilePage';
import { MatchDetailPage } from '../pages/match/MatchDetailPage';
import { ScoringPage } from '../pages/match/ScoringPage';
import { LiveMatchPage } from '../pages/match/LiveMatchPage';
import { TournamentDetailPage } from '../pages/tournaments/TournamentDetailPage';
import { MatchCreatePage } from '../pages/match/MatchCreatePage';
import { LiveHubPage } from '../features/hub/components/LiveHubPage';
import { SpectatorLivePage } from '../pages/hub/SpectatorLivePage';
import { PublicLayout } from '../layouts/PublicLayout';
import { ShareMatchPage } from '../features/share/components/ShareMatchPage';
import { ArchiveListPage } from '../features/archive/components/ArchiveListPage';
import { ArchiveDetailPage } from '../features/archive/components/ArchiveDetailPage';
import { TournamentListPage } from '../features/tournament/components/TournamentListPage';
import { PublicProfilePage } from '../features/profile/components/PublicProfilePage';
import { LeaderboardPage } from '../features/profile/components/LeaderboardPage';
import NotificationCenterPage from '../features/notifications/NotificationCenterPage';
import { InviteInboxPage } from '../features/invites/InviteInboxPage';
import { MessageRoomPage } from '../features/messages/pages/MessageRoomPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { InboxPage } from '../features/messages/InboxPage';
import { SearchPage } from '../features/search/SearchPage';
import { ComparePage } from '../features/compare/ComparePage';

// Tab Components
import { MatchSummaryTab } from '../features/matches/tabs/MatchSummaryTab';
import { MatchScorecardTab } from '../features/matches/tabs/MatchScorecardTab';
import { MatchInfoTab } from '../features/matches/tabs/MatchInfoTab';
import { MatchAnalyticsTab } from '../features/matches/tabs/MatchAnalyticsTab';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/hub" replace />,
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
            { path: '/hub', element: <LiveHubPage /> },
            { path: '/home', element: <HomePage /> },
            { path: '/market', element: <MarketPage /> },
            { path: '/teams', element: <TeamsPage /> },
            { path: '/teams/:id', element: <TeamDetailPage /> },
            { path: '/profile', element: <ProfilePage /> },
            { path: '/profile/edit', element: <EditProfilePage /> },
            { path: '/tournaments', element: <TournamentListPage /> },
            { path: '/tournaments/:id', element: <TournamentDetailPage /> },
            { path: '/match/create', element: <MatchCreatePage /> },
            { path: '/archive', element: <ArchiveListPage /> },
            { path: '/archive/:id', element: <ArchiveDetailPage /> },
            { path: '/leaderboard', element: <LeaderboardPage /> },
            { path: '/settings', element: <SettingsPage /> },
            { path: '/inbox', element: <InboxPage /> },
            { path: '/search', element: <SearchPage /> },
            { path: '/compare', element: <ComparePage /> },
            { path: '/notifications', element: <NotificationCenterPage /> },
            { path: '/invites', element: <InviteInboxPage /> },
            { path: '/messages/:roomType/:roomId', element: <MessageRoomPage /> },
            { path: '/u/:username', element: <PublicProfilePage /> },
            {
                path: '/match/:id',
                element: <MatchDetailPage />,
                children: [
                    { index: true, element: <MatchSummaryTab /> },
                    { path: 'scorecard', element: <MatchScorecardTab /> },
                    { path: 'analytics', element: <MatchAnalyticsTab /> },
                    { path: 'info', element: <MatchInfoTab /> },
                ]
            },
        ],
    },
    {
        element: <FullscreenScoringLayout />,
        children: [
            { path: '/match/:id/score', element: <ScoringPage /> },
            { path: '/match/:id/live', element: <LiveMatchPage /> },
            { path: '/live/:matchId', element: <SpectatorLivePage /> },
        ],
    },
    {
        element: <PublicLayout />,
        children: [
            { path: '/share/:matchId', element: <ShareMatchPage /> },
        ],
    },
]);
