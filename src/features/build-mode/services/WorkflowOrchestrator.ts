/**
 * WorkflowOrchestrator - Lightweight multi-agent workflow coordination
 *
 * A custom orchestration layer that works with the existing AgentManager
 * to coordinate multi-agent workflows for:
 * - Feature generation from user interviews (persona surveys)
 * - Research workflows (competitive, market, user, technical)
 * - Build iterations (UX → Developer → User Feedback)
 *
 * This replaces the need for external frameworks like VoltAgent, LangGraph,
 * or CrewAI while providing the same core functionality.
 *
 * **Validates: Requirements 10.8, 11.2, 12.2**
 */

import * as vscode from 'vscode';

/**
 * Workflow step types
 */
export type WorkflowStepType = 'sequential' | 'parallel';

/**
 * Agent definition for a workflow
 */
export interface WorkflowAgent {
    id: string;
    role: string;
    systemPrompt: string;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
    type: WorkflowStepType;
    /** For parallel steps, multiple agent IDs */
    agents?: string[];
    /** For sequential steps, single agent ID */
    agent?: string;
    /** Task description for the step */
    task: string;
    /** Optional input data for the step */
    input?: Record<string, any>;
    /** Dependencies (agent IDs that must complete first) */
    dependencies?: string[];
}

/**
 * Complete workflow definition
 */
export interface WorkflowDefinition {
    name: string;
    description?: string;
    agents: WorkflowAgent[];
    steps: WorkflowStep[];
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
    projectName: string;
    iterationNumber?: number;
    /** Additional context data */
    data: Record<string, any>;
}

/**
 * Result from a single agent execution
 */
export interface AgentResult {
    agentId: string;
    role: string;
    output: string;
    success: boolean;
    error?: string;
    timestamp: number;
}

/**
 * Complete workflow result
 */
export interface WorkflowResult {
    workflowName: string;
    success: boolean;
    results: Record<string, AgentResult>;
    error?: string;
    startTime: number;
    endTime: number;
}

/**
 * Progress callback for real-time updates
 */
export type WorkflowProgressCallback = (update: {
    step: number;
    totalSteps: number;
    agentId: string;
    status: 'starting' | 'running' | 'complete' | 'error';
    message: string;
}) => void;

/**
 * Workflow state for pause/resume support
 */
export interface WorkflowState {
    workflowName: string;
    projectName: string;
    currentStep: number;
    completedAgents: string[];
    results: Record<string, AgentResult>;
    context: WorkflowContext;
    startTime: number;
    pausedAt?: number;
}

/**
 * WorkflowOrchestrator coordinates multi-agent workflows
 */
export class WorkflowOrchestrator {
    private _currentWorkflow: WorkflowDefinition | null = null;
    private currentState: WorkflowState | null = null;
    private isRunning: boolean = false;
    private abortController: AbortController | null = null;

    constructor(
        private readonly _webview: vscode.Webview,
        private readonly agentFactory: AgentFactory
    ) {
        // Webview stored for future progress notifications
    }

    /**
     * Execute a workflow from start to finish
     */
    async executeWorkflow(
        workflow: WorkflowDefinition,
        context: WorkflowContext,
        onProgress?: WorkflowProgressCallback
    ): Promise<WorkflowResult> {
        if (this.isRunning) {
            throw new Error('A workflow is already running. Please wait or abort.');
        }

        this._currentWorkflow = workflow;
        this.isRunning = true;
        this.abortController = new AbortController();

        const state: WorkflowState = {
            workflowName: workflow.name,
            projectName: context.projectName,
            currentStep: 0,
            completedAgents: [],
            results: {},
            context,
            startTime: Date.now(),
        };
        this.currentState = state;

        const result: WorkflowResult = {
            workflowName: workflow.name,
            success: false,
            results: {},
            startTime: state.startTime,
            endTime: 0,
        };

        try {
            for (let i = 0; i < workflow.steps.length; i++) {
                if (this.abortController.signal.aborted) {
                    throw new Error('Workflow aborted');
                }

                const step = workflow.steps[i];
                state.currentStep = i;

                // Execute step based on type
                if (step.type === 'parallel') {
                    await this.executeParallelStep(
                        workflow,
                        step,
                        state,
                        context,
                        i,
                        workflow.steps.length,
                        onProgress
                    );
                } else {
                    await this.executeSequentialStep(
                        workflow,
                        step,
                        state,
                        context,
                        i,
                        workflow.steps.length,
                        onProgress
                    );
                }
            }

            result.success = true;
            result.results = state.results;
        } catch (error: any) {
            result.success = false;
            result.error = error.message;
            result.results = state.results;
        } finally {
            result.endTime = Date.now();
            this.isRunning = false;
            this._currentWorkflow = null;
            this.currentState = null;
            this.abortController = null;
        }

        return result;
    }

