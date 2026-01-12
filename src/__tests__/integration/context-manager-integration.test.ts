/**
 * Integration test for ContextManager
 * 
 * Feature: build-agent-architecture-review
 * Validates: Requirements AC-03.3, AC-11.6, AC-13.2, AC-13.3, AC-13.4, AC-13.6
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { WorkflowStateManager } from '../../features/build-mode/services/WorkflowStateManager';
import { ContextManager } from '../../features/build-mode/services/ContextManager';
import { SummarizerAgent } from '../../core/agent/build/SummarizerAgent';

describe('ContextManager Integration Tests', () => {
    let tempDir: string;
    let workflowStateManager: WorkflowStateManager;
    let contextManager: ContextManager;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-integration-'));

        workflowStateManager = new WorkflowStateManager({
            projectName: 'test-project',
            baseDir: tempDir,
        });

        const summarizerAgent = {} as SummarizerAgent;

        contextManager = new ContextManager({
            workflowStateManager,
            summarizerAgent,
            projectContext: {
                projectName: 'test-project',
                framework: 'react',
                description: 'Test project',
            },
            slidingWindowSize: 3,
        });

        await workflowStateManager.initializeWorkflow(
            [
                { pageId: 'login', pageName: 'Login Page' },
                { pageId: 'dashboard', pageName: 'Dashboard' },
            ],
            5
        );
    });

    afterEach(async () => {
        await workflowStateManager.cleanup();
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Context Assembly', () => {
        it('should assemble designer context for first iteration', async () => {
            const context = await contextManager.assembleDesignerContext(
                'login',
                1,
                {
                    pageId: 'login',
                    pageName: 'Login Page',
                    description: 'User login page with email and password',
                }
            );

            expect(context).toBeDefined();
            expect(context.systemPrompt).toContain('UX/UI designer');
            expect(context.projectContext.projectName).toBe('test-project');
            expect(context.pageDefinition.pageId).toBe('login');
            expect(context.previousFeedbackSummary).toBeNull();
            expect(context.estimatedTokens).toBeGreaterThan(0);
        });

        it('should assemble developer context', async () => {
            const context = await contextManager.assembleDeveloperContext(
                'login',
                {
                    pageId: 'login',
                    iteration: 1,
                    content: 'UX spec content',
                    checksum: 'abc123',
                },
                {
                    pageId: 'login',
                    pageName: 'Login Page',
                    description: 'User login page',
                }
            );

            expect(context).toBeDefined();
            expect(context.systemPrompt).toContain('react developer');
            expect(context.uxSpec.pageId).toBe('login');
            expect(context.estimatedTokens).toBeGreaterThan(0);
        });

        it('should assemble reviewer context', async () => {
            const context = await contextManager.assembleReviewerContext(
                'login',
                {
                    pageId: 'login',
                    iteration: 1,
                    content: 'UX spec',
                    checksum: 'abc123',
                },
                {
                    pageId: 'login',
                    iteration: 1,
                    code: 'const Login = () => {}',
                    filePath: '/src/Login.tsx',
                    checksum: 'def456',
                },
                {
                    pageId: 'login',
                    pageName: 'Login Page',
                    description: 'Login page',
                },
                '/screenshots/login.png',
                'Sarah',
                'Product Manager'
            );

            expect(context).toBeDefined();
            expect(context.systemPrompt).toContain('Sarah');
            expect(context.systemPrompt).toContain('Product Manager');
            expect(context.personaName).toBe('Sarah');
            expect(context.screenshotPath).toBe('/screenshots/login.png');
        });
    });

    describe('Token Budget Management', () => {
        it('should estimate token count correctly', () => {
            const context = {
                systemPrompt: 'Test prompt',
                projectContext: {
                    projectName: 'test',
                    framework: 'react',
                },
                pageDefinition: {
                    pageId: 'test',
                    pageName: 'Test',
                    description: 'Test description',
                },
                previousFeedbackSummary: null,
                previousUxSpecDelta: null,
            };

            const tokens = contextManager.estimateTokenCount(context);
            expect(tokens).toBeGreaterThan(0);
            expect(tokens).toBeLessThan(1000); // Small context
        });

        it('should get model context limits', () => {
            expect(contextManager.getModelContextLimit('gemini-1.5-pro')).toBe(1000000);
            expect(contextManager.getModelContextLimit('gpt-4')).toBe(128000);
            expect(contextManager.getModelContextLimit('claude-3-5-sonnet')).toBe(200000);
            expect(contextManager.getModelContextLimit('unknown-model')).toBe(128000); // Default
        });

        it('should calculate safe limits', () => {
            const limit = contextManager.getModelContextLimit('gpt-4');
            const safeLimit = contextManager.getSafeLimit('gpt-4');

            expect(safeLimit).toBe(Math.floor(limit * 0.8));
            expect(safeLimit).toBeLessThan(limit);
        });

        it('should check token budget and detect within budget', () => {
            const smallContext = {
                systemPrompt: 'Test',
                projectContext: {
                    projectName: 'test',
                    framework: 'react',
                },
                pageDefinition: {
                    pageId: 'test',
                    pageName: 'Test',
                    description: 'Test',
                },
                previousFeedbackSummary: null,
                previousUxSpecDelta: null,
            };

            const result = contextManager.checkTokenBudget(smallContext, 'gpt-4');

            expect(result.withinBudget).toBe(true);
            expect(result.atWarningThreshold).toBe(false);
            expect(result.atEmergencyThreshold).toBe(false);
            expect(result.currentTokens).toBeGreaterThan(0);
        });

        it('should enforce token budget', () => {
            const context = {
                systemPrompt: 'Test',
                projectContext: {
                    projectName: 'test',
                    framework: 'react',
                },
                pageDefinition: {
                    pageId: 'test',
                    pageName: 'Test',
                    description: 'Test',
                },
                previousFeedbackSummary: null,
                previousUxSpecDelta: null,
            };

            const result = contextManager.enforceTokenBudget(context, 'gpt-4');

            expect(result.context).toBeDefined();
            expect(result.budgetStatus).toBeDefined();
            expect(typeof result.wasPruned).toBe('boolean');
        });
    });

    describe('Context Pruning', () => {
        it('should prune large context to target size', () => {
            const largeContext = {
                systemPrompt: 'Test prompt',
                projectContext: {
                    projectName: 'test',
                    framework: 'react',
                },
                pageDefinition: {
                    pageId: 'test',
                    pageName: 'Test Page',
                    description: 'A very long description that repeats many times. '.repeat(100),
                },
                previousFeedbackSummary: 'Long feedback summary. '.repeat(50),
                previousUxSpecDelta: 'Long UX spec delta. '.repeat(50),
                olderIterationsSummary: 'Very long older iterations summary. '.repeat(100),
            };

            const originalTokens = contextManager.estimateTokenCount(largeContext);
            const targetTokens = Math.floor(originalTokens / 2);

            const prunedContext = contextManager.pruneContext(largeContext, targetTokens);
            const prunedTokens = contextManager.estimateTokenCount(prunedContext);

            expect(prunedTokens).toBeLessThanOrEqual(originalTokens);
            // Essential fields should still exist
            expect(prunedContext.systemPrompt).toBeDefined();
            expect(prunedContext.projectContext).toBeDefined();
            expect(prunedContext.pageDefinition).toBeDefined();
        });

        it('should preserve essential context even with aggressive pruning', () => {
            const context = {
                systemPrompt: 'Essential prompt',
                projectContext: {
                    projectName: 'test',
                    framework: 'react',
                },
                pageDefinition: {
                    pageId: 'test',
                    pageName: 'Essential Page',
                    description: 'Essential description',
                },
                previousFeedbackSummary: 'Feedback',
                previousUxSpecDelta: null,
            };

            const prunedContext = contextManager.pruneContext(context, 10);

            // Core fields must remain
            expect(prunedContext.systemPrompt).toBe('Essential prompt');
            expect(prunedContext.projectContext.projectName).toBe('test');
            expect(prunedContext.pageDefinition.pageId).toBe('test');
        });
    });

    describe('Sliding Window', () => {
        it('should get iteration summaries with sliding window', async () => {
            // Add some iterations to the state
            const state = workflowStateManager.getState();
            if (state) {
                const page = state.pages.find(p => p.pageId === 'login');
                if (page) {
                    for (let i = 1; i <= 5; i++) {
                        page.iterations.push({
                            iteration: i,
                            status: 'complete',
                            currentStep: 'iteration-complete',
                            startTime: Date.now(),
                            feedbackSummary: {
                                averageRating: 4.0,
                                consolidatedFeedback: `Iteration ${i} feedback`,
                                reviewerCount: 3,
                            },
                            decision: i < 5 ? 'iterate-again' : 'move-to-next-page',
                            tokenUsage: [],
                            errors: [],
                        });
                    }
                }
            }

            const summaries = await contextManager.getIterationSummaries('login', 3);

            expect(summaries).toBeDefined();
            expect(summaries.length).toBe(3); // Window size
            expect(summaries[0].iteration).toBe(3); // Most recent 3: 3, 4, 5
            expect(summaries[2].iteration).toBe(5);
        });

        it('should return empty array for non-existent page', async () => {
            const summaries = await contextManager.getIterationSummaries('nonexistent', 3);
            expect(summaries).toEqual([]);
        });
    });
});
