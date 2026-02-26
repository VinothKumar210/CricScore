import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Props {
    onSend: (content: string) => Promise<void>;
    disabled?: boolean;
}

export const MessageInput: React.FC<Props> = ({ onSend, disabled }) => {
    const [content, setContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [content]);

    const handleSubmit = async () => {
        const trimmed = content.trim();
        if (!trimmed || isSending || disabled) return;

        setIsSending(true);
        // We let the parent handle the optimistic send before awaiting, so we can clear immediately
        // But the prompt says components should handle rate limits/state minimally. 
        try {
            // we await the parent send (which might be fire-and-forget optimistically or wait for ACK)
            await onSend(trimmed);
            setContent('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        } finally {
            // Prevent exact 300ms spam natively by holding isSending high for exactly minimum 300ms
            setTimeout(() => {
                setIsSending(false);
            }, 300);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="p-4 bg-card dark:bg-card-950 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-end gap-2 bg-background dark:bg-card-900 rounded-xl border border-border dark:border-gray-700 p-1 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-all">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || isSending}
                    placeholder="Type a message..."
                    className="w-full max-h-[120px] min-h-[44px] bg-transparent border-0 focus:ring-0 resize-none py-3 px-4 text-sm text-foreground dark:text-white placeholder-gray-400 disabled:opacity-50"
                    rows={1}
                />
                <div className="p-1">
                    <button
                        onClick={handleSubmit}
                        disabled={!content.trim() || disabled || isSending}
                        className="p-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white transition-colors flex shrink-0"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
