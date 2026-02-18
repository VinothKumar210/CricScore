import { Outlet } from 'react-router-dom';

export const FullscreenScoringLayout = () => {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <main className="flex-1 relative">
                <Outlet />
            </main>
        </div>
    );
};
