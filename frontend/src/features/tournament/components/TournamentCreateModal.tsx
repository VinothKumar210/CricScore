import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { X, Loader2 } from 'lucide-react';
import type { CreateTournamentInput } from '../tournamentAdminService';

interface TournamentCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: CreateTournamentInput) => Promise<string>;
}

/**
 * TournamentCreateModal — Modal form for creating a tournament.
 * Validates locally, submits via tournamentAdminStore.createTournament.
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

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <Card padding="lg" className="w-full max-w-md max-h-[90vh] overflow-y-auto relative">
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-1 text-textSecondary hover:text-textPrimary"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <h2 className="text-lg font-bold text-textPrimary mb-4">Create Tournament</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-xs font-medium text-textSecondary mb-1">
                                Tournament Name *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. T20 Premier League"
                                maxLength={50}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm
                                           focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                            />
                        </div>

                        {/* Format */}
                        <div>
                            <label className="block text-xs font-medium text-textSecondary mb-1">Format *</label>
                            <select
                                value={format}
                                onChange={e => setFormat(e.target.value)}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm
                                           focus:outline-none focus:ring-2 focus:ring-brand/30"
                            >
                                <option value="ROUND_ROBIN">Round Robin</option>
                                <option value="KNOCKOUT">Knockout</option>
                            </select>
                        </div>

                        {/* Overs + Max Teams */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-textSecondary mb-1">Overs *</label>
                                <input
                                    type="number"
                                    value={overs}
                                    onChange={e => setOvers(Number(e.target.value))}
                                    min={1} max={50}
                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm
                                               focus:outline-none focus:ring-2 focus:ring-brand/30"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-textSecondary mb-1">Max Teams *</label>
                                <input
                                    type="number"
                                    value={maxTeams}
                                    onChange={e => setMaxTeams(Number(e.target.value))}
                                    min={2} max={32}
                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm
                                               focus:outline-none focus:ring-2 focus:ring-brand/30"
                                />
                            </div>
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className="block text-xs font-medium text-textSecondary mb-1">Start Date *</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm
                                           focus:outline-none focus:ring-2 focus:ring-brand/30"
                            />
                        </div>

                        {/* Ball Type */}
                        <div>
                            <label className="block text-xs font-medium text-textSecondary mb-1">Ball Type</label>
                            <select
                                value={ballType}
                                onChange={e => setBallType(e.target.value)}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm
                                           focus:outline-none focus:ring-2 focus:ring-brand/30"
                            >
                                <option value="">Not specified</option>
                                <option value="RED">Red</option>
                                <option value="WHITE">White</option>
                                <option value="TENNIS">Tennis</option>
                            </select>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-medium text-textSecondary mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                maxLength={200}
                                rows={2}
                                placeholder="Optional description..."
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm
                                           resize-none focus:outline-none focus:ring-2 focus:ring-brand/30"
                            />
                        </div>

                        {/* Error */}
                        {error && <p className="text-xs text-danger font-medium">{error}</p>}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={!isValid || isSubmitting}
                            className="w-full py-2.5 bg-brand text-white rounded-lg text-sm font-semibold
                                       hover:bg-brand/90 transition-colors
                                       disabled:opacity-40 disabled:cursor-not-allowed
                                       flex items-center justify-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSubmitting ? 'Creating...' : 'Create Tournament'}
                        </button>
                    </form>
                </Card>
            </div>
        );
    }
);

TournamentCreateModal.displayName = 'TournamentCreateModal';
