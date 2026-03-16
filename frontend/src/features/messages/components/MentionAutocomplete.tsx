import React, { useEffect, useState, useRef } from 'react';
import { messageService } from '../messageService';

interface Member {
    id: string;
    fullName: string;
    profilePictureUrl?: string;
}

interface MentionAutocompleteProps {
    conversationId: string;
    query: string;
    onSelect: (member: Member) => void;
    onClose: () => void;
    position?: { top: number; left: number };
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
    conversationId,
    query,
    onSelect,
    onClose,
    position
}) => {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadMembers = async () => {
            setLoading(true);
            try {
                const data = await messageService.getConversationMembers(conversationId);
                setMembers(data);
            } catch (error) {
                console.error('Failed to load members for mentions', error);
            } finally {
                setLoading(false);
            }
        };
        loadMembers();
    }, [conversationId]);

    const filteredMembers = members.filter(m =>
        m.fullName.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!filteredMembers.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredMembers.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                onSelect(filteredMembers[selectedIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [filteredMembers, selectedIndex, onSelect, onClose]);

    if (!filteredMembers.length && !loading) return null;

    return (
        <div
            ref={containerRef}
            className="absolute z-50 bg-card border border-border rounded-lg shadow-lg w-64 max-h-60 overflow-y-auto"
            style={{
                bottom: position ? 'auto' : '100%',
                left: position?.left || 0,
                top: position?.top || 'auto',
                marginBottom: position ? 0 : '0.5rem' // Margin if positioned above input
            }}
        >
            {loading ? (
                <div className="p-3 text-sm text-muted-foreground text-center">Loading members...</div>
            ) : (
                <ul className="py-1">
                    {filteredMembers.map((member, idx) => (
                        <li
                            key={member.id}
                            className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                                idx === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                            }`}
                            onClick={() => onSelect(member)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                        >
                            <div className="w-6 h-6 rounded-full bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                                {member.profilePictureUrl ? (
                                    <img src={member.profilePictureUrl} alt={member.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-medium uppercase text-muted-foreground">
                                        {member.fullName.charAt(0)}
                                    </span>
                                )}
                            </div>
                            <span className="text-sm font-medium truncate">{member.fullName}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
