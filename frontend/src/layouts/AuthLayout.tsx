import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Subtle gradient orbs */}
            <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-chart-2/10 rounded-full blur-3xl" />

            <div className="w-full max-w-md relative z-10">
                <Outlet />
            </div>
        </div>
    );
};
