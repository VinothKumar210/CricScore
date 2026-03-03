import { useAuthStore } from '../store/authStore';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * AuthGuard — Wraps protected routes.
 * - While auth is loading → shows spinner
 * - If not authenticated → redirects to /login
 * - If authenticated → renders children
 */
export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
    const isAuthenticated = useAuthStore(s => s.isAuthenticated);
    const isLoading = useAuthStore(s => s.isLoading);
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                    <span className="text-primary text-xl font-bold">C</span>
                </div>
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
