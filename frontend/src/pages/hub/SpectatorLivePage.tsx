import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScoringStore } from '../../features/scoring/scoringStore';
import { useSpectatorSocket } from '../../features/hub/useSpectatorSocket';
import { MatchLiveShell } from '../../features/scoring/components/MatchLiveShell';
import { Loader2, Share2, Check, ArrowLeft } from 'lucide-react';

/**
 * SpectatorLivePage — Read-only live spectator view at /live/:matchId
 *
 * Reuses MatchLiveShell for rendering (no scoring controls).
 * Subscribes to WebSocket via useSpectatorSocket.
 * Navigates back to Hub on match not found.
 *
 * SECURITY: No scoring actions, no ControlPad, no mutations visible.
 */
export const SpectatorLivePage = () => {
    const { matchId } = useParams<{ matchId: string }>();
    const navigate = useNavigate();
    const initialize = useScoringStore((s) => s.initialize);
    const matchState = useScoringStore((s) => s.matchState);
    const error = useScoringStore((s) => s.error);
    const [copied, setCopied] = useState(false);

    // Initialize scoring store (read-only consumption)
    useEffect(() => {
        if (matchId) {
            initialize(matchId);
        }
    }, [matchId, initialize]);

    // Subscribe to live WebSocket updates
    useSpectatorSocket(matchId || null);

    // Loading
    if (!matchState && !error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-bgPrimary gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading match...</p>
            </div>
        );
    }

    // Error — match not found
    if (error && !matchState) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-bgPrimary p-4 gap-3">
                <p className="text-destructive font-semibold">Match not found</p>
                <p className="text-muted-foreground text-sm">{error}</p>
                <div className="flex gap-3 mt-2">
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-card border border-border text-foreground rounded-lg text-sm font-medium
                                   hover:bg-background transition-colors"
                    >
                        Back to Hub
                    </button>
                    <button
                        onClick={() => matchId && initialize(matchId)}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
                                   hover:bg-primary/90 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/share/${matchId}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: 'CricScore — Live Match', url: shareUrl });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch {
            // User cancelled or fallback failed
        }
    };

    return (
        <div className="flex flex-col h-full bg-bgPrimary max-w-md mx-auto shadow-2xl overflow-hidden relative">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-card/80 backdrop-blur-sm
                            border-b border-border z-20">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground
                               transition-colors text-sm"
                    aria-label="Back to hub"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-medium">Hub</span>
                </button>

                <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                    <span className="w-2 h-2 rounded-full bg-destructive/100 animate-pulse" />
                    Spectator Mode
                </span>

                <button
                    onClick={handleShare}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg
                               hover:bg-card"
                    aria-label="Share match"
                >
                    {copied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
                </button>
            </div>

            {/* Match Live Shell (read-only, reused from scoring) */}
            <div className="flex-1 overflow-y-auto">
                <MatchLiveShell />
            </div>
        </div>
    );
};
