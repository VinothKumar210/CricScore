import { useState } from 'react';
import type { MarketMatch } from '../marketService';
import { useMarketStore } from '../marketStore';
import { Calendar, MapPin, Clock, Loader2, Send, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
    match: MarketMatch;
    currentTeamId?: string;
}

export const MarketMatchCard: React.FC<Props> = ({ match, currentTeamId = 'temp-team-id' }) => {
    const { sendMatchInvite } = useMarketStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const myResponse = match.responses?.find(r => r.responderTeamId === currentTeamId);

    let buttonState: 'INVITE' | 'SENT' | 'JOINED' | 'FULL' = 'INVITE';
    if (myResponse) {
        if (myResponse.status === 'ACCEPTED') buttonState = 'JOINED';
        else if (myResponse.status === 'PENDING') buttonState = 'SENT';
    } else if (match.status === 'CLOSED') {
        buttonState = 'FULL';
    }

    const handleInvite = async () => {
        if (buttonState !== 'INVITE' || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await sendMatchInvite(match, currentTeamId);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getInitial = (name: string) => name.charAt(0).toUpperCase();

    const getButtonConfig = () => {
        switch (buttonState) {
            case 'SENT':
                return { label: 'Invite Sent', icon: <CheckCircle className="w-4 h-4" />, style: 'bg-secondary text-muted-foreground cursor-not-allowed' };
            case 'JOINED':
                return { label: 'Joined', icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, style: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-not-allowed' };
            case 'FULL':
                return { label: 'Match Full', icon: null, style: 'bg-secondary text-muted-foreground cursor-not-allowed' };
            default:
                return { label: 'Send Invite', icon: <Send className="w-4 h-4" />, style: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20 active:scale-[0.98]' };
        }
    };

    const btn = getButtonConfig();

    return (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all">
            {/* Header: Team + Ball Type */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        {match.team.logoUrl ? (
                            <img src={match.team.logoUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                        ) : (
                            <span className="text-primary font-bold text-lg">{getInitial(match.team.name)}</span>
                        )}
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">{match.team.name}</h4>
                        <span className="text-xs text-muted-foreground">
                            {match.team.reliability !== undefined ? `${match.team.reliability}% reliable` : 'New Team'}
                        </span>
                    </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-secondary border border-border text-muted-foreground tracking-wider">
                    {match.ballType ? match.ballType.charAt(0) + match.ballType.slice(1).toLowerCase() : 'Any'}
                </span>
            </div>

            {/* Message */}
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {match.message || "Looking for a competitive match this weekend."}
            </p>

            {/* Details Grid */}
            <div className="flex flex-wrap gap-3 mb-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 bg-secondary rounded-lg px-2.5 py-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    {match.preferredDate
                        ? new Date(match.preferredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'Any Date'}
                </span>
                <span className="flex items-center gap-1.5 bg-secondary rounded-lg px-2.5 py-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {match.overs ? `${match.overs} Overs` : 'Any'}
                </span>
                <span className="flex items-center gap-1.5 bg-secondary rounded-lg px-2.5 py-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    ~{Math.round(match.radius || 0)}km
                </span>
            </div>

            {/* Footer: Invite Button */}
            <div className="pt-3 border-t border-border flex justify-end">
                <button
                    onClick={handleInvite}
                    disabled={buttonState !== 'INVITE' || isSubmitting}
                    className={clsx(
                        "font-semibold text-sm py-2 px-5 rounded-xl transition-all flex items-center gap-2",
                        btn.style
                    )}
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : btn.icon}
                    {isSubmitting ? 'Sending...' : btn.label}
                </button>
            </div>
        </div>
    );
};
