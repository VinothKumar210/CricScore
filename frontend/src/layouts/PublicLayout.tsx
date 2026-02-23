import { Outlet } from 'react-router-dom';

/**
 * PublicLayout — Minimal layout for unauthenticated public pages.
 *
 * NOT included:
 * - Navigation bar
 * - User menu
 * - Scoring toolbar
 * - Auth checks
 * - WebSocket connection
 */
export const PublicLayout = () => {
    return (
        <div className="min-h-screen bg-bgPrimary">
            {/* Minimal Header */}
            <header className="bg-white border-b border-border px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center gap-2">
                    <span className="text-lg font-bold text-brand">🏏 CricScore</span>
                    <span className="text-xs text-textSecondary bg-surface px-2 py-0.5 rounded-full">
                        Shared Match
                    </span>
                </div>
            </header>

            {/* Page Content */}
            <main className="max-w-3xl mx-auto">
                <Outlet />
            </main>
        </div>
    );
};
