import { MessageSquare } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import NotificationBell from '../../features/notifications/components/NotificationBell';
import { useLocation } from 'react-router-dom';

const ROUTE_TITLES: Record<string, string> = {
    '/home': 'Home',
    '/market': 'Marketplace',
    '/teams': 'Teams',
    '/profile': 'Profile',
    '/match/create': 'Create Match',
};

const getPageTitle = (pathname: string): string => {
    if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
    if (pathname.startsWith('/teams/')) return 'Team';
    if (pathname.startsWith('/match/') && !pathname.endsWith('/create')) return 'Match';
    if (pathname.startsWith('/tournaments/')) return 'Tournament';
    return 'CricScore';
};

export const TopBar = () => {
    const { unreadMessages } = useUiStore();
    const location = useLocation();
    const title = getPageTitle(location.pathname);

    return (
        <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-border flex items-center justify-between px-4 z-50">
            <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-textPrimary">{title}</h1>
            </div>

            <div className="flex items-center gap-4">
                <button className="relative p-1">
                    <MessageSquare className="w-5 h-5 text-textSecondary" />
                    {unreadMessages > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[10px] min-w-4 h-4 flex items-center justify-center rounded-full px-1">
                            {unreadMessages}
                        </span>
                    )}
                </button>

                <NotificationBell />
            </div>
        </header>
    );
};
