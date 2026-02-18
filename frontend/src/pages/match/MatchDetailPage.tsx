import { useParams } from 'react-router-dom';

export const MatchDetailPage = () => {
    const { id } = useParams();
    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-2">Match Centre</h1>
            <p className="text-gray-500">Viewing Match ID: {id}</p>
        </div>
    );
};
