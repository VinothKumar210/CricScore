import React, { useState } from 'react';
import { X, Loader2, Trophy } from 'lucide-react';
import type { CreateTournamentInput } from '../tournamentAdminService';

interface TournamentCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: CreateTournamentInput) => Promise<string>;
}

/**
 * TournamentCreateModal — Bottom sheet / modal form for creating a tournament.
 */
export const TournamentCreateModal: React.FC<TournamentCreateModalProps> = React.memo(
    ({ isOpen, onClose, onCreate }) => {
        const [name, setName] = useState('');
        const [format, setFormat] = useState('ROUND_ROBIN');
        const [overs, setOvers] = useState(20);
        const [maxTeams, setMaxTeams] = useState(8);
        const [startDate, setStartDate] = useState('');
        const [description, setDescription] = useState('');
        const [ballType, setBallType] = useState('');
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [error, setError] = useState<string | null>(null);

        if (!isOpen) return null;

        const isValid = name.length >= 3 && name.length <= 50
            && overs >= 1 && overs <= 50
            && maxTeams >= 2 && maxTeams <= 32
            && startDate;

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!isValid || isSubmitting) return;

            setIsSubmitting(true);
            setError(null);
            try {
                await onCreate({
                    name,
                    format,
                    overs,
                    maxTeams,
                    startDate,
                    description: description || undefined,
                    ballType: ballType || undefined,
                });
                onClose();
            } catch (err: any) {
                setError(err?.message || 'Failed to create tournament');
            } finally {
                setIsSubmitting(false);
            }
        };

        const inputClass = "w-full h-11 rounded-xl bg-secondary border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
        const labelClass = "block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5";

        return (
            <>
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl p-5 shadow-2xl border-t border-border max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
                    <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />

                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-bold text-foreground">Create Tournament</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className={labelClass}>Tournament Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. T20 Premier League"
                                maxLength={50}
                                className={inputClass}
                            />
                        </div>

                        {/* Format */}
                        <div>
                            <label className={labelClass}>Format *</label>
                            <select
                                value={format}
                                onChange={e => setFormat(e.target.value)}
                                className={inputClass + " appearance-none cursor-pointer"}
                            >
                                <option value="ROUND_ROBIN">Round Robin</option>
                                <option value="KNOCKOUT">Knockout</option>
                            </select>
                        </div>

                        {/* Overs + Max Teams */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Overs *</label>
                                <input
                                    type="number"
                                    value={overs}
                                    onChange={e => setOvers(Number(e.target.value))}
                                    min={1} max={50}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Max Teams *</label>
                                <input
                                    type="number"
                                    value={maxTeams}
                                    onChange={e => setMaxTeams(Number(e.target.value))}
                                    min={2} max={32}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className={labelClass}>Start Date *</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className={inputClass}
                            />
                        </div>

                        {/* Ball Type */}
                        <div>
                            <label className={labelClass}>Ball Type</label>
                            <select
                                value={ballType}
                                onChange={e => setBallType(e.target.value)}
                                className={inputClass + " appearance-none cursor-pointer"}
                            >
                                <option value="">Not specified</option>
                                <option value="RED">Red</option>
                                <option value="WHITE">White</option>
                                <option value="TENNIS">Tennis</option>
                            </select>
                        </div>

                        {/* Description */}
                        <div>
                            <label className={labelClass}>Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                maxLength={200}
                                rows={2}
                                placeholder="Optional description..."
                                className="w-full rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </div>

                        {/* Error */}
                        {error && <p className="text-destructive text-sm text-center font-medium">{error}</p>}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={!isValid || isSubmitting}
                            className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold
                                       hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20
                                       disabled:opacity-40 disabled:cursor-not-allowed
                                       flex items-center justify-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSubmitting ? 'Creating...' : 'Create Tournament'}
                        </button>
                    </form>
                </div>
            </>
        );
    }
);

TournamentCreateModal.displayName = 'TournamentCreateModal';
