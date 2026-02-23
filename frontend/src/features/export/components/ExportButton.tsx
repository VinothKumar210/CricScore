import React, { useState, useRef, useEffect } from 'react';
import { useExport } from '../useExport';
import type { ArchivedMatchFull } from '../../archive/types';
import { Download, FileJson, FileText, X, Loader2 } from 'lucide-react';

interface ExportButtonProps {
    archiveId: string;
    archive: ArchivedMatchFull | null;
}

/**
 * ExportButton — Drop-in export control.
 *
 * PLACEMENT RULES:
 * ✅ ArchiveDetailPage (authenticated, owned)
 * ❌ NEVER in share/*, hub/*, spectator/*, live/*
 */
export const ExportButton: React.FC<ExportButtonProps> = React.memo(({ archiveId, archive }) => {
    const { status, exportJSON, exportPDF, cancel } = useExport(archiveId, archive);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    // During export — show progress
    if (status.isExporting) {
        return (
            <div className="flex items-center gap-3 px-4 py-2 bg-surface border border-border rounded-lg">
                <Loader2 className="w-4 h-4 text-brand animate-spin" />
                <div className="flex-1">
                    <p className="text-xs font-medium text-textPrimary">
                        {status.format === 'json' ? 'Exporting JSON...' : 'Generating PDF...'}
                    </p>
                    <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brand rounded-full transition-all duration-300"
                            style={{ width: `${status.progress}%` }}
                        />
                    </div>
                </div>
                <button
                    onClick={cancel}
                    className="p-1 text-textSecondary hover:text-danger transition-colors"
                    title="Cancel"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    // Error state
    if (status.error) {
        return (
            <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 flex-1">{status.error}</p>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-medium text-red-600 underline"
                >
                    Dismiss
                </button>
            </div>
        );
    }

    // Normal — dropdown
    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={!archive}
                className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium
                           hover:bg-brand/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <Download className="w-4 h-4" />
                Export
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-border rounded-lg
                                shadow-lg z-50 overflow-hidden">
                    <button
                        onClick={() => { setIsOpen(false); exportJSON(); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-textPrimary
                                   hover:bg-surface transition-colors text-left"
                    >
                        <FileJson className="w-4 h-4 text-blue-500" />
                        <div>
                            <p className="font-medium">JSON</p>
                            <p className="text-[10px] text-textSecondary">Raw match data</p>
                        </div>
                    </button>
                    <div className="h-px bg-border" />
                    <button
                        onClick={() => { setIsOpen(false); exportPDF(); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-textPrimary
                                   hover:bg-surface transition-colors text-left"
                    >
                        <FileText className="w-4 h-4 text-red-500" />
                        <div>
                            <p className="font-medium">PDF</p>
                            <p className="text-[10px] text-textSecondary">Formatted scorecard</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
});

ExportButton.displayName = 'ExportButton';
