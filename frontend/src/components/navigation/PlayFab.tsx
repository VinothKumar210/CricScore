import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PlayFab = () => {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate('/match/create')}
            className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-green-800 rounded-full flex items-center justify-center shadow-lg hover:bg-green-900 transition-colors z-50"
        >
            <Plus className="w-8 h-8 text-white" />
        </button>
    );
};
