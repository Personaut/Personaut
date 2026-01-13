import { ChatAgent } from './ChatAgent';
import { PersonaAgent } from './PersonaAgent';
import { AssistantAgent } from './AssistantAgent';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode');

// Mock providers
jest.mock('../../providers/GeminiProvider');
jest.mock('../../providers/BedrockProvider');
jest.mock('../../providers/NativeIDEProvider');

// Mock tools
jest.mock('../../tools/FileTools');
jest.mock('../../tools/TerminalTool');
jest.mock('../../tools/BrowserTool');
jest.mock('../../integrations/TerminalManager');

// Mock prompts
jest.mock('../../prompts/ChatPrompts', () => ({
    DEFAULT_CHAT_PERSONA_PROMPT: 'You are a helpful AI assistant',
}));

jest.mock('../../prompts/PersonaPrompts', () => ({
    getAgentModePrompt: jest.fn((persona) => `Agent mode for ${persona.name}`),
    getTextMessengerModePrompt: jest.fn((persona) => `Text messenger mode for ${persona.name}`),
    getFeedbackModePrompt: jest.fn((persona) => `Feedback mode for ${persona.name}`),
    getBuildModePrompt: jest.fn((persona) => `Build mode for ${persona.name}`),
}));

jest.mock('../../prompts/SystemPrompts', () => ({
    getAgentSystemPrompt: jest.fn((_tools, workspace) => `System prompt with tools in ${workspace}`),
    GENERIC_ASSISTANT_PROMPT: 'You are a coding assistant',
}));

