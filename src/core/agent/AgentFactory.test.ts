import { AgentFactory } from './AgentFactory';
import { ChatAgent } from './chat/ChatAgent';
import { PersonaAgent } from './chat/PersonaAgent';
import { AssistantAgent } from './chat/AssistantAgent';
import { DeveloperAgent } from './build/DeveloperAgent';
import { DesignerAgent } from './build/DesignerAgent';
import { ResearchAgent } from './build/ResearchAgent';
import { ReviewerAgent } from './feedback/ReviewerAgent';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode');

// Mock all agent dependencies
jest.mock('./chat/ChatAgent');
jest.mock('./chat/PersonaAgent');
jest.mock('./chat/AssistantAgent');
jest.mock('./build/DeveloperAgent');
jest.mock('./build/DesignerAgent');
jest.mock('./build/ResearchAgent');
jest.mock('./feedback/ReviewerAgent');

describe('AgentFactory', () => {
    let mockWebview: jest.Mocked<vscode.Webview>;
    let mockTokenStorageService: any;
    let mockTokenMonitor: any;
    let mockOnDidUpdateMessages: jest.Mock;

    beforeEach(() => {
        mockWebview = {
            postMessage: jest.fn(),
        } as any;

        mockTokenStorageService = {};
        mockTokenMonitor = {};
        mockOnDidUpdateMessages = jest.fn();

        jest.clearAllMocks();
    });

    describe('createChatAgent', () => {
        it('should create a ChatAgent with correct config', () => {
            const agent = AgentFactory.createChatAgent(
                'test-chat-1',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages
            );

            expect(agent).toBeDefined();
            expect(ChatAgent).toHaveBeenCalledWith({
                conversationId: 'test-chat-1',
                webview: mockWebview,
                mode: 'chat',
                tokenStorageService: mockTokenStorageService,
                tokenMonitor: mockTokenMonitor,
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });
        });

        it('should return ChatAgent instance', () => {
            const agent = AgentFactory.createChatAgent(
                'test-chat-2',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages
            );

            expect(agent).toBeInstanceOf(ChatAgent);
        });
    });

    describe('createPersonaAgent', () => {
        it('should create a PersonaAgent with correct config and options', () => {
            const options = {
                personaName: 'Emily',
                backstory: 'A UX designer',
                mode: 'agent' as const,
            };

            const agent = AgentFactory.createPersonaAgent(
                'test-persona-1',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages,
                options
            );

            expect(agent).toBeDefined();
            expect(PersonaAgent).toHaveBeenCalledWith(
                {
                    conversationId: 'test-persona-1',
                    webview: mockWebview,
                    mode: 'chat',
                    tokenStorageService: mockTokenStorageService,
                    tokenMonitor: mockTokenMonitor,
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                options
            );
        });

        it('should return PersonaAgent instance', () => {
            const agent = AgentFactory.createPersonaAgent(
                'test-persona-2',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages,
                { personaName: 'Emily' }
            );

            expect(agent).toBeInstanceOf(PersonaAgent);
        });
    });

    describe('createAssistantAgent', () => {
        it('should create an AssistantAgent with correct config', () => {
            const agent = AgentFactory.createAssistantAgent(
                'test-assistant-1',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages
            );

            expect(agent).toBeDefined();
            expect(AssistantAgent).toHaveBeenCalledWith({
                conversationId: 'test-assistant-1',
                webview: mockWebview,
                mode: 'chat',
                tokenStorageService: mockTokenStorageService,
                tokenMonitor: mockTokenMonitor,
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });
        });

        it('should return AssistantAgent instance', () => {
            const agent = AgentFactory.createAssistantAgent(
                'test-assistant-2',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages
            );

            expect(agent).toBeInstanceOf(AssistantAgent);
        });
    });

    describe('createDeveloperAgent', () => {
        it('should create a DeveloperAgent with correct config and options', () => {
            const options = { framework: 'react' as const };

            const agent = AgentFactory.createDeveloperAgent(
                'test-developer-1',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages,
                options
            );

            expect(agent).toBeDefined();
            expect(DeveloperAgent).toHaveBeenCalledWith(
                {
                    conversationId: 'test-developer-1',
                    webview: mockWebview,
                    mode: 'build',
                    tokenStorageService: mockTokenStorageService,
                    tokenMonitor: mockTokenMonitor,
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                options
            );
        });

        it('should support all frameworks', () => {
            const frameworks: Array<'react' | 'nextjs' | 'vue' | 'flutter' | 'html'> = [
                'react',
                'nextjs',
                'vue',
                'flutter',
                'html',
            ];

            frameworks.forEach(framework => {
                jest.clearAllMocks();

                AgentFactory.createDeveloperAgent(
                    `test-developer-${framework}`,
                    mockWebview,
                    mockTokenStorageService,
                    mockTokenMonitor,
                    mockOnDidUpdateMessages,
                    { framework }
                );

                expect(DeveloperAgent).toHaveBeenCalledWith(
                    expect.objectContaining({
                        conversationId: `test-developer-${framework}`,
                    }),
                    { framework }
                );
            });
        });

        it('should return DeveloperAgent instance', () => {
            const agent = AgentFactory.createDeveloperAgent(
                'test-developer-2',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages,
                { framework: 'react' }
            );

            expect(agent).toBeInstanceOf(DeveloperAgent);
        });
    });

    describe('createDesignerAgent', () => {
        it('should create a DesignerAgent with correct config', () => {
            const agent = AgentFactory.createDesignerAgent(
                'test-designer-1',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages
            );

            expect(agent).toBeDefined();
            expect(DesignerAgent).toHaveBeenCalledWith({
                conversationId: 'test-designer-1',
                webview: mockWebview,
                mode: 'build',
                tokenStorageService: mockTokenStorageService,
                tokenMonitor: mockTokenMonitor,
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });
        });

        it('should return DesignerAgent instance', () => {
            const agent = AgentFactory.createDesignerAgent(
                'test-designer-2',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages
            );

            expect(agent).toBeInstanceOf(DesignerAgent);
        });
    });

    describe('createResearchAgent', () => {
        it('should create a ResearchAgent with correct config and options', () => {
            const options = {
                researchType: 'competitive' as const,
                idea: 'AI coding assistant',
            };

            const agent = AgentFactory.createResearchAgent(
                'test-research-1',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages,
                options
            );

            expect(agent).toBeDefined();
            expect(ResearchAgent).toHaveBeenCalledWith(
                {
                    conversationId: 'test-research-1',
                    webview: mockWebview,
                    mode: 'build',
                    tokenStorageService: mockTokenStorageService,
                    tokenMonitor: mockTokenMonitor,
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                options
            );
        });

        it('should support all research types', () => {
            const types: Array<'competitive' | 'market' | 'user' | 'synthesis'> = [
                'competitive',
                'market',
                'user',
                'synthesis',
            ];

            types.forEach(researchType => {
                jest.clearAllMocks();

                AgentFactory.createResearchAgent(
                    `test-research-${researchType}`,
                    mockWebview,
                    mockTokenStorageService,
                    mockTokenMonitor,
                    mockOnDidUpdateMessages,
                    { researchType }
                );

                expect(ResearchAgent).toHaveBeenCalledWith(
                    expect.objectContaining({
                        conversationId: `test-research-${researchType}`,
                    }),
                    { researchType }
                );
            });
        });

        it('should return ResearchAgent instance', () => {
            const agent = AgentFactory.createResearchAgent(
                'test-research-2',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages,
                { researchType: 'market' }
            );

            expect(agent).toBeInstanceOf(ResearchAgent);
        });
    });

    describe('createReviewerAgent', () => {
        it('should create a ReviewerAgent with correct config and options', () => {
            const options = {
                personaName: 'Emily',
                ratingSystem: 'stars' as const,
            };

            const agent = AgentFactory.createReviewerAgent(
                'test-reviewer-1',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages,
                options
            );

            expect(agent).toBeDefined();
            expect(ReviewerAgent).toHaveBeenCalledWith(
                {
                    conversationId: 'test-reviewer-1',
                    webview: mockWebview,
                    mode: 'feedback',
                    tokenStorageService: mockTokenStorageService,
                    tokenMonitor: mockTokenMonitor,
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                options
            );
        });

        it('should support all rating systems', () => {
            const ratingSystems: Array<'stars' | '1-10' | '1-100'> = ['stars', '1-10', '1-100'];

            ratingSystems.forEach(ratingSystem => {
                jest.clearAllMocks();

                AgentFactory.createReviewerAgent(
                    `test-reviewer-${ratingSystem}`,
                    mockWebview,
                    mockTokenStorageService,
                    mockTokenMonitor,
                    mockOnDidUpdateMessages,
                    { personaName: 'Emily', ratingSystem }
                );

                expect(ReviewerAgent).toHaveBeenCalledWith(
                    expect.objectContaining({
                        conversationId: `test-reviewer-${ratingSystem}`,
                    }),
                    { personaName: 'Emily', ratingSystem }
                );
            });
        });

        it('should return ReviewerAgent instance', () => {
            const agent = AgentFactory.createReviewerAgent(
                'test-reviewer-2',
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages,
                { personaName: 'Emily' }
            );

            expect(agent).toBeInstanceOf(ReviewerAgent);
        });
    });

    describe('factory consistency', () => {
        it('should create all agent types with consistent parameters', () => {
            const conversationId = 'test-consistency';

            // Create all agent types
            AgentFactory.createChatAgent(
                conversationId,
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages
            );

            AgentFactory.createPersonaAgent(
                conversationId,
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages,
                { personaName: 'Emily' }
            );

            AgentFactory.createAssistantAgent(
                conversationId,
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages
            );

            AgentFactory.createDeveloperAgent(
                conversationId,
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages,
                { framework: 'react' }
            );

            AgentFactory.createDesignerAgent(
                conversationId,
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages
            );

            AgentFactory.createResearchAgent(
                conversationId,
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages,
                { researchType: 'competitive' }
            );

            AgentFactory.createReviewerAgent(
                conversationId,
                mockWebview,
                mockTokenStorageService,
                mockTokenMonitor,
                mockOnDidUpdateMessages,
                { personaName: 'Emily' }
            );

            // All should have been called with same base parameters
            expect(ChatAgent).toHaveBeenCalledWith(
                expect.objectContaining({
                    conversationId,
                    webview: mockWebview,
                    tokenStorageService: mockTokenStorageService,
                    tokenMonitor: mockTokenMonitor,
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                })
            );
        });
    });
});