    /**
     * Execute a parallel step (multiple agents run concurrently)
     */
    private async executeParallelStep(
        workflow: WorkflowDefinition,
        step: WorkflowStep,
        state: WorkflowState,
        context: WorkflowContext,
        stepIndex: number,
        totalSteps: number,
        onProgress?: WorkflowProgressCallback
    ): Promise<void> {
        const agentIds = step.agents || [];

        // Start all agents in parallel
        const promises = agentIds.map(async (agentId) => {
            const agentDef = workflow.agents.find((a) => a.id === agentId);
            if (!agentDef) {
                throw new Error(`Agent definition not found: ${agentId}`);
            }

            onProgress?.({
                step: stepIndex + 1,
                totalSteps,
                agentId,
                status: 'starting',
                message: `Starting ${agentDef.role}...`,
            });

            try {
                const result = await this.executeAgent(agentDef, step.task, context, state.results);

                state.results[agentId] = result;
                state.completedAgents.push(agentId);

                onProgress?.({
                    step: stepIndex + 1,
                    totalSteps,
                    agentId,
                    status: 'complete',
                    message: `${agentDef.role} completed`,
                });
            } catch (error: any) {
                const failedResult: AgentResult = {
                    agentId,
                    role: agentDef.role,
                    output: '',
                    success: false,
                    error: error.message,
                    timestamp: Date.now(),
                };
                state.results[agentId] = failedResult;

                onProgress?.({
                    step: stepIndex + 1,
                    totalSteps,
                    agentId,
                    status: 'error',
                    message: `${agentDef.role} failed: ${error.message}`,
                });
            }
        });

        await Promise.all(promises);
    }

    /**
     * Execute a sequential step (single agent)
     */
    private async executeSequentialStep(
        workflow: WorkflowDefinition,
        step: WorkflowStep,
        state: WorkflowState,
        context: WorkflowContext,
        stepIndex: number,
        totalSteps: number,
        onProgress?: WorkflowProgressCallback
    ): Promise<void> {
        const agentId = step.agent;
        if (!agentId) {
            throw new Error('Sequential step must have an agent ID');
        }

        const agentDef = workflow.agents.find((a) => a.id === agentId);
        if (!agentDef) {
            throw new Error(`Agent definition not found: ${agentId}`);
        }

        onProgress?.({
            step: stepIndex + 1,
            totalSteps,
            agentId,
            status: 'starting',
            message: `Starting ${agentDef.role}...`,
        });

        const result = await this.executeAgent(agentDef, step.task, context, state.results);

        state.results[agentId] = result;

        // Check if the agent failed
        if (!result.success) {
            onProgress?.({
                step: stepIndex + 1,
                totalSteps,
                agentId,
                status: 'error',
                message: `${agentDef.role} failed: ${result.error}`,
            });

            // Throw to stop sequential execution
            throw new Error(result.error || `Agent ${agentId} failed`);
        }

        state.completedAgents.push(agentId);

        onProgress?.({
            step: stepIndex + 1,
            totalSteps,
            agentId,
            status: 'complete',
            message: `${agentDef.role} completed`,
        });
    }

