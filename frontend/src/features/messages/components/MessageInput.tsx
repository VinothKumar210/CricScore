import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Smile, X, Loader2 } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { MentionAutocomplete } from './MentionAutocomplete';
import { AttachmentPicker } from './AttachmentPicker';
import ReplyPreview from './ReplyPreview';
import { useMessageStore } from '../messageStore';
import { getMessageSocket } from '../useMessageSocket';
import { api } from '../../../lib/api';

interface Props {
    onSend: (content: string, attachments?: any[], replyToId?: string) => Promise<void>;
    disabled?: boolean;
}

export const MessageInput: React.FC<Props> = ({ onSend, disabled }) => {
    const [content, setContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const activeRoom = useMessageStore(state => state.activeRoom);
    const replyingToMessage = useMessageStore(state => state.replyingToMessage);
    const clearReply = useMessageStore(state => state.clearReply);

    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTypingEmitRef = useRef<number>(0);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [content]);

    const checkMentionPattern = (text: string, cursorIndex: number) => {
        const textBeforeCursor = text.slice(0, cursorIndex);
        const match = textBeforeCursor.match(/(?:^|\s)@(\w*)$/);
        
        if (match) {
            setMentionQuery(match[1]);
        } else {
            setMentionQuery(null);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setContent(newValue);
        checkMentionPattern(newValue, e.target.selectionStart);
        emitTypingStart();
    };

    const emitTypingStart = useCallback(() => {
        const now = Date.now();
        if (now - lastTypingEmitRef.current < 2000) return;
        lastTypingEmitRef.current = now;

        const sock = getMessageSocket();
        if (sock && activeRoom) {
            sock.emit('typing:start', { conversationId: activeRoom });
        }

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            const sock2 = getMessageSocket();
            if (sock2 && activeRoom) {
                sock2.emit('typing:stop', { conversationId: activeRoom });
            }
        }, 3000);
    }, [activeRoom]);

    const handleBlur = useCallback(() => {
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        const sock = getMessageSocket();
        if (sock && activeRoom) {
            sock.emit('typing:stop', { conversationId: activeRoom });
        }
    }, [activeRoom]);

    const handleMentionSelect = (member: { id: string; fullName: string }) => {
        if (!textareaRef.current || mentionQuery === null) return;
        
        const cursorIndex = textareaRef.current.selectionStart;
        const textBeforeCursor = content.slice(0, cursorIndex);
        const textAfterCursor = content.slice(cursorIndex);
        
        const match = textBeforeCursor.match(/(?:^|\s)@(\w*)$/);
        if (match) {
            const index = match.index! + (match[0].startsWith(' ') ? 1 : 0);
            const token = `@[${member.fullName}](${member.id}) `;
            const newContent = content.slice(0, index) + token + textAfterCursor;
            setContent(newContent);
            
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = index + token.length;
                    textareaRef.current.selectionEnd = index + token.length;
                    textareaRef.current.focus();
                }
            }, 0);
        }
        setMentionQuery(null);
    };

    const handleSubmit = async () => {
        const trimmed = content.trim();
        if ((!trimmed && !selectedFile) || isSending || disabled || isUploading) return;

        setIsSending(true);
        let attachments: any[] | undefined = undefined;

        try {
            if (selectedFile) {
                setIsUploading(true);
                const formData = new FormData();
                formData.append('file', selectedFile);
                
                const { data } = await api.post('/api/upload', formData);
                
                // Extract result wrapper
                const uploadResult = data.data || data;
                attachments = [uploadResult];
            }

            await onSend(trimmed, attachments, replyingToMessage?.id);
            setContent('');
            setSelectedFile(null);
            clearReply();
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        } catch (error) {
            console.error('Failed to send message with attachment:', error);
        } finally {
            setIsUploading(false);
            setTimeout(() => setIsSending(false), 300);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Prevent enter default if mention dropdown is open
        if (mentionQuery !== null && (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            // Mention component handles this
            return;
        }
        
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="p-3 bg-card border-t border-border shrink-0 relative">
            {/* Reply banner */}
            {replyingToMessage && (
                <div className="mb-2 bg-secondary/60 border border-border rounded-xl overflow-hidden">
                    <ReplyPreview
                        senderName={replyingToMessage.sender?.fullName || replyingToMessage.sender?.name || 'Unknown'}
                        content={replyingToMessage.content}
                        messageType={replyingToMessage.attachments?.[0]?.type}
                        onCancel={clearReply}
                    />
                </div>
            )}

            {showEmojiPicker && (
                <EmojiPicker 
                    className="absolute bottom-full left-4 mb-2 z-50" 
                    onSelect={(emoji) => setContent(prev => prev + emoji)}
                    onClose={() => setShowEmojiPicker(false)}
                />
            )}
            
            {mentionQuery !== null && activeRoom && (
                <MentionAutocomplete 
                    conversationId={activeRoom}
                    query={mentionQuery}
                    onSelect={handleMentionSelect}
                    onClose={() => setMentionQuery(null)}
                />
            )}

            {selectedFile && (
                <div className="absolute bottom-full left-4 mb-2 z-40 bg-card border border-border shadow-md rounded-xl p-3 flex flex-col gap-2 max-w-sm animate-in slide-in-from-bottom-2 fade-in">
                    <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground truncate block">{selectedFile.name}</span>
                            <span className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        <button 
                            onClick={() => !isUploading && setSelectedFile(null)} 
                            disabled={isUploading}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors shrink-0 disabled:opacity-50"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {selectedFile.type.startsWith('image/') && (
                        <div className="relative rounded-lg overflow-hidden bg-black/5 flex items-center justify-center">
                            <img src={URL.createObjectURL(selectedFile)} alt="preview" className="h-32 w-auto object-contain" />
                            {isUploading && (
                                <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center backdrop-blur-sm gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    <span className="text-xs font-medium text-foreground shadow-sm">Uploading...</span>
                                </div>
                            )}
                        </div>
                    )}
                    {!selectedFile.type.startsWith('image/') && isUploading && (
                        <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-secondary/50 rounded-md text-xs font-medium text-foreground">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            Uploading document...
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-end gap-2 bg-secondary rounded-xl border border-border p-1 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
                <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={disabled || isSending || isUploading}
                    className="p-3 text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-50"
                >
                    <Smile className="w-5 h-5" />
                </button>
                <AttachmentPicker 
                    onFileSelect={(file: File | null) => { if (!isUploading && file) setSelectedFile(file); }} 
                    disabled={disabled || isSending || isUploading} 
                />
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    onSelect={(e) => checkMentionPattern(e.currentTarget.value, e.currentTarget.selectionStart)}
                    disabled={disabled || isSending || isUploading}
                    placeholder="Type a message..."
                    className="w-full max-h-[120px] min-h-[44px] bg-transparent border-0 focus:ring-0 focus:outline-none resize-none py-3 px-3 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                    rows={1}
                />
                <div className="p-1">
                    <button
                        onClick={handleSubmit}
                        disabled={(!content.trim() && !selectedFile) || disabled || isSending || isUploading}
                        className="p-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground text-primary-foreground transition-colors flex shrink-0"
                    >
                        {isSending || isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
