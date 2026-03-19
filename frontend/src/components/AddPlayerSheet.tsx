import { useState } from 'react';
import { api } from '../lib/api';
import { Loader2, X, Plus } from 'lucide-react';

interface AddPlayerSheetProps {
    teamId: string;
    teamName: string;
    onClose: () => void;
    onSuccess: (newPlayer: any) => void;
}

export const AddPlayerSheet = ({ teamId, teamName, onClose, onSuccess }: AddPlayerSheetProps) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('BATSMAN');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Name is required');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // Assume POST /api/teams/:id/guest-players
            const res = await api.post(`/api/teams/${teamId}/guest-players`, {
                name: name.trim(),
                phone: phone.trim() || undefined,
                role
            });

            onSuccess(res.data?.player || res.player || res);
        } catch (err: any) {
            setError(err?.data?.message || err.message || 'Failed to add player');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Sheet Content */}
            <div className="relative w-full max-w-md bg-card border-x border-t sm:border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300">
                {/* Drag Handle (Mobile) */}
                <div className="w-12 h-1.5 bg-secondary rounded-full mx-auto mb-6 sm:hidden" />

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold">Add Player</h2>
                        <p className="text-sm text-muted-foreground mt-1">To {teamName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive rounded-xl">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Player Name *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter full name"
                            className="w-full h-12 px-4 rounded-xl bg-secondary border border-border focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none transition-shadow"
                            autoFocus // Focus when sheet opens
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Role</label>
                            <div className="relative">
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full h-12 px-4 pr-10 appearance-none rounded-xl bg-secondary border border-border focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none transition-shadow text-sm font-medium"
                                >
                                    <option value="BATSMAN">Batsman</option>
                                    <option value="BOWLER">Bowler</option>
                                    <option value="ALL_ROUNDER">All-rounder</option>
                                    <option value="WICKET_KEEPER">Wicket Keeper</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Phone (Optional)</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+91"
                                className="w-full h-12 px-4 rounded-xl bg-secondary border border-border focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none transition-shadow text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !name.trim()}
                        className="w-full h-12 mt-4 rounded-xl font-bold bg-primary text-primary-foreground flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-primary/20"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                Add Player
                            </>
                        )}
                    </button>
                    <p className="text-xs text-center text-muted-foreground mt-4 pb-2">
                        This player will be added as a Guest to your team.
                    </p>
                </form>
            </div>
        </div>
    );
};
