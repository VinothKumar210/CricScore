import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '../../components/ui/Container';
import { api } from '../../lib/api';
import { Loader2, Swords, Clock, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';

export const MatchSetupPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [match, setMatch] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [tossWinner, setTossWinner] = useState<'HOME' | 'AWAY' | ''>('');
    const [tossDecision, setTossDecision] = useState<'BAT' | 'BOWL' | ''>('');

    useEffect(() => {
        const fetchMatch = async () => {
            try {
                const res = await api.get(`/api/matches/${id}`);
                setMatch(res.match);
                // If match is already LIVE, redirect to score
                if (res.match.status !== 'SCHEDULED') {
                    navigate(`/match/${id}/score`, { replace: true });
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load match');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchMatch();
    }, [id, navigate]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background gap-3">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
                <span className="text-sm font-medium text-muted-foreground">Loading Match Details...</span>
            </div>
        );
    }

    if (!match) {
        return (
            <Container className="py-6 flex flex-col items-center">
                <p className="text-destructive font-bold">Match not found.</p>
                <button onClick={() => navigate('/hub')} className="mt-4 text-primary underline">Go to Hub</button>
            </Container>
        );
    }

    const homeName = match.homeTeamName || match.homeTeam?.name || 'Home Team';
    const awayName = match.awayTeamName || match.awayTeam?.name || 'Away Team';

    const getSelectedTossWinnerName = () => {
        return tossWinner === 'HOME' ? homeName : awayName;
    };

    const handleStartMatch = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            await api.patch(`/api/matches/${id}/setup`, {
                tossWinnerName: getSelectedTossWinnerName(),
                tossDecision
            });
            // Complete! Redirect to scoring
            navigate(`/match/${id}/score`, { replace: true });
        } catch (err: any) {
            setError(err?.data?.message || err.message || 'Failed to start match');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Container className="py-6">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Pre-Match Setup</h1>
            <p className="text-sm text-muted-foreground mb-8">
                {homeName} vs {awayName}
            </p>

            <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Toss details</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setTossWinner('HOME')}
                        className={clsx(
                            "p-4 rounded-xl border text-center transition-all",
                            tossWinner === 'HOME'
                                ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                                : "border-border bg-card hover:border-primary/30"
                        )}
                    >
                        <span className="font-bold text-foreground truncate block w-full">{homeName}</span>
                        <p className="text-xs text-muted-foreground mt-1">Won Toss</p>
                    </button>
                    <button
                        onClick={() => setTossWinner('AWAY')}
                        className={clsx(
                            "p-4 rounded-xl border text-center transition-all",
                            tossWinner === 'AWAY'
                                ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                                : "border-border bg-card hover:border-primary/30"
                        )}
                    >
                        <span className="font-bold text-foreground truncate block w-full">{awayName}</span>
                        <p className="text-xs text-muted-foreground mt-1">Won Toss</p>
                    </button>
                </div>

                {tossWinner && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <button
                            onClick={() => setTossDecision('BAT')}
                            className={clsx(
                                "p-3 rounded-xl border text-center font-bold tracking-wide transition-all",
                                tossDecision === 'BAT'
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-card text-foreground hover:border-primary/30"
                            )}
                        >
                            Elected to Bat
                        </button>
                        <button
                            onClick={() => setTossDecision('BOWL')}
                            className={clsx(
                                "p-3 rounded-xl border text-center font-bold tracking-wide transition-all",
                                tossDecision === 'BOWL'
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-card text-foreground hover:border-primary/30"
                            )}
                        >
                            Elected to Bowl
                        </button>
                    </div>
                )}

                {error && (
                    <p className="text-destructive text-sm text-center font-medium mt-4">{error}</p>
                )}

                <div className="pt-6">
                    <button
                        onClick={handleStartMatch}
                        disabled={!tossWinner || !tossDecision || isSubmitting}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Swords className="w-5 h-5" />
                                Start Match Scoring
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Container>
    );
};
