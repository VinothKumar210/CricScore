import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../../components/ui/Container';
import { api } from '../../lib/api';
import { teamService } from '../../features/teams/teamService';
import type { TeamListItem } from '../../features/teams/teamService';
import {
    ChevronLeft, Loader2, Swords, CircleDot,
    Shield, ScrollText, ArrowRight
} from 'lucide-react';
import { clsx } from 'clsx';

// ── UI types (user-friendly labels) ──────────────────
type MatchFormat = 'T20' | 'ODI' | 'TEST' | 'CUSTOM';
type UIBallType = 'LEATHER' | 'TENNIS' | 'OTHER';
type TossDecision = 'BAT' | 'BOWL';

// ── Mapping: UI → Backend enums ──────────────────────
const MATCH_TYPE_MAP: Record<MatchFormat, string> = {
    T20: 'TEAM_MATCH',
    ODI: 'TEAM_MATCH',
    TEST: 'TEAM_MATCH',
    CUSTOM: 'LOCAL_MATCH',
};

const BALL_TYPE_MAP: Record<UIBallType, string> = {
    LEATHER: 'STITCH',
    TENNIS: 'RED_TENNIS',
    OTHER: 'CORK',
};

interface FormData {
    matchFormat: MatchFormat;
    homeTeamId: string;
    awayTeamId: string;
    awayTeamName: string;
    overs: number;
    ballType: UIBallType;
    tossWinner: 'HOME' | 'AWAY' | '';
    tossDecision: TossDecision | '';
    venue: string;
}

/**
 * MatchCreatePage — Full match creation form.
 * Steps: Format → Teams → Toss → Confirm
 */
