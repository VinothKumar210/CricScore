import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useArchiveStore } from '../archiveStore';

/**
 * ArchiveFilters — Team name + Tournament search with debounce.
 * Calls archiveStore.setFilters() which re-fetches from page 1.
 */
export const ArchiveFilters: React.FC = React.memo(() => {
    const filters = useArchiveStore(s => s.filters);
    const setFilters = useArchiveStore(s => s.setFilters);

    const [teamInput, setTeamInput] = useState(filters.teamName || '');
    const [tournamentInput, setTournamentInput] = useState(filters.tournament || '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const debouncedSetFilters = useCallback(
        (updates: { teamName?: string; tournament?: string }) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                setFilters(updates);
            }, 300);
        },
        [setFilters],
    );

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const handleTeamChange = (value: string) => {
        setTeamInput(value);
        debouncedSetFilters({ teamName: value || undefined });
    };

    const handleTournamentChange = (value: string) => {
        setTournamentInput(value);
        debouncedSetFilters({ tournament: value || undefined });
    };

    const handleClear = () => {
        setTeamInput('');
        setTournamentInput('');
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setFilters({ teamName: undefined, tournament: undefined });
    };

    const hasFilters = teamInput || tournamentInput;

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <input
                type="text"
                value={teamInput}
                onChange={e => handleTeamChange(e.target.value)}
                placeholder="Filter by team..."
                className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm
                           text-textPrimary placeholder:text-textSecondary
                           focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand
                           w-40"
            />
            <input
                type="text"
                value={tournamentInput}
                onChange={e => handleTournamentChange(e.target.value)}
                placeholder="Tournament..."
                className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm
                           text-textPrimary placeholder:text-textSecondary
                           focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand
                           w-40"
            />
            {hasFilters && (
                <button
                    onClick={handleClear}
                    className="px-3 py-1.5 text-xs font-medium text-textSecondary bg-surface
                               border border-border rounded-lg hover:bg-gray-100 transition-colors"
                >
                    Clear
                </button>
            )}
        </div>
    );
});

ArchiveFilters.displayName = 'ArchiveFilters';
