import { ReviewerAgent } from './ReviewerAgent';
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
jest.mock('../../prompts/FeedbackPrompts', () => ({
    PERSONA_FEEDBACK_PROMPT: jest.fn((personaName, ratingScale) =>
        `Feedback prompt for ${personaName} using ${ratingScale}`
    ),
}));

describe('ReviewerAgent', () => {
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

    describe('initialization', () => {
        it('should initialize with correct agent type', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-1',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    ratingSystem: 'stars',
                }
            );

            expect(agent.agentType).toBe('reviewer');
        });

        it('should default to stars rating system', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-2',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                }
            );

            expect(agent.getRatingSystem()).toBe('stars');
        });

        it('should accept 1-10 rating system', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-3',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    ratingSystem: '1-10',
                }
            );

            expect(agent.getRatingSystem()).toBe('1-10');
        });

        it('should accept 1-100 rating system', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-4',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    ratingSystem: '1-100',
                }
            );

            expect(agent.getRatingSystem()).toBe('1-100');
        });
    });

    describe('capabilities', () => {
        it('should register FEEDBACK_COLLECTION and FEEDBACK_SYNTHESIS capabilities', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-5',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                }
            );

            const capabilities = agent.getCapabilities();
            expect(capabilities).toHaveLength(2);

            const capabilityNames = capabilities.map(c => c.name);
            expect(capabilityNames).toContain('feedback-collection');
            expect(capabilityNames).toContain('feedback-synthesis');
        });
    });

    describe('system prompt', () => {
        it('should use PERSONA_FEEDBACK_PROMPT with stars', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-6',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    ratingSystem: 'stars',
                }
            );

            const prompt = agent.getSystemPrompt();
            expect(prompt).toContain('Feedback prompt for Emily');
            expect(prompt).toContain('1-5 stars');
        });

        it('should use PERSONA_FEEDBACK_PROMPT with 1-10 scale', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-7',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    ratingSystem: '1-10',
                }
            );

            const prompt = agent.getSystemPrompt();
            expect(prompt).toContain('1-10 scale');
        });

        it('should use PERSONA_FEEDBACK_PROMPT with 1-100 scale', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-8',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    ratingSystem: '1-100',
                }
            );

            const prompt = agent.getSystemPrompt();
            expect(prompt).toContain('1-100 scale');
        });
    });

    describe('persona info', () => {
        it('should return persona name', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-9',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                }
            );

            expect(agent.getPersonaName()).toBe('Emily');
        });
    });

    describe('feedback guidelines', () => {
        it('should return feedback best practices', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-10',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                }
            );

            const guidelines = agent.getFeedbackGuidelines();

            expect(Array.isArray(guidelines)).toBe(true);
            expect(guidelines.length).toBeGreaterThan(0);
            expect(guidelines.some(g => g.includes('specific') || g.includes('actionable'))).toBe(true);
        });

        it('should include accessibility in guidelines', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-11',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                }
            );

            const guidelines = agent.getFeedbackGuidelines();

            expect(guidelines.some(g => g.toLowerCase().includes('accessibility'))).toBe(true);
        });
    });

    describe('rating parsing', () => {
        it('should parse rating from text with "rating:" prefix', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-12',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    ratingSystem: 'stars',
                }
            );

            // Access private method through type assertion
            const rating = (agent as any).parseRating('Rating: 4 stars');

            expect(rating).toBe(4);
        });

        it('should parse rating from "X out of Y" format', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-13',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    ratingSystem: 'stars',
                }
            );

            const rating = (agent as any).parseRating('4 out of 5');

            expect(rating).toBe(4);
        });

        it('should parse rating from "X stars" format', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-14',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    ratingSystem: 'stars',
                }
            );

            const rating = (agent as any).parseRating('I give this 3.5 stars');

            expect(rating).toBe(3.5);
        });

        it('should default to middle rating if not found', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-15',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    ratingSystem: 'stars',
                }
            );

            const rating = (agent as any).parseRating('No rating mentioned here');

            expect(rating).toBe(2.5); // Middle of 1-5
        });

        it('should handle different max ratings', () => {
            const agent100 = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-16a',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    ratingSystem: '1-100',
                }
            );

            const rating100 = (agent100 as any).parseRating('No rating');
            expect(rating100).toBe(50); // Middle of 1-100

            const agent10 = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-16b',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                    ratingSystem: '1-10',
                }
            );

            const rating10 = (agent10 as any).parseRating('No rating');
            expect(rating10).toBe(5); // Middle of 1-10
        });
    });

    describe('list extraction', () => {
        it('should extract list items from text', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-17',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                }
            );

            const text = `
Key Themes:
- Easy to use
- Good design
- Fast performance

Positives:
- Intuitive interface
`;

            const themes = (agent as any).extractListItems(text, 'themes');

            expect(themes).toContain('Easy to use');
            expect(themes).toContain('Good design');
            expect(themes).toContain('Fast performance');
        });

        it('should handle different list markers', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-18',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                }
            );

            const text = `
Recommendations:
* Improve contrast
• Add tooltips
- Fix navigation
`;

            const recommendations = (agent as any).extractListItems(text, 'recommendations');

            expect(recommendations.length).toBeGreaterThan(0);
        });

        it('should stop at next section', () => {
            const agent = new ReviewerAgent(
                {
                    conversationId: 'test-reviewer-19',
                    webview: mockWebview,
                    mode: 'feedback',
                    onDidUpdateMessages: mockOnDidUpdateMessages,
                },
                {
                    personaName: 'Emily',
                }
            );

            const text = `
Positives:
- Good design
- Fast

Negatives:
- Confusing navigation
`;

            const positives = (agent as any).extractListItems(text, 'positives');

            expect(positives).toContain('Good design');
            expect(positives).toContain('Fast');
            expect(positives).not.toContain('Confusing navigation');
        });
    });
});
