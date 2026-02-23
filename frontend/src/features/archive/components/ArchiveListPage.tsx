import { useEffect } from 'react';
import { useArchiveStore } from '../archiveStore';
import { ArchiveCard } from './ArchiveCard';
import { ArchiveFilters } from './ArchiveFilters';
import { Container } from '../../../components/ui/Container';
import { typography } from '../../../constants/typography';

/**
 * ArchiveListPage — /archive route.
 *
 * PERFORMANCE CONTRACT:
 * - Zero engine calls
 * - Zero bundle creation
 * - Zero event loading
 * - All cards render metadata only
 * - resetList() on unmount
 */
export const ArchiveListPage = () => {
    const archives = useArchiveStore(s => s.archives);
    const pagination = useArchiveStore(s => s.pagination);
    const isListLoading = useArchiveStore(s => s.isListLoading);
    const listError = useArchiveStore(s => s.listError);
    const fetchList = useArchiveStore(s => s.fetchList);
    const resetList = useArchiveStore(s => s.resetList);

    // Fetch on mount, resetList on unmount
    useEffect(() => {
        fetchList(1);
        return () => resetList();
    }, [fetchList, resetList]);

    return (
        <Container className="py-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className={typography.headingLg}>Match Archive</h1>
            </div>

            {/* Filters */}
            <ArchiveFilters />

            {/* Error */}
            {listError && (
                <div className="flex flex-col items-center py-8 gap-3">
                    <p className="text-danger font-medium">{listError}</p>
                    <button
                        onClick={() => fetchList(1)}
                        className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium
                                   hover:bg-brand/90 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Loading */}
            {isListLoading && archives.length === 0 && !listError && (
                <div className="space-y-3">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            )}

            {/* Archive Cards */}
            {archives.length > 0 && (
                <div className="space-y-3">
                    {archives.map(archive => (
                        <ArchiveCard key={archive.id} archive={archive} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isListLoading && !listError && archives.length === 0 && (
                <div className="bg-surface rounded-xl p-8 text-center border border-dashed border-border">
                    <p className="text-textSecondary text-sm">
                        No archived matches found.
                    </p>
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                    <button
                        onClick={() => fetchList(pagination.page - 1)}
                        disabled={pagination.page <= 1 || isListLoading}
                        className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium
                                   disabled:opacity-40 disabled:cursor-not-allowed
                                   hover:bg-gray-50 transition-colors"
                    >
                        ← Previous
                    </button>
                    <span className="text-sm text-textSecondary tabular-nums">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => fetchList(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages || isListLoading}
                        className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium
                                   disabled:opacity-40 disabled:cursor-not-allowed
                                   hover:bg-gray-50 transition-colors"
                    >
                        Next →
                    </button>
                </div>
            )}
        </Container>
    );
};

const SkeletonCard = () => (
    <div className="h-28 bg-surface rounded-xl animate-pulse" />
);
