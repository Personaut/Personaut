/**
 * Tests for ChatView component
 * 
 * Tests the chat interface including message display,
 * input handling, and state management.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ChatView } from '../../../features/chat/ChatView';

// Mock the useChatState hook
jest.mock('../../../features/chat/hooks/useChatState', () => ({
    useChatState: () => ({
        messages: [],
        input: '',
        setInput: jest.fn(),
        isTyping: false,
        status: '',
        contextFiles: [],
        selectedPersona: { id: 'default', name: 'Default' },
        sendMessage: jest.fn(),
        removeContextFile: jest.fn(),
        addActiveFile: jest.fn(),
        bottomRef: { current: null },
    }),
}));

// Mock the components
jest.mock('../../../features/chat/components/MessageList', () => ({
    MessageList: ({ messages }: { messages: any[] }) => (
        <div data-testid="message-list">
            Messages: {messages.length}
        </div>
    ),
}));

jest.mock('../../../features/chat/components/ChatInput', () => ({
    ChatInput: ({ placeholder }: { placeholder: string }) => (
        <div data-testid="chat-input">
            <input placeholder={placeholder} />
        </div>
    ),
}));

describe('ChatView', () => {
    it('renders without crashing', () => {
        render(<ChatView />);
        expect(screen.getByTestId('message-list')).toBeInTheDocument();
        expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    it('displays message list component', () => {
        render(<ChatView />);
        expect(screen.getByText('Messages: 0')).toBeInTheDocument();
    });

    it('displays chat input component', () => {
        render(<ChatView />);
        expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('accepts onMessageSent prop', () => {
        const onMessageSent = jest.fn();
        render(<ChatView onMessageSent={onMessageSent} />);
        expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });
});

describe('ChatView with messages', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('renders container with correct styles', () => {
        render(<ChatView />);
        const container = screen.getByTestId('message-list').parentElement;
        expect(container).toHaveStyle({ display: 'flex' });
    });
});
