import { clsx } from 'clsx';

type CardPadding = 'sm' | 'md' | 'lg';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> { // Extend HTMLAttributes to allow onClick
    children: React.ReactNode;
    padding?: CardPadding;
    hover?: boolean;
}

const paddingStyles: Record<CardPadding, string> = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
    children,
    padding = 'md',
    hover = false,
    className,
    ...props // Spread remaining props like onClick
}) => {
    return (
        <div
            className={clsx(
                'bg-white border border-border rounded-xl',
                paddingStyles[padding],
                hover && 'hover:shadow-sm transition-shadow',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
