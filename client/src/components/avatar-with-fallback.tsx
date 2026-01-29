import * as React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Get initials from a name for avatar fallback
 * @param name - Full name (e.g., "Vinoth Kumar")
 * @returns Initials (e.g., "VK")
 */
function getInitials(name: string | null | undefined): string {
    if (!name) return '?';

    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].charAt(0).toUpperCase();
    }

    // Take first letter of first and last word
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a consistent background color from a name
 */
function getColorFromName(name: string | null | undefined): string {
    if (!name) return 'hsl(215, 20%, 65%)';

    // Hash the name to get a consistent color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate a hue (0-360) from the hash
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 60%, 55%)`;
}

export interface AvatarWithFallbackProps {
    src?: string | null;
    alt?: string;
    name?: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    fallbackClassName?: string;
}

const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
};

/**
 * Avatar component with automatic initial-based fallback
 * 
 * Features:
 * - Shows image if available
 * - Falls back to initials from name
 * - Consistent color based on name
 * - Multiple sizes
 * 
 * @example
 * <AvatarWithFallback 
 *   src={user.profilePictureUrl} 
 *   name={user.profileName} 
 *   size="lg" 
 * />
 */
export function AvatarWithFallback({
    src,
    alt = "Avatar",
    name,
    size = 'md',
    className,
    fallbackClassName,
}: AvatarWithFallbackProps) {
    const initials = getInitials(name);
    const bgColor = getColorFromName(name);

    return (
        <Avatar className={cn(sizeClasses[size], className)}>
            {src && <AvatarImage src={src} alt={alt} />}
            <AvatarFallback
                className={cn("font-semibold text-white", fallbackClassName)}
                style={{ backgroundColor: bgColor }}
            >
                {initials}
            </AvatarFallback>
        </Avatar>
    );
}

export default AvatarWithFallback;
