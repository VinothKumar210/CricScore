import { useMatchDetailStore } from "../matchDetailStore";
import { typography } from "../../../constants/typography";
import { clsx } from "clsx";
import type { Innings, BattingEntry, BowlingEntry } from "../types/domainTypes";

export const MatchScorecardTab = () => {
    const { match } = useMatchDetailStore();
    if (!match) return null;

    return (
        <div className="space-y-6 py-4">
            {match.innings.map((inning, index) => (
                <InningsBlock key={index} inning={inning} index={index} />
            ))}
        </div>
    );
};

const InningsBlock = ({ inning, index }: { inning: Innings; index: number }) => {
    return (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-gray-50/50">
                <h3 className={clsx(typography.headingMd)}>
                    Innings {index + 1}
                </h3>
            </div>

            <BattingTable batting={inning.batting} />
            <ExtrasRow extras={inning.extras} />
            <TotalRow
                runs={inning.totalRuns}
                wickets={inning.totalWickets}
                overs={inning.totalOvers}
            />
            <BowlingTable bowling={inning.bowling} />
        </div>
    );
};

const BattingTable = ({ batting }: { batting: BattingEntry[] }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-surface text-textSecondary border-b border-border">
                    <tr className="h-10 text-left">
                        <th className="px-4 font-medium w-[40%]">Batter</th>
                        <th className="text-right px-2 font-medium">R</th>
                        <th className="text-right px-2 font-medium">B</th>
                        <th className="text-right px-2 font-medium hidden sm:table-cell">4s</th>
                        <th className="text-right px-2 font-medium hidden sm:table-cell">6s</th>
                        <th className="text-right px-4 font-medium">SR</th>
                    </tr>
                </thead>
                <tbody>
                    {batting.map((player) => (
                        <tr
                            key={player.playerId}
                            className="h-10 border-b border-border last:border-none hover:bg-gray-50/50"
                        >
                            <td className="px-4 py-2">
                                <div className="font-medium text-textPrimary">{player.name}</div>
                                {player.dismissal && (
                                    <div className="text-xs text-textSecondary truncate max-w-[120px] sm:max-w-none">
                                        {player.dismissal}
                                    </div>
                                )}
                            </td>
                            <td className="text-right px-2 tabular-nums font-semibold">{player.runs}</td>
                            <td className="text-right px-2 tabular-nums text-textSecondary">{player.balls}</td>
                            <td className="text-right px-2 tabular-nums text-textSecondary hidden sm:table-cell">{player.fours}</td>
                            <td className="text-right px-2 tabular-nums text-textSecondary hidden sm:table-cell">{player.sixes}</td>
                            <td className="text-right px-4 tabular-nums text-textSecondary">{player.strikeRate.toFixed(1)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const ExtrasRow = ({ extras }: { extras: number }) => (
    <div className="px-4 py-2 text-sm text-textSecondary flex justify-between items-center bg-gray-50/30">
        <span>Extras</span>
        <span className="font-medium">{extras}</span>
    </div>
);

const TotalRow = ({
    runs,
    wickets,
    overs,
}: {
    runs: number;
    wickets: number;
    overs: string;
}) => (
    <div className="px-4 py-3 bg-surface border-t border-b border-border flex justify-between font-semibold text-textPrimary">
        <span>Total</span>
        <span className="tabular-nums">
            {runs}/{wickets} <span className="text-textSecondary font-normal ml-1">({overs} Ov)</span>
        </span>
    </div>
);

const BowlingTable = ({ bowling }: { bowling: BowlingEntry[] }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-surface text-textSecondary border-b border-border">
                    <tr className="h-10 text-left">
                        <th className="px-4 font-medium w-[40%]">Bowler</th>
                        <th className="text-right px-2 font-medium">O</th>
                        <th className="text-right px-2 font-medium">M</th>
                        <th className="text-right px-2 font-medium">R</th>
                        <th className="text-right px-2 font-medium">W</th>
                        <th className="text-right px-4 font-medium">Econ</th>
                    </tr>
                </thead>
                <tbody>
                    {bowling.map((player) => (
                        <tr
                            key={player.playerId}
                            className="h-10 border-b border-border last:border-none hover:bg-gray-50/50"
                        >
                            <td className="px-4 font-medium text-textPrimary">{player.name}</td>
                            <td className="text-right px-2 tabular-nums">{player.overs}</td>
                            <td className="text-right px-2 tabular-nums text-textSecondary">{player.maidens}</td>
                            <td className="text-right px-2 tabular-nums text-textSecondary">{player.runs}</td>
                            <td className="text-right px-2 tabular-nums font-bold text-textPrimary">{player.wickets}</td>
                            <td className="text-right px-4 tabular-nums text-textSecondary">{player.economy.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
