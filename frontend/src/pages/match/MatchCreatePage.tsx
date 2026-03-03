import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../../components/ui/Container';
import { api } from '../../lib/api';
import {
    ChevronLeft, Loader2, Swords, Clock, CircleDot,
    Shield, ScrollText, ArrowRight
} from 'lucide-react';
import { clsx } from 'clsx';

type MatchType = 'T20' | 'ODI' | 'TEST' | 'CUSTOM';
type BallType = 'LEATHER' | 'TENNIS' | 'OTHER';
type TossDecision = 'BAT' | 'BOWL';

interface FormData {
    matchType: MatchType;
    homeTeamId: string;
    awayTeamId: string;
    overs: number;
    ballType: BallType;
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

    const [form, setForm] = useState<FormData>({
        matchType: 'T20',
        homeTeamId: '',
        awayTeamId: '',
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

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            const res = await api.post('/matches', {
                matchType: form.matchType,
                homeTeamId: form.homeTeamId,
                awayTeamId: form.awayTeamId,
                overs: form.overs,
                ballType: form.ballType,
                tossWinner: form.tossWinner === 'HOME' ? form.homeTeamId : form.awayTeamId,
                tossDecision: form.tossDecision,
                venue: form.venue,
            });
            const matchId = res.data?.match?.id;
            if (matchId) {
                navigate(`/match/${matchId}/score`);
            } else {
                navigate('/hub');
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to create match');
        } finally {
            setIsSubmitting(false);
        }
    };

    const matchFormats: { type: MatchType; label: string; overs: number; desc: string }[] = [
        { type: 'T20', label: 'T20', overs: 20, desc: '20 overs per side' },
        { type: 'ODI', label: 'ODI', overs: 50, desc: '50 overs per side' },
        { type: 'TEST', label: 'Test', overs: 90, desc: 'Unlimited overs' },
        { type: 'CUSTOM', label: 'Custom', overs: form.overs, desc: 'Set your own' },
    ];

    const ballTypes: { type: BallType; label: string }[] = [
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
                {[1, 2, 3].map(s => (
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
                                onClick={() => updateForm({ matchType: f.type, overs: f.type !== 'CUSTOM' ? f.overs : form.overs })}
                                className={clsx(
                                    "p-4 rounded-xl border text-left transition-all active:scale-[0.97]",
                                    form.matchType === f.type
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
                    {form.matchType === 'CUSTOM' && (
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
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Home Team ID</label>
                            <input
                                type="text"
                                value={form.homeTeamId}
                                onChange={e => updateForm({ homeTeamId: e.target.value })}
                                placeholder="Enter home team ID"
                                className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </div>

                        <div className="flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center">
                                <Swords className="w-4 h-4 text-muted-foreground" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Away Team ID</label>
                            <input
                                type="text"
                                value={form.awayTeamId}
                                onChange={e => updateForm({ awayTeamId: e.target.value })}
                                placeholder="Enter away team ID"
                                className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
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

                    <button
                        onClick={() => {
                            if (!form.homeTeamId || !form.awayTeamId) {
                                setError('Please select both teams');
                                return;
                            }
                            if (form.homeTeamId === form.awayTeamId) {
                                setError('Teams must be different');
                                return;
                            }
                            setStep(3);
                        }}
                        disabled={!form.homeTeamId || !form.awayTeamId}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        Next
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Step 3: Toss + Confirm */}
            {step === 3 && (
                <div className="space-y-6">
                    <SectionHeader icon={<Clock className="w-5 h-5 text-primary" />} title="Toss (Optional)" />

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => updateForm({ tossWinner: 'HOME' })}
                            className={clsx(
                                "p-4 rounded-xl border text-center transition-all",
                                form.tossWinner === 'HOME'
                                    ? "border-primary bg-primary/10"
                                    : "border-border bg-card hover:border-primary/30"
                            )}
                        >
                            <span className="font-semibold">Home</span>
                            <p className="text-xs text-muted-foreground mt-0.5">Won Toss</p>
                        </button>
                        <button
                            onClick={() => updateForm({ tossWinner: 'AWAY' })}
                            className={clsx(
                                "p-4 rounded-xl border text-center transition-all",
                                form.tossWinner === 'AWAY'
                                    ? "border-primary bg-primary/10"
                                    : "border-border bg-card hover:border-primary/30"
                            )}
                        >
                            <span className="font-semibold">Away</span>
                            <p className="text-xs text-muted-foreground mt-0.5">Won Toss</p>
                        </button>
                    </div>

                    {form.tossWinner && (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => updateForm({ tossDecision: 'BAT' })}
                                className={clsx(
                                    "p-3 rounded-xl border text-center font-medium transition-all",
                                    form.tossDecision === 'BAT'
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border bg-card text-foreground hover:border-primary/30"
                                )}
                            >
                                Elected to Bat
                            </button>
                            <button
                                onClick={() => updateForm({ tossDecision: 'BOWL' })}
                                className={clsx(
                                    "p-3 rounded-xl border text-center font-medium transition-all",
                                    form.tossDecision === 'BOWL'
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border bg-card text-foreground hover:border-primary/30"
                                )}
                            >
                                Elected to Bowl
                            </button>
                        </div>
                    )}

                    {/* Summary card */}
                    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Match Summary</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <SummaryItem label="Format" value={form.matchType} />
                            <SummaryItem label="Overs" value={String(form.overs)} />
                            <SummaryItem label="Ball" value={form.ballType} />
                            <SummaryItem label="Venue" value={form.venue || 'Not set'} />
                        </div>
                    </div>

                    {error && (
                        <p className="text-destructive text-sm text-center font-medium">{error}</p>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Swords className="w-4 h-4" />
                                Start Match
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

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
    <div>
        <span className="text-xs text-muted-foreground">{label}</span>
        <p className="font-medium text-foreground">{value}</p>
    </div>
);
