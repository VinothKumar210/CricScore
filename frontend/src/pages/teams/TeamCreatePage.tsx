import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../../components/ui/Container';
import { useTeamStore } from '../../features/teams/teamStore';
import {
    ChevronLeft, Loader2, Shield, MapPin, Tag, ArrowRight
} from 'lucide-react';

/**
 * TeamCreatePage — Full page form for creating a new team.
 * Fields: Team Name, Short Name (optional), City (optional).
 */
export const TeamCreatePage = () => {
    const navigate = useNavigate();
    const createTeam = useTeamStore((s) => s.createTeam);

    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [city, setCity] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const getInitials = (s: string) =>
        s.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();

    const handleCreate = async () => {
        if (!name.trim()) {
            setError('Team name is required');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const team = await createTeam({
                name: name.trim(),
                shortName: shortName.trim() || undefined,
                city: city.trim() || undefined,
            });
            navigate(`/teams/${team.id}`);
        } catch (err: any) {
            setError(err.message || 'Failed to create team');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Container className="py-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-lg bg-secondary border border-border hover:bg-card transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Create Team</h1>
                    <p className="text-sm text-muted-foreground">Build your squad</p>
                </div>
            </div>

            {/* Preview Card */}
            <div className="bg-card rounded-xl border border-border p-6 mb-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-3 transition-all">
                    {shortName.trim() || (name.trim() ? getInitials(name) : '?')}
                </div>
                <h3 className="text-lg font-bold text-foreground">
                    {name.trim() || 'Your Team Name'}
                </h3>
                {city.trim() && (
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {city}
                    </p>
                )}
            </div>

            {/* Form */}
            <div className="space-y-5">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Team Name *
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => { setName(e.target.value); setError(''); }}
                        placeholder="e.g. Chennai Super Kings"
                        maxLength={50}
                        className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" />
                        Short Name
                    </label>
                    <input
                        type="text"
                        value={shortName}
                        onChange={e => setShortName(e.target.value)}
                        placeholder="e.g. CSK (2-3 letters)"
                        maxLength={4}
                        className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-foreground uppercase placeholder:text-muted-foreground placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        City
                    </label>
                    <input
                        type="text"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="e.g. Chennai"
                        maxLength={50}
                        className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                </div>

                {error && (
                    <p className="text-destructive text-sm text-center font-medium">{error}</p>
                )}

                <button
                    onClick={handleCreate}
                    disabled={isSubmitting || !name.trim()}
                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Create Team
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>
        </Container>
    );
};
