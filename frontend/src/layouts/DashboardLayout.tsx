import { Outlet } from 'react-router-dom';
import { TopBar } from '../components/navigation/TopBar';
import { BottomNav } from '../components/navigation/BottomNav';

export const DashboardLayout = () => {
    return (
        <div className="min-h-screen bg-surface flex flex-col">
            <TopBar />

            <main className="flex-1 pt-14 pb-16 overflow-y-auto">
                <Outlet />
            </main>

            <BottomNav />
        </div>
    );
};
