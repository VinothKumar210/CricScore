import React from 'react';
import { X, Image, Video, FileText, Music } from 'lucide-react';

interface ReplyPreviewProps {
    senderName: string;
    content: string;
    messageType?: string;
    /** Show the X close button (used in MessageInput, not in MessageBubble) */
    onCancel?: () => void;
    /** Compact mode for display inside bubbles */
    compact?: boolean;
}

const getAttachmentLabel = (type?: string) => {
    switch (type) {
        case 'IMAGE': return { icon: Image, label: '📷 Photo' };
        case 'VIDEO': return { icon: Video, label: '🎬 Video' };
        case 'DOCUMENT': return { icon: FileText, label: '📄 Document' };
        case 'AUDIO': return { icon: Music, label: '🎵 Audio' };
        default: return null;
    }
};

const ReplyPreview: React.FC<ReplyPreviewProps> = ({ senderName, content, messageType, onCancel, compact = false }) => {
    const attachment = messageType && messageType !== 'TEXT' ? getAttachmentLabel(messageType) : null;
    const displayContent = content?.trim() ? content : attachment?.label || '';

    return (
        <div className={`flex items-stretch gap-2 ${compact ? 'mb-1.5' : 'px-3 py-2'} group`}>
            {/* Accent bar */}
            <div className="w-1 rounded-full bg-primary shrink-0" />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={`font-semibold text-primary truncate ${compact ? 'text-[11px]' : 'text-xs'}`}>
                    {senderName || 'Unknown'}
                </p>
                <p className={`text-muted-foreground truncate ${compact ? 'text-[11px]' : 'text-xs'}`}>
                    {displayContent.length > 80 ? displayContent.slice(0, 80) + '…' : displayContent}
                </p>
            </div>

            {/* Close button (input mode only) */}
            {onCancel && (
                <button
                    onClick={onCancel}
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors shrink-0 self-center"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default ReplyPreview;
