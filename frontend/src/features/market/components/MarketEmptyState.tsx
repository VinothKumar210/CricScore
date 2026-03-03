import { Compass } from 'lucide-react';

export const MarketEmptyState = () => {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Compass className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
                No matches nearby
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
                Try increasing your search radius or adjusting filters to discover more teams.
            </p>
        </div>
    );
};
