import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useScoringStore } from '../../features/scoring/scoringStore';
import { useScoringSocket } from '../../features/scoring/useScoringSocket';
import type { ConnectionStatus } from '../../features/scoring/useScoringSocket';
import { MatchLiveShell } from '../../features/scoring/components/MatchLiveShell';
import { Loader2, Share2, Check, Users, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';

// Connection status indicator styles
const CONNECTION_STYLES: Record<ConnectionStatus, { color: string; label: string; pulse: boolean }> = {
    connected: { color: '#10B981', label: 'LIVE', pulse: false },
    connecting: { color: '#FBBF24', label: 'Connecting...', pulse: true },
    reconnecting: { color: '#F59E0B', label: 'Reconnecting...', pulse: true },
    disconnected: { color: '#EF4444', label: 'Offline', pulse: false },
};

/**
 * LiveMatchPage — read-only spectator view.
 * Connects to socket for live updates, renders MatchLiveShell.
 * NO scoring actions, NO ControlPad, NO mutations.
 */
export const LiveMatchPage = () => {
    const { id: matchId } = useParams<{ id: string }>();
    const initialize = useScoringStore((s) => s.initialize);
    const matchState = useScoringStore((s) => s.matchState);
    const error = useScoringStore((s) => s.error);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (matchId) {
            initialize(matchId);
        }
    }, [matchId, initialize]);

    const connectionStatus = useScoringSocket(matchId || null);
    const connStyle = CONNECTION_STYLES[connectionStatus];

    // Loading
    if (!matchState && !error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground font-medium">Joining live match...</span>
            </div>
        );
    }

    // Error
    if (error && !matchState) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background p-4 gap-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Users className="w-7 h-7 text-destructive" />
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

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
        }
    };

    return (
        <div className="flex flex-col h-full bg-background max-w-md mx-auto shadow-2xl overflow-hidden relative">
            <MatchLiveShell />

            {/* Connection Status Indicator */}
            <div
                style={{
                    position: 'fixed', top: 12, left: 12, zIndex: 50,
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 20,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                    border: `1px solid ${connStyle.color}44`,
                }}
            >
                <span
                    style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: connStyle.color,
                        animation: connStyle.pulse ? 'pulse 1.5s infinite' : 'none',
                    }}
                />
                <span style={{ fontSize: 10, fontWeight: 700, color: connStyle.color, letterSpacing: '0.05em' }}>
                    {connStyle.label}
                </span>
                {connectionStatus === 'disconnected' ? (
                    <WifiOff size={11} color={connStyle.color} />
                ) : (
                    <Wifi size={11} color={connStyle.color} />
                )}
            </div>

            {/* Share FAB */}
            <button
                onClick={handleShare}
                className="fixed top-4 right-4 z-50 bg-primary text-primary-foreground p-2.5 rounded-full shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                aria-label="Share match link"
            >
                {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
            </button>
        </div>
    );
};
