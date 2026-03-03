export const MarketSkeleton = () => {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map(key => (
                <div key={key} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-secondary animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-4 w-28 bg-secondary rounded-lg animate-pulse" />
                                <div className="h-3 w-16 bg-secondary rounded-lg animate-pulse" />
                            </div>
                        </div>
                        <div className="h-6 w-14 bg-secondary rounded-lg animate-pulse" />
                    </div>

                    <div className="space-y-2 mb-3">
                        <div className="h-3 w-full bg-secondary rounded-lg animate-pulse" />
                        <div className="h-3 w-3/4 bg-secondary rounded-lg animate-pulse" />
                    </div>

                    <div className="flex gap-2 mb-4">
                        <div className="h-7 w-20 bg-secondary rounded-lg animate-pulse" />
                        <div className="h-7 w-20 bg-secondary rounded-lg animate-pulse" />
                        <div className="h-7 w-16 bg-secondary rounded-lg animate-pulse" />
                    </div>

                    <div className="pt-3 border-t border-border flex justify-end">
                        <div className="h-9 w-28 bg-secondary rounded-xl animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    );
};
