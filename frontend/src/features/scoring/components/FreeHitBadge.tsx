import { clsx } from 'clsx';

/**
 * FreeHitBadge — Pulsing badge displayed when the next ball is a free hit.
 * If the free-hit ball is also a no-ball, the next ball remains a free hit.
 */
export const FreeHitBadge = ({ isFreeHit }: { isFreeHit: boolean }) => {
    if (!isFreeHit) return null;

    return (
        <div className={clsx(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider",
            "bg-amber-500/20 text-amber-400 border border-amber-500/30",
            "animate-pulse shadow-sm shadow-amber-500/10"
        )}>
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            FREE HIT
        </div>
    );
};