    /**
     * Execute a single agent with a task
     */
    private async executeAgent(
        agentDef: WorkflowAgent,
        task: string,
        context: WorkflowContext,
        previousResults: Record<string, AgentResult>
    ): Promise<AgentResult> {
        const startTime = Date.now();

        // Build the prompt with context and previous results
        let prompt = this.buildAgentPrompt(task, context, previousResults);

        try {
            // Create agent via factory
            const response = await this.agentFactory.executeAgentTask(
                agentDef.id,
                agentDef.systemPrompt,
                prompt,
                context.projectName
            );

            return {
                agentId: agentDef.id,
                role: agentDef.role,
                output: response,
                success: true,
                timestamp: startTime,
            };
        } catch (error: any) {
            return {
                agentId: agentDef.id,
                role: agentDef.role,
                output: '',
                success: false,
                error: error.message,
                timestamp: startTime,
            };
        }
    }

    /**
     * Build a prompt for an agent with context and previous results
     */
    private buildAgentPrompt(
        task: string,
        context: WorkflowContext,
        previousResults: Record<string, AgentResult>
    ): string {
        let prompt = `Task: ${task}\n\n`;

        // Add context data
        if (Object.keys(context.data).length > 0) {
            prompt += `Context:\n${JSON.stringify(context.data, null, 2)}\n\n`;
        }

        // Add relevant previous results
        const completedResults = Object.values(previousResults).filter((r) => r.success);
        if (completedResults.length > 0) {
            prompt += `Previous Results:\n`;
            completedResults.forEach((r) => {
                prompt += `\n--- ${r.role} ---\n${r.output}\n`;
            });
        }

        return prompt;
    }

