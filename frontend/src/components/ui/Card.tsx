import { clsx } from 'clsx';

type CardPadding = 'sm' | 'md' | 'lg';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
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
    ...props
}) => {
    return (
        <div
            className={clsx(
                'bg-card border border-border rounded-xl text-card-foreground',
                paddingStyles[padding],
                hover && 'hover:border-primary/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.06)] transition-all duration-200',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
