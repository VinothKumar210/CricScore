import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Loader2, Search, UserPlus, Star, Shield } from 'lucide-react';
import type { PlayingXIPlayer } from '../pages/match/SelectPlayingXIPage';
import { AddPlayerSheet } from './AddPlayerSheet';
import { clsx } from 'clsx';

interface PlayerSelectorProps {
    teamId: string;
    teamName: string;
    selectedPlayers: PlayingXIPlayer[];
    onChange: (players: PlayingXIPlayer[]) => void;
}

export const PlayerSelector = ({ teamId, teamName, selectedPlayers, onChange }: PlayerSelectorProps) => {
    const [members, setMembers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

    const loadMembers = async () => {
        setIsLoading(true);
        try {
            // Can be full team ID or local name
            if (!teamId) {
                // Ad-hoc local team
                setMembers([]);
                return;
            }
            const res = await api.get(`/api/teams/${teamId}/members`);
            setMembers(res.data?.members || res.members || []);
        } catch (err) {
            console.error('Failed to load members:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMembers();
    }, [teamId]);

    const isSelected = (playerId: string) => selectedPlayers.some(p => p.playerId === playerId);

    const togglePlayer = (member: any) => {
        const id = member.userId || member.id;
        if (isSelected(id)) {
            onChange(selectedPlayers.filter(p => p.playerId !== id));
        } else {
            if (selectedPlayers.length >= 11) return; // Max 11
            
            // Auto-assign captain/wk if empty
            const isFirst = selectedPlayers.length === 0;
            const isSecond = selectedPlayers.length === 1;

            onChange([...selectedPlayers, {
                playerId: id,
                playerName: member.user?.name || member.name,
                playerType: member.role === 'GUEST' ? 'GUEST' : 'REGISTERED',
                role: member.cricketRole || member.role, // from team member or guest player
                isCaptain: isFirst,
                isWicketKeeper: isSecond
            }]);
        }
    };

    const toggleCaptain = (playerId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selectedPlayers.map(p => ({
            ...p,
            isCaptain: p.playerId === playerId
        })));
    };

    const toggleWK = (playerId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selectedPlayers.map(p => ({
            ...p,
            isWicketKeeper: p.playerId === playerId
        })));
    };

    const handleNewPlayer = (newPlayer: any) => {
        // Assume it's a guest player returned by POST /teams/:id/guest-players
        setMembers(prev => [...prev, newPlayer]);
        if (selectedPlayers.length < 11) {
            togglePlayer(newPlayer);
        }
        setIsAddSheetOpen(false);
    };

    const filteredMembers = members.filter(m => {
        const name = m.user?.name || m.name || '';
        return name.toLowerCase().includes(search.toLowerCase());
    });

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Search and Add */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search players..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-11 bg-secondary rounded-xl pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
                <button
                    onClick={() => setIsAddSheetOpen(true)}
                    className="h-11 px-4 bg-primary/10 text-primary font-medium rounded-xl flex items-center gap-2 hover:bg-primary/20 transition-colors shrink-0"
                >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Player</span>
                </button>
            </div>

            {/* Selection Counter */}
            <div className="flex justify-between items-end mb-4 px-1">
                <h3 className="font-semibold">{teamName} Squad</h3>
                <span className={clsx(
                    "text-sm font-medium px-2 py-0.5 rounded-full",
                    selectedPlayers.length === 11 ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                )}>
                    {selectedPlayers.length} / 11 Selected
                </span>
            </div>

            {/* Player List */}
            {members.length === 0 ? (
                <div className="text-center py-12 px-4 bg-secondary/30 rounded-2xl border border-dashed border-border/50">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                        <UserPlus className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1">No players found</h3>
                    <p className="text-sm text-muted-foreground mb-4">Add players to this team to select them for the match.</p>
                    <button onClick={() => setIsAddSheetOpen(true)} className="text-primary font-medium text-sm">
                        + Add New Player
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredMembers.map(member => {
                        const id = member.userId || member.id;
                        const name = member.user?.name || member.name;
                        const role = member.role === 'CAPTAIN' ? 'C' : member.cricketRole || member.role;
                        const selected = isSelected(id);
                        const selectedData = selectedPlayers.find(p => p.playerId === id);

                        return (
                            <div
                                key={id}
                                onClick={() => togglePlayer(member)}
                                className={clsx(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                    selected ? "bg-card border-primary" : "bg-card bg-opacity-50 border-border hover:border-primary/30"
                                )}
                            >
                                {/* Checkbox / Avatar */}
                                <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors shrink-0",
                                    selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                                )}>
                                    {name.substring(0, 2).toUpperCase()}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold truncate text-sm">{name}</p>
                                        {role && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground font-medium uppercase shrink-0">
                                                {role.replace('_', ' ')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {member.user?.phone || member.phone || 'No phone'}
                                    </p>
                                </div>

                                {/* Tags (C/WK) */}
                                {selected && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={(e) => toggleCaptain(id, e)}
                                            className={clsx(
                                                "w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm",
                                                selectedData?.isCaptain ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground hover:bg-amber-500/20"
                                            )}
                                        >
                                            <Star className={clsx("w-4 h-4", selectedData?.isCaptain && "fill-current")} />
                                        </button>
                                        <button
                                            onClick={(e) => toggleWK(id, e)}
                                            className={clsx(
                                                "w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm",
                                                selectedData?.isWicketKeeper ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground hover:bg-emerald-500/20"
                                            )}
                                        >
                                            <Shield className={clsx("w-4 h-4", selectedData?.isWicketKeeper && "fill-current")} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {isAddSheetOpen && (
                <AddPlayerSheet
                    teamId={teamId}
                    teamName={teamName}
                    onClose={() => setIsAddSheetOpen(false)}
                    onSuccess={handleNewPlayer}
                />
            )}
        </div>
    );
};
