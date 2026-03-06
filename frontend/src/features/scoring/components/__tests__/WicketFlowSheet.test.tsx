import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WicketFlowSheet } from '../wicket/WicketFlowSheet';
import { useScoringStore } from '../../scoringStore';

// Mock the store
vi.mock('../../scoringStore', () => ({
    useScoringStore: vi.fn()
}));

// Mock the child steps to just render simple buttons we can click to test the flow
vi.mock('../wicket/DismissalTypeStep', () => ({
    DismissalTypeStep: ({ onSelect }: any) => (
        <div data-testid="step-type">
            <button onClick={() => onSelect('BOWLED')}>Select BOWLED</button>
            <button onClick={() => onSelect('CAUGHT')}>Select CAUGHT</button>
            <button onClick={() => onSelect('RUN_OUT')}>Select RUN_OUT</button>
        </div>
    )
}));

vi.mock('../wicket/FielderSelectStep', () => ({
    FielderSelectStep: ({ onSelect, onBack }: any) => (
        <div data-testid="step-fielder">
            <button onClick={() => onSelect('fielder1')}>Select Fielder 1</button>
            <button onClick={onBack}>Back from Fielder</button>
        </div>
    )
}));

vi.mock('../wicket/NewBatsmanStep', () => ({
    NewBatsmanStep: ({ onSelect, onBack }: any) => (
        <div data-testid="step-batsman">
            <button onClick={() => {
                onSelect('batsman1');
            }}>Select Batsman 1</button>
            <button onClick={onBack}>Back from Batsman</button>
        </div>
    )
}));

