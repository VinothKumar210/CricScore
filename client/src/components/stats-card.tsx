import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    subtext?: string;
    className?: string;
}

export function StatsCard({ title, value, icon, subtext, className }: StatsCardProps) {
    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardContent className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">{title}</p>
                        <h3 className="text-2xl font-bold mt-1">{value}</h3>
                        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
                    </div>
                    {icon && <div className="text-primary opacity-20">{icon}</div>}
                </div>
            </CardContent>
        </Card>
    );
}
