import React from 'react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon?: string;
    highlight?: boolean;
    subtext?: string;
}

/**
 * StatCard — Premium stat tile with gradient accent on highlight.
 */
export const StatCard: React.FC<StatCardProps> = React.memo(({
    label, value, icon, highlight = false, subtext,
}) => {
    return (
        <div className={`
            relative rounded-xl p-3 text-center overflow-hidden transition-all
            ${highlight
                ? 'bg-gradient-to-br from-brand/10 to-brand/5 border border-brand/20 ring-1 ring-brand/10'
                : 'bg-card border border-border/50'
            }
        `}>
            {highlight && (
                <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-brand/15 to-transparent
                                rounded-full blur-md" />
            )}
            <div className="relative">
                {icon && <span className="text-base mb-1 block">{icon}</span>}
                <p className={`text-lg font-black tabular-nums ${highlight ? 'text-primary' : 'text-foreground'}`}>
                    {value}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 uppercase tracking-wider">
                    {label}
                </p>
                {subtext && (
                    <p className="text-[9px] text-muted-foreground mt-0.5">{subtext}</p>
                )}
            </div>
        </div>
    );
});

StatCard.displayName = 'StatCard';
