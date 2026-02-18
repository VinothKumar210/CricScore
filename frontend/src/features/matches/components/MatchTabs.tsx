import { NavLink, useParams } from "react-router-dom";
import { clsx } from "clsx";

export const MatchTabs = () => {
    const { id } = useParams<{ id: string }>();

    const tabs = [
        { label: "Summary", path: `/match/${id}` },
        { label: "Scorecard", path: `/match/${id}/scorecard` },
        { label: "Info", path: `/match/${id}/info` },
    ];

    return (
        <div className="flex border-b border-border">
            {tabs.map((tab) => (
                <NavLink
                    key={tab.label}
                    to={tab.path}
                    end={tab.label === "Summary"}
                    className={({ isActive }) =>
                        clsx(
                            "flex-1 text-center py-3 text-sm font-medium transition-colors",
                            isActive
                                ? "text-brand border-b-2 border-brand"
                                : "text-textSecondary hover:text-textPrimary"
                        )
                    }
                >
                    {tab.label}
                </NavLink>
            ))}
        </div>
    );
};
