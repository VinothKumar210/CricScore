import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

interface AppProvidersProps {
    children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
    const initAuth = useAuthStore(s => s.initAuth);

    useEffect(() => {
        const unsubscribe = initAuth();
        return () => unsubscribe();
    }, [initAuth]);

    return (
        <React.StrictMode>
            {children}
        </React.StrictMode>
    );
};
