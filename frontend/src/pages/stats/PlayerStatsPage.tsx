import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRightLeft } from 'lucide-react';
import { api } from '../../lib/api';

import { CareerStatsCard } from '../../features/profile/components/CareerStatsCard';
import { FormatStatsTable } from '../../features/profile/components/FormatStatsTable';
import { SeasonBreakdown } from '../../features/profile/components/SeasonBreakdown';

export const PlayerStatsPage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            if (!userId) return;
            try {
                const res = await api.get(`/stats/career/${userId}`);
                setStats(res.data);
            } catch (err) {
                setError('Failed to load career statistics');
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [userId]);

    return (
        <div className="flex flex-col h-[100dvh] bg-background">
            <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-foreground" />
                    </button>
                    <h1 className="text-lg font-bold text-foreground truncate">
                        Career Stats
                    </h1>
                </div>
                <button 
                    onClick={() => navigate(`/stats/compare?player1=${userId}`)}
                    className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                    title="Compare Player"
                >
                    <ArrowRightLeft className="w-5 h-5" />
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-6">
                {error && (
                    <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-center font-medium">
                        {error}
                    </div>
                )}

                <section>
                    <h2 className="text-base font-bold text-foreground mb-3 px-1">Overall Career</h2>
                    <CareerStatsCard stats={stats?.career} isLoading={isLoading} />
                </section>

                <section>
                    <FormatStatsTable stats={stats?.formatStats || []} />
                </section>

                <section>
                    <SeasonBreakdown stats={stats?.seasonStats || []} />
                </section>
                
                {/* Spacer block for scroll bounce */}
                <div className="h-8" />
            </main>
        </div>
    );
};