export const MatchCreatePage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [myTeams, setMyTeams] = useState<TeamListItem[]>([]);
    const [isLoadingTeams, setIsLoadingTeams] = useState(false);

    // Away Team Lookup State
    const [awayCode, setAwayCode] = useState('');
    const [isCheckingCode, setIsCheckingCode] = useState(false);
    const [awayTeamDetails, setAwayTeamDetails] = useState<any>(null);
    const [awayCodeError, setAwayCodeError] = useState('');
    const [isManualAway, setIsManualAway] = useState(false);

    useEffect(() => {
        const loadTeams = async () => {
            setIsLoadingTeams(true);
            try {
                const teams = await teamService.getUserTeams();
                setMyTeams(teams);
                // Auto-select first team if available
                if (teams.length > 0) {
                    setForm(prev => ({ ...prev, homeTeamId: teams[0].id }));
                }
            } catch (err) {
                console.error('Failed to load teams:', err);
            } finally {
                setIsLoadingTeams(false);
            }
        };
        loadTeams();
    }, []);

    const [form, setForm] = useState<FormData>({
        matchFormat: 'T20',
        homeTeamId: '',
        awayTeamId: '',
        awayTeamName: '',
        overs: 20,
        ballType: 'LEATHER',
        tossWinner: '',
        tossDecision: '',
        venue: '',
    });

    const updateForm = (updates: Partial<FormData>) => {
        setForm(prev => ({ ...prev, ...updates }));
        setError('');
    };

    // Derived helpers
    const getHomeTeamName = () => {
        const team = myTeams.find(t => t.id === form.homeTeamId);
        return team ? (team.shortName || team.name) : 'Home Team';
    };

    const getAwayTeamName = () => {
        return form.awayTeamName.trim() || 'Away Team';
    };

    const handleCheckCode = async (code: string) => {
        if (!code.trim()) {
            setAwayTeamDetails(null);
            setAwayCodeError('');
            updateForm({ awayTeamId: '', awayTeamName: '' });
            return;
        }
        setIsCheckingCode(true);
        setAwayCodeError('');
        try {
            const team = await teamService.getTeamByCode(code.trim());
            setAwayTeamDetails(team);
            updateForm({ awayTeamId: team.id, awayTeamName: team.name });
            setAwayCodeError('');
        } catch (err: any) {
            console.error('Code check error:', err);
            setAwayTeamDetails(null);
            setAwayCodeError('Invalid invite code. Try manual entry.');
            updateForm({ awayTeamId: '', awayTeamName: '' });
        } finally {
            setIsCheckingCode(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            const res = await api.post('/api/matches', {
                matchType: MATCH_TYPE_MAP[form.matchFormat],
                homeTeamId: form.homeTeamId,
                homeTeamName: getHomeTeamName(),
                awayTeamId: form.awayTeamId || undefined,
                awayTeamName: form.awayTeamName.trim(),
                overs: form.overs,
                ballType: BALL_TYPE_MAP[form.ballType],
                venue: form.venue,
            });
            const matchId = res.data?.match?.id ?? res.match?.id;
            if (matchId) {
                navigate(`/match/${matchId}/toss`);
            } else {
                navigate('/hub');
            }
        } catch (err: any) {
            // ApiError exposes err.data.message from backend JSON
            setError(err?.data?.message || err?.message || 'Failed to create match');
        } finally {
            setIsSubmitting(false);
        }
    };

    const matchFormats: { type: MatchFormat; label: string; overs: number; desc: string }[] = [
        { type: 'T20', label: 'T20', overs: 20, desc: '20 overs per side' },
        { type: 'ODI', label: 'ODI', overs: 50, desc: '50 overs per side' },
        { type: 'TEST', label: 'Test', overs: 90, desc: 'Unlimited overs' },
        { type: 'CUSTOM', label: 'Custom', overs: form.overs, desc: 'Set your own' },
    ];

    const ballTypes: { type: UIBallType; label: string }[] = [
        { type: 'LEATHER', label: 'Leather' },
        { type: 'TENNIS', label: 'Tennis' },
        { type: 'OTHER', label: 'Other' },
    ];

    return (
        <Container className="py-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
                    className="p-2 rounded-lg bg-secondary border border-border hover:bg-card transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Create Match</h1>
                    <p className="text-sm text-muted-foreground">Step {step} of 3</p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1.5 mb-8">
                {[1, 2].map(s => (
                    <div key={s} className={clsx(
                        "h-1 flex-1 rounded-full transition-colors",
                        s <= step ? "bg-primary" : "bg-secondary"
                    )} />
                ))}
            </div>

            {/* Step 1: Match Format */}
            {step === 1 && (
                <div className="space-y-6">
                    <SectionHeader icon={<ScrollText className="w-5 h-5 text-primary" />} title="Match Format" />

                    <div className="grid grid-cols-2 gap-3">
                        {matchFormats.map(f => (
                            <button
                                key={f.type}
                                onClick={() => updateForm({ matchFormat: f.type, overs: f.type !== 'CUSTOM' ? f.overs : form.overs })}
                                className={clsx(
                                    "p-4 rounded-xl border text-left transition-all active:scale-[0.97]",
                                    form.matchFormat === f.type
                                        ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                                        : "border-border bg-card hover:border-primary/30"
                                )}
                            >
                                <span className="text-lg font-bold">{f.label}</span>
                                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                            </button>
                        ))}
                    </div>

                    {/* Custom overs input */}
                    {form.matchFormat === 'CUSTOM' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Overs per side</label>
                            <input
                                type="number"
                                min={1}
                                max={90}
                                value={form.overs}
                                onChange={e => updateForm({ overs: parseInt(e.target.value) || 1 })}
                                className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-foreground font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </div>
                    )}

                    <SectionHeader icon={<CircleDot className="w-5 h-5 text-primary" />} title="Ball Type" />

                    <div className="grid grid-cols-3 gap-3">
                        {ballTypes.map(b => (
                            <button
                                key={b.type}
                                onClick={() => updateForm({ ballType: b.type })}
                                className={clsx(
                                    "p-3 rounded-xl border text-center font-medium transition-all active:scale-[0.97]",
                                    form.ballType === b.type
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border bg-card text-foreground hover:border-primary/30"
                                )}
                            >
                                {b.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setStep(2)}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm shadow-primary/20 mt-4"
                    >
                        Next
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Step 2: Teams + Venue */}
            {step === 2 && (
                <div className="space-y-6">
                    <SectionHeader icon={<Shield className="w-5 h-5 text-primary" />} title="Select Teams" />

                    <div className="space-y-4">
                        <div className="space-y-2 relative">
                            <label className="text-sm font-medium text-foreground">Home Team</label>
                            <div className="relative">
                                {isLoadingTeams ? (
                                    <div className="w-full h-12 flex items-center px-4 rounded-xl bg-secondary border border-border text-muted-foreground text-sm cursor-wait">
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Loading your teams...
                                    </div>
                                ) : myTeams.length === 0 ? (
                                    <div className="w-full h-12 flex items-center px-4 rounded-xl bg-secondary/50 border border-border text-muted-foreground text-sm">
                                        No teams found. Please create or join a team first.
                                    </div>
                                ) : (
                                    <select
                                        value={form.homeTeamId}
                                        onChange={e => updateForm({ homeTeamId: e.target.value })}
                                        className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none pr-10"
                                    >
                                        <option value="" disabled>Select your team</option>
                                        {myTeams.map(team => (
                                            <option key={team.id} value={team.id}>
                                                {team.name} {team.shortName ? `(${team.shortName})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {/* Custom arrow for select */}
                                {!isLoadingTeams && myTeams.length > 0 && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center">
                                <Swords className="w-4 h-4 text-muted-foreground" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground">Away Team (Opponent)</label>
                                <button
                                    onClick={() => {
                                        setIsManualAway(!isManualAway);
                                        setAwayCode('');
                                        setAwayTeamDetails(null);
                                        setAwayCodeError('');
                                        updateForm({ awayTeamId: '', awayTeamName: '' });
                                    }}
                                    className="text-xs text-primary font-medium hover:underline"
                                >
                                    {isManualAway ? 'Use Invite Code' : 'Enter Manually'}
                                </button>
                            </div>

                            {isManualAway ? (
                                <input
                                    type="text"
                                    value={form.awayTeamName}
                                    onChange={e => updateForm({ awayTeamName: e.target.value, awayTeamId: '' })}
                                    placeholder="Enter opponent team name"
                                    className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                            ) : (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={awayCode}
                                            onChange={e => {
                                                setAwayCode(e.target.value.toUpperCase());
                                                setAwayCodeError('');
                                            }}
                                            onBlur={() => handleCheckCode(awayCode)}
                                            placeholder="Enter 6-digit invite code"
                                            className={clsx(
                                                "w-full h-12 rounded-xl bg-secondary border px-4 font-mono uppercase focus:outline-none focus:ring-2",
                                                awayCodeError ? "border-destructive focus:ring-destructive/30" : "border-border focus:ring-primary/30 focus:border-primary"
                                            )}
                                            maxLength={6}
                                        />
                                        {isCheckingCode && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {awayCodeError && (
                                        <p className="text-xs font-medium text-destructive">{awayCodeError}</p>
                                    )}

                                    {awayTeamDetails && (
                                        <div className="p-3 bg-secondary/50 rounded-xl border border-border flex items-center gap-3 animate-in fade-in duration-200">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                                {awayTeamDetails.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-foreground">{awayTeamDetails.name}</p>
                                                <p className="text-xs text-muted-foreground">{awayTeamDetails.memberCount || 0} members</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Venue (Optional)</label>
                            <input
                                type="text"
                                value={form.venue}
                                onChange={e => updateForm({ venue: e.target.value })}
                                placeholder="e.g. Central Cricket Ground"
                                className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </div>
                    </div>

                    {/* Match Summary Card */}
                    {form.homeTeamId && form.awayTeamName.trim() && (
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-foreground">Match Summary</h3>
                            <div className="flex items-center justify-between">
                                <div className="text-center flex-1">
                                    <p className="font-bold text-foreground text-lg">{getHomeTeamName()}</p>
                                    <span className="text-xs text-muted-foreground">Home</span>
                                </div>
                                <div className="px-3">
                                    <Swords className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div className="text-center flex-1">
                                    <p className="font-bold text-foreground text-lg">{getAwayTeamName()}</p>
                                    <span className="text-xs text-muted-foreground">Away</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm pt-2 border-t border-border">
                                <div>
                                    <span className="text-xs text-muted-foreground">Format</span>
                                    <p className="font-medium text-foreground">{form.matchFormat}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground">Overs</span>
                                    <p className="font-medium text-foreground">{form.overs}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground">Ball</span>
                                    <p className="font-medium text-foreground">{form.ballType}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className="text-destructive text-sm text-center font-medium">{error}</p>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={!form.homeTeamId || !form.awayTeamName.trim() || isSubmitting}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Next: Toss
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            )}
        </Container>
    );
};

// --- Helpers ---

const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold">{title}</h2>
    </div>
);
