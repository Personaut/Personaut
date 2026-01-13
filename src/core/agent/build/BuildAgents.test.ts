import { DeveloperAgent } from './DeveloperAgent';
import { DesignerAgent } from './DesignerAgent';
import { ResearchAgent } from './ResearchAgent';
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
jest.mock('../../prompts/CodePrompts', () => ({
    getCodePrompt: jest.fn((framework) => `Code prompt for ${framework}`),
}));

jest.mock('../../prompts/BuildPrompts', () => ({
    DESIGN_PROMPT: 'You are a UX designer',
    COMPETITIVE_ANALYSIS_PROMPT: jest.fn((idea) => `Competitive analysis for ${idea}`),
    MARKET_RESEARCH_PROMPT: jest.fn((idea) => `Market research for ${idea}`),
    USER_RESEARCHER_PROMPT: jest.fn((idea) => `User research for ${idea}`),
    RESEARCH_SYNTHESIS_PROMPT: 'Synthesize research findings',
}));

describe('Build Agents', () => {
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

    describe('DeveloperAgent', () => {
        it('should initialize with correct agent type and framework', () => {
            const agent = new DeveloperAgent(
                {
                    conversationId: 'test-dev-1',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                { framework: 'react' }
            );

            expect(agent.agentType).toBe('developer');
            expect(agent.getFramework()).toBe('react');
        });

        it('should register CODE_GENERATION and CODE_REPAIR capabilities', () => {
            const agent = new DeveloperAgent(
                {
                    conversationId: 'test-dev-2',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                { framework: 'react' }
            );

            const capabilities = agent.getCapabilities();
            expect(capabilities).toHaveLength(2);

            const capabilityNames = capabilities.map(c => c.name);
            expect(capabilityNames).toContain('code-generation');
            expect(capabilityNames).toContain('code-repair');
        });

        it('should use framework-specific prompt for React', () => {
            const agent = new DeveloperAgent(
                {
                    conversationId: 'test-dev-3',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                { framework: 'react' }
            );

            const prompt = agent.getSystemPrompt();
            expect(prompt).toContain('Code prompt for react');
        });

        it('should use framework-specific prompt for Next.js', () => {
            const agent = new DeveloperAgent(
                {
                    conversationId: 'test-dev-4',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                { framework: 'nextjs' }
            );

            const prompt = agent.getSystemPrompt();
            expect(prompt).toContain('Code prompt for nextjs');
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
                const agent = new DeveloperAgent(
                    {
                        conversationId: `test-dev-${framework}`,
                        webview: mockWebview,
                        mode: 'build',
                        onDidUpdateMessages: mockOnDidUpdateMessages,
                    },
                    { framework }
                );

                expect(agent.getFramework()).toBe(framework);
                expect(agent.getSystemPrompt()).toContain(`Code prompt for ${framework}`);
            });
        });

        it('should return framework-specific best practices', () => {
            const agent = new DeveloperAgent(
                {
                    conversationId: 'test-dev-5',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                { framework: 'react' }
            );

            const practices = agent.getBestPractices();

            expect(Array.isArray(practices)).toBe(true);
            expect(practices.length).toBeGreaterThan(0);
            expect(practices.some(p => p.includes('React') || p.includes('functional'))).toBe(true);
        });

        it('should have different best practices for different frameworks', () => {
            const reactAgent = new DeveloperAgent(
                {
                    conversationId: 'test-dev-6a',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                { framework: 'react' }
            );

            const vueAgent = new DeveloperAgent(
                {
                    conversationId: 'test-dev-6b',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                { framework: 'vue' }
            );

            const reactPractices = reactAgent.getBestPractices();
            const vuePractices = vueAgent.getBestPractices();

            expect(reactPractices).not.toEqual(vuePractices);
        });
    });

    describe('DesignerAgent', () => {
        it('should initialize with correct agent type', () => {
            const agent = new DesignerAgent({
                conversationId: 'test-designer-1',
                webview: mockWebview,
                mode: 'build',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            expect(agent.agentType).toBe('designer');
        });

        it('should register UX_DESIGN capability', () => {
            const agent = new DesignerAgent({
                conversationId: 'test-designer-2',
                webview: mockWebview,
                mode: 'build',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            const capabilities = agent.getCapabilities();
            expect(capabilities).toHaveLength(1);
            expect(capabilities[0].name).toBe('ux-design');
        });

        it('should use DESIGN_PROMPT', () => {
            const agent = new DesignerAgent({
                conversationId: 'test-designer-3',
                webview: mockWebview,
                mode: 'build',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            const prompt = agent.getSystemPrompt();
            expect(prompt).toBe('You are a UX designer');
        });

        it('should return design principles', () => {
            const agent = new DesignerAgent({
                conversationId: 'test-designer-4',
                webview: mockWebview,
                mode: 'build',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            const principles = agent.getDesignPrinciples();

            expect(Array.isArray(principles)).toBe(true);
            expect(principles.length).toBeGreaterThan(0);
            expect(principles.some(p => p.includes('user') || p.includes('User'))).toBe(true);
        });

        it('should have accessibility in design principles', () => {
            const agent = new DesignerAgent({
                conversationId: 'test-designer-5',
                webview: mockWebview,
                mode: 'build',
                onDidUpdateMessages: mockOnDidUpdateMessages,
            });

            const principles = agent.getDesignPrinciples();

            expect(principles.some(p => p.toLowerCase().includes('accessible'))).toBe(true);
        });
    });

    describe('ResearchAgent', () => {
        it('should initialize with correct agent type and research type', () => {
            const agent = new ResearchAgent(
                {
                    conversationId: 'test-research-1',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    researchType: 'competitive',
                    idea: 'AI coding assistant',
                }
            );

            expect(agent.agentType).toBe('researcher');
            expect(agent.getResearchType()).toBe('competitive');
        });

        it('should register RESEARCH capability', () => {
            const agent = new ResearchAgent(
                {
                    conversationId: 'test-research-2',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    researchType: 'market',
                }
            );

            const capabilities = agent.getCapabilities();
            expect(capabilities).toHaveLength(1);
            expect(capabilities[0].name).toBe('research');
        });

        it('should use competitive analysis prompt', () => {
            const agent = new ResearchAgent(
                {
                    conversationId: 'test-research-3',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    researchType: 'competitive',
                    idea: 'AI assistant',
                }
            );

            const prompt = agent.getSystemPrompt();
            expect(prompt).toContain('Competitive analysis for AI assistant');
        });

        it('should use market research prompt', () => {
            const agent = new ResearchAgent(
                {
                    conversationId: 'test-research-4',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    researchType: 'market',
                    idea: 'AI assistant',
                }
            );

            const prompt = agent.getSystemPrompt();
            expect(prompt).toContain('Market research for AI assistant');
        });

        it('should use user research prompt', () => {
            const agent = new ResearchAgent(
                {
                    conversationId: 'test-research-5',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    researchType: 'user',
                    idea: 'AI assistant',
                }
            );

            const prompt = agent.getSystemPrompt();
            expect(prompt).toContain('User research for AI assistant');
        });

        it('should use synthesis prompt', () => {
            const agent = new ResearchAgent(
                {
                    conversationId: 'test-research-6',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    researchType: 'synthesis',
                }
            );

            const prompt = agent.getSystemPrompt();
            expect(prompt).toBe('Synthesize research findings');
        });

        it('should allow updating idea', () => {
            const agent = new ResearchAgent(
                {
                    conversationId: 'test-research-7',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    researchType: 'competitive',
                    idea: 'Original idea',
                }
            );

            agent.setIdea('New idea');

            const prompt = agent.getSystemPrompt();
            expect(prompt).toContain('New idea');
        });

        it('should return research guidelines for each type', () => {
            const types: Array<'competitive' | 'market' | 'user' | 'synthesis'> = [
                'competitive',
                'market',
                'user',
                'synthesis',
            ];

            types.forEach(type => {
                const agent = new ResearchAgent(
                    {
                        conversationId: `test-research-${type}`,
                        webview: mockWebview,
                        mode: 'build',
                        onDidUpdateMessages: mockOnDidUpdateMessages,
                    },
                    { researchType: type }
                );

                const guidelines = agent.getResearchGuidelines();

                expect(Array.isArray(guidelines)).toBe(true);
                expect(guidelines.length).toBeGreaterThan(0);
            });
        });

        it('should have different guidelines for different research types', () => {
            const competitiveAgent = new ResearchAgent(
                {
                    conversationId: 'test-research-8a',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                { researchType: 'competitive' }
            );

            const marketAgent = new ResearchAgent(
                {
                    conversationId: 'test-research-8b',
                    webview: mockWebview,
                    mode: 'build',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                { researchType: 'market' }
            );

            const competitiveGuidelines = competitiveAgent.getResearchGuidelines();
            const marketGuidelines = marketAgent.getResearchGuidelines();

            expect(competitiveGuidelines).not.toEqual(marketGuidelines);
        });
    });
});
