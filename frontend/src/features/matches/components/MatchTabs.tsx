import { NavLink, useParams } from "react-router-dom";
import { clsx } from "clsx";

/**
 * MatchTabs — Pill-style tab navigation for match detail.
 */
export const MatchTabs = () => {
    const { id } = useParams<{ id: string }>();

    const tabs = [
        { label: "Summary", path: `/match/${id}` },
        { label: "Scorecard", path: `/match/${id}/scorecard` },
        { label: "Analytics", path: `/match/${id}/analytics` },
        { label: "Info", path: `/match/${id}/info` },
    ];

    return (
        <div className="flex bg-secondary rounded-xl p-1 gap-1">
            {tabs.map((tab) => (
                <NavLink
                    key={tab.label}
                    to={tab.path}
                    end={tab.label === "Summary"}
                    className={({ isActive }) =>
                        clsx(
                            "flex-1 text-center py-2 text-sm font-medium transition-all rounded-lg",
                            isActive
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )
                    }
                >
                    {tab.label}
                </NavLink>
            ))}
        </div>
    );
};
