
import { apiRequest } from "../client/src/lib/queryClient";

const BASE_URL = 'http://localhost:3001';

async function verifyFixes() {
    console.log('Starting verification...');

    try {
        // 1. Create a User (Captain)
        const username = `verify_user_${Date.now()}`;
        const password = 'password123';
        console.log(`Creating user: ${username}`);

        let headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        const registerRes = await fetch(`${BASE_URL}/api/register`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                username,
                password,
                role: 'captain',
                name: 'Verify Captain'
            })
        });

        if (!registerRes.ok) {
            throw new Error(`Register failed: ${registerRes.status} ${await registerRes.text()}`);
        }

        // Capture cookie
        const cookie = registerRes.headers.get('set-cookie');
        if (cookie) {
            headers['Cookie'] = cookie;
        }

        console.log('User created and logged in.');

        // 2. Create a Team
        const teamName = `Verify Team ${Date.now()}`;
        console.log(`Creating team: ${teamName}`);

        const teamRes = await fetch(`${BASE_URL}/api/teams`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: teamName })
        });

        if (!teamRes.ok) {
            throw new Error(`Create team failed: ${teamRes.status} ${await teamRes.text()}`);
        }
        const teamData = await teamRes.json();
        const teamId = teamData.id;
        console.log(`Team created: ${teamId}`);

        // 3. Add Guest Player (Test permission & default values)
        console.log('Adding guest player...');
        const guestRes = await fetch(`${BASE_URL}/api/teams/${teamId}/guest-players`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: 'Guest Star' })
        });

        if (!guestRes.ok) {
            throw new Error(`Add guest failed: ${guestRes.status} ${await guestRes.text()}`);
        }

        const guestData = await guestRes.json();
        console.log('Guest player added:', guestData);
        const guestId = guestData.id;

        // 4. Submit Match Result (Test validation)
        console.log('Submitting match result...');

        const matchPayload = {
            homeTeamId: teamId,
            homeTeamName: teamName,
            awayTeamName: 'Opponent XI',
            matchDate: new Date().toISOString(),
            venue: 'Verification Ground',
            result: 'HOME_WIN',
            homeTeamRuns: 150,
            homeTeamWickets: 5,
            homeTeamOvers: 20,
            awayTeamRuns: 140,
            awayTeamWickets: 9,
            awayTeamOvers: 20,
            playerPerformances: [
                {
                    teamId: teamId,
                    isGuest: true,
                    guestId: guestId,
                    playerName: 'Guest Star',
                    runs: 50,
                    ballsFaced: 30,
                    fours: 4,
                    sixes: 2,
                    wickets: 0,
                    overs: 0,
                    runsConceded: 0,
                    catches: 0,
                    runOuts: 0,
                    stumpings: 0,
                    isNotOut: true
                }
            ]
        };

        const matchRes = await fetch(`${BASE_URL}/api/matches/submit-result`, {
            method: 'POST',
            headers,
            body: JSON.stringify(matchPayload)
        });

        if (!matchRes.ok) {
            const errorText = await matchRes.text();
            throw new Error(`Match submit failed: ${matchRes.status} ${errorText}`);
        }

        const matchData = await matchRes.json();
        console.log('Match submitted successfully:', matchData);

        console.log('VERIFICATION SUCCESSFUL: All critical paths tested.');

    } catch (error: any) {
        console.error('VERIFICATION FAILED');
        console.error(error.message);
    }
}

verifyFixes();
