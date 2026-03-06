import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScorePanel } from '../ScorePanel';
import { useScoringStore } from '../../scoringStore';

// Mock Zustand
vi.mock('../../scoringStore', () => ({
    useScoringStore: vi.fn()
}));

// Mock StateBadge so it just renders text
vi.mock('../../../components/ui/StateBadge', () => ({
    StateBadge: ({ status }: { status: string }) => <div data-testid="state-badge">{status}</div>
}));

describe('ScorePanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Base mock for getState since ScorePanel reads it directly for some banners
        (useScoringStore as any).getState = vi.fn(() => ({ isOffline: false, unsyncedCount: 0 }));
    });

    it('renders basic match info, teams, and score', () => {
        (useScoringStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                matchState: {
                    tournamentName: 'T20 World Cup',
                    status: 'LIVE',
                    teamA: { name: 'India' },
                    teamB: { name: 'Australia' }
                },
                isSubmitting: false,
                getDisplayScore: () => ({ totalRuns: 120, totalWickets: 2, overs: '12.4', crr: '9.47' }),
                getChaseInfo: () => null,
                isOffline: false,
                syncState: 'SYNCED'
            };
            return selector(state);
        });

        render(<ScorePanel />);

        expect(screen.getByText('T20 World Cup')).toBeInTheDocument();
        expect(screen.getByText(/India/i)).toBeInTheDocument();
        expect(screen.getByText(/Australia/i)).toBeInTheDocument();

        expect(screen.getByText('120')).toBeInTheDocument(); // totalRuns
        expect(screen.getByText('2')).toBeInTheDocument();   // totalWickets
        expect(screen.getByText('(12.4)')).toBeInTheDocument(); // overs
        expect(screen.getByText('9.47')).toBeInTheDocument();   // crr
    });

    it('shows offline banner when app is offline', () => {
        (useScoringStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                matchState: { teamA: { name: 'A' }, teamB: { name: 'B' } },
                getDisplayScore: () => ({ totalRuns: 0, totalWickets: 0, overs: '0.0', crr: '0.00' }),
                getChaseInfo: () => null,
                isOffline: true,
                unsyncedCount: 5,
                syncState: 'SYNCED'
            };
            return selector(state);
        });

        render(<ScorePanel />);
        // Text is "Offline Mode — 5 unsynced balls"
        // RTL matches text across multiple nodes if not exact, we can use a regex or partial match safely
        expect(screen.getByText(/Offline Mode/i)).toBeInTheDocument();
        expect(screen.getByText(/5 unsynced balls/i)).toBeInTheDocument();
    });

    it('shows sync conflict banner when syncState is CONFLICT', () => {
        (useScoringStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                matchState: { teamA: { name: 'A' }, teamB: { name: 'B' } },
                getDisplayScore: () => null,
                getChaseInfo: () => null,
                isOffline: false,
                syncState: 'CONFLICT',
            };
            // Also need to mock the getState().isOffline call in the component
            (useScoringStore as any).getState = () => ({ isOffline: false });
            return selector(state);
        });

        render(<ScorePanel />);
        expect(screen.getByText(/State updated by another scorer/i)).toBeInTheDocument();
    });

    it('renders chase info when available (Target, RRR)', () => {
        (useScoringStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                matchState: { teamA: { name: 'A' }, teamB: { name: 'B' } },
                getDisplayScore: () => ({ totalRuns: 50, totalWickets: 0, overs: '5.0', crr: '10.00' }),
                getChaseInfo: () => ({
                    target: 151,
                    requiredRuns: 101,
                    remainingBalls: 90,
                    requiredRunRate: '6.73',
                    isComplete: false
                }),
                isOffline: false,
                syncState: 'SYNCED',
            };
            return selector(state);
        });

        render(<ScorePanel />);
        expect(screen.getByText('151')).toBeInTheDocument(); // Target
        expect(screen.getByText('Need 101 off 90')).toBeInTheDocument();
        expect(screen.getByText('6.73')).toBeInTheDocument(); // RRR
    });

    it('shows match result if chase is complete', () => {
        (useScoringStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                matchState: { teamA: { name: 'A' }, teamB: { name: 'B' } },
                getDisplayScore: () => ({ totalRuns: 155, totalWickets: 2, overs: '15.0', crr: '10.33' }),
                getChaseInfo: () => ({
                    target: 151,
                    requiredRuns: 0,
                    remainingBalls: 30,
                    requiredRunRate: '0.00',
                    isComplete: true,
                    result: { resultType: 'WIN', description: 'Team B won by 8 wickets' }
                }),
                isOffline: false,
                syncState: 'SYNCED',
            };
            return selector(state);
        });

        render(<ScorePanel />);
        expect(screen.getByText('Target Achieved ✓')).toBeInTheDocument();
        expect(screen.getByText('Team B won by 8 wickets')).toBeInTheDocument();
    });
});
