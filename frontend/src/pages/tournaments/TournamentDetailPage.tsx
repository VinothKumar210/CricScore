import { useParams } from 'react-router-dom';

export const TournamentDetailPage = () => {
    const { id } = useParams();
    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-2">Tournament Dashboard</h1>
            <p className="text-gray-500">Viewing Tournament ID: {id}</p>
        </div>
    );
};
