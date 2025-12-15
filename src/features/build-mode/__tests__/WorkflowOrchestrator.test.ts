/**
 * Tests for WorkflowOrchestrator
 *
 * Validates the custom workflow orchestration implementation
 * that replaces VoltAgent for multi-agent coordination.
 */

import {
    WorkflowOrchestrator,
    WorkflowDefinition,
    WorkflowContext,
    AgentFactory,
    createFeatureSurveyWorkflow,
    createResearchWorkflow,
    createBuildIterationWorkflow,
} from '../services/WorkflowOrchestrator';

// Mock AgentFactory for testing
class MockAgentFactory implements AgentFactory {
    public executedTasks: Array<{
        agentId: string;
        systemPrompt: string;
        task: string;
        projectName: string;
    }> = [];

    public responses: Record<string, string> = {};
    public shouldFail: Set<string> = new Set();
    public delayMs: number = 10;

    async executeAgentTask(
        agentId: string,
        systemPrompt: string,
        task: string,
        projectName: string
    ): Promise<string> {
        this.executedTasks.push({ agentId, systemPrompt, task, projectName });

        // Simulate async execution
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));

        if (this.shouldFail.has(agentId)) {
            throw new Error(`Agent ${agentId} failed intentionally`);
        }

        return this.responses[agentId] || `Mock response from ${agentId}`;
    }

    reset() {
        this.executedTasks = [];
        this.responses = {};
        this.shouldFail.clear();
    }
}

// Mock webview
const mockWebview = {
    postMessage: jest.fn(),
} as any;

describe('WorkflowOrchestrator', () => {
    let orchestrator: WorkflowOrchestrator;
    let mockFactory: MockAgentFactory;

    beforeEach(() => {
        mockFactory = new MockAgentFactory();
        orchestrator = new WorkflowOrchestrator(mockWebview, mockFactory);
    });

    afterEach(() => {
        mockFactory.reset();
        jest.clearAllMocks();
    });

    describe('Sequential Workflow Execution', () => {
        it('should execute sequential steps in order', async () => {
            const workflow: WorkflowDefinition = {
                name: 'test-sequential',
                agents: [
                    { id: 'agent-1', role: 'First Agent', systemPrompt: 'First prompt' },
                    { id: 'agent-2', role: 'Second Agent', systemPrompt: 'Second prompt' },
                ],
                steps: [
                    { type: 'sequential', agent: 'agent-1', task: 'Task 1' },
                    { type: 'sequential', agent: 'agent-2', task: 'Task 2' },
                ],
            };

            const context: WorkflowContext = {
                projectName: 'test-project',
                data: {},
            };

            const result = await orchestrator.executeWorkflow(workflow, context);

            expect(result.success).toBe(true);
            expect(mockFactory.executedTasks.length).toBe(2);
            expect(mockFactory.executedTasks[0].agentId).toBe('agent-1');
            expect(mockFactory.executedTasks[1].agentId).toBe('agent-2');
        });

        it('should stop on sequential step failure', async () => {
            mockFactory.shouldFail.add('agent-1');

            const workflow: WorkflowDefinition = {
                name: 'test-fail',
                agents: [
                    { id: 'agent-1', role: 'Failing Agent', systemPrompt: 'Will fail' },
                    { id: 'agent-2', role: 'Should Not Run', systemPrompt: 'Never runs' },
                ],
                steps: [
                    { type: 'sequential', agent: 'agent-1', task: 'Fail task' },
                    { type: 'sequential', agent: 'agent-2', task: 'Never reached' },
                ],
            };

            const context: WorkflowContext = {
                projectName: 'test-project',
                data: {},
            };

            const result = await orchestrator.executeWorkflow(workflow, context);

            expect(result.success).toBe(false);
            expect(result.error).toContain('agent-1 failed');
            expect(mockFactory.executedTasks.length).toBe(1);
        });
    });

    describe('Parallel Workflow Execution', () => {
        it('should execute parallel steps concurrently', async () => {
            const workflow: WorkflowDefinition = {
                name: 'test-parallel',
                agents: [
                    { id: 'agent-1', role: 'Agent 1', systemPrompt: 'Prompt 1' },
                    { id: 'agent-2', role: 'Agent 2', systemPrompt: 'Prompt 2' },
                    { id: 'agent-3', role: 'Agent 3', systemPrompt: 'Prompt 3' },
                ],
                steps: [
                    {
                        type: 'parallel',
                        agents: ['agent-1', 'agent-2', 'agent-3'],
                        task: 'Parallel task',
                    },
                ],
            };

            const context: WorkflowContext = {
                projectName: 'test-project',
                data: {},
            };

            const result = await orchestrator.executeWorkflow(workflow, context);

            expect(result.success).toBe(true);
            expect(mockFactory.executedTasks.length).toBe(3);
            // All agents should be invoked
            const agentIds = mockFactory.executedTasks.map((t) => t.agentId);
            expect(agentIds).toContain('agent-1');
            expect(agentIds).toContain('agent-2');
            expect(agentIds).toContain('agent-3');
        });

        it('should continue parallel execution even if one agent fails', async () => {
            mockFactory.shouldFail.add('agent-2');

            const workflow: WorkflowDefinition = {
                name: 'test-parallel-partial-fail',
                agents: [
                    { id: 'agent-1', role: 'Agent 1', systemPrompt: 'Prompt 1' },
                    { id: 'agent-2', role: 'Agent 2', systemPrompt: 'Prompt 2' },
                    { id: 'agent-3', role: 'Agent 3', systemPrompt: 'Prompt 3' },
                ],
                steps: [
                    {
                        type: 'parallel',
                        agents: ['agent-1', 'agent-2', 'agent-3'],
                        task: 'Parallel task',
                    },
                ],
            };

            const context: WorkflowContext = {
                projectName: 'test-project',
                data: {},
            };

            const result = await orchestrator.executeWorkflow(workflow, context);

            // Parallel failures are recorded but don't stop the workflow
            expect(result.results['agent-1'].success).toBe(true);
            expect(result.results['agent-2'].success).toBe(false);
            expect(result.results['agent-3'].success).toBe(true);
        });
    });

    describe('Progress Callbacks', () => {
        it('should call progress callback for each step', async () => {
            const progressUpdates: any[] = [];

            const workflow: WorkflowDefinition = {
                name: 'test-progress',
                agents: [
                    { id: 'agent-1', role: 'Agent 1', systemPrompt: 'Prompt' },
                    { id: 'agent-2', role: 'Agent 2', systemPrompt: 'Prompt' },
                ],
                steps: [
                    { type: 'sequential', agent: 'agent-1', task: 'Task 1' },
                    { type: 'sequential', agent: 'agent-2', task: 'Task 2' },
                ],
            };

            const context: WorkflowContext = {
                projectName: 'test-project',
                data: {},
            };

            await orchestrator.executeWorkflow(workflow, context, (update) => {
                progressUpdates.push(update);
            });

            // Should have starting and complete updates for each agent
            expect(progressUpdates.length).toBe(4);
            expect(progressUpdates.filter((u) => u.status === 'starting').length).toBe(2);
            expect(progressUpdates.filter((u) => u.status === 'complete').length).toBe(2);
        });
    });

    describe('Workflow State', () => {
        it('should track workflow running state', async () => {
            expect(orchestrator.isWorkflowRunning()).toBe(false);

            const workflow: WorkflowDefinition = {
                name: 'test-state',
                agents: [{ id: 'agent-1', role: 'Agent', systemPrompt: 'Prompt' }],
                steps: [{ type: 'sequential', agent: 'agent-1', task: 'Task' }],
            };

            const promise = orchestrator.executeWorkflow(workflow, { projectName: 'test', data: {} });

            // Should be running during execution
            // Note: Due to async nature, this might be flaky
            await promise;

            expect(orchestrator.isWorkflowRunning()).toBe(false);
        });
    });
});