describe('Chat Agents', () => {
    let mockWebview: jest.Mocked<vscode.Webview>;
    let mockOnDidUpdateMessages: jest.Mock;

    beforeEach(() => {
        mockWebview = {
            postMessage: jest.fn(),
        } as any;

        mockOnDidUpdateMessages = jest.fn();

        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((key: string) => {
                if (key === 'provider') return 'gemini';
                if (key === 'geminiApiKey') return 'test-key';
                return undefined;
            }),
        });

        (vscode.workspace.workspaceFolders as any) = [{ uri: { fsPath: '/test/workspace' } }];

        jest.clearAllMocks();
    });

    describe('ChatAgent', () => {
        it('should initialize with correct agent type', () => {
            const agent = new ChatAgent({
                conversationId: 'test-chat-1',
                webview: mockWebview,
                mode: 'chat',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            expect(agent.agentType).toBe('chat');
            expect(agent.mode).toBe('chat');
        });

        it('should register CONVERSATION capability', () => {
            const agent = new ChatAgent({
                conversationId: 'test-chat-2',
                webview: mockWebview,
                mode: 'chat',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            const capabilities = agent.getCapabilities();
            expect(capabilities).toHaveLength(1);
            expect(capabilities[0].name).toBe('conversation');
        });

        it('should generate system prompt with chat persona', () => {
            const agent = new ChatAgent({
                conversationId: 'test-chat-3',
                webview: mockWebview,
                mode: 'chat',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            const prompt = agent.getSystemPrompt();

            expect(prompt).toContain('System prompt');
            expect(prompt).toContain('You are a helpful AI assistant');
        });

        it('should have conversation capability', () => {
            const agent = new ChatAgent({
                conversationId: 'test-chat-4',
                webview: mockWebview,
                mode: 'chat',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            expect(agent.hasCapability('conversation')).toBe(true);
        });
    });

    describe('PersonaAgent', () => {
        it('should initialize with correct agent type', () => {
            const agent = new PersonaAgent(
                {
                    conversationId: 'test-persona-1',
                    webview: mockWebview,
                    mode: 'chat',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    backstory: 'A UX designer',
                    mode: 'agent',
                }
            );

            expect(agent.agentType).toBe('persona');
        });

        it('should register PERSONA_CHAT capability', () => {
            const agent = new PersonaAgent(
                {
                    conversationId: 'test-persona-2',
                    webview: mockWebview,
                    mode: 'chat',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                }
            );

            const capabilities = agent.getCapabilities();
            expect(capabilities).toHaveLength(1);
            expect(capabilities[0].name).toBe('persona-chat');
        });

        it('should use agent mode prompt by default', () => {
            const agent = new PersonaAgent(
                {
                    conversationId: 'test-persona-3',
                    webview: mockWebview,
                    mode: 'chat',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    backstory: 'A UX designer',
                }
            );

            const prompt = agent.getSystemPrompt();

            expect(prompt).toContain('Agent mode for Emily');
        });

        it('should use text-messenger mode prompt when specified', () => {
            const agent = new PersonaAgent(
                {
                    conversationId: 'test-persona-4',
                    webview: mockWebview,
                    mode: 'chat',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    mode: 'text-messenger',
                }
            );

            const prompt = agent.getSystemPrompt();

            expect(prompt).toContain('Text messenger mode for Emily');
        });

        it('should use feedback mode prompt when specified', () => {
            const agent = new PersonaAgent(
                {
                    conversationId: 'test-persona-5',
                    webview: mockWebview,
                    mode: 'chat',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    mode: 'feedback',
                }
            );

            const prompt = agent.getSystemPrompt();

            expect(prompt).toContain('Feedback mode for Emily');
        });

        it('should use build mode prompt when specified', () => {
            const agent = new PersonaAgent(
                {
                    conversationId: 'test-persona-6',
                    webview: mockWebview,
                    mode: 'chat',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    mode: 'build',
                }
            );

            const prompt = agent.getSystemPrompt();

            expect(prompt).toContain('Build mode for Emily');
        });

        it('should return persona info', () => {
            const agent = new PersonaAgent(
                {
                    conversationId: 'test-persona-7',
                    webview: mockWebview,
                    mode: 'chat',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    backstory: 'A UX designer',
                    attributes: { age: 28, role: 'designer' },
                    mode: 'agent',
                }
            );

            const info = agent.getPersonaInfo();

            expect(info.name).toBe('Emily');
            expect(info.backstory).toBe('A UX designer');
            expect(info.attributes).toEqual({ age: 28, role: 'designer' });
            expect(info.mode).toBe('agent');
        });

        it('should allow mode changes', () => {
            const agent = new PersonaAgent(
                {
                    conversationId: 'test-persona-8',
                    webview: mockWebview,
                    mode: 'chat',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    mode: 'agent',
                }
            );

            agent.setMode('feedback');

            const prompt = agent.getSystemPrompt();
            expect(prompt).toContain('Feedback mode for Emily');
        });
    });

    describe('AssistantAgent', () => {
        it('should initialize with correct agent type', () => {
            const agent = new AssistantAgent({
                conversationId: 'test-assistant-1',
                webview: mockWebview,
                mode: 'chat',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            expect(agent.agentType).toBe('assistant');
        });

        it('should register CONVERSATION and TOOL_EXECUTION capabilities', () => {
            const agent = new AssistantAgent({
                conversationId: 'test-assistant-2',
                webview: mockWebview,
                mode: 'chat',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            const capabilities = agent.getCapabilities();
            expect(capabilities).toHaveLength(2);

            const capabilityNames = capabilities.map(c => c.name);
            expect(capabilityNames).toContain('conversation');
            expect(capabilityNames).toContain('tool-execution');
        });

        it('should generate system prompt with assistant prompt', () => {
            const agent = new AssistantAgent({
                conversationId: 'test-assistant-3',
                webview: mockWebview,
                mode: 'chat',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            const prompt = agent.getSystemPrompt();

            expect(prompt).toContain('System prompt');
            expect(prompt).toContain('You are a coding assistant');
        });

        it('should return available tools', () => {
            const agent = new AssistantAgent({
                conversationId: 'test-assistant-4',
                webview: mockWebview,
                mode: 'chat',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            const tools = agent.getAvailableTools();

            expect(Array.isArray(tools)).toBe(true);
            expect(tools.length).toBeGreaterThan(0);
        });

        it('should check tool availability', () => {
            const agent = new AssistantAgent({
                conversationId: 'test-assistant-5',
                webview: mockWebview,
                mode: 'chat',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            // Assuming read_file is a standard tool
            expect(agent.hasToolAvailable('read_file')).toBe(true);
            expect(agent.hasToolAvailable('non_existent_tool')).toBe(false);
        });

        it('should have both conversation and tool execution capabilities', () => {
            const agent = new AssistantAgent({
                conversationId: 'test-assistant-6',
                webview: mockWebview,
                mode: 'chat',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            expect(agent.hasCapability('conversation')).toBe(true);
            expect(agent.hasCapability('tool-execution')).toBe(true);
        });
    });
});
