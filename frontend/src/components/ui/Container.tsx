import { clsx } from 'clsx';

interface ContainerProps {
    children: React.ReactNode;
    className?: string;
}

export const Container: React.FC<ContainerProps> = ({ children, className }) => {
    return (
        <div className={clsx('max-w-3xl mx-auto px-4', className)}>
            {children}
        </div>
    );
};
