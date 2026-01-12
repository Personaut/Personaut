/**
 * BuildWorkflowOrchestrator - Main orchestration layer for build workflow
 * 
 * Responsibilities:
 * - Orchestrate the complete build workflow across all pages
 * - Manage sequential page processing
 * - Coordinate Design → Development → Review → Consolidation cycle
 * - Handle framework initialization (first page only)
 * - Manage workflow state and checkpoints
 * - Handle user decisions (iterate/move to next page)
 * 
 * Feature: build-agent-architecture-review
 * Validates: Requirements AC-01.1, AC-01.2, AC-01.3, AC-01.4, AC-01.5, AC-02.3, AC-02.4, AC-03.1, AC-13.7
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AgentManager } from '../../../core/agent/AgentManager';
import { WorkflowStateManager } from './WorkflowStateManager';
import { ContextManager } from './ContextManager';
import { HandoffManager } from './HandoffManager';
import { ParallelReviewerExecutor } from './ParallelReviewerExecutor';
import { DevServerManager } from './DevServerManager';
import { ScreenshotService } from './ScreenshotService';
import { IterationPlan } from './IterationPlan';


/**
 * Workflow configuration
 */
export interface BuildWorkflowConfig {
    projectName: string;
    framework: string;
    pages: Array<{
        pageId: string;
        pageName: string;
        description: string;
    }>;
    personas: Array<{
        personaId: string;
        personaName: string;
        personaRole: string;
    }>;
    maxIterationsPerPage: number;
    baseDir: string;
    webview?: any;  // Optional webview for logging
    onLog?: (message: string, level?: 'info' | 'success' | 'error') => void;  // Optional logging callback
}

/**
 * Workflow status
 */
export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';

/**
 * User decision
 */
export type UserDecision = 'iterate-again' | 'move-to-next-page' | 'cancel';

/**
 * Iteration result
 */
export interface IterationResult {
    pageId: string;
    iteration: number;
    uxSpec: string;
    code: string;
    screenshotPath: string;
    feedbackSummary: string;
    averageRating: number;
    feedbackResults?: any[]; // Individual persona feedback
    decision: UserDecision;
}

/**
 * BuildWorkflowOrchestrator orchestrates the complete build workflow
 */
export class BuildWorkflowOrchestrator {
    private config: BuildWorkflowConfig;
    private agentManager: AgentManager;
    private workflowStateManager: WorkflowStateManager;
    // TODO: Integrate ContextManager for sliding window context
    // TODO: Integrate HandoffManager for SHA-256 validation
    private parallelReviewerExecutor: ParallelReviewerExecutor;

    // Dev server and screenshot services
    private devServerManager: DevServerManager;
    private screenshotService: ScreenshotService;

    private status: WorkflowStatus = 'idle';
    private currentPageIndex: number = 0;
    private frameworkInitialized: boolean = false;

    // User decision tracking
    private pendingDecision: {
        resolve: (decision: UserDecision) => void;
        reject: (error: Error) => void;
    } | null = null;

    constructor(
        config: BuildWorkflowConfig,
        agentManager: AgentManager,
        workflowStateManager: WorkflowStateManager,
        _contextManager: ContextManager,  // TODO: Use for sliding window context
        _handoffManager: HandoffManager,  // TODO: Use for SHA-256 validation
        parallelReviewerExecutor: ParallelReviewerExecutor
    ) {
        this.config = config;
        this.agentManager = agentManager;
        this.workflowStateManager = workflowStateManager;
        // contextManager and handoffManager will be integrated in future
        this.parallelReviewerExecutor = parallelReviewerExecutor;

        // Initialize dev server and screenshot services
        this.devServerManager = new DevServerManager();
        this.screenshotService = new ScreenshotService();
    }

    /**
     * Start the workflow
     * @returns Workflow ID
     * 
     * Validates: Requirements AC-01.1, AC-03.1
     */
    async startWorkflow(): Promise<string> {
        console.log('[BuildWorkflowOrchestrator] Starting workflow:', {
            projectName: this.config.projectName,
            framework: this.config.framework,
            totalPages: this.config.pages.length,
        });

        this.status = 'running';
        this.currentPageIndex = 0;
        this.frameworkInitialized = false;

        // Initialize workflow state
        await this.workflowStateManager.initializeWorkflow(
            this.config.pages,
            this.config.maxIterationsPerPage
        );

        const state = this.workflowStateManager.getState();
        if (!state) {
            throw new Error('Failed to initialize workflow state');
        }

        this.log(`🚀 Starting build workflow for ${this.config.projectName} (${this.config.pages.length} pages)`, 'info');

        return state.workflowId;
    }

