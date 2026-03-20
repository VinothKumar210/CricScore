import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '../../components/ui/Container';
import { api } from '../../lib/api';
import { Loader2, ChevronLeft, ArrowRight } from 'lucide-react';
import { PlayerSelector } from '../../components/PlayerSelector';

export interface PlayingXIPlayer {
    playerId: string;
    playerName: string;
    playerType: 'REGISTERED' | 'GUEST';
    role?: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
    isCaptain: boolean;
    isWicketKeeper: boolean;
}

export const SelectPlayingXIPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    // Step 1: Home Team, Step 2: Away Team
    const [step, setStep] = useState<1 | 2>(1);
    
    const [match, setMatch] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [homeXI, setHomeXI] = useState<PlayingXIPlayer[]>([]);
    const [awayXI, setAwayXI] = useState<PlayingXIPlayer[]>([]);

    useEffect(() => {
        const fetchMatch = async () => {
            try {
                const res = await api.get(`/api/matches/${id}`);
                const matchData = res.data?.match || res.match;
                setMatch(matchData);
                
                // If it already has XI setup, pre-fill or redirect
                if (matchData?.playingXIHome?.length) {
                    setHomeXI(matchData.playingXIHome);
                }
                if (matchData?.playingXIAway?.length) {
                    setAwayXI(matchData.playingXIAway);
                }
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

    const homeName = match.homeTeamName || match.homeTeam?.name || 'Home Team';
    const awayName = match.awayTeamName || match.awayTeam?.name || 'Away Team';

    const handleNext = async () => {
        if (step === 1) {
            if (homeXI.length === 0) {
                setError('Please select at least one player for the Home Team');
                return;
            }
            if (homeXI.length > 11) {
                setError('You cannot select more than 11 players');
                return;
            }
            setError('');
            setStep(2);
        } else {
            if (awayXI.length === 0) {
                setError('Please select at least one player for the Away Team');
                return;
            }
            if (awayXI.length > 11) {
                setError('You cannot select more than 11 players');
                return;
            }
            
            // Both selected, submit to API
            setIsSubmitting(true);
            setError('');
            try {
                await api.patch(`/api/matches/${id}/playing-xi`, {
                    playingXIHome: homeXI,
                    playingXIAway: awayXI
                });
                
                // Navigate to next step
                navigate(`/match/${id}/openers`, { replace: true });
            } catch (err: any) {
                setError(err?.data?.message || err.message || 'Failed to save Playing XI');
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
                    <h1 className="text-xl font-bold tracking-tight">Select Playing XI</h1>
                    <p className="text-sm text-muted-foreground">{step === 1 ? homeName : awayName}</p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-xl mb-4 text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Player Selector component handles search, selection, captain/wk tags, and adding guest players */}
            {step === 1 ? (
                <PlayerSelector 
                    teamId={match.homeTeamId} 
                    teamName={homeName} 
                    selectedPlayers={homeXI} 
                    onChange={setHomeXI} 
                />
            ) : (
                <PlayerSelector 
                    teamId={match.awayTeamId} 
                    teamName={awayName} 
                    selectedPlayers={awayXI} 
                    onChange={setAwayXI} 
                />
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
                    ) : (
                        <>
                            {step === 1 ? 'Next: Away Team' : 'Next: Select Openers'}
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                    )}
                </button>
            </div>
        </Container>
    );
};
