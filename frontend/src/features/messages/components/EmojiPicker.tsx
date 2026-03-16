import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const EMOJI_CATEGORIES = [
    {
        name: 'Cricket',
        emojis: ['🏏', '🏆', '💯', '🔥', '👏', '🎯', '🏃‍♂️', '🌟', '💪', '👑', '🧤', '⚾']
    },
    {
        name: 'Smileys',
        emojis: ['😀', '😂', '🤣', '😊', '😍', '😎', '😢', '😭', '😡', '🤔', '👍', '👎', '🙏', '❤️', '💔']
    },
    // Add more common emojis as needed
];

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    className?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose, className }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCategories = EMOJI_CATEGORIES.map(category => ({
        ...category,
        emojis: category.emojis.filter(_emoji => 
            // In a real app we'd search against unicode descriptions, 
            // but for P1 we just show all if search is empty, else filter by some basic mapping if we had one.
            searchQuery ? true : true 
        )
    })).filter(c => c.emojis.length > 0);

    return (
        <div className={cn("bg-card border border-border rounded-lg shadow-lg flex flex-col w-64 max-h-80 overflow-hidden", className)}>
            {/* Header / Search */}
            <div className="p-2 border-b border-border flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search emojis..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-background border border-input rounded-md pl-8 pr-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    />
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Emoji Grid */}
            <div className="flex-1 overflow-y-auto p-2 hide-scrollbar">
                {filteredCategories.map((category) => (
                    <div key={category.name} className="mb-4">
                        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider px-1">
                            {category.name}
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                            {category.emojis.map((emoji, index) => (
                                <button
                                    key={index}
                                    onClick={() => onSelect(emoji)}
                                    className="aspect-square flex items-center justify-center text-xl hover:bg-muted rounded text-foreground transition-colors"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
