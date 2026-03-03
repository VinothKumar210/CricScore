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
        try {
            await onSend(trimmed);
            setContent('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        } finally {
            setTimeout(() => setIsSending(false), 300);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="p-3 bg-card border-t border-border shrink-0">
            <div className="flex items-end gap-2 bg-secondary rounded-xl border border-border p-1 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || isSending}
                    placeholder="Type a message..."
                    className="w-full max-h-[120px] min-h-[44px] bg-transparent border-0 focus:ring-0 focus:outline-none resize-none py-3 px-3 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                    rows={1}
                />
                <div className="p-1">
                    <button
                        onClick={handleSubmit}
                        disabled={!content.trim() || disabled || isSending}
                        className="p-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground text-primary-foreground transition-colors flex shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
