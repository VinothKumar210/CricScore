import { MessageSquare, Search } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import NotificationBell from '../../features/notifications/components/NotificationBell';
import { useLocation, useNavigate } from 'react-router-dom';

const ROUTE_TITLES: Record<string, string> = {
    '/hub': 'CricScore',
    '/home': 'Home',
    '/market': 'Marketplace',
    '/teams': 'Teams',
    '/profile': 'Profile',
    '/match/create': 'New Match',
    '/tournaments': 'Tournaments',
    '/archive': 'Archive',
    '/leaderboard': 'Leaderboard',
    '/settings': 'Settings',
    '/inbox': 'Inbox',
    '/search': 'Search',
    '/compare': 'Compare',
    '/notifications': 'Notifications',
    '/invites': 'Invites',
};

const getPageTitle = (pathname: string): string => {
    if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
    if (pathname.startsWith('/teams/')) return 'Team';
    if (pathname.startsWith('/match/') && !pathname.endsWith('/create')) return 'Match';
    if (pathname.startsWith('/tournaments/')) return 'Tournament';
    if (pathname.startsWith('/u/')) return 'Player';
    if (pathname.startsWith('/messages/')) return 'Messages';
    return 'CricScore';
};

export const TopBar = () => {
    const { unreadMessages } = useUiStore();
    const location = useLocation();
    const navigate = useNavigate();
    const title = getPageTitle(location.pathname);
    const isHub = location.pathname === '/hub';

    return (
        <header className="fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 z-50">
            <div className="flex items-center gap-3">
                {isHub && (
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                        <span className="text-primary text-sm font-bold">C</span>
                    </div>
                )}
                <h1 className="text-lg font-semibold text-foreground tracking-tight">{title}</h1>
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => navigate('/search')}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                    <Search className="w-5 h-5 text-muted-foreground" />
                </button>

                <button
                    onClick={() => navigate('/inbox')}
                    className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    {unreadMessages > 0 && (
                        <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] min-w-4 h-4 flex items-center justify-center rounded-full px-1 font-bold">
                            {unreadMessages}
                        </span>
                    )}
                </button>

                <NotificationBell />
            </div>
        </header>
    );
};
