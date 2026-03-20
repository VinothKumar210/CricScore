import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '../../components/ui/Container';
import { api } from '../../lib/api';
import { Loader2, ChevronLeft, Swords, Star } from 'lucide-react';
import { clsx } from 'clsx';
import type { PlayingXIPlayer } from './SelectPlayingXIPage';

export const SelectOpenersPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    // Step 1: Batsmen, Step 2: Bowler
    const [step, setStep] = useState<1 | 2>(1);
    
    const [match, setMatch] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [strikerId, setStrikerId] = useState<string>('');
    const [nonStrikerId, setNonStrikerId] = useState<string>('');
    const [bowlerId, setBowlerId] = useState<string>('');

    useEffect(() => {
        const fetchMatch = async () => {
            try {
                const res = await api.get(`/api/matches/${id}`);
                setMatch(res.data?.match || res.match);
            } catch (err: any) {
                setError(err.message || 'Failed to load match');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchMatch();
    }, [id]);

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

    // Determine Batting / Bowling Teams based on Toss
    const isHomeBatting = match.tossWinnerId === match.homeTeamId 
        ? match.tossDecision === 'BAT' 
        : match.tossDecision === 'BOWL';

    const battingXI: PlayingXIPlayer[] = isHomeBatting ? match.playingXIHome : match.playingXIAway;
    const bowlingXI: PlayingXIPlayer[] = isHomeBatting ? match.playingXIAway : match.playingXIHome;
    const battingTeamName = isHomeBatting ? match.homeTeamName : match.awayTeamName;
    const bowlingTeamName = isHomeBatting ? match.awayTeamName : match.homeTeamName;

    // Must have playing XI
    if (!battingXI || !bowlingXI || battingXI.length === 0 || bowlingXI.length === 0) {
        return (
            <Container className="py-6 flex flex-col items-center text-center">
                <p className="text-destructive font-bold">Playing XI not selected.</p>
                <p className="text-sm text-muted-foreground mt-2">You must select the Playing XI before choosing openers.</p>
                <button onClick={() => navigate(`/match/${id}/select-xi`)} className="mt-4 h-10 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
                    Go Select XI
                </button>
            </Container>
        );
    }

    const toggleBatsman = (playerId: string) => {
        if (strikerId === playerId) {
            setStrikerId('');
            // If we remove striker, shift non-striker to striker
            if (nonStrikerId) {
                setStrikerId(nonStrikerId);
                setNonStrikerId('');
            }
        } else if (nonStrikerId === playerId) {
            setNonStrikerId('');
        } else if (!strikerId) {
            setStrikerId(playerId);
        } else if (!nonStrikerId) {
            setNonStrikerId(playerId);
        }
    };

    const handleNext = async () => {
        if (step === 1) {
            if (!strikerId || !nonStrikerId) {
                setError('Please select both a Striker and a Non-Striker');
                return;
            }
            if (strikerId === nonStrikerId) {
                setError('Striker and Non-Striker cannot be the same person');
                return;
            }
            setError('');
            setStep(2);
        } else {
            if (!bowlerId) {
                setError('Please select an opening bowler');
                return;
            }
            
            // Start match!
            setIsSubmitting(true);
            setError('');
            try {
                await api.patch(`/api/matches/${id}/openers`, {
                    strikerId,
                    nonStrikerId,
                    bowlerId
                });
                
                // Navigate to scoring
                navigate(`/match/${id}/score`, { replace: true });
            } catch (err: any) {
                setError(err?.data?.message || err.message || 'Failed to set openers and start match');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <Container className="py-6 pb-40">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => step === 2 ? setStep(1) : navigate(-1)}
                    className="p-2 rounded-lg bg-secondary border border-border hover:bg-card transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Select Openers</h1>
                    <p className="text-sm text-muted-foreground">
                        {step === 1 ? 'Opening Batsmen' : 'Opening Bowler'}
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-xl mb-4 text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Content Based on Step */}
            {step === 1 ? (
                // --- STEP 1: Select Batsmen ---
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col items-center text-center">
                        <Swords className="w-6 h-6 text-primary mb-2" />
                        <h2 className="font-semibold text-foreground">{battingTeamName} is Batting</h2>
                        <p className="text-xs text-muted-foreground mt-1 text-balance">
                            First tap assigns the <strong>Striker ⭐</strong>, second tap assigns the <strong>Non-Striker</strong>.
                        </p>
                    </div>

                    <div className="space-y-2">
                        {battingXI.map(player => {
                            const isStriker = player.playerId === strikerId;
                            const isNonStriker = player.playerId === nonStrikerId;
                            const isSelected = isStriker || isNonStriker;

                            return (
                                <div
                                    key={player.playerId}
                                    onClick={() => toggleBatsman(player.playerId)}
                                    className={clsx(
                                        "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                        isSelected ? "bg-card border-primary" : "bg-card bg-opacity-50 border-border hover:border-primary/30"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors shrink-0",
                                        isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                                    )}>
                                        {player.playerName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate text-sm flex items-center gap-2">
                                            {player.playerName}
                                            {player.isCaptain && <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-sm uppercase">C</span>}
                                            {player.isWicketKeeper && <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-sm uppercase">WK</span>}
                                        </p>
                                    </div>
                                    {isStriker && (
                                        <div className="flex items-center gap-1.5 text-amber-500 text-xs font-bold animate-in zoom-in px-2 py-1 bg-amber-500/10 rounded-lg">
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                            Striker
                                        </div>
                                    )}
                                    {isNonStriker && (
                                        <div className="flex items-center gap-1.5 text-primary text-xs font-bold animate-in zoom-in px-2 py-1 bg-primary/10 rounded-lg">
                                            Non-Striker
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                // --- STEP 2: Select Bowler ---
                <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
                    <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex flex-col items-center text-center">
                        <div className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
                            <span className="text-sm">🏏</span>
                        </div>
                        <h2 className="font-semibold text-foreground">{bowlingTeamName} is Bowling</h2>
                        <p className="text-xs text-muted-foreground mt-1">Select the bowler for the first over.</p>
                    </div>

                    <div className="space-y-2">
                        {bowlingXI.map(player => {
                            const isSelected = player.playerId === bowlerId;

                            return (
                                <div
                                    key={player.playerId}
                                    onClick={() => setBowlerId(player.playerId)}
                                    className={clsx(
                                        "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                        isSelected ? "bg-card border-primary" : "bg-card bg-opacity-50 border-border hover:border-primary/30"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors shrink-0",
                                        isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                                    )}>
                                        {player.playerName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate text-sm flex items-center gap-2">
                                            {player.playerName}
                                            {player.isCaptain && <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-sm uppercase">C</span>}
                                            {player.isWicketKeeper && <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-sm uppercase">WK</span>}
                                        </p>
                                    </div>
                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-in zoom-in text-primary-foreground">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Fixed Bottom Action Bar */}
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border z-40 max-w-md mx-auto">
                <button
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : step === 1 ? (
                        'Next: Opening Bowler'
                    ) : (
                        'Start Match! 🏏'
                    )}
                </button>
            </div>
        </Container>
    );
};
