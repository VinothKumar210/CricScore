
import { clsx } from 'clsx';

interface SparklineProps {
    data: number[];
    type: 'batting' | 'bowling';
}

export const FormSparkline = ({ data, type }: SparklineProps) => {
    if (!data || data.length === 0) return null;

    // Fixed height for relative scaling
    const containerHeight = 24;
    const maxVal = Math.max(...data, 1);


    return (
        <div className="flex items-end gap-1" style={{ height: containerHeight }}>
            {data.map((val, idx) => {
                const percentage = (val / maxVal);
                const barHeight = Math.max(percentage * containerHeight, 2);

                return (
                    <div
                        key={idx}
                        className={clsx(
                            "flex-1 rounded-t-sm transition-all duration-300",
                            type === 'batting' ? "bg-primary/80 hover:bg-primary" : "bg-emerald-500/80 hover:bg-emerald-500"
                        )}
                        style={{ height: barHeight }}
                        title={`${val} ${type === 'batting' ? 'runs' : 'wickets'}`}
                    />
                );
            })}
        </div>
    );
};