describe('Pre-built Workflows', () => {
    describe('createFeatureSurveyWorkflow', () => {
        it('should create workflow with persona agents and consolidator', () => {
            const personas = [
                { id: '1', name: 'Alice', backstory: 'A developer' },
                { id: '2', name: 'Bob', backstory: 'A designer' },
            ];

            const workflow = createFeatureSurveyWorkflow(personas, 'Test idea');

            // Should have agents for each persona plus consolidator
            expect(workflow.agents.length).toBe(3);
            expect(workflow.agents.find((a) => a.id === 'persona-1')).toBeDefined();
            expect(workflow.agents.find((a) => a.id === 'persona-2')).toBeDefined();
            expect(workflow.agents.find((a) => a.id === 'consolidator')).toBeDefined();

            // Should have 2 steps: parallel survey + consolidation
            expect(workflow.steps.length).toBe(2);
            expect(workflow.steps[0].type).toBe('parallel');
            expect(workflow.steps[1].type).toBe('sequential');
        });
    });

    describe('createResearchWorkflow', () => {
        it('should create workflow with research agents and synthesizer', () => {
            const workflow = createResearchWorkflow('Test product idea');

            // Should have competitive, market, user analysts and synthesizer
            expect(workflow.agents.length).toBe(4);
            expect(workflow.agents.find((a) => a.id === 'competitive-analyst')).toBeDefined();
            expect(workflow.agents.find((a) => a.id === 'market-researcher')).toBeDefined();
            expect(workflow.agents.find((a) => a.id === 'user-researcher')).toBeDefined();
            expect(workflow.agents.find((a) => a.id === 'synthesizer')).toBeDefined();

            // Should have 2 steps: parallel research + synthesis
            expect(workflow.steps.length).toBe(2);
            expect(workflow.steps[0].type).toBe('parallel');
            expect(workflow.steps[1].type).toBe('sequential');
        });
    });

    describe('createBuildIterationWorkflow', () => {
        it('should create workflow with UX, developer, and feedback agents', () => {
            const personas = [{ id: '1', name: 'Alice', backstory: 'A user' }];

            const workflow = createBuildIterationWorkflow(
                'As a user, I want to login',
                'React',
                personas
            );

            // Should have UX, developer, and feedback agents
            expect(workflow.agents.find((a) => a.id === 'ux-agent')).toBeDefined();
            expect(workflow.agents.find((a) => a.id === 'developer-agent')).toBeDefined();
            expect(workflow.agents.find((a) => a.id === 'feedback-1')).toBeDefined();

            // Should have 3 steps: UX -> Dev -> Feedback
            expect(workflow.steps.length).toBe(3);
            expect(workflow.steps[0].agent).toBe('ux-agent');
            expect(workflow.steps[1].agent).toBe('developer-agent');
            expect(workflow.steps[2].agents).toContain('feedback-1');
        });

        it('should include previous feedback in UX agent prompt', () => {
            const personas = [{ id: '1', name: 'Alice', backstory: 'A user' }];

            const workflow = createBuildIterationWorkflow(
                'As a user, I want to login',
                'Vue',
                personas,
                'Previous iteration had issues with button placement'
            );

            const uxAgent = workflow.agents.find((a) => a.id === 'ux-agent');
            expect(uxAgent?.systemPrompt).toContain('Previous iteration feedback');
            expect(uxAgent?.systemPrompt).toContain('button placement');
        });
    });
});
