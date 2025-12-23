/**
 * Tests for App component (main routing shell)
 * 
 * Tests the main application shell including mode switching,
 * view navigation, and feature view rendering.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the vscode API
const mockPostMessage = jest.fn();
const mockGetState = jest.fn(() => ({}));
const mockSetState = jest.fn();

(window as any).acquireVsCodeApi = () => ({
    postMessage: mockPostMessage,
    getState: mockGetState,
    setState: mockSetState,
});

// Mock feature views to isolate App testing
jest.mock('../features', () => ({
    BuildView: () => <div data-testid="build-view">Build View</div>,
    ChatView: () => <div data-testid="chat-view">Chat View</div>,
    FeedbackView: () => <div data-testid="feedback-view">Feedback View</div>,
    SettingsView: () => <div data-testid="settings-view">Settings View</div>,
    UserBaseView: () => <div data-testid="userbase-view">UserBase View</div>,
}));

// Import App after mocks are set up
import App from '../App';

describe('App', () => {
    beforeEach(() => {
        mockPostMessage.mockClear();
        mockGetState.mockClear();
        mockSetState.mockClear();
        mockGetState.mockReturnValue({});
    });

    it('renders without crashing', () => {
        render(<App />);
        expect(screen.getByText('Personaut')).toBeInTheDocument();
    });

    it('displays mode tabs', () => {
        render(<App />);
        expect(screen.getByText('Chat')).toBeInTheDocument();
        expect(screen.getByText('Feedback')).toBeInTheDocument();
        expect(screen.getByText('Build')).toBeInTheDocument();
    });

    it('displays view icons', () => {
        render(<App />);
        expect(screen.getByTitle('History')).toBeInTheDocument();
        expect(screen.getByTitle('User Base')).toBeInTheDocument();
        expect(screen.getByTitle('Settings')).toBeInTheDocument();
    });

    it('displays token usage bar', () => {
        render(<App />);
        expect(screen.getByText(/In:/)).toBeInTheDocument();
        expect(screen.getByText(/Out:/)).toBeInTheDocument();
        expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });

    it('requests settings on mount', () => {
        render(<App />);
        expect(mockPostMessage).toHaveBeenCalledWith({ type: 'get-settings' });
    });

    it('requests project history on mount', () => {
        render(<App />);
        expect(mockPostMessage).toHaveBeenCalledWith({ type: 'get-project-history' });
    });

    it('defaults to chat mode', () => {
        render(<App />);
        expect(screen.getByTestId('chat-view')).toBeInTheDocument();
    });
});

describe('App Mode Switching', () => {
    beforeEach(() => {
        mockGetState.mockReturnValue({});
    });

    it('switches to build mode', () => {
        render(<App />);

        fireEvent.click(screen.getByText('Build'));

        expect(screen.getByTestId('build-view')).toBeInTheDocument();
    });

    it('switches to feedback mode', () => {
        render(<App />);

        fireEvent.click(screen.getByText('Feedback'));

        expect(screen.getByTestId('feedback-view')).toBeInTheDocument();
    });

    it('switches back to chat mode', () => {
        render(<App />);

        fireEvent.click(screen.getByText('Build'));
        expect(screen.getByTestId('build-view')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Chat'));
        expect(screen.getByTestId('chat-view')).toBeInTheDocument();
    });
});

describe('App View Navigation', () => {
    beforeEach(() => {
        mockGetState.mockReturnValue({});
    });

    it('shows settings view when settings icon is clicked', () => {
        render(<App />);

        fireEvent.click(screen.getByTitle('Settings'));

        expect(screen.getByTestId('settings-view')).toBeInTheDocument();
    });

    it('shows userbase view when userbase icon is clicked', () => {
        render(<App />);

        fireEvent.click(screen.getByTitle('User Base'));

        expect(screen.getByTestId('userbase-view')).toBeInTheDocument();
    });

    it('toggles settings view off when clicked again', () => {
        render(<App />);

        fireEvent.click(screen.getByTitle('Settings'));
        expect(screen.getByTestId('settings-view')).toBeInTheDocument();

        fireEvent.click(screen.getByTitle('Settings'));
        expect(screen.getByTestId('chat-view')).toBeInTheDocument();
    });
});

describe('App State Persistence', () => {
    it('restores mode from saved state', () => {
        mockGetState.mockReturnValue({ mode: 'build' });

        render(<App />);

        expect(screen.getByTestId('build-view')).toBeInTheDocument();
    });

    it('restores view from saved state', () => {
        mockGetState.mockReturnValue({ view: 'settings' });

        render(<App />);

        expect(screen.getByTestId('settings-view')).toBeInTheDocument();
    });

    it('persists state changes', () => {
        render(<App />);

        fireEvent.click(screen.getByText('Build'));

        expect(mockSetState).toHaveBeenCalledWith(
            expect.objectContaining({ mode: 'build' })
        );
    });
});

describe('App Token Usage', () => {
    it('displays reset button', () => {
        render(<App />);
        expect(screen.getByTitle('Reset Token Counter')).toBeInTheDocument();
    });

    it('resets token usage when reset is clicked', () => {
        render(<App />);

        fireEvent.click(screen.getByTitle('Reset Token Counter'));

        expect(mockPostMessage).toHaveBeenCalledWith({ type: 'reset-token-usage' });
    });
});
