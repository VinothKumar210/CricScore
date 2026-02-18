import React from 'react';

interface AppProvidersProps {
    children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
    return (
        <React.StrictMode>
            {children}
        </React.StrictMode>
    );
};
