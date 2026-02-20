import React, { useState, useCallback } from 'react';
import { useEventNotifier } from './useEventNotifier';
import { Bell } from 'lucide-react';

interface Toast {
    id: string;
    message: string;
}

/**
 * EventNotifier — purely presentational layer for toasts.
 * Must be rendered inside MatchLiveShell.
 */
export const EventNotifier: React.FC = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string) => {
        const id = Math.random().toString(36).substring(2, 9); // Safe to use Math.random for visual ephemeral ID only. Does not break undo.
        setToasts((prev) => [...prev, { id, message }]);

        // Auto remove
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    useEventNotifier(addToast);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className="bg-gray-900 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 w-full animate-in slide-in-from-bottom-4 fade-in duration-300 pointer-events-auto"
                >
                    <div className="bg-brand/20 p-1.5 rounded-full flex-shrink-0">
                        <Bell className="w-4 h-4 text-brand max-h-full" />
                    </div>
                    <span className="text-sm font-medium w-full break-words">
                        {toast.message}
                    </span>
                </div>
            ))}
        </div>
    );
};
