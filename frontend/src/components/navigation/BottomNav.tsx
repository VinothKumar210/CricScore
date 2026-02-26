import { Home, Compass, Users, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { PlayFab } from './PlayFab';
import { clsx } from 'clsx';

export const BottomNav = () => {
    const navItems = [
        { label: 'Home', icon: Home, path: '/hub' },
        { label: 'Explore', icon: Compass, path: '/market' },
        { label: 'Play', icon: null, path: '/match/create' },
        { label: 'Teams', icon: Users, path: '/teams' },
        { label: 'Profile', icon: User, path: '/profile' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background/90 backdrop-blur-xl border-t border-border flex items-center justify-between px-2 z-50">
            {navItems.map((item, index) => {
                if (item.label === 'Play') {
                    return (
                        <div key={index} className="relative w-1/5 flex justify-center">
                            <PlayFab />
                        </div>
                    );
                }

                const Icon = item.icon!;

                return (
                    <NavLink
                        key={index}
                        to={item.path}
                        className={({ isActive }) => clsx(
                            'flex flex-col items-center justify-center w-1/5 h-full space-y-1 transition-colors',
                            isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <div className={clsx(
                                    'p-1.5 rounded-lg transition-colors',
                                    isActive && 'bg-primary/10'
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                );
            })}
        </nav>
    );
};
