import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, MapPin, Calendar, Clock, Users, Plus, Send, Check, X, ChevronRight, Loader2, Navigation, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/components/auth/auth-context';

interface Ground {
    id: string;
    teamId: string;
    groundName: string;
    latitude: number;
    longitude: number;
    address?: string;
    isFavorite: boolean;
}

interface InviteData {
    id: string;
    teamId: string;
    groundId: string;
    matchDate: string;
    matchTime: string;
    overs: number;
    description?: string;
    status: string;
    distance?: number;
    team: { id: string; name: string; logoUrl?: string };
    ground: Ground;
    creator: { id: string; username?: string; profileName?: string };
    responses: InviteResponseData[];
}

interface InviteResponseData {
    id: string;
    fromUserId: string;
    responseType: string;
    message?: string;
    fromTeamName?: string;
    fromUser: { id: string; username?: string; profileName?: string };
}

export default function MatchInvites() {
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();

    // State
    const [invites, setInvites] = useState<InviteData[]>([]);
    const [myTeams, setMyTeams] = useState<any[]>([]);
    const [grounds, setGrounds] = useState<Ground[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [radius, setRadius] = useState(50);
    const [activeTab, setActiveTab] = useState('nearby');

    // Dialogs
    const [showCreateInvite, setShowCreateInvite] = useState(false);
    const [showAddGround, setShowAddGround] = useState(false);
    const [showRespondDialog, setShowRespondDialog] = useState(false);
    const [selectedInvite, setSelectedInvite] = useState<InviteData | null>(null);

    // Create invite form
    const [newInvite, setNewInvite] = useState({ teamId: '', groundId: '', matchDate: '', matchTime: '', overs: 10, description: '' });
    // Add ground form
    const [newGround, setNewGround] = useState({ teamId: '', groundName: '', latitude: '', longitude: '', address: '' });
    // Response
    const [responseMessage, setResponseMessage] = useState('');
    const [responseTeamId, setResponseTeamId] = useState('');

    // Get user location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                () => console.log('Location permission denied, showing all invites')
            );
        }
    }, []);

    // Fetch data
    const fetchInvites = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (userLocation) {
                params.set('lat', String(userLocation.lat));
                params.set('lon', String(userLocation.lon));
                params.set('radius', String(radius));
            }
            const res = await apiRequest('GET', `/api/invites?${params.toString()}`);
            const data = await res.json();
            setInvites(data);
        } catch (err) {
            console.error('Failed to fetch invites:', err);
        } finally {
            setLoading(false);
        }
    }, [userLocation, radius]);

    const fetchTeams = useCallback(async () => {
        try {
            const res = await apiRequest('GET', '/api/teams');
            const data = await res.json();
            setMyTeams(data);
        } catch (err) {
            console.error('Failed to fetch teams:', err);
        }
    }, []);

    useEffect(() => { fetchInvites(); }, [fetchInvites]);
    useEffect(() => { fetchTeams(); }, [fetchTeams]);

    const fetchGrounds = useCallback(async (teamId: string) => {
        try {
            const res = await apiRequest('GET', `/api/grounds?teamId=${teamId}`);
            const data = await res.json();
            setGrounds(data);
        } catch (err) {
            console.error('Failed to fetch grounds:', err);
        }
    }, []);

    // Create invite
    const handleCreateInvite = async () => {
        try {
            if (!newInvite.teamId || !newInvite.groundId || !newInvite.matchDate || !newInvite.matchTime) {
                toast({ title: 'Missing fields', description: 'Please fill all required fields', variant: 'destructive' });
                return;
            }
            await apiRequest('POST', '/api/invites', newInvite);
            toast({ title: 'Invite Created! 🏏', description: 'Your match invite is now visible to nearby teams' });
            setShowCreateInvite(false);
            setNewInvite({ teamId: '', groundId: '', matchDate: '', matchTime: '', overs: 10, description: '' });
            fetchInvites();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to create invite', variant: 'destructive' });
        }
    };

    // Add ground
    const handleAddGround = async () => {
        try {
            if (!newGround.teamId || !newGround.groundName || !newGround.latitude || !newGround.longitude) {
                toast({ title: 'Missing fields', description: 'Please fill team, ground name, and coordinates', variant: 'destructive' });
                return;
            }
            await apiRequest('POST', '/api/grounds', {
                ...newGround,
                latitude: parseFloat(newGround.latitude),
                longitude: parseFloat(newGround.longitude)
            });
            toast({ title: 'Ground Added! 📍', description: `${newGround.groundName} saved` });
            setShowAddGround(false);
            setNewGround({ teamId: '', groundName: '', latitude: '', longitude: '', address: '' });
            if (newInvite.teamId) fetchGrounds(newInvite.teamId);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to add ground', variant: 'destructive' });
        }
    };

    // Use current location for ground
    const useCurrentLocationForGround = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setNewGround(prev => ({
                        ...prev,
                        latitude: String(pos.coords.latitude),
                        longitude: String(pos.coords.longitude)
                    }));
                    toast({ title: 'Location captured 📍' });
                },
                () => toast({ title: 'Error', description: 'Location permission denied', variant: 'destructive' })
            );
        }
    };

    // Respond to invite
    const handleRespond = async (type: string) => {
        if (!selectedInvite) return;
        try {
            const selectedTeam = myTeams.find((t: any) => t.id === responseTeamId);
            await apiRequest('POST', `/api/invites/${selectedInvite.id}/respond`, {
                responseType: type,
                message: responseMessage,
                fromTeamId: responseTeamId || undefined,
                fromTeamName: selectedTeam?.name || undefined
            });
            toast({ title: type === 'INTERESTED' ? '👍 Interest Sent!' : '✅ Accepted!', description: 'The team has been notified' });
            setShowRespondDialog(false);
            setResponseMessage('');
            setResponseTeamId('');
            fetchInvites();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to respond', variant: 'destructive' });
        }
    };

    // Format distance
    const formatDistance = (km?: number) => {
        if (km == null) return '';
        if (km < 1) return `${Math.round(km * 1000)} m away`;
        return `${km.toFixed(1)} km away`;
    };

    // Format date
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    // My invites = ones I created
    const myInvites = invites.filter(inv => inv.creator.id === user?.id);
    const nearbyInvites = invites.filter(inv => inv.creator.id !== user?.id);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
                <div className="max-w-2xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Button variant="ghost" size="icon" onClick={() => setLocation('/dashboard')} className="text-white hover:bg-white/20 rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">Match Invites</h1>
                            <p className="text-green-100 text-sm">Find nearby teams & schedule matches</p>
                        </div>
                    </div>

                    {/* Location status */}
                    <div className="flex items-center gap-2 text-sm bg-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm">
                        <Navigation className="w-4 h-4" />
                        {userLocation
                            ? <span>Showing matches within <strong>{radius} km</strong></span>
                            : <span>Enable location for distance-based filtering</span>
                        }
                        {userLocation && (
                            <select
                                value={radius}
                                onChange={(e) => setRadius(Number(e.target.value))}
                                className="ml-auto bg-white/20 border-0 rounded-lg text-sm px-2 py-1 text-white"
                            >
                                <option value={10}>10 km</option>
                                <option value={25}>25 km</option>
                                <option value={50}>50 km</option>
                                <option value={100}>100 km</option>
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        onClick={() => { setShowCreateInvite(true); }}
                        className="h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-100 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Post Invite
                    </Button>
                    <Button
                        onClick={() => setShowAddGround(true)}
                        className="h-14 bg-white hover:bg-gray-50 text-gray-800 rounded-2xl font-bold shadow-md border border-gray-200 flex items-center gap-2"
                    >
                        <MapPin className="w-5 h-5 text-green-600" /> Add Ground
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200 rounded-2xl h-12 p-1">
                        <TabsTrigger value="nearby" className="rounded-xl font-bold data-[state=active]:bg-green-600 data-[state=active]:text-white">
                            🏏 Nearby ({nearbyInvites.length})
                        </TabsTrigger>
                        <TabsTrigger value="my-invites" className="rounded-xl font-bold data-[state=active]:bg-green-600 data-[state=active]:text-white">
                            📤 My Invites ({myInvites.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Nearby Invites */}
                    <TabsContent value="nearby" className="space-y-3 mt-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                <p className="text-sm">Finding nearby matches...</p>
                            </div>
                        ) : nearbyInvites.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 mx-auto mb-4 bg-green-50 rounded-full flex items-center justify-center">
                                    <MapPin className="w-10 h-10 text-green-300" />
                                </div>
                                <h3 className="font-bold text-gray-700 text-lg">No nearby invites</h3>
                                <p className="text-gray-400 text-sm mt-1">Be the first to post a match invite!</p>
                            </div>
                        ) : (
                            nearbyInvites.map(invite => (
                                <InviteCard
                                    key={invite.id}
                                    invite={invite}
                                    formatDistance={formatDistance}
                                    formatDate={formatDate}
                                    onRespond={() => { setSelectedInvite(invite); setShowRespondDialog(true); }}
                                    isOwn={false}
                                />
                            ))
                        )}
                    </TabsContent>

                    {/* My Invites */}
                    <TabsContent value="my-invites" className="space-y-3 mt-4">
                        {myInvites.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
                                    <Send className="w-10 h-10 text-blue-300" />
                                </div>
                                <h3 className="font-bold text-gray-700 text-lg">No invites posted</h3>
                                <p className="text-gray-400 text-sm mt-1">Post an invite to find opponents!</p>
                            </div>
                        ) : (
                            myInvites.map(invite => (
                                <InviteCard
                                    key={invite.id}
                                    invite={invite}
                                    formatDistance={formatDistance}
                                    formatDate={formatDate}
                                    onRespond={() => { }}
                                    isOwn={true}
                                />
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Create Invite Dialog */}
            <Dialog open={showCreateInvite} onOpenChange={setShowCreateInvite}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Post Match Invite</DialogTitle>
                        <DialogDescription>Invite nearby teams for a match at your ground.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Team</Label>
                            <Select value={newInvite.teamId} onValueChange={(v) => { setNewInvite(p => ({ ...p, teamId: v, groundId: '' })); fetchGrounds(v); }}>
                                <SelectTrigger><SelectValue placeholder="Select your team" /></SelectTrigger>
                                <SelectContent>
                                    {myTeams.map((t: any) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Ground</Label>
                            <Select value={newInvite.groundId} onValueChange={(v) => setNewInvite(p => ({ ...p, groundId: v }))}>
                                <SelectTrigger><SelectValue placeholder={newInvite.teamId ? 'Select ground' : 'Select team first'} /></SelectTrigger>
                                <SelectContent>
                                    {grounds.map(g => (
                                        <SelectItem key={g.id} value={g.id}>{g.groundName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {newInvite.teamId && grounds.length === 0 && (
                                <p className="text-xs text-amber-600">No grounds saved. Add one first!</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" value={newInvite.matchDate} onChange={(e) => setNewInvite(p => ({ ...p, matchDate: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Time</Label>
                                <Input type="time" value={newInvite.matchTime} onChange={(e) => setNewInvite(p => ({ ...p, matchTime: e.target.value }))} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Overs</Label>
                            <Input type="number" min={1} max={50} value={newInvite.overs} onChange={(e) => setNewInvite(p => ({ ...p, overs: parseInt(e.target.value) || 10 }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <Input placeholder="e.g., Friendly T10 match" value={newInvite.description} onChange={(e) => setNewInvite(p => ({ ...p, description: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateInvite(false)}>Cancel</Button>
                        <Button onClick={handleCreateInvite} className="bg-green-600 hover:bg-green-700 text-white">Post Invite</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Ground Dialog */}
            <Dialog open={showAddGround} onOpenChange={setShowAddGround}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Ground</DialogTitle>
                        <DialogDescription>Save a cricket ground with its location.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Team</Label>
                            <Select value={newGround.teamId} onValueChange={(v) => setNewGround(p => ({ ...p, teamId: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                                <SelectContent>
                                    {myTeams.map((t: any) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Ground Name</Label>
                            <Input placeholder="e.g., Pattanam Ground" value={newGround.groundName} onChange={(e) => setNewGround(p => ({ ...p, groundName: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Button variant="outline" onClick={useCurrentLocationForGround} className="w-full gap-2">
                                <Navigation className="w-4 h-4" /> Use My Current Location
                            </Button>
                            <div className="grid grid-cols-2 gap-2">
                                <Input placeholder="Latitude" type="number" step="any" value={newGround.latitude} onChange={(e) => setNewGround(p => ({ ...p, latitude: e.target.value }))} />
                                <Input placeholder="Longitude" type="number" step="any" value={newGround.longitude} onChange={(e) => setNewGround(p => ({ ...p, longitude: e.target.value }))} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Address <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <Input placeholder="e.g., Main Road, Area Name" value={newGround.address} onChange={(e) => setNewGround(p => ({ ...p, address: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddGround(false)}>Cancel</Button>
                        <Button onClick={handleAddGround} className="bg-green-600 hover:bg-green-700 text-white">Save Ground</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Respond to Invite Dialog */}
            <Dialog open={showRespondDialog} onOpenChange={setShowRespondDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Respond to Invite</DialogTitle>
                        <DialogDescription>
                            {selectedInvite && `${selectedInvite.team.name} — ${formatDate(selectedInvite.matchDate)} at ${selectedInvite.matchTime}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Your Team <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <Select value={responseTeamId} onValueChange={setResponseTeamId}>
                                <SelectTrigger><SelectValue placeholder="Select your team" /></SelectTrigger>
                                <SelectContent>
                                    {myTeams.map((t: any) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Message <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <Input placeholder="e.g., We have 11 players ready!" value={responseMessage} onChange={(e) => setResponseMessage(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setShowRespondDialog(false)} className="w-full sm:w-auto">Cancel</Button>
                        <Button onClick={() => handleRespond('INTERESTED')} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white gap-1">
                            <Users className="w-4 h-4" /> Interested
                        </Button>
                        <Button onClick={() => handleRespond('ACCEPTED')} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white gap-1">
                            <Check className="w-4 h-4" /> Accept
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Invite Card Component
function InviteCard({ invite, formatDistance, formatDate, onRespond, isOwn }: {
    invite: InviteData;
    formatDistance: (km?: number) => string;
    formatDate: (d: string) => string;
    onRespond: () => void;
    isOwn: boolean;
}) {
    const interestedCount = invite.responses.filter(r => r.responseType === 'INTERESTED' || r.responseType === 'ACCEPTED').length;

    return (
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-200 rounded-2xl">
            <CardContent className="p-0">
                {/* Top: Team info & distance */}
                <div className="flex items-center gap-3 p-4 pb-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
                        {invite.team.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{invite.team.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>by {invite.creator.profileName || invite.creator.username}</span>
                            {invite.distance != null && (
                                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                    {formatDistance(invite.distance)}
                                </span>
                            )}
                        </div>
                    </div>
                    {isOwn && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${invite.status === 'OPEN' ? 'bg-green-50 text-green-700' :
                                invite.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700' :
                                    'bg-gray-100 text-gray-500'
                            }`}>
                            {invite.status}
                        </span>
                    )}
                </div>

                {/* Match details */}
                <div className="px-4 py-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-green-500" />
                        {formatDate(invite.matchDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        {invite.matchTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-purple-500" />
                        {invite.overs} overs
                    </span>
                </div>

                {/* Ground */}
                <div className="px-4 py-1 text-xs text-gray-500 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-red-400" />
                    {invite.ground.groundName}
                    {invite.ground.address && ` — ${invite.ground.address}`}
                </div>

                {invite.description && (
                    <div className="px-4 py-1 text-sm text-gray-600 italic">"{invite.description}"</div>
                )}

                {/* Bottom: responses & action */}
                <div className="flex items-center justify-between px-4 py-3 mt-1 bg-gray-50 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                        {interestedCount > 0
                            ? `${interestedCount} team${interestedCount > 1 ? 's' : ''} interested`
                            : 'No responses yet'
                        }
                    </span>
                    {!isOwn && (
                        <Button size="sm" onClick={onRespond} className="bg-green-600 hover:bg-green-700 text-white rounded-full px-4 gap-1 text-xs font-bold">
                            Respond <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                    )}
                    {isOwn && interestedCount > 0 && (
                        <span className="text-xs font-medium text-green-600">{interestedCount} response{interestedCount > 1 ? 's' : ''}!</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
