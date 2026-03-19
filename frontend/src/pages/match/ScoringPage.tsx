import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useScoringStore } from '../../features/scoring/scoringStore';
import { useScoringSocket } from '../../features/scoring/useScoringSocket';
import { ScoreHeader } from '../../features/scoring/components/ScoreHeader';
import { BatsmanCard } from '../../features/scoring/components/BatsmanCard';
import { BowlerCard } from '../../features/scoring/components/BowlerCard';
import { CurrentOverDots } from '../../features/scoring/components/CurrentOverDots';
import { ScoringPad } from '../../features/scoring/components/ScoringPad';
import { CommentaryPanel } from '../../features/scoring/components/CommentaryPanel';
import { MilestoneWatcher } from '../../features/scoring/components/MilestoneWatcher';
import { EventNotifier } from '../../features/scoring/broadcast/EventNotifier';
import { Loader2 } from 'lucide-react';

export const ScoringPage = () => {
    const { id: matchId } = useParams<{ id: string }>();
    const initialize = useScoringStore((s) => s.initialize);
    const matchState = useScoringStore((s) => s.matchState);
    const error = useScoringStore((s) => s.error);

    // 1. Initialize Store
    useEffect(() => {
        if (matchId) {
            initialize(matchId);
        }
    }, [matchId, initialize]);

    // 2. Connect Socket
    useScoringSocket(matchId || null);

    // Loading
    if (!matchState && !error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground font-medium">Loading match...</span>
            </div>
        );
    }

    // Error
    if (error && !matchState) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background p-4 gap-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                </div>
                <div className="text-center">
                    <p className="text-foreground font-semibold mb-1">Failed to load match</p>
                    <p className="text-muted-foreground text-sm max-w-xs">{error}</p>
                </div>
                <button
                    onClick={() => matchId && initialize(matchId)}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold
                               hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm shadow-primary/20"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!matchId) return <Navigate to="/home" />;

    return (
        <div className="flex flex-col h-[100dvh] bg-background max-w-md mx-auto shadow-2xl overflow-hidden relative">
            {/* Broadcast Layer */}
            <EventNotifier />
            <MilestoneWatcher />

            {/* Header: Score + Team + Rates */}
            <div className="flex-none">
                <ScoreHeader />
            </div>

            {/* Current Over Dots */}
            <div className="flex-none">
                <CurrentOverDots />
            </div>

            {/* Batting & Bowling Cards */}
            <div className="flex-none px-3 py-2 space-y-2">
                <BatsmanCard />
                <BowlerCard />
            </div>

            {/* Commentary (scrollable) */}
            <div className="flex-1 overflow-y-auto px-3 pb-2">
                <CommentaryPanel />
            </div>

            {/* Footer: Scoring Pad */}
            <div className="flex-none pb-safe-area">
                <ScoringPad />
            </div>

            {/* Global Error Toast */}
            {error && (
                <div className="absolute top-20 left-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 rounded-xl shadow-lg shadow-destructive/20 text-sm font-medium z-50 flex justify-between items-center animate-in fade-in slide-in-from-top-2 border border-destructive/30">
                    <span>{error}</span>
                    <button
                        onClick={() => useScoringStore.getState().refetch()}
                        className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg text-xs font-semibold ml-3 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            )}
        </div>
    );
};
