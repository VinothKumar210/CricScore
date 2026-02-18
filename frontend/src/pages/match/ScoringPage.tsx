import { useParams } from 'react-router-dom';

export const ScoringPage = () => {
    const { id } = useParams();
    return (
        <div className="p-4 text-center mt-20">
            <h1 className="text-2xl font-bold mb-4">Scoring Interface</h1>
            <p className="text-gray-400">Match ID: {id}</p>
            <div className="mt-8 p-4 border border-gray-700 rounded bg-gray-900">
                Control Grid Placeholder
            </div>
        </div>
    );
};
