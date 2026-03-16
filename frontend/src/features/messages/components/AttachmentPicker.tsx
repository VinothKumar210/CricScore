import React, { useRef } from 'react';
import { Paperclip, Image as ImageIcon, Video, FileText, Headphones } from 'lucide-react';

interface Props {
    onFileSelect: (file: File) => void;
    disabled?: boolean;
}

export const AttachmentPicker: React.FC<Props> = ({ onFileSelect, disabled }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = React.useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
        }
        setIsOpen(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerFileSelect = (accept: string) => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = accept;
            fileInputRef.current.click();
        }
    };

    return (
        <div className="relative">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
            />
            
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
                <Paperclip className="w-5 h-5" />
            </button>

            {isOpen && !disabled && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)} 
                    />
                    <div className="absolute bottom-full left-0 mb-3 z-50 bg-popover text-popover-foreground border border-border shadow-md rounded-xl p-2 w-48 animate-in slide-in-from-bottom-2 fade-in">
                        <div className="grid grid-cols-1 gap-1">
                            <button
                                type="button"
                                onClick={() => triggerFileSelect('image/jpeg,image/png,image/gif,image/webp')}
                                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary text-sm transition-colors text-left group"
                            >
                                <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-full group-hover:bg-blue-500/20 transition-colors">
                                    <ImageIcon className="w-4 h-4" />
                                </div>
                                Photos & Images
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => triggerFileSelect('video/mp4,video/webm,video/ogg,video/quicktime')}
                                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary text-sm transition-colors text-left group"
                            >
                                <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-full group-hover:bg-rose-500/20 transition-colors">
                                    <Video className="w-4 h-4" />
                                </div>
                                Videos
                            </button>

                            <button
                                type="button"
                                onClick={() => triggerFileSelect('application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain')}
                                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary text-sm transition-colors text-left group"
                            >
                                <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-full group-hover:bg-emerald-500/20 transition-colors">
                                    <FileText className="w-4 h-4" />
                                </div>
                                Documents
                            </button>

                            <button
                                type="button"
                                onClick={() => triggerFileSelect('audio/mpeg,audio/wav,audio/ogg')}
                                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary text-sm transition-colors text-left group"
                            >
                                <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-full group-hover:bg-purple-500/20 transition-colors">
                                    <Headphones className="w-4 h-4" />
                                </div>
                                Audio
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
