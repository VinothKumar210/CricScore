import React, { useState } from 'react';
import { 
    FileText, 
    Headphones,
    Download
} from 'lucide-react';
import { clsx } from 'clsx';

export interface Attachment {
    id?: string;
    url: string;
    type: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';
    filename: string;
    sizeBytes: number;
    mimeType: string;
    thumbnailUrl?: string;
}

interface MediaPreviewProps {
    attachment: Attachment;
    className?: string;
}

// Format bytes to KB, MB, etc.
const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const MediaPreview: React.FC<MediaPreviewProps> = ({ attachment, className }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const renderContent = () => {
        switch (attachment.type) {
            case 'IMAGE':
                return (
                    <>
                        <div 
                            className="relative w-full max-w-sm rounded-lg overflow-hidden cursor-pointer hover:opacity-95 transition-opacity bg-black/5"
                            onClick={() => setIsFullscreen(true)}
                        >
                            <img 
                                src={attachment.thumbnailUrl || attachment.url} 
                                alt={attachment.filename}
                                className="w-full h-auto object-cover max-h-64"
                                loading="lazy"
                            />
                        </div>

                        {isFullscreen && (
                            <div 
                                className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
                                onClick={() => setIsFullscreen(false)}
                            >
                                <img 
                                    src={attachment.url} 
                                    alt={attachment.filename}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                        )}
                    </>
                );

            case 'VIDEO':
                return (
                    <div className="relative w-full max-w-sm rounded-lg overflow-hidden bg-black/5">
                        <video 
                            src={attachment.url} 
                            controls
                            poster={attachment.thumbnailUrl}
                            className="w-full h-auto max-h-64 object-cover"
                        />
                    </div>
                );

            case 'AUDIO':
                return (
                    <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg w-full max-w-sm border border-border">
                        <div className="p-2 bg-primary/10 rounded-full text-primary shrink-0">
                            <Headphones className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <audio src={attachment.url} controls className="w-full h-8" />
                        </div>
                    </div>
                );

            case 'DOCUMENT':
            default:
                return (
                    <a 
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg w-full max-w-sm hover:bg-secondary/50 transition-colors group"
                    >
                        <div className="p-2 bg-primary/10 rounded-md text-primary shrink-0">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-foreground truncate">{attachment.filename}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(attachment.sizeBytes)}</p>
                        </div>
                        <div className="p-2 text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                            <Download className="w-4 h-4" />
                        </div>
                    </a>
                );
        }
    };

    return (
        <div className={clsx("mt-1 mb-1 relative", className)}>
            {renderContent()}
        </div>
    );
};
