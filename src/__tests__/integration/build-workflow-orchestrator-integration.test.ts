/**
 * Integration tests for BuildWorkflowOrchestrator
 * 
 * Feature: build-agent-architecture-review
 * Validates: Requirements AC-01.1, AC-01.2, AC-01.3, AC-01.4, AC-01.5, AC-02.3, AC-02.4, AC-03.1, AC-13.7
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { BuildWorkflowOrchestrator } from '../../features/build-mode/services/BuildWorkflowOrchestrator';
import { AgentManager } from '../../core/agent/AgentManager';
import { WorkflowStateManager } from '../../features/build-mode/services/WorkflowStateManager';
import { ContextManager } from '../../features/build-mode/services/ContextManager';
import { HandoffManager } from '../../features/build-mode/services/HandoffManager';
import { ParallelReviewerExecutor } from '../../features/build-mode/services/ParallelReviewerExecutor';

describe('BuildWorkflowOrchestrator Integration Tests', () => {
    let tempDir: string;
    let orchestrator: BuildWorkflowOrchestrator;
    let workflowStateManager: WorkflowStateManager;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orchestrator-test-'));

        // Create mock dependencies
        const agentManager = {} as AgentManager;

        workflowStateManager = new WorkflowStateManager({
            projectName: 'test-project',
            baseDir: tempDir,
        });

        const contextManager = new ContextManager({
            workflowStateManager,
            summarizerAgent: {} as any,
            projectContext: {
                projectName: 'test-project',
                framework: 'react',
            },
        });

        const handoffManager = new HandoffManager({
            projectName: 'test-project',
            baseDir: tempDir,
        });

        const parallelReviewerExecutor = new ParallelReviewerExecutor({
            maxConcurrent: 5,
            batchDelay: 100,
            reviewerTimeout: 5000,
            minCompletionRate: 0.5,
        });

        orchestrator = new BuildWorkflowOrchestrator(
            {
                projectName: 'test-project',
                framework: 'react',
                pages: [
                    { pageId: 'login', pageName: 'Login Page', description: 'User login' },
                    { pageId: 'dashboard', pageName: 'Dashboard', description: 'Main dashboard' },
                ],
                personas: [
                    { personaId: 'sarah', personaName: 'Sarah', personaRole: 'PM' },
                    { personaId: 'john', personaName: 'John', personaRole: 'Developer' },
                ],
                maxIterationsPerPage: 5,
                baseDir: tempDir,
            },
            agentManager,
            workflowStateManager,
            contextManager,
            handoffManager,
            parallelReviewerExecutor
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

    describe('Workflow Control', () => {
        it('should start workflow and initialize state', async () => {
            const workflowId = await orchestrator.startWorkflow();

            expect(workflowId).toBeDefined();
            expect(orchestrator.getStatus()).toBe('running');
            expect(orchestrator.getCurrentPageIndex()).toBe(0);
            expect(orchestrator.isFrameworkInitialized()).toBe(false);
        });

        it('should pause workflow', async () => {
            await orchestrator.startWorkflow();
            await orchestrator.pauseWorkflow();

            expect(orchestrator.getStatus()).toBe('paused');
        });

        it('should resume workflow', async () => {
            await orchestrator.startWorkflow();
            await orchestrator.pauseWorkflow();
            await orchestrator.resumeWorkflow();

            expect(orchestrator.getStatus()).toBe('running');
        });

        it('should cancel workflow', async () => {
            await orchestrator.startWorkflow();
            await orchestrator.cancelWorkflow();

            expect(orchestrator.getStatus()).toBe('cancelled');
        });
    });

    describe('Status Tracking', () => {
        it('should start with idle status', () => {
            expect(orchestrator.getStatus()).toBe('idle');
        });

        it('should transition to running on start', async () => {
            await orchestrator.startWorkflow();
            expect(orchestrator.getStatus()).toBe('running');
        });

        it('should track current page index', async () => {
            await orchestrator.startWorkflow();
            expect(orchestrator.getCurrentPageIndex()).toBe(0);
        });
    });

    describe('Framework Initialization', () => {
        it('should not be initialized before workflow starts', () => {
            expect(orchestrator.isFrameworkInitialized()).toBe(false);
        });

        it('should track framework initialization flag', async () => {
            await orchestrator.startWorkflow();

            // Framework initialization happens during processAllPages
            // For now, just verify the flag exists
            expect(typeof orchestrator.isFrameworkInitialized()).toBe('boolean');
        });
    });

    describe('Configuration', () => {
        it('should accept valid configuration', () => {
            expect(orchestrator).toBeDefined();
            expect(orchestrator.getStatus()).toBe('idle');
        });

        it('should handle multiple pages', async () => {
            const multiPageOrchestrator = new BuildWorkflowOrchestrator(
                {
                    projectName: 'multi-page-test',
                    framework: 'react',
                    pages: [
                        { pageId: 'page1', pageName: 'Page 1', description: 'First page' },
                        { pageId: 'page2', pageName: 'Page 2', description: 'Second page' },
                        { pageId: 'page3', pageName: 'Page 3', description: 'Third page' },
                    ],
                    personas: [
                        { personaId: 'p1', personaName: 'Persona 1', personaRole: 'Role 1' },
                    ],
                    maxIterationsPerPage: 5,
                    baseDir: tempDir,
                },
                {} as AgentManager,
                workflowStateManager,
                new ContextManager({
                    workflowStateManager,
                    summarizerAgent: {} as any,
                    projectContext: {
                        projectName: 'multi-page-test',
                        framework: 'react',
                    },
                }),
                new HandoffManager({
                    projectName: 'multi-page-test',
                    baseDir: tempDir,
                }),
                new ParallelReviewerExecutor()
            );

            expect(multiPageOrchestrator).toBeDefined();
        });

        it('should handle multiple personas', async () => {
            const multiPersonaOrchestrator = new BuildWorkflowOrchestrator(
                {
                    projectName: 'multi-persona-test',
                    framework: 'react',
                    pages: [
                        { pageId: 'page1', pageName: 'Page 1', description: 'Test page' },
                    ],
                    personas: [
                        { personaId: 'p1', personaName: 'Persona 1', personaRole: 'PM' },
                        { personaId: 'p2', personaName: 'Persona 2', personaRole: 'Developer' },
                        { personaId: 'p3', personaName: 'Persona 3', personaRole: 'Designer' },
                        { personaId: 'p4', personaName: 'Persona 4', personaRole: 'QA' },
                    ],
                    maxIterationsPerPage: 5,
                    baseDir: tempDir,
                },
                {} as AgentManager,
                workflowStateManager,
                new ContextManager({
                    workflowStateManager,
                    summarizerAgent: {} as any,
                    projectContext: {
                        projectName: 'multi-persona-test',
                        framework: 'react',
                    },
                }),
                new HandoffManager({
                    projectName: 'multi-persona-test',
                    baseDir: tempDir,
                }),
                new ParallelReviewerExecutor()
            );

            expect(multiPersonaOrchestrator).toBeDefined();
        });
    });

    describe('Workflow State Integration', () => {
        it('should initialize workflow state on start', async () => {
            await orchestrator.startWorkflow();

            const state = workflowStateManager.getState();
            expect(state).toBeDefined();
            expect(state?.projectName).toBe('test-project');
            expect(state?.pages).toHaveLength(2);
        });

        it('should create workflow with correct page configuration', async () => {
            await orchestrator.startWorkflow();

            const state = workflowStateManager.getState();
            expect(state?.pages[0].pageId).toBe('login');
            expect(state?.pages[1].pageId).toBe('dashboard');
        });
    });

    describe('Edge Cases', () => {
        it('should handle workflow with single page', async () => {
            const singlePageOrchestrator = new BuildWorkflowOrchestrator(
                {
                    projectName: 'single-page-test',
                    framework: 'react',
                    pages: [
                        { pageId: 'only-page', pageName: 'Only Page', description: 'The only page' },
                    ],
                    personas: [
                        { personaId: 'p1', personaName: 'Persona 1', personaRole: 'PM' },
                    ],
                    maxIterationsPerPage: 5,
                    baseDir: tempDir,
                },
                {} as AgentManager,
                workflowStateManager,
                new ContextManager({
                    workflowStateManager,
                    summarizerAgent: {} as any,
                    projectContext: {
                        projectName: 'single-page-test',
                        framework: 'react',
                    },
                }),
                new HandoffManager({
                    projectName: 'single-page-test',
                    baseDir: tempDir,
                }),
                new ParallelReviewerExecutor()
            );

            const workflowId = await singlePageOrchestrator.startWorkflow();
            expect(workflowId).toBeDefined();
        });

        it('should handle workflow with single persona', async () => {
            const singlePersonaOrchestrator = new BuildWorkflowOrchestrator(
                {
                    projectName: 'single-persona-test',
                    framework: 'react',
                    pages: [
                        { pageId: 'page1', pageName: 'Page 1', description: 'Test page' },
                    ],
                    personas: [
                        { personaId: 'only-persona', personaName: 'Only Persona', personaRole: 'PM' },
                    ],
                    maxIterationsPerPage: 5,
                    baseDir: tempDir,
                },
                {} as AgentManager,
                workflowStateManager,
                new ContextManager({
                    workflowStateManager,
                    summarizerAgent: {} as any,
                    projectContext: {
                        projectName: 'single-persona-test',
                        framework: 'react',
                    },
                }),
                new HandoffManager({
                    projectName: 'single-persona-test',
                    baseDir: tempDir,
                }),
                new ParallelReviewerExecutor()
            );

            const workflowId = await singlePersonaOrchestrator.startWorkflow();
            expect(workflowId).toBeDefined();
        });
    });
});