    /**
     * Abort the current workflow
     */
    abort(): void {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    /**
     * Pause the current workflow (saves state for resume)
     */
    pause(): WorkflowState | null {
        if (!this.currentState) {
            return null;
        }
        this.currentState.pausedAt = Date.now();
        this.abort();
        return { ...this.currentState };
    }

    /**
     * Resume a paused workflow
     */
    async resumeWorkflow(
        savedState: WorkflowState,
        workflow: WorkflowDefinition,
        onProgress?: WorkflowProgressCallback
    ): Promise<WorkflowResult> {
        if (this.isRunning) {
            throw new Error('A workflow is already running');
        }

        // Continue from the saved step
        this._currentWorkflow = workflow;
        this.isRunning = true;
        this.abortController = new AbortController();
        this.currentState = savedState;

        const result: WorkflowResult = {
            workflowName: workflow.name,
            success: false,
            results: savedState.results,
            startTime: savedState.startTime,
            endTime: 0,
        };

        try {
            for (let i = savedState.currentStep; i < workflow.steps.length; i++) {
                if (this.abortController.signal.aborted) {
                    throw new Error('Workflow aborted');
                }

                const step = workflow.steps[i];
                savedState.currentStep = i;

                if (step.type === 'parallel') {
                    await this.executeParallelStep(
                        workflow,
                        step,
                        savedState,
                        savedState.context,
                        i,
                        workflow.steps.length,
                        onProgress
                    );
                } else {
                    await this.executeSequentialStep(
                        workflow,
                        step,
                        savedState,
                        savedState.context,
                        i,
                        workflow.steps.length,
                        onProgress
                    );
                }
            }

            result.success = true;
            result.results = savedState.results;
        } catch (error: any) {
            result.success = false;
            result.error = error.message;
            result.results = savedState.results;
        } finally {
            result.endTime = Date.now();
            this.isRunning = false;
            this._currentWorkflow = null;
            this.currentState = null;
            this.abortController = null;
        }

        return result;
    }

    /**
     * Check if a workflow is currently running
     */
    isWorkflowRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Get current workflow state (for persistence)
     */
    getCurrentState(): WorkflowState | null {
        return this.currentState ? { ...this.currentState } : null;
    }

    /**
     * Get current workflow definition (for debugging/inspection)
     */
    getCurrentWorkflow(): WorkflowDefinition | null {
        return this._currentWorkflow;
    }

    /**
     * Get webview reference (for sending progress updates)
     */
    getWebview(): vscode.Webview {
        return this._webview;
    }
}

/**
 * AgentFactory interface for creating and executing agent tasks
 * This decouples WorkflowOrchestrator from the specific Agent implementation
 */
export interface AgentFactory {
    /**
     * Execute a task with a specific agent configuration
     * @param agentId Unique identifier for this agent instance
     * @param systemPrompt System prompt for the agent
     * @param task The task prompt to execute
     * @param projectName Project context
     * @returns The agent's response text
     */
    executeAgentTask(
        agentId: string,
        systemPrompt: string,
        task: string,
        projectName: string
    ): Promise<string>;
}

// ============================================================================
// Pre-built Workflow Definitions
// ============================================================================

/**
 * Create a feature survey workflow for interviewing personas
 */
export function createFeatureSurveyWorkflow(
    personas: Array<{ id: string; name: string; backstory: string }>,
    ideaDescription: string
): WorkflowDefinition {
    const agents: WorkflowAgent[] = [
        // Create an agent for each persona
        ...personas.map((persona) => ({
            id: `persona-${persona.id}`,
            role: persona.name,
            systemPrompt: `You are ${persona.name}. ${persona.backstory}

Your goal is to evaluate a product idea and provide feature requests based on YOUR personal needs and perspective.

When evaluating features:
1. Rate how much the feature would benefit YOU (1-10)
2. Explain why from your perspective
3. Suggest any modifications that would make it more useful to you
4. Rate the idea with and without each feature

Be authentic to your character and background.`,
        })),
        // Consolidator agent
        {
            id: 'consolidator',
            role: 'Feature Analyst',
            systemPrompt: `You are a feature analyst consolidating feedback from multiple user interviews.

Your task is to:
1. Identify common feature themes across all personas
2. Calculate average ratings and determine priority
3. Generate feature descriptions with persona associations
4. Rank features by importance (Must-Have, Should-Have, Nice-to-Have)

Output your analysis as JSON in a code block.`,
        },
    ];

    const steps: WorkflowStep[] = [
        // Step 1: Survey all personas in parallel
        {
            type: 'parallel',
            agents: personas.map((p) => `persona-${p.id}`),
            task: `Please evaluate this product idea and tell us what features you would want:

${ideaDescription}

For each feature you suggest:
1. Describe the feature
2. Rate how important it is to you (1-10)
3. How often would you use it? (Daily, Weekly, Monthly, Rarely)
4. How would you rate the overall idea WITH this feature? (1-10)
5. How would you rate the overall idea WITHOUT this feature? (1-10)

Please provide at least 3 feature suggestions from your perspective.`,
        },
        // Step 2: Consolidate all feedback
        {
            type: 'sequential',
            agent: 'consolidator',
            task: `Consolidate all the persona feedback into a prioritized feature list.

For each feature, provide:
- name: Feature name
- description: What the feature does
- score: Average importance rating
- frequency: Most common usage frequency
- priority: "Must-Have" | "Should-Have" | "Nice-to-Have"
- personas: List of persona names who want this feature

Output as JSON: { "features": [...] }`,
            dependencies: personas.map((p) => `persona-${p.id}`),
        },
    ];

    return {
        name: 'feature-survey',
        description: 'Survey personas about desired features and consolidate feedback',
        agents,
        steps,
    };
}

/**
 * Create a research workflow for idea validation
 */
export function createResearchWorkflow(ideaDescription: string): WorkflowDefinition {
    const agents: WorkflowAgent[] = [
        {
            id: 'competitive-analyst',
            role: 'Competitive Analyst',
            systemPrompt: `You are a competitive analysis researcher. Your goal is to find and analyze products similar to the idea provided.

Identify:
1. Direct competitors (same solution)
2. Indirect competitors (alternative solutions)
3. Market leaders in this space

For each competitor, document:
- Product name
- Key features
- Target market
- Strengths and weaknesses`,
        },
        {
            id: 'market-researcher',
            role: 'Market Researcher',
            systemPrompt: `You are a market research analyst. Research the market opportunity for the idea provided.

Analyze:
1. Market size and growth projections
2. Industry trends
3. Target demographics
4. Regulatory considerations
5. Market maturity`,
        },
        {
            id: 'user-researcher',
            role: 'User Researcher',
            systemPrompt: `You are a user researcher. Research potential users for the idea provided.

Identify:
1. Target user demographics
2. Common pain points
3. Current solutions users are using
4. User communities and forums
5. User preferences and behaviors`,
        },
        {
            id: 'synthesizer',
            role: 'Research Synthesizer',
            systemPrompt: `You are a research synthesis expert. Consolidate findings from competitive, market, and user research into a comprehensive report.

Create sections for:
1. Executive Summary
2. Competitive Landscape
3. Market Opportunity
4. Target Users
5. Key Recommendations
6. Risks and Challenges`,
        },
    ];

    const steps: WorkflowStep[] = [
        // Step 1: Parallel research
        {
            type: 'parallel',
            agents: ['competitive-analyst', 'market-researcher', 'user-researcher'],
            task: `Research this product idea: ${ideaDescription}`,
        },
        // Step 2: Synthesize findings
        {
            type: 'sequential',
            agent: 'synthesizer',
            task: `Synthesize all the research findings into a comprehensive report.`,
            dependencies: ['competitive-analyst', 'market-researcher', 'user-researcher'],
        },
    ];

    return {
        name: 'idea-research',
        description: 'Research competitive landscape, market opportunity, and target users',
        agents,
        steps,
    };
}

/**
 * Create a build iteration workflow (UX → Developer → User Feedback)
 */
export function createBuildIterationWorkflow(
    userStory: string,
    framework: string,
    personas: Array<{ id: string; name: string; backstory: string }>,
    previousFeedback?: string
): WorkflowDefinition {
    const agents: WorkflowAgent[] = [
        {
            id: 'ux-agent',
            role: 'UX Designer',
            systemPrompt: `You are a UX designer. Your task is to design the user interface and write clear requirements for the developer.

Consider:
1. UI components and layout
2. Interaction behaviors
3. Accessibility requirements
4. Design patterns and best practices

${previousFeedback ? `\nPrevious iteration feedback to address:\n${previousFeedback}` : ''}`,
        },
        {
            id: 'developer-agent',
            role: 'Developer',
            systemPrompt: `You are a full-stack developer using ${framework}.

Your task:
1. Implement the feature according to UX requirements
2. Write clean, maintainable code
3. Follow ${framework} best practices

Output your implementation as code blocks with file paths.`,
        },
        // Create feedback agents for each persona
        ...personas.map((persona) => ({
            id: `feedback-${persona.id}`,
            role: `${persona.name} (Feedback)`,
            systemPrompt: `You are ${persona.name}. ${persona.backstory}

You're reviewing a screenshot of an app or website. Give your honest feedback as yourself, like you're talking to a friend.

Share what you like, what you don't like, and rate it out of 100 for how well it would work for you.`,
        })),
    ];

    const steps: WorkflowStep[] = [
        // Step 1: UX Design
        {
            type: 'sequential',
            agent: 'ux-agent',
            task: `Design the user interface for this user story:\n\n${userStory}`,
        },
        // Step 2: Development
        {
            type: 'sequential',
            agent: 'developer-agent',
            task: `Implement the feature based on the UX design requirements.`,
            dependencies: ['ux-agent'],
        },
        // Step 3: Parallel User Feedback
        {
            type: 'parallel',
            agents: personas.map((p) => `feedback-${p.id}`),
            task: `Look at this screenshot and share your thoughts.`,
            dependencies: ['developer-agent'],
        },
    ];

    return {
        name: 'build-iteration',
        description: 'UX → Developer → User Feedback iteration',
        agents,
        steps,
    };
}
