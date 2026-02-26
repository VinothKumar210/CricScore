import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PlayFab = () => {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate('/match/create')}
            className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 transition-all duration-200 active:scale-95 z-50"
        >
            <Plus className="w-7 h-7 text-primary-foreground" />
        </button>
    );
};
