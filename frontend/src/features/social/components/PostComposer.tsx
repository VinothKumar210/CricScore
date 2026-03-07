import { useState, useRef } from 'react';
import { socialService } from '../socialService';
import { ImageIcon, Send, Loader2, Globe, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { useProfileStore } from '../../profile/profileStore';

export const PostComposer = ({ onPostCreated }: { onPostCreated: () => void }) => {
    const profile = useProfileStore(s => s.profile);
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS_ONLY'>('PUBLIC');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const handleSubmit = async () => {
        if (!content.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await socialService.createPost(content.trim(), [], visibility);
            setContent('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
            onPostCreated();
        } catch (error) {
            console.error('Failed to create post', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-cardAlt rounded-3xl p-4 sm:p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-border/40 relative overflow-hidden group mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

            <div className="flex gap-3 sm:gap-4 relative z-10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary overflow-hidden flex-shrink-0 shadow-inner ring-2 ring-background">
                    {profile?.profilePictureUrl ? (
                        <img src={profile.profilePictureUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary font-bold bg-primary/10">
                            {profile?.fullName?.charAt(0) || 'U'}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleInput}
                        placeholder="Share your cricket thoughts..."
                        className="w-full bg-transparent resize-none outline-none text-[15px] sm:text-base text-foreground placeholder:text-muted-foreground min-h-[44px] sm:min-h-[48px] pt-2"
                        rows={1}
                        disabled={isSubmitting}
                    />

                    {(content.length > 0) && (
                        <div className="mt-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2">
                                <button className="p-2 -ml-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors active:scale-95">
                                    <ImageIcon className="w-5 h-5" />
                                </button>

                                <div className="h-4 w-px bg-border/50 mx-1" />

                                <button
                                    onClick={() => setVisibility(v => v === 'PUBLIC' ? 'FOLLOWERS_ONLY' : 'PUBLIC')}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-secondary/80 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                                    title="Post Visibility"
                                >
                                    {visibility === 'PUBLIC' ? (
                                        <><Globe className="w-3.5 h-3.5" /> Public</>
                                    ) : (
                                        <><Users className="w-3.5 h-3.5" /> Followers</>
                                    )}
                                </button>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={!content.trim() || isSubmitting}
                                className={clsx(
                                    "px-4 sm:px-5 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-all shadow-sm active:scale-[0.98]",
                                    content.trim() && !isSubmitting
                                        ? "bg-primary text-primary-foreground shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
                                        : "bg-secondary text-muted-foreground cursor-not-allowed"
                                )}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Posting...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Post</span>
                                        <Send className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
