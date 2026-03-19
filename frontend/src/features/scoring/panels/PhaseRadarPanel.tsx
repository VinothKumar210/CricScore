import { useScoringStore } from "../scoringStore";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { deriveBatsmanPhaseRate } from "../engine/analytics/deriveBatsmanPhaseRate";
import { ActivitySquare } from 'lucide-react';

export const PhaseRadarPanel = () => {
    const events = useScoringStore(s => s.events);
    const derivedState = useScoringStore(s => s.derivedState);
    if (!derivedState) return null;

    const targetEvents = events.filter(e => e.type !== 'PHASE_CHANGE' && e.type !== 'INTERRUPTION');
    
    // We can use deriveBatsmanPhaseRate for the whole team! Just don't pass batsmanId
    const phaseRates = deriveBatsmanPhaseRate(targetEvents);

    const data = [
        {
            subject: 'Powerplay',
            Runs: phaseRates.powerplay.runs,
            Dots: phaseRates.powerplay.dots,
            Boundaries: phaseRates.powerplay.boundaries * 4, // Weighted visual
        },
        {
            subject: 'Middle',
            Runs: phaseRates.middleOvers.runs,
            Dots: phaseRates.middleOvers.dots,
            Boundaries: phaseRates.middleOvers.boundaries * 4,
        },
        {
            subject: 'Death',
            Runs: phaseRates.deathOvers.runs,
            Dots: phaseRates.deathOvers.dots,
            Boundaries: phaseRates.deathOvers.boundaries * 4,
        }
    ];

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
             <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <ActivitySquare className="w-5 h-5 text-teal-500" />
                    Phase Radar
                </h3>
            </div>
            
            <div className="flex-1 w-full min-h-[250px] relative mt-2 bg-card rounded-xl shadow-inner flex justify-center items-center p-2">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontWeight: 600 }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                        
                        <Radar name="Runs" dataKey="Runs" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                        <Radar name="Dots" dataKey="Dots" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.6} />
                        <Radar name="Boundaries Val" dataKey="Boundaries" stroke="#a855f7" fill="#a855f7" fillOpacity={0.6} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
