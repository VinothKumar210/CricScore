import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ControlPad } from '../ControlPad';
import { useScoringStore } from '../../scoringStore';

// Mock the Zustand store entirely
vi.mock('../../scoringStore', () => ({
    useScoringStore: vi.fn()
}));

// Mock the WicketFlowSheet component so we don't need to mount it
vi.mock('../wicket/WicketFlowSheet', () => ({
    WicketFlowSheet: () => <div data-testid="wicket-flow-sheet" />
}));

describe('ControlPad', () => {
    let mockRecordBall: ReturnType<typeof vi.fn>;
    let mockUndo: ReturnType<typeof vi.fn>;
    let mockStartWicketFlow: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockRecordBall = vi.fn();
        mockUndo = vi.fn();
        mockStartWicketFlow = vi.fn();

        // Default store mock state: Active match, not submitting
        (useScoringStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                recordBall: mockRecordBall,
                undo: mockUndo,
                startWicketFlow: mockStartWicketFlow,
                isSubmitting: false,
                matchState: { status: 'LIVE' },
                derivedState: { matchResult: undefined }
            };
            return selector(state);
        });
    });

    it('renders run buttons and triggers recordBall on click', () => {
        render(<ControlPad />);

        // Dot ball button text is '•'
        fireEvent.click(screen.getByText('•'));
        expect(mockRecordBall).toHaveBeenCalledWith({ type: 'RUN', runs: 0 });

        fireEvent.click(screen.getByText('1'));
        expect(mockRecordBall).toHaveBeenCalledWith({ type: 'RUN', runs: 1 });

        fireEvent.click(screen.getByText('4'));
        expect(mockRecordBall).toHaveBeenCalledWith({ type: 'RUN', runs: 4 });

        fireEvent.click(screen.getByText('6'));
        expect(mockRecordBall).toHaveBeenCalledWith({ type: 'RUN', runs: 6 });
    });

    it('handles extra deliveries correctly', () => {
        render(<ControlPad />);

        fireEvent.click(screen.getByText('WD'));
        expect(mockRecordBall).toHaveBeenCalledWith({ type: 'EXTRA', extraType: 'WIDE', runsOffBat: 0, additionalRuns: 0 });

        fireEvent.click(screen.getByText('NB'));
        expect(mockRecordBall).toHaveBeenCalledWith({ type: 'EXTRA', extraType: 'NO_BALL', runsOffBat: 0, additionalRuns: 0 });

        fireEvent.click(screen.getByText('B'));
        expect(mockRecordBall).toHaveBeenCalledWith({ type: 'EXTRA', extraType: 'BYE', runsOffBat: 0, additionalRuns: 0 });

        fireEvent.click(screen.getByText('LB'));
        expect(mockRecordBall).toHaveBeenCalledWith({ type: 'EXTRA', extraType: 'LEG_BYE', runsOffBat: 0, additionalRuns: 0 });
    });

    it('triggers OUT flow', () => {
        render(<ControlPad />);
        fireEvent.click(screen.getByText('OUT'));
        expect(mockStartWicketFlow).toHaveBeenCalled();
    });

    it('triggers undo', () => {
        render(<ControlPad />);
        // Undo button has "Undo" text
        fireEvent.click(screen.getByText('Undo'));
        expect(mockUndo).toHaveBeenCalled();
    });

    it('disables buttons when isSubmitting is true', () => {
        (useScoringStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                recordBall: mockRecordBall,
                undo: mockUndo,
                startWicketFlow: mockStartWicketFlow,
                isSubmitting: true, // Submitting state!
                matchState: { status: 'LIVE' },
                derivedState: { matchResult: undefined }
            };
            return selector(state);
        });

        render(<ControlPad />);

        // Buttons should be disabled
        expect(screen.getByText('1')).toBeDisabled();
        expect(screen.getByText('OUT')).toBeDisabled();
        expect(screen.getByText('Undo')).toBeDisabled();
    });

    it('disables buttons when match is NOT live', () => {
        (useScoringStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                recordBall: mockRecordBall,
                undo: mockUndo,
                startWicketFlow: mockStartWicketFlow,
                isSubmitting: false,
                matchState: { status: 'COMPLETED' }, // Not live
                derivedState: { matchResult: undefined }
            };
            return selector(state);
        });

        render(<ControlPad />);
        expect(screen.getByText('6')).toBeDisabled();
        expect(screen.getByText('WD')).toBeDisabled();
        expect(screen.getByText('OUT')).toBeDisabled();
    });

    it('disables buttons when matchResult is defined (Match Complete)', () => {
        (useScoringStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                recordBall: mockRecordBall,
                undo: mockUndo,
                startWicketFlow: mockStartWicketFlow,
                isSubmitting: false,
                matchState: { status: 'LIVE' },
                derivedState: { matchResult: { resultType: 'WIN', winnerTeamId: 't1', description: 'Won' } } // Complete
            };
            return selector(state);
        });

        render(<ControlPad />);
        expect(screen.getByText('1')).toBeDisabled();
        expect(screen.getByText('OUT')).toBeDisabled();
    });
});
