import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { typography } from '../../../constants/typography';
import { clsx } from 'clsx';
import type { ArchivedMatchMeta } from '../types';

interface ArchiveCardProps {
    archive: ArchivedMatchMeta;
}

/**
 * ArchiveCard — Metadata-only card for archive list.
 *
 * PERFORMANCE CONTRACT:
 * - No engine calls
 * - No bundle creation
 * - No events loaded
 * - Renders pre-computed metadata only
 */
export const ArchiveCard: React.FC<ArchiveCardProps> = React.memo(({ archive }) => {
    const navigate = useNavigate();

    return (
        <Card
            className="cursor-pointer active:scale-[0.99] transition-transform"
            padding="md"
            hover
            onClick={() => navigate(`/archive/${archive.id}`)}
        >
            {/* Header: Teams */}
            <div className="flex items-center justify-between mb-2">
                <h3 className={clsx(typography.bodyMd, 'font-semibold')}>
                    {archive.homeTeamName} vs {archive.awayTeamName}
                </h3>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">
                    Archived
                </span>
            </div>

            {/* Result */}
            {archive.result && (
                <p className="text-sm font-medium text-brand mb-2">
                    {archive.result}
                </p>
            )}

            {/* Meta Row */}
            <div className="flex items-center gap-3 text-xs text-textSecondary">
                <span>
                    {new Date(archive.matchDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                </span>
                <span>·</span>
                <span>{archive.overs} overs</span>
                <span>·</span>
                <span>📊 {archive.eventCount} events</span>
            </div>

            {/* Footer: Engine version */}
            <div className="mt-2 pt-2 border-t border-border/50">
                <span className="text-[10px] text-textSecondary">
                    Engine v{archive.engineVersion} · Archived {new Date(archive.archivedAt).toLocaleDateString()}
                </span>
            </div>
        </Card>
    );
});

ArchiveCard.displayName = 'ArchiveCard';
