import React from 'react';

interface TypingUser {
    userId: string;
    name: string;
}

interface TypingIndicatorProps {
    typingUsers: TypingUser[];
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
    if (typingUsers.length === 0) return null;

    const label =
        typingUsers.length === 1
            ? `${typingUsers[0].name} is typing`
            : typingUsers.length === 2
                ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing`
                : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing`;

    return (
        <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-200">
            {/* Animated dots */}
            <span className="flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
            </span>
            <span className="font-medium italic">{label}</span>
        </div>
    );
};

export default TypingIndicator;
