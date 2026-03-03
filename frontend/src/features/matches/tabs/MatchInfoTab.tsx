import { useMatchDetailStore } from "../matchDetailStore";
import { Calendar, Shield, Users, Clock, CircleDot, Hash } from 'lucide-react';

/**
 * MatchInfoTab — General match information.
 * Shows: date/time, venue, format, teams with player lists.
 */
export const MatchInfoTab = () => {
    const { match } = useMatchDetailStore();
    if (!match) return null;

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return {
            date: d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
        };
    };

    const { date, time } = formatDate(match.startTime);

    return (
        <div className="py-4 space-y-4">
            {/* Match Details Card */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground">Match Details</h3>
                </div>
                <div className="p-4 space-y-4">
                    <InfoRow icon={<Calendar className="w-4 h-4 text-primary" />} label="Date" value={date} />
                    <InfoRow icon={<Clock className="w-4 h-4 text-primary" />} label="Time" value={time} />
                    <InfoRow icon={<Shield className="w-4 h-4 text-primary" />} label="Tournament" value={match.tournamentName || 'Friendly Match'} />
                    <InfoRow icon={<Hash className="w-4 h-4 text-primary" />} label="Match ID" value={match.id} />
                    <InfoRow icon={<CircleDot className="w-4 h-4 text-primary" />} label="Phase" value={match.phase || 'Regular'} />
                </div>
            </div>

            {/* Teams Card */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Teams
                    </h3>
                </div>
                <div className="divide-y divide-border">
                    {/* Team A */}
                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {match.teamA.shortName || match.teamA.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <span className="font-semibold text-foreground">{match.teamA.name}</span>
                                {match.teamA.shortName && (
                                    <span className="text-xs text-muted-foreground ml-2">({match.teamA.shortName})</span>
                                )}
                            </div>
                        </div>
                        {match.teamA.players && match.teamA.players.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5">
                                {match.teamA.players.map((p, i) => (
                                    <span key={p.id} className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <span className="text-[10px] text-muted-foreground/50 tabular-nums w-4">{i + 1}.</span>
                                        {p.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Team B */}
                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                                {match.teamB.shortName || match.teamB.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <span className="font-semibold text-foreground">{match.teamB.name}</span>
                                {match.teamB.shortName && (
                                    <span className="text-xs text-muted-foreground ml-2">({match.teamB.shortName})</span>
                                )}
                            </div>
                        </div>
                        {match.teamB.players && match.teamB.players.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5">
                                {match.teamB.players.map((p, i) => (
                                    <span key={p.id} className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <span className="text-[10px] text-muted-foreground/50 tabular-nums w-4">{i + 1}.</span>
                                        {p.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Info Row ---
const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-center gap-3">
        {icon}
        <div className="flex-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <p className="text-sm font-medium text-foreground">{value}</p>
        </div>
    </div>
);
