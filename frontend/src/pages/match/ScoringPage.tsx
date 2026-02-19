import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useScoringStore } from '../../features/scoring/scoringStore';
import { useScoringSocket } from '../../features/scoring/useScoringSocket';
import { ScorePanel } from '../../features/scoring/components/ScorePanel';
import { ControlPad } from '../../features/scoring/components/ControlPad';
import { OverTimeline } from '../../features/scoring/components/OverTimeline';
import { Loader2 } from 'lucide-react';

export const ScoringPage = () => {
    const { id: matchId } = useParams<{ id: string }>();
    const initialize = useScoringStore((s) => s.initialize);
    const matchState = useScoringStore((s) => s.matchState);
    const error = useScoringStore((s) => s.error);
    // isSubmitting removed as it was unused and caused TS errors

    // 1. Initialize Store
    useEffect(() => {
        if (matchId) {
            initialize(matchId);
        }
    }, [matchId, initialize]);

    // 2. Connect Socket (Dependent on matchId)
    useScoringSocket(matchId || null);

    // Loading State (Initial)
    if (!matchState && !error) {
        return (
            <div className="flex items-center justify-center h-screen bg-bgPrimary">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
            </div>
        );
    }

    // Error State
    if (error && !matchState) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-bgPrimary p-4">
                <p className="text-danger font-semibold mb-2">Failed to load match</p>
                <button
                    onClick={() => matchId && initialize(matchId)}
                    className="px-4 py-2 bg-brand text-white rounded-lg"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!matchId) return <Navigate to="/home" />;

    return (
        <div className="flex flex-col h-full bg-bgPrimary max-w-md mx-auto shadow-2xl overflow-hidden relative">
            {/* Header: Score Panel */}
            <div className="flex-none">
                <ScorePanel />
            </div>

            {/* Middle: Timeline & Scrollable Area if needed */}
            <div className="flex-none border-b border-border bg-white mt-1">
                <OverTimeline />
            </div>

            {/* Main Content Area (Commentary? Players?) - Flexible filler */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                {/* Placeholder for future commentary or ball-by-ball list */}
                <div className="text-center text-textSecondary text-sm py-8">
                    <p>Commentary & Stats Area</p>
                    <p className="text-xs opacity-60 mt-2">v{useScoringStore.getState().expectedVersion}</p>
                </div>
            </div>

            {/* Footer: Control Pad */}
            <div className="flex-none p-2 bg-white border-t border-border pb-safe-area">
                <ControlPad />
            </div>

            {/* Global Error Toast Overlay (e.g. Sync Conflict) */}
            {error && (
                <div className="absolute top-20 left-4 right-4 bg-danger text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 z-50 flex justify-between items-center">
                    <span>{error}</span>
                    <button
                        onClick={() => useScoringStore.getState().refetch()}
                        className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs ml-2"
                    >
                        Refresh
                    </button>
                </div>
            )}
        </div>
    );
};
