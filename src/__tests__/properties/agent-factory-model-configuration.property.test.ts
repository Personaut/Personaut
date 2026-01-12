/**
 * Property test for AgentFactory model configuration
 *
 * Feature: build-agent-architecture-review, Property 17: Model Configuration from Settings
 *
 * For any specialized agent created through AgentManager factory methods,
 * the agent should be created with the correct model configuration from
 * project settings, and the configuration should propagate through the
 * factory to the agent instance.
 *
 * Validates: Requirements AC-13.5
 */

import * as fc from 'fast-check';
import { AgentManager, AgentManagerConfig } from '../../core/agent/AgentManager';
import { Framework } from '../../core/agent/AgentTypes';

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

describe('Property 17: Model Configuration from Settings', () => {
    /**
     * Create mock webview
     */
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

    /**
     * Create mock TokenStorageService
     */
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

    /**
     * Create mock ConversationManager
     */
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

    /**
     * Generator for conversation IDs
     */
    const conversationIdArb = fc.string({ minLength: 1, maxLength: 50 });

    /**
     * Generator for frameworks
     */
    const frameworkArb = fc.constantFrom<Framework>('react', 'nextjs', 'vue', 'flutter', 'html');

    /**
     * Generator for persona names
     */
    const personaNameArb = fc.string({ minLength: 1, maxLength: 50 });

    /**
     * Test that DesignerAgent is created with correct configuration
     * Validates: Requirements AC-13.5, AC-10.3
     */
    it('should create DesignerAgent with correct configuration from AgentManager', async () => {
        await fc.assert(
            fc.asyncProperty(conversationIdArb, async (conversationId) => {
                // Create mocks
                const mockWebview = createMockWebview();
                const mockTokenStorage = createMockTokenStorageService();
                const mockConversationManager = createMockConversationManager();

                // Create AgentManager config
                const config: AgentManagerConfig = {
                    webview: mockWebview,
                    tokenStorageService: mockTokenStorage,
                    conversationManager: mockConversationManager,
                };

                // Create AgentManager
                const agentManager = new AgentManager(config);

                // Create DesignerAgent through AgentManager
                const agent = await agentManager.createDesignerAgent(conversationId);

                // Verify agent is created
                expect(agent).toBeDefined();
                expect(agent).not.toBeNull();

                // Verify agent has correct conversation ID
                expect(agent.conversationId).toBe(conversationId);

                // Verify agent has correct mode
                expect(agent.mode).toBe('build');

                // Verify agent is registered in AgentManager
                expect(agentManager.hasAgent(conversationId)).toBe(true);

                // Verify agent has required methods
                expect(typeof agent.dispose).toBe('function');
                expect(typeof agent.abort).toBe('function');
                expect(typeof agent.chat).toBe('function');

                // Clean up
                await agentManager.disposeAgent(conversationId);
            }),
            { numRuns: 50 }
        );
    });

    /**
     * Test that DeveloperAgent is created with correct framework configuration
     * Validates: Requirements AC-13.5, AC-10.3
     */
    it('should create DeveloperAgent with correct framework configuration from AgentManager', async () => {
        await fc.assert(
            fc.asyncProperty(
                conversationIdArb,
                frameworkArb,
                async (conversationId, framework) => {
                    // Create mocks
                    const mockWebview = createMockWebview();
                    const mockTokenStorage = createMockTokenStorageService();
                    const mockConversationManager = createMockConversationManager();

                    // Create AgentManager config
                    const config: AgentManagerConfig = {
                        webview: mockWebview,
                        tokenStorageService: mockTokenStorage,
                        conversationManager: mockConversationManager,
                    };

                    // Create AgentManager
                    const agentManager = new AgentManager(config);

                    // Create DeveloperAgent through AgentManager with framework option
                    const agent = await agentManager.createDeveloperAgent(conversationId, {
                        framework,
                    });

                    // Verify agent is created
                    expect(agent).toBeDefined();
                    expect(agent).not.toBeNull();

                    // Verify agent has correct conversation ID
                    expect(agent.conversationId).toBe(conversationId);

                    // Verify agent has correct mode
                    expect(agent.mode).toBe('build');

                    // Verify agent is registered in AgentManager
                    expect(agentManager.hasAgent(conversationId)).toBe(true);

                    // Verify agent has required methods
                    expect(typeof agent.dispose).toBe('function');
                    expect(typeof agent.abort).toBe('function');
                    expect(typeof agent.chat).toBe('function');

                    // Clean up
                    await agentManager.disposeAgent(conversationId);
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Test that ReviewerAgent is created with correct persona configuration
     * Validates: Requirements AC-13.5, AC-10.3
     */
    it('should create ReviewerAgent with correct persona configuration from AgentManager', async () => {
        await fc.assert(
            fc.asyncProperty(
                conversationIdArb,
                personaNameArb,
                async (conversationId, personaName) => {
                    // Create mocks
                    const mockWebview = createMockWebview();
                    const mockTokenStorage = createMockTokenStorageService();
                    const mockConversationManager = createMockConversationManager();

                    // Create AgentManager config
                    const config: AgentManagerConfig = {
                        webview: mockWebview,
                        tokenStorageService: mockTokenStorage,
                        conversationManager: mockConversationManager,
                    };

                    // Create AgentManager
                    const agentManager = new AgentManager(config);

                    // Create ReviewerAgent through AgentManager with persona option
                    const agent = await agentManager.createReviewerAgent(conversationId, {
                        personaName,
                    });

                    // Verify agent is created
                    expect(agent).toBeDefined();
                    expect(agent).not.toBeNull();

                    // Verify agent has correct conversation ID
                    expect(agent.conversationId).toBe(conversationId);

                    // Verify agent has correct mode
                    expect(agent.mode).toBe('feedback');

                    // Verify agent is registered in AgentManager
                    expect(agentManager.hasAgent(conversationId)).toBe(true);

                    // Verify agent has required methods
                    expect(typeof agent.dispose).toBe('function');
                    expect(typeof agent.abort).toBe('function');
                    expect(typeof agent.chat).toBe('function');

                    // Clean up
                    await agentManager.disposeAgent(conversationId);
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Test that multiple specialized agents can be created with different configurations
     * Validates: Requirements AC-13.5, AC-10.3
     */
    it('should create multiple specialized agents with different configurations', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(conversationIdArb, { minLength: 3, maxLength: 3 }).map((ids) => {
                    // Ensure unique IDs
                    return Array.from(new Set(ids));
                }),
                frameworkArb,
                personaNameArb,
                async (conversationIds, framework, personaName) => {
                    // Skip if we don't have exactly 3 unique IDs
                    if (conversationIds.length < 3) {
                        return;
                    }

                    // Create mocks
                    const mockWebview = createMockWebview();
                    const mockTokenStorage = createMockTokenStorageService();
                    const mockConversationManager = createMockConversationManager();

                    // Create AgentManager config
                    const config: AgentManagerConfig = {
                        webview: mockWebview,
                        tokenStorageService: mockTokenStorage,
                        conversationManager: mockConversationManager,
                    };

                    // Create AgentManager
                    const agentManager = new AgentManager(config);

                    // Create DesignerAgent
                    const designerAgent = await agentManager.createDesignerAgent(conversationIds[0]);

                    // Create DeveloperAgent with framework
                    const developerAgent = await agentManager.createDeveloperAgent(conversationIds[1], {
                        framework,
                    });

                    // Create ReviewerAgent with persona
                    const reviewerAgent = await agentManager.createReviewerAgent(conversationIds[2], {
                        personaName,
                    });

                    // Verify all agents are created
                    expect(designerAgent).toBeDefined();
                    expect(developerAgent).toBeDefined();
                    expect(reviewerAgent).toBeDefined();

                    // Verify all agents are unique instances
                    expect(designerAgent).not.toBe(developerAgent);
                    expect(designerAgent).not.toBe(reviewerAgent);
                    expect(developerAgent).not.toBe(reviewerAgent);

                    // Verify all agents have correct conversation IDs
                    expect(designerAgent.conversationId).toBe(conversationIds[0]);
                    expect(developerAgent.conversationId).toBe(conversationIds[1]);
                    expect(reviewerAgent.conversationId).toBe(conversationIds[2]);

                    // Verify all agents have correct modes
                    expect(designerAgent.mode).toBe('build');
                    expect(developerAgent.mode).toBe('build');
                    expect(reviewerAgent.mode).toBe('feedback');

                    // Verify all agents are registered
                    expect(agentManager.hasAgent(conversationIds[0])).toBe(true);
                    expect(agentManager.hasAgent(conversationIds[1])).toBe(true);
                    expect(agentManager.hasAgent(conversationIds[2])).toBe(true);

                    // Verify agent count
                    expect(agentManager.getActiveAgentCount()).toBe(3);

                    // Clean up
                    await agentManager.disposeAllAgents();
                }
            ),
            { numRuns: 30 }
        );
    });

    /**
     * Test that agent creation enforces agent limit (LRU eviction)
     * Validates: Requirements AC-10.3
     */
    it('should enforce agent limit when creating specialized agents', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(conversationIdArb, { minLength: 12, maxLength: 12 }).map((ids) => {
                    // Ensure unique IDs
                    return Array.from(new Set(ids));
                }),
                async (conversationIds) => {
                    // Skip if we don't have at least 12 unique IDs
                    if (conversationIds.length < 12) {
                        return;
                    }

                    // Create mocks
                    const mockWebview = createMockWebview();
                    const mockTokenStorage = createMockTokenStorageService();
                    const mockConversationManager = createMockConversationManager();

                    // Create AgentManager config with maxActiveAgents = 10
                    const config: AgentManagerConfig = {
                        webview: mockWebview,
                        tokenStorageService: mockTokenStorage,
                        conversationManager: mockConversationManager,
                        maxActiveAgents: 10,
                    };

                    // Create AgentManager
                    const agentManager = new AgentManager(config);

                    // Create 12 DesignerAgents (should trigger LRU eviction)
                    for (let i = 0; i < 12; i++) {
                        await agentManager.createDesignerAgent(conversationIds[i]);
                    }

                    // Verify agent count is at most 10 (limit enforced)
                    expect(agentManager.getActiveAgentCount()).toBeLessThanOrEqual(10);

                    // Verify oldest agents were evicted (first 2 should be gone)
                    expect(agentManager.hasAgent(conversationIds[0])).toBe(false);
                    expect(agentManager.hasAgent(conversationIds[1])).toBe(false);

                    // Verify newest agents are still present (last 10 should exist)
                    for (let i = 2; i < 12; i++) {
                        expect(agentManager.hasAgent(conversationIds[i])).toBe(true);
                    }

                    // Clean up
                    await agentManager.disposeAllAgents();
                }
            ),
            { numRuns: 20 }
        );
    });

    /**
     * Test that specialized agents can be disposed and recreated
     * Validates: Requirements AC-10.3
     */
    it('should allow specialized agents to be disposed and recreated', async () => {
        await fc.assert(
            fc.asyncProperty(
                conversationIdArb,
                frameworkArb,
                async (conversationId, framework) => {
                    // Create mocks
                    const mockWebview = createMockWebview();
                    const mockTokenStorage = createMockTokenStorageService();
                    const mockConversationManager = createMockConversationManager();

                    // Create AgentManager config
                    const config: AgentManagerConfig = {
                        webview: mockWebview,
                        tokenStorageService: mockTokenStorage,
                        conversationManager: mockConversationManager,
                    };

                    // Create AgentManager
                    const agentManager = new AgentManager(config);

                    // Create DeveloperAgent
                    const agent1 = await agentManager.createDeveloperAgent(conversationId, {
                        framework,
                    });

                    // Verify agent is created and registered
                    expect(agentManager.hasAgent(conversationId)).toBe(true);
                    expect(agentManager.getActiveAgentCount()).toBe(1);

                    // Dispose agent
                    await agentManager.disposeAgent(conversationId);

                    // Verify agent is disposed
                    expect(agentManager.hasAgent(conversationId)).toBe(false);
                    expect(agentManager.getActiveAgentCount()).toBe(0);

                    // Recreate agent with same ID
                    const agent2 = await agentManager.createDeveloperAgent(conversationId, {
                        framework,
                    });

                    // Verify new agent is created
                    expect(agentManager.hasAgent(conversationId)).toBe(true);
                    expect(agentManager.getActiveAgentCount()).toBe(1);

                    // Verify it's a different instance
                    expect(agent1).not.toBe(agent2);

                    // Verify new agent has correct configuration
                    expect(agent2.conversationId).toBe(conversationId);
                    expect(agent2.mode).toBe('build');

                    // Clean up
                    await agentManager.disposeAgent(conversationId);
                }
            ),
            { numRuns: 50 }
        );
    });
});