    /**
     * Process all pages sequentially
     * 
     * Validates: Requirements AC-01.1
     */
    async processAllPages(): Promise<void> {
        console.log('[BuildWorkflowOrchestrator] Processing all pages sequentially');

        // Process pages one at a time (sequential)
        for (let i = 0; i < this.config.pages.length; i++) {
            if (this.status !== 'running') {
                console.log('[BuildWorkflowOrchestrator] Workflow not running, stopping');
                break;
            }

            this.currentPageIndex = i;
            const page = this.config.pages[i];

            this.log(`📄 Processing page ${i + 1}/${this.config.pages.length}: ${page.pageName}`, 'info');

            // Initialize framework on first page only
            if (i === 0 && !this.frameworkInitialized) {
                await this.initializeFramework();
            }

            // Process page with iterations
            await this.processPage(page);

            this.log(`✅ Page complete: ${page.pageName}`, 'success');
        }

        this.status = 'completed';
        console.log('[BuildWorkflowOrchestrator] All pages processed');

        // Cleanup resources
        await this.cleanup();
    }

    /**
     * Initialize framework (first page only)
     * Creates a proper framework project using ProjectInitializationService
     * 
     * Validates: Requirements AC-01.3
     */
    private async initializeFramework(): Promise<void> {
        this.log(`🏗️ Initializing ${this.config.framework} project...`, 'info');

        console.log('[BuildWorkflowOrchestrator] Initializing framework:', {
            framework: this.config.framework,
            baseDir: this.config.baseDir,
            projectName: this.config.projectName,
        });

        try {
            // Import ProjectInitializationService
            const { ProjectInitializationService } = await import('./ProjectInitializationService');
            const projectInitService = new ProjectInitializationService();

            // Initialize the framework project
            const result = await projectInitService.initializeProject({
                projectName: this.config.projectName,
                framework: this.config.framework as any,
                baseDirectory: this.config.baseDir,
            });

            if (!result.success) {
                throw new Error(result.error || 'Framework initialization failed');
            }

            // Update baseDir to point to the created project
            this.config.baseDir = result.projectPath;

            this.frameworkInitialized = true;
            this.log(`✅ ${this.config.framework} project created at ${result.projectPath}`, 'success');

            console.log('[BuildWorkflowOrchestrator] Framework initialized successfully');
        } catch (error: any) {
            console.error('[BuildWorkflowOrchestrator] Framework initialization failed:', error);
            this.log(`❌ Failed to initialize ${this.config.framework} project: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Process a single page with iterations
     * @param page - Page to process
     * 
     * Validates: Requirements AC-01.2, AC-01.4, AC-01.5
     */
    private async processPage(page: { pageId: string; pageName: string; description: string }): Promise<void> {
        let iteration = 1;
        let shouldContinue = true;

        while (shouldContinue && iteration <= this.config.maxIterationsPerPage) {
            console.log('[BuildWorkflowOrchestrator] Starting iteration:', {
                pageId: page.pageId,
                iteration,
                maxIterations: this.config.maxIterationsPerPage,
            });

            // Check for iteration warning (3+ iterations)
            if (iteration >= 3) {
                await this.displayIterationWarning(page.pageId, iteration);
            }

            // Execute iteration cycle
            const result = await this.executeIterationCycle(page, iteration);

            // Handle user decision
            const decision = await this.handleUserDecision(result);

            if (decision === 'iterate-again') {
                iteration++;
                shouldContinue = true;
            } else if (decision === 'move-to-next-page') {
                shouldContinue = false;
            } else if (decision === 'cancel') {
                this.status = 'cancelled';
                shouldContinue = false;
            }
        }
    }

    /**
     * Execute a single iteration cycle with checkpointing
     * Design → Development → Review → Consolidation
     * 
     * Supports resuming from last completed step
     * 
     * @param page - Page being processed
     * @param iteration - Iteration number
     * @returns Iteration result
     * 
     * Validates: Requirements AC-01.2, AC-01.4, AC-01.5
     */
    private async executeIterationCycle(
        page: { pageId: string; pageName: string; description: string },
        iteration: number
    ): Promise<IterationResult> {
        console.log('[BuildWorkflowOrchestrator] Executing iteration cycle:', {
            pageId: page.pageId,
            iteration,
        });

        // Initialize iteration plan
        const plan = new IterationPlan(this.config.baseDir, page.pageId, iteration);
        await plan.initialize(page.pageName);

        this.log(`📋 Iteration plan loaded. ${plan.getSummary()}`, 'info');

        try {
            // Step 1: Design Phase
            let uxSpec: string;
            if (plan.isStepCompleted('design')) {
                this.log(`✅ Design phase already completed, loading artifacts...`, 'info');
                const artifacts = plan.getStepArtifacts('design');
                uxSpec = await fs.readFile(plan.getArtifactPath(artifacts.uxSpec), 'utf-8');
            } else {
                await plan.startStep('design');
                this.log(`✏️ Starting design phase...`, 'info');
                uxSpec = await this.designPhase(page, iteration);
                await plan.completeStep('design', { uxSpec: 'ux-spec.md' });
            }

            // Step 2: Development Phase
            let code: string;
            let screenshotPath: string;
            if (plan.isStepCompleted('development')) {
                this.log(`✅ Development phase already completed, loading artifacts...`, 'info');
                const artifacts = plan.getStepArtifacts('development');
                code = await fs.readFile(plan.getArtifactPath(artifacts.code), 'utf-8');
                screenshotPath = plan.getArtifactPath(artifacts.screenshot);
            } else {
                await plan.startStep('development');
                this.log(`💻 Starting development phase...`, 'info');
                const result = await this.developmentPhase(page, iteration, uxSpec);
                code = result.code;
                screenshotPath = result.screenshotPath;
                await plan.completeStep('development', {
                    thinking: 'thinking.md',
                    code: 'code.txt',
                    screenshot: 'screenshot.png',
                });
            }

            // Step 3: Review Phase
            let feedbackResults: any[];
            if (plan.isStepCompleted('review')) {
                this.log(`✅ Review phase already completed, loading artifacts...`, 'info');
                const artifacts = plan.getStepArtifacts('review');
                feedbackResults = await Promise.all(
                    artifacts.feedbackFiles.map(async (file: string) => {
                        const content = await fs.readFile(plan.getArtifactPath(file), 'utf-8');
                        return JSON.parse(content);
                    })
                );
            } else {
                await plan.startStep('review');
                this.log(`💬 Starting review phase...`, 'info');
                feedbackResults = await this.reviewPhase(page, iteration, uxSpec, code, screenshotPath);

                const feedbackFiles = feedbackResults.map(r => `feedback_${r.personaId}.json`);
                await plan.completeStep('review', { feedbackFiles });
            }

            // Step 4: Consolidation Phase
            let feedbackSummary: string;
            let averageRating: number;
            if (plan.isStepCompleted('consolidation')) {
                this.log(`✅ Consolidation phase already completed, loading artifacts...`, 'info');
                const artifacts = plan.getStepArtifacts('consolidation');
                const consolidated = await fs.readFile(
                    plan.getArtifactPath(artifacts.consolidated),
                    'utf-8'
                );
                // Parse average rating from consolidated feedback
                const match = consolidated.match(/\*\*Average Rating:\*\* ([\d.]+)\/10/);
                averageRating = match ? parseFloat(match[1]) : 5;
                feedbackSummary = consolidated;
            } else {
                await plan.startStep('consolidation');
                this.log(`📊 Starting consolidation phase...`, 'info');
                const result = await this.consolidationPhase(feedbackResults);
                feedbackSummary = result.feedbackSummary;
                averageRating = result.averageRating;
                await plan.completeStep('consolidation', {
                    consolidated: 'feedback_consolidated.md',
                    averageRating,
                });
            }

            // Step 5: Save Feedback (if not already done)
            if (!plan.isStepCompleted('save-feedback')) {
                await plan.startStep('save-feedback');
                this.log(`💾 Saving feedback...`, 'info');
                await this.saveFeedback(page.pageId, iteration, feedbackResults, feedbackSummary, averageRating);
                await plan.completeStep('save-feedback', {});
            }

            this.log(`✅ Iteration ${iteration} complete! ${plan.getSummary()}`, 'success');

            return {
                pageId: page.pageId,
                iteration,
                uxSpec,
                code,
                screenshotPath,
                feedbackSummary,
                averageRating,
                feedbackResults, // Include individual persona feedback
                decision: 'iterate-again', // Will be determined by user
            };

        } catch (error: any) {
            // Mark current step as failed
            const currentStep = plan.getCurrentStep();
            if (currentStep) {
                await plan.failStep(currentStep.id, error.message);
            }
            this.log(`❌ Iteration failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Design Phase: Generate UX specification
     * 
     * Validates: Requirements AC-01.2
     */
    private async designPhase(
        page: { pageId: string; pageName: string; description: string },
        iteration: number
    ): Promise<string> {
        this.log(`✏️ Creating UX specification for ${page.pageName} (Iteration ${iteration})...`, 'info');

        // TODO: Use ContextManager to assemble context with sliding window and token budgets
        // const context = await this.contextManager.assembleDesignerContext(...)

        // Create designer agent
        const conversationId = `designer-${this.config.projectName}-${page.pageId}-iter${iteration}`;
        const designerAgent = await this.agentManager.getOrCreateAgent(conversationId, 'build');

        // Generate UX spec
        const prompt = `Create a detailed UX specification for the "${page.pageName}" page.

**Page Description:** ${page.description}

**Framework:** ${this.config.framework}

**Requirements:**
1. Define the page layout and structure
2. List all UI components needed
3. Specify user interactions and flows
4. Include accessibility considerations
5. Define responsive behavior

${iteration > 1 ? `**Previous Iteration:** This is iteration ${iteration}. Improve upon the previous design based on feedback.` : ''}

Output a detailed UX specification in markdown format.`;

        const systemPrompt = `You are a UX designer creating specifications for a ${this.config.framework} application. Be specific and detailed.`;

        await designerAgent.chat(prompt, [], {}, systemPrompt, false);

        // Retrieve the generated UX spec
        const conversation = await this.agentManager['config'].conversationManager.getConversation(conversationId);
        const lastMsg = conversation?.messages.filter((m: any) => m.role === 'model').pop();
        const uxSpec = lastMsg?.text || `UX Specification for ${page.pageName} (Iteration ${iteration})`;

        // Dispose agent
        await this.agentManager.disposeAgent(conversationId);

        // Save UX spec to disk
        await this.writeUXSpec(page.pageId, iteration, uxSpec);

        console.log('[BuildWorkflowOrchestrator] Design phase complete');
        return uxSpec;
    }

    /**
     * Development Phase: Build page and capture screenshot
     * Uses ThinkingDeveloperAgent for multi-step reasoning
     * 
     * Validates: Requirements AC-01.4
     */
    private async developmentPhase(
        page: { pageId: string; pageName: string; description: string },
        iteration: number,
        uxSpec: string
    ): Promise<{ code: string; screenshotPath: string }> {
        this.log(`💻 Implementing code for ${page.pageName} (Iteration ${iteration})...`, 'info');

        // Import ThinkingDeveloperAgent
        const { ThinkingDeveloperAgent } = await import('../../../core/agent/build/ThinkingDeveloperAgent');

        // Create thinking developer agent
        const conversationId = `developer-${this.config.projectName}-${page.pageId}-iter${iteration}`;
        const baseAgent = await this.agentManager.getOrCreateAgent(conversationId, 'build');

        // Create ThinkingDeveloperAgent with valid config
        const developerAgent = new ThinkingDeveloperAgent(
            {
                conversationId: baseAgent.conversationId,
                webview: (baseAgent as any).webview,
                mode: 'build',
                onDidUpdateMessages: (baseAgent as any).onDidUpdateMessages,
            },
            {
                framework: this.config.framework as any,  // Type cast to match DeveloperAgentOptions
                projectPath: this.config.baseDir,
            }
        );

        // Set project path for file operations
        developerAgent.setProjectPath(this.config.baseDir);

        // Sanitize page name for valid filename
        const sanitizedName = page.pageName
            .replace(/[\/\\:*?"<>|]/g, '_')
            .replace(/\s+/g, '')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        const ext = this.config.framework.toLowerCase().includes('vue') ? '.vue' : '.tsx';
        const outputPath = `src/pages/${sanitizedName}${ext}`;

        // Generate code using DeveloperAgent
        this.log(`💻 Generating code for ${page.pageName}...`, 'info');

        const codePrompt = `Generate a complete ${this.config.framework} component for: ${page.pageName}

UX Specification:
${uxSpec}

Requirements:
- Complete, production-ready code
- Proper TypeScript types
- Error handling
- Responsive design
- Accessibility features
- Sample/mock data if needed

Provide ONLY the code, no explanations.`;

        console.log('[DevelopmentPhase] Calling generateCode...');
        const code = await developerAgent.generateCode(codePrompt);
        console.log('[DevelopmentPhase] Code received:', {
            length: code?.length || 0,
            preview: code?.substring(0, 200)
        });

        // Archive code to .personaut
        const iterationDir = path.join(
            this.config.baseDir,
            '.personaut',
            'iterations',
            page.pageId,
            `iteration_${iteration}`
        );
        await fs.mkdir(iterationDir, { recursive: true });
        console.log('[DevelopmentPhase] Writing code to:', path.join(iterationDir, 'code.txt'));
        await fs.writeFile(path.join(iterationDir, 'code.txt'), code, 'utf-8');
        console.log('[DevelopmentPhase] Code written successfully');

        // Also write to project file
        const projectFilePath = path.join(this.config.baseDir, outputPath);
        console.log('[DevelopmentPhase] Writing code to project:', projectFilePath);
        await fs.mkdir(path.dirname(projectFilePath), { recursive: true });
        await fs.writeFile(projectFilePath, code, 'utf-8');
        console.log('[DevelopmentPhase] Project file written successfully');

        // Dispose agent
        await this.agentManager.disposeAgent(conversationId);

        // Start dev server if not running
        await this.startDevServer();

        // Capture screenshot
        const screenshotPath = await this.captureScreenshot(page.pageId, page.pageName, iteration);


        console.log('[BuildWorkflowOrchestrator] Development phase complete');
        return { code, screenshotPath };
    }


    /**
     * Review Phase: Collect feedback in parallel
     * 
     * Validates: Requirements AC-01.5
     */
    private async reviewPhase(
        page: { pageId: string; pageName: string; description: string },
        iteration: number,
        _uxSpec: string,  // TODO: Include in persona prompts for more context
        _code: string,    // TODO: Include in persona prompts for more context
        screenshotPath: string
    ): Promise<any[]> {
        this.log(`💬 Collecting feedback from ${this.config.personas.length} personas for ${page.pageName}...`, 'info');

        // Create reviewer execution functions
        const reviewers = this.config.personas.map(persona => ({
            personaId: persona.personaId,
            personaName: persona.personaName,
            execute: async () => {
                // Create PersonaAgent for this user persona
                const conversationId = `persona-${persona.personaId}-${page.pageId}-iter${iteration}`;
                const personaAgent = await this.agentManager.getOrCreateAgent(conversationId, 'feedback');

                const systemPrompt = `You are ${persona.personaName}, ${persona.personaRole}.

You are reviewing a screenshot of the "${page.pageName}" page that was just built.

IMPORTANT: Base your feedback ONLY on what you see in the screenshot image. Focus on the actual visual implementation, not on ideas or concepts.

Respond as yourself - ${persona.personaName} - giving your honest, natural feedback as if you're talking to a friend about what you see in the screenshot.

Keep your response conversational and authentic. Share what you like about the visual design, what you don't like, and rate it out of 10 based on how well it would work for someone like you.`;

                const userPrompt = `Look at this screenshot of the "${page.pageName}" page.

**What this page is for:** ${page.description}
${(page as any).userFlow ? `\n**What users should be able to do:** ${(page as any).userFlow}` : ''}

Based on what you SEE in the screenshot, provide your honest feedback:
1. Does the visual design match what you'd expect for this feature?
2. What do you like about how it looks?
3. What concerns or issues do you see in the implementation?
4. How well would this work for you based on what's shown?
5. Rate it from 1-10 (1=terrible, 10=perfect)

Keep it conversational and real - like you're texting a friend about what you see in the screenshot.`;

                // Pass screenshot as image
                const images = [screenshotPath];
                console.log(`[ReviewPhase] Sending chat to ${persona.personaName}...`);
                await personaAgent.chat(userPrompt, [], {}, systemPrompt, true, images);
                console.log(`[ReviewPhase] Chat completed for ${persona.personaName}`);

                // Retrieve feedback
                console.log(`[ReviewPhase] Retrieving conversation ${conversationId}...`);
                const conversation = await this.agentManager['config'].conversationManager.getConversation(conversationId);
                console.log(`[ReviewPhase] Conversation retrieved:`, {
                    exists: !!conversation,
                    messageCount: conversation?.messages?.length || 0
                });

                const modelMessages = conversation?.messages?.filter((m: any) => m.role === 'model') || [];
                console.log(`[ReviewPhase] Model messages:`, modelMessages.length);

                const lastMsg = modelMessages.pop();
                console.log(`[ReviewPhase] Last message:`, {
                    exists: !!lastMsg,
                    hasText: !!lastMsg?.text,
                    textLength: lastMsg?.text?.length || 0,
                    textPreview: lastMsg?.text?.substring(0, 100)
                });

                const feedbackText = lastMsg?.text || `Feedback from ${persona.personaName}`;
                console.log(`[ReviewPhase] Feedback text length:`, feedbackText.length);

                // Parse rating from feedback (look for number 1-10)
                const ratingMatch = feedbackText.match(/\b([1-9]|10)\b/);
                const rating = ratingMatch ? parseInt(ratingMatch[1]) : 5;
                console.log(`[ReviewPhase] Parsed rating:`, rating);

                // Dispose agent
                await this.agentManager.disposeAgent(conversationId);

                return {
                    personaId: persona.personaId,
                    personaName: persona.personaName,
                    rating,
                    feedback: feedbackText,
                };
            },
        }));

        // Execute reviewers in parallel
        const summary = await this.parallelReviewerExecutor.executeReviewers(reviewers);

        console.log('[BuildWorkflowOrchestrator] Review phase complete:', {
            totalReviewers: summary.totalReviewers,
            successful: summary.successfulReviewers,
            completionRate: `${(summary.completionRate * 100).toFixed(1)}%`,
        });

        return this.parallelReviewerExecutor.getSuccessfulResults(summary);
    }

    /**
     * Consolidation Phase: Consolidate feedback
     * 
     * Validates: Requirements AC-01.2
     */
    private async consolidationPhase(feedbackResults: any[]): Promise<{
        feedbackSummary: string;
        averageRating: number;
    }> {
        this.log(`📊 Consolidating feedback from ${feedbackResults.length} personas...`, 'info');

        // Calculate average rating
        const ratings = feedbackResults.map((r: any) => r.rating || 5);
        const averageRating = ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length;

        // Create SummarizerAgent to consolidate feedback
        const conversationId = `summarizer-consolidation-${Date.now()}`;
        const summarizerAgent = await this.agentManager.getOrCreateAgent(conversationId, 'build');

        // Prepare feedback for summarization
        const feedbackList = feedbackResults
            .map((r: any) => `**${r.personaName}** (Rating: ${r.rating}/10):\n${r.feedback}`)
            .join('\n\n');

        const prompt = `Consolidate the following feedback from ${feedbackResults.length} user personas:

${feedbackList}

**Average Rating:** ${averageRating.toFixed(1)}/10

Please provide:
1. A brief summary of common themes
2. Key strengths mentioned
3. Main concerns or issues raised
4. Recommendations for improvement

Keep it concise and actionable.`;

        const systemPrompt = `You are a UX analyst consolidating user feedback. Be objective and highlight the most important points.`;

        await summarizerAgent.chat(prompt, [], {}, systemPrompt, false);

        // Retrieve consolidated summary
        const conversation = await this.agentManager['config'].conversationManager.getConversation(conversationId);
        const lastMsg = conversation?.messages.filter((m: any) => m.role === 'model').pop();
        const feedbackSummary = lastMsg?.text || 'Consolidated feedback summary';

        // Dispose agent
        await this.agentManager.disposeAgent(conversationId);

        console.log('[BuildWorkflowOrchestrator] Consolidation phase complete');
        return { feedbackSummary, averageRating };
    }

    /**
     * Handle user decision
     * Sends feedback to UI and waits for user response
     * 
     * Validates: Requirements AC-02.3
     */
    async handleUserDecision(result: IterationResult): Promise<UserDecision> {
        console.log('[BuildWorkflowOrchestrator] Awaiting user decision:', {
            pageId: result.pageId,
            iteration: result.iteration,
            averageRating: result.averageRating,
        });

        // Auto-proceed if rating is high enough (8.5+)
        if (result.averageRating >= 8.5) {
            this.log(`⭐ Excellent rating (${result.averageRating.toFixed(1)}/10)! Auto-proceeding to next page.`, 'success');
            return 'move-to-next-page';
        }

        // Send feedback to UI for user decision
        await this.sendFeedbackToUI(result);

        // Wait for user decision via Promise
        return new Promise<UserDecision>((resolve, reject) => {
            this.pendingDecision = { resolve, reject };

            // Set timeout (5 minutes) in case user never responds
            setTimeout(() => {
                if (this.pendingDecision) {
                    this.pendingDecision = null;
                    reject(new Error('User decision timeout'));
                }
            }, 300000); // 5 minutes
        });
    }

    /**
     * Receive user decision from UI
     * Called by WorkflowOrchestratorHandler when user makes a choice
     */
    receiveUserDecision(decision: 'iterate-again' | 'move-to-next-page' | 'cancel'): void {
        if (!this.pendingDecision) {
            console.warn('[BuildWorkflowOrchestrator] Received decision but none pending');
            return;
        }

        console.log('[BuildWorkflowOrchestrator] User decision received:', decision);
        this.pendingDecision.resolve(decision);
        this.pendingDecision = null;
    }

    /**
     * Display iteration warning (3+ iterations)
     * 
     * Validates: Requirements AC-02.4, AC-13.7
     */
    private async displayIterationWarning(pageId: string, iteration: number): Promise<void> {
        console.warn('[BuildWorkflowOrchestrator] Iteration warning:', {
            pageId,
            iteration,
            message: `This page has reached ${iteration} iterations. Consider moving to the next page to manage costs.`,
        });

        // In actual implementation, this would display a warning to the user
    }

    /**
     * Pause the workflow
     * 
     * Validates: Requirements AC-03.1
     */
    async pauseWorkflow(): Promise<void> {
        console.log('[BuildWorkflowOrchestrator] Pausing workflow');
        this.status = 'paused';
    }

    /**
     * Resume the workflow
     * 
     * Validates: Requirements AC-03.1
     */
    async resumeWorkflow(): Promise<void> {
        console.log('[BuildWorkflowOrchestrator] Resuming workflow');
        this.status = 'running';
    }

    /**
     * Cancel the workflow
     * 
     * Validates: Requirements AC-03.1
     */
    async cancelWorkflow(): Promise<void> {
        console.log('[BuildWorkflowOrchestrator] Cancelling workflow');
        this.status = 'cancelled';

        // Cleanup resources
        await this.cleanup();
    }

    /**
     * Cleanup resources (dev server, browser)
     */
    private async cleanup(): Promise<void> {
        console.log('[BuildWorkflowOrchestrator] Cleaning up resources...');

        // Stop dev server
        if (this.devServerManager.isRunning()) {
            console.log('[BuildWorkflowOrchestrator] Stopping dev server');
            this.devServerManager.stop();
        }

        // Close browser
        if (this.screenshotService.isInitialized()) {
            console.log('[BuildWorkflowOrchestrator] Closing browser');
            await this.screenshotService.close();
        }

        console.log('[BuildWorkflowOrchestrator] Cleanup complete');
    }

    /**
     * Get current workflow status
     */
    getStatus(): WorkflowStatus {
        return this.status;
    }

    /**
     * Get current page index
     */
    getCurrentPageIndex(): number {
        return this.currentPageIndex;
    }

    /**
     * Check if framework is initialized
     */
    isFrameworkInitialized(): boolean {
        return this.frameworkInitialized;
    }

    /**
     * Log message to console and webview
     */
    private log(message: string, level: 'info' | 'success' | 'error' = 'info'): void {
        console.log(`[BuildWorkflowOrchestrator] ${message}`);

        // Also send to webview if available
        if (this.config.onLog) {
            this.config.onLog(message, level);
        }
    }

    /**
     * Write UX spec to disk
     */
    private async writeUXSpec(pageId: string, iteration: number, uxSpec: string): Promise<string> {
        // Store metadata in .personaut directory
        const iterationDir = path.join(this.config.baseDir, '.personaut', 'iterations', pageId, `iteration_${iteration}`);
        await fs.mkdir(iterationDir, { recursive: true });

        const specPath = path.join(iterationDir, 'ux-spec.md');
        await fs.writeFile(specPath, uxSpec, 'utf-8');

        console.log(`[BuildWorkflowOrchestrator] UX spec saved: ${specPath}`);
        return specPath;
    }

    /**
     * Write code files to disk
     * 
     * @deprecated This method is no longer used. ThinkingDeveloperAgent now handles file writing directly.
     * Kept for reference/potential future use.
     */
    // @ts-ignore - Unused but kept for reference
    private async writeCodeFiles(pageId: string, pageName: string, iteration: number, code: string): Promise<string> {
        // Store raw code archive in .personaut directory
        const iterationDir = path.join(this.config.baseDir, '.personaut', 'iterations', pageId, `iteration_${iteration}`);
        await fs.mkdir(iterationDir, { recursive: true });

        // Save raw code to iteration folder (for reference/history)
        const codePath = path.join(iterationDir, 'code.txt');
        await fs.writeFile(codePath, code, 'utf-8');

        // Write actual implementation to src directory for dev server
        const srcDir = path.join(this.config.baseDir, 'src', 'pages');
        await fs.mkdir(srcDir, { recursive: true });

        // Sanitize page name for valid filename (remove /, \, :, *, ?, ", <, >, |)
        const sanitizedName = pageName
            .replace(/[\/\\:*?"<>|]/g, '_')  // Replace invalid chars with underscore
            .replace(/\s+/g, '')              // Remove spaces for PascalCase
            .replace(/_+/g, '_')              // Collapse multiple underscores
            .replace(/^_|_$/g, '');           // Remove leading/trailing underscores

        // Determine file extension based on framework
        const ext = this.config.framework.toLowerCase().includes('vue') ? '.vue' : '.tsx';
        const componentPath = path.join(srcDir, `${sanitizedName}${ext}`);
        await fs.writeFile(componentPath, code, 'utf-8');

        console.log(`[BuildWorkflowOrchestrator] Code saved: ${componentPath}`);
        return componentPath;
    }

    /**
     * Start dev server (if not already running)
     */
    private async startDevServer(): Promise<void> {
        // Check if dev server is already running
        if (this.devServerManager.isRunning()) {
            console.log('[BuildWorkflowOrchestrator] Dev server already running');
            return;
        }

        console.log('[BuildWorkflowOrchestrator] Starting dev server...');

        try {
            // Determine port based on framework
            const port = this.config.framework.toLowerCase().includes('vite') ? 5173 : 3000;

            // Start the dev server
            const result = await this.devServerManager.start({
                projectPath: this.config.baseDir,
                framework: this.config.framework as any,
                port,
                onLog: (message) => console.log(`[DevServer] ${message}`),
                onError: (error) => console.error(`[DevServer] ${error}`),
                onReady: () => {
                    this.frameworkInitialized = true;
                    console.log('[BuildWorkflowOrchestrator] Dev server ready!');
                },
                timeout: 60000, // 1 minute timeout
            });

            if (!result.success) {
                console.error(`[BuildWorkflowOrchestrator] Dev server failed to start: ${result.error}`);
                // Don't throw - continue with placeholder screenshots
            } else {
                this.frameworkInitialized = true;
            }
        } catch (error: any) {
            console.error(`[BuildWorkflowOrchestrator] Dev server error: ${error.message}`);
            // Don't throw - continue with placeholder screenshots
        }
    }

    /**
     * Capture screenshot using Puppeteer
     */
    private async captureScreenshot(pageId: string, pageName: string, iteration: number): Promise<string> {
        // Store screenshots in .personaut directory
        const iterationDir = path.join(this.config.baseDir, '.personaut', 'iterations', pageId, `iteration_${iteration}`);
        await fs.mkdir(iterationDir, { recursive: true });

        const screenshotPath = path.join(iterationDir, 'screenshot.png');

        // Only attempt real screenshot if dev server is running
        if (!this.devServerManager.isRunning()) {
            console.log(`[BuildWorkflowOrchestrator] Dev server not running, creating placeholder screenshot`);
            await fs.writeFile(screenshotPath, 'placeholder screenshot', 'utf-8');
            return screenshotPath;
        }

        try {
            // Initialize browser if not already done
            if (!this.screenshotService.isInitialized()) {
                console.log('[BuildWorkflowOrchestrator] Initializing Puppeteer browser...');
                await this.screenshotService.initialize();
            }

            // Determine port based on framework
            const port = this.config.framework.toLowerCase().includes('vite') ? 5173 : 3000;
            const url = `http://localhost:${port}/${pageName}`;

            console.log(`[BuildWorkflowOrchestrator] Capturing screenshot of ${url}`);

            // Capture screenshot
            const result = await this.screenshotService.capture({
                url,
                viewport: { width: 1280, height: 720 },
                waitForTimeout: 2000,
                fullPage: true,
            });

            if (result.success && result.data) {
                // Save screenshot to disk
                await fs.writeFile(screenshotPath, result.data);
                console.log(`[BuildWorkflowOrchestrator] Screenshot saved for ${pageName}: ${screenshotPath}`);
            } else {
                // Fallback to placeholder
                console.error(`[BuildWorkflowOrchestrator] Screenshot failed: ${result.error}, using placeholder`);
                await fs.writeFile(screenshotPath, 'placeholder screenshot', 'utf-8');
            }
        } catch (error: any) {
            // Fallback to placeholder on error
            console.error(`[BuildWorkflowOrchestrator] Screenshot error: ${error.message}, using placeholder`);
            await fs.writeFile(screenshotPath, 'placeholder screenshot', 'utf-8');
        }

        return screenshotPath;
    }

    /**
     * Save persona feedback to disk
     */
    private async saveFeedback(
        pageId: string,
        iteration: number,
        feedbackResults: any[],
        consolidatedFeedback: string,
        averageRating: number
    ): Promise<void> {
        // Store feedback in .personaut directory
        const iterationDir = path.join(this.config.baseDir, '.personaut', 'iterations', pageId, `iteration_${iteration}`);
        await fs.mkdir(iterationDir, { recursive: true });

        // Save individual persona feedback
        for (const result of feedbackResults) {
            const feedbackPath = path.join(iterationDir, `feedback_${result.personaId}.json`);
            await fs.writeFile(feedbackPath, JSON.stringify(result, null, 2), 'utf-8');
        }

        // Save consolidated feedback
        const consolidatedPath = path.join(iterationDir, 'feedback_consolidated.md');
        const consolidatedContent = `# Consolidated Feedback - Iteration ${iteration}

**Average Rating:** ${averageRating.toFixed(1)}/10

## Summary

${consolidatedFeedback}

## Individual Feedback

${feedbackResults.map(r => `### ${r.personaName} (${r.rating}/10)

${r.feedback}
`).join('\n')}
`;

        await fs.writeFile(consolidatedPath, consolidatedContent, 'utf-8');

        console.log(`[BuildWorkflowOrchestrator] Feedback saved: ${consolidatedPath}`);
    }

    /**
     * Send feedback to UI for user decision
     */
    private async sendFeedbackToUI(result: IterationResult): Promise<void> {
        if (!this.config.webview) {
            console.warn('[BuildWorkflowOrchestrator] No webview available to send feedback');
            return;
        }

        this.log(`⏸️ Awaiting your decision (Rating: ${result.averageRating.toFixed(1)}/10)...`, 'info');

        // Send iteration summary with feedback
        this.config.webview.postMessage({
            type: 'iteration-summary',
            projectName: this.config.projectName,
            pageId: result.pageId,
            iteration: result.iteration,
            feedbackSummary: result.feedbackSummary,
            averageRating: result.averageRating,
            feedback: result.feedbackResults?.map((f: any) => ({
                reviewerId: f.personaId || (f.feedback?.personaId) || f.id,
                reviewerName: f.personaName || (f.feedback?.personaName) || f.name,
                rating: (f.feedback?.rating) || f.rating || 5,
                comments: typeof f.feedback === 'string' ? f.feedback : (f.feedback?.feedback || ''),
                strengths: f.strengths || [],
                improvements: f.improvements || [],
            })) || [],
        });

        // Send user decision request
        this.config.webview.postMessage({
            type: 'user-decision-request',
            projectName: this.config.projectName,
            pageId: result.pageId,
            iteration: result.iteration,
            averageRating: result.averageRating,
        });

        // Update phase to 'decision'
        this.config.webview.postMessage({
            type: 'iteration-phase-changed',
            projectName: this.config.projectName,
            phase: 'decision',
            iteration: result.iteration,
        });
    }
}