describe('WicketFlowSheet', () => {
    let mockCancelWicketFlow: ReturnType<typeof vi.fn>;
    let mockSetDismissalType: ReturnType<typeof vi.fn>;
    let mockSetFielder: ReturnType<typeof vi.fn>;
    let mockSetNewBatsman: ReturnType<typeof vi.fn>;
    let mockCommitWicket: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockCancelWicketFlow = vi.fn();
        mockSetDismissalType = vi.fn();
        mockSetFielder = vi.fn();
        mockSetNewBatsman = vi.fn();
        mockCommitWicket = vi.fn();

        (useScoringStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                isWicketFlowActive: true, // Always show it for tests
                wicketDraft: { dismissalType: null },
                isSubmitting: false,
                syncState: 'SYNCED',
                matchState: {
                    teamA: { id: 'teamA', players: [] },
                    teamB: { id: 'teamB', players: [] },
                    innings: [{ battingTeamId: 'teamA' }] // Current innings 0 (teamA batting)
                },
                cancelWicketFlow: mockCancelWicketFlow,
                setDismissalType: mockSetDismissalType,
                setFielder: mockSetFielder,
                setNewBatsman: mockSetNewBatsman,
                commitWicket: mockCommitWicket
            };
            return selector(state);
        });
    });

    it('returns null if isWicketFlowActive is false', () => {
        (useScoringStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            return selector({ isWicketFlowActive: false });
        });
        const { container } = render(<WicketFlowSheet />);
        expect(container.firstChild).toBeNull();
    });

    it('renders initial TYPE step', () => {
        render(<WicketFlowSheet />);
        expect(screen.getByTestId('step-type')).toBeInTheDocument();
        expect(screen.queryByTestId('step-fielder')).not.toBeInTheDocument();
        expect(screen.queryByTestId('step-batsman')).not.toBeInTheDocument();
        expect(screen.getByText('Wicket: Dismissal Method')).toBeInTheDocument();
    });

    it('skips fielder step for BOWLED', () => {
        render(<WicketFlowSheet />);

        fireEvent.click(screen.getByText('Select BOWLED'));

        expect(mockSetDismissalType).toHaveBeenCalledWith('BOWLED');
        // Type -> Batsman directly
        expect(screen.queryByTestId('step-type')).not.toBeInTheDocument();
        expect(screen.queryByTestId('step-fielder')).not.toBeInTheDocument();
        expect(screen.getByTestId('step-batsman')).toBeInTheDocument();
        expect(screen.getByText('Wicket: New Batsman')).toBeInTheDocument();
    });

    it('goes to fielder step for CAUGHT', () => {
        render(<WicketFlowSheet />);

        fireEvent.click(screen.getByText('Select CAUGHT'));

        expect(mockSetDismissalType).toHaveBeenCalledWith('CAUGHT');

        // Type -> Fielder
        expect(screen.queryByTestId('step-type')).not.toBeInTheDocument();
        expect(screen.getByTestId('step-fielder')).toBeInTheDocument();
        expect(screen.getByText('Wicket: Fielder')).toBeInTheDocument();

        // Then Fielder -> Batsman
        fireEvent.click(screen.getByText('Select Fielder 1'));
        expect(mockSetFielder).toHaveBeenCalledWith('fielder1');

        expect(screen.queryByTestId('step-fielder')).not.toBeInTheDocument();
        expect(screen.getByTestId('step-batsman')).toBeInTheDocument();
    });

    it('commits wicket when batsman is selected', () => {
        render(<WicketFlowSheet />);

        // Go straight to batsman step via BOWLED
        fireEvent.click(screen.getByText('Select BOWLED'));

        // Select Batsman
        fireEvent.click(screen.getByText('Select Batsman 1'));
        expect(mockSetNewBatsman).toHaveBeenCalledWith('batsman1');
        expect(mockCommitWicket).toHaveBeenCalled(); // Auto-commits on select
    });

    it('back button from Fielder goes to Type', () => {
        render(<WicketFlowSheet />);

        fireEvent.click(screen.getByText('Select CAUGHT'));
        expect(screen.getByTestId('step-fielder')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Back from Fielder'));
        expect(screen.getByTestId('step-type')).toBeInTheDocument();
    });

    it('back button from Batsman goes to Fielder if required', () => {
        // Mock state so draft KNOWS it's caught
        (useScoringStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                isWicketFlowActive: true,
                wicketDraft: { dismissalType: 'CAUGHT' }, // Draft has CAUGHT
                isSubmitting: false,
                syncState: 'SYNCED',
                matchState: { innings: [{}] },
                cancelWicketFlow: mockCancelWicketFlow,
                setDismissalType: mockSetDismissalType,
                setFielder: mockSetFielder,
                setNewBatsman: mockSetNewBatsman,
                commitWicket: mockCommitWicket
            };
            return selector(state);
        });

        render(<WicketFlowSheet />);

        // Setup state to be on Batsman step (simulate user clicking through)
        fireEvent.click(screen.getByText('Select CAUGHT'));
        fireEvent.click(screen.getByText('Select Fielder 1'));
        expect(screen.getByTestId('step-batsman')).toBeInTheDocument();

        // Go back
        fireEvent.click(screen.getByText('Back from Batsman'));

        // Because dismissalType in draft was CAUGHT, we go back to Fielder
        expect(screen.getByTestId('step-fielder')).toBeInTheDocument();
    });

    it('back button from Batsman goes to Type if fielder NOT required', () => {
        // Mock state so draft KNOWS it's bowled
        (useScoringStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                isWicketFlowActive: true,
                wicketDraft: { dismissalType: 'BOWLED' }, // Draft has BOWLED
                isSubmitting: false,
                syncState: 'SYNCED',
                matchState: { innings: [{}] },
                cancelWicketFlow: mockCancelWicketFlow,
                setDismissalType: mockSetDismissalType,
                setFielder: mockSetFielder,
                setNewBatsman: mockSetNewBatsman,
                commitWicket: mockCommitWicket
            };
            return selector(state);
        });

        render(<WicketFlowSheet />);

        // Setup state to be on Batsman step
        fireEvent.click(screen.getByText('Select BOWLED'));
        expect(screen.getByTestId('step-batsman')).toBeInTheDocument();

        // Go back
        fireEvent.click(screen.getByText('Back from Batsman'));

        // Because dismissalType was BOWLED, skip fielder, go to TYPE
        expect(screen.getByTestId('step-type')).toBeInTheDocument();
    });

    it('closes sheet when cancel/close button clicked', () => {
        render(<WicketFlowSheet />);
        fireEvent.click(screen.getByText('✕'));
        expect(mockCancelWicketFlow).toHaveBeenCalled();
    });
});
