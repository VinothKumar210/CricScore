import { useParams } from 'react-router-dom';

export const TeamDetailPage = () => {
    const { id } = useParams();
    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-2">Team Details</h1>
            <p className="text-gray-500">Viewing Team ID: {id}</p>
        </div>
    );
};
