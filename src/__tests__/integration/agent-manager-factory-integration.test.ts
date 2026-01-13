/**
 * Integration test for AgentManager factory delegation
 * Verifies that all specialized agents can be created through AgentManager
 */

import { AgentManager, AgentManagerConfig } from '../../core/agent/AgentManager';

// Mock vscode module
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn((key: string) => {
                const defaults: Record<string, any> = {
                    provider: 'gemini',
                    geminiApiKey: 'test-api-key',
                    awsAccessKey: '',
                    awsSecretKey: '',
                    awsRegion: 'us-east-1',
                    awsProfile: 'default',
                    bedrockUseAwsProfile: false,
                    mcpServers: {},
                };
                return defaults[key];
            }),
        })),
        workspaceFolders: [
            {
                uri: { fsPath: '/test/workspace' },
                name: 'test-workspace',
                index: 0,
            },
        ],
    },
    Uri: {
        joinPath: jest.fn(),
    },
}));

describe('AgentManager Factory Integration', () => {
    function createMockWebview() {
        return {
            postMessage: jest.fn().mockResolvedValue(true),
            asWebviewUri: jest.fn((uri) => uri),
            cspSource: 'mock-csp-source',
            options: {},
            html: '',
            onDidReceiveMessage: jest.fn(),
        } as any;
    }

    function createMockTokenStorageService() {
        return {
            getAllApiKeys: jest.fn().mockResolvedValue({
                geminiApiKey: 'test-api-key',
                awsAccessKey: '',
                awsSecretKey: '',
            }),
            retrieveApiKey: jest.fn().mockResolvedValue('test-api-key'),
            storeApiKey: jest.fn().mockResolvedValue(undefined),
            deleteApiKey: jest.fn().mockResolvedValue(undefined),
            hasApiKey: jest.fn().mockResolvedValue(true),
        } as any;
    }

    function createMockConversationManager() {
        return {
            saveConversation: jest.fn().mockResolvedValue({
                id: 'test-id',
                title: 'Test Conversation',
                timestamp: Date.now(),
                messages: [],
                lastUpdated: Date.now(),
            }),
            getConversation: jest.fn().mockReturnValue(undefined),
            getConversations: jest.fn().mockReturnValue([]),
            deleteConversation: jest.fn().mockResolvedValue(true),
            loadAllConversations: jest.fn().mockResolvedValue({ successful: [], failed: [] }),
        } as any;
    }

    it('should create DesignerAgent through AgentManager', async () => {
        const config: AgentManagerConfig = {
            webview: createMockWebview(),
            tokenStorageService: createMockTokenStorageService(),
            conversationManager: createMockConversationManager(),
        };

        const agentManager = new AgentManager(config);
        const agent = await agentManager.createDesignerAgent('designer-1');

        expect(agent).toBeDefined();
        expect(agent.conversationId).toBe('designer-1');
        expect(agent.mode).toBe('build');
        expect(agentManager.hasAgent('designer-1')).toBe(true);

        await agentManager.disposeAgent('designer-1');
    });

    it('should create DeveloperAgent through AgentManager', async () => {
        const config: AgentManagerConfig = {
            webview: createMockWebview(),
            tokenStorageService: createMockTokenStorageService(),
            conversationManager: createMockConversationManager(),
        };

        const agentManager = new AgentManager(config);
        const agent = await agentManager.createDeveloperAgent('developer-1', {
            framework: 'react',
        });

        expect(agent).toBeDefined();
        expect(agent.conversationId).toBe('developer-1');
        expect(agent.mode).toBe('build');
        expect(agentManager.hasAgent('developer-1')).toBe(true);

        await agentManager.disposeAgent('developer-1');
    });

    it('should create ReviewerAgent through AgentManager', async () => {
        const config: AgentManagerConfig = {
            webview: createMockWebview(),
            tokenStorageService: createMockTokenStorageService(),
            conversationManager: createMockConversationManager(),
        };

        const agentManager = new AgentManager(config);
        const agent = await agentManager.createReviewerAgent('reviewer-1', {
            personaName: 'Emily',
        });

        expect(agent).toBeDefined();
        expect(agent.conversationId).toBe('reviewer-1');
        expect(agent.mode).toBe('feedback');
        expect(agentManager.hasAgent('reviewer-1')).toBe(true);

        await agentManager.disposeAgent('reviewer-1');
    });

    it('should create SummarizerAgent through AgentManager', async () => {
        const config: AgentManagerConfig = {
            webview: createMockWebview(),
            tokenStorageService: createMockTokenStorageService(),
            conversationManager: createMockConversationManager(),
        };

        const agentManager = new AgentManager(config);
        const agent = await agentManager.createSummarizerAgent('summarizer-1', {
            maxOutputTokens: 1000,
        });

        expect(agent).toBeDefined();
        expect(agent.conversationId).toBe('summarizer-1');
        expect(agent.mode).toBe('build');
        expect(agent.getMaxOutputTokens()).toBe(1000);
        expect(agentManager.hasAgent('summarizer-1')).toBe(true);

        await agentManager.disposeAgent('summarizer-1');
    });

    it('should create all four specialized agents simultaneously', async () => {
        const config: AgentManagerConfig = {
            webview: createMockWebview(),
            tokenStorageService: createMockTokenStorageService(),
            conversationManager: createMockConversationManager(),
        };

        const agentManager = new AgentManager(config);

        const designer = await agentManager.createDesignerAgent('designer-1');
        const developer = await agentManager.createDeveloperAgent('developer-1', {
            framework: 'nextjs',
        });
        const reviewer = await agentManager.createReviewerAgent('reviewer-1', {
            personaName: 'Marcus',
        });
        const summarizer = await agentManager.createSummarizerAgent('summarizer-1');

        // Verify all agents are created
        expect(designer).toBeDefined();
        expect(developer).toBeDefined();
        expect(reviewer).toBeDefined();
        expect(summarizer).toBeDefined();

        // Verify all agents are registered
        expect(agentManager.getActiveAgentCount()).toBe(4);
        expect(agentManager.hasAgent('designer-1')).toBe(true);
        expect(agentManager.hasAgent('developer-1')).toBe(true);
        expect(agentManager.hasAgent('reviewer-1')).toBe(true);
        expect(agentManager.hasAgent('summarizer-1')).toBe(true);

        // Verify correct modes
        expect(designer.mode).toBe('build');
        expect(developer.mode).toBe('build');
        expect(reviewer.mode).toBe('feedback');
        expect(summarizer.mode).toBe('build');

        // Clean up
        await agentManager.disposeAllAgents();
    });
});
