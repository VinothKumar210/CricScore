import { Sparkles } from 'lucide-react';

interface Props {
    narrative?: string;
    isLoading?: boolean;
}

export const PostMatchInsight = ({ narrative, isLoading }: Props) => {
    if (isLoading) {
        return (
            <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5 mt-4 animate-pulse h-24 flex items-center justify-center">
                <div className="flex items-center gap-2 text-primary/50 text-sm font-medium">
                    <Sparkles className="w-4 h-4 animate-spin" /> Analyzing match data...
                </div>
            </div>
        );
    }

    if (!narrative) return null;

    return (
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-5 mt-4 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 text-primary/10">
                <Sparkles className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" /> Match Insight
                </div>
                <p className="text-foreground text-sm leading-relaxed font-medium">
                    {narrative}
                </p>
            </div>
        </div>
    );
};
