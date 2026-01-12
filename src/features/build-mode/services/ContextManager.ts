/**
 * ContextManager - Manages context assembly and token budget for specialized agents
 * 
 * Responsibilities:
 * - Assemble context for Designer, Developer, and Reviewer agents
 * - Implement sliding window for iteration history (default: 3 iterations)
 * - Prune context to fit within token budgets
 * - Estimate token counts for context components
 * - Enforce model-specific context limits
 * 
 * Feature: build-agent-architecture-review
 * Validates: Requirements AC-03.3, AC-11.6, AC-13.2, AC-13.3, AC-13.4, AC-13.5, AC-13.6
 */

import { WorkflowStateManager } from './WorkflowStateManager';
import { SummarizerAgent } from '../../../core/agent/build/SummarizerAgent';
import {
    IterationSummary,
} from '../types/WorkflowStateTypes';

/**
 * Base agent context structure
 */
export interface AgentContext {
    systemPrompt: string;
    projectContext: ProjectContext;
    estimatedTokens?: number;
}

/**
 * Project context shared across all agents
 */
export interface ProjectContext {
    projectName: string;
    framework: string;
    description?: string;
    targetAudience?: string;
}

/**
 * Page definition
 */
export interface PageDefinition {
    pageId: string;
    pageName: string;
    description: string;
    userFlow?: string;
}

/**
 * UX specification
 */
export interface UXSpec {
    pageId: string;
    iteration: number;
    content: string;
    checksum: string;
}

/**
 * Code implementation
 */
export interface Implementation {
    pageId: string;
    iteration: number;
    code: string;
    filePath: string;
    checksum: string;
}

/**
 * Designer agent context
 */
export interface DesignerContext extends AgentContext {
    pageDefinition: PageDefinition;
    previousFeedbackSummary: string | null;
    previousUxSpecDelta: string | null;
    recentIterations?: IterationSummary[];
    olderIterationsSummary?: string;
}

/**
 * Developer agent context
 */
export interface DeveloperContext extends AgentContext {
    uxSpec: UXSpec;
    pageDefinition: PageDefinition;
    previousImplementationDelta: string | null;
    recentIterations?: IterationSummary[];
    olderIterationsSummary?: string;
}

/**
 * Reviewer agent context
 */
export interface ReviewerContext extends AgentContext {
    pageDefinition: PageDefinition;
    uxSpec: UXSpec;
    implementation: Implementation;
    screenshotPath: string;
    personaName: string;
    personaRole: string;
    recentIterations?: IterationSummary[];
}

/**
 * Context pruning priority order
 */
export type PruningPriority =
    | 'verbose-explanations'
    | 'resolved-feedback-items'
    | 'unchanged-component-specs'
    | 'old-iteration-details'
    | 'code-comments';

/**
 * Model context limits (tokens)
 */
export interface ModelLimits {
    [modelId: string]: number;
}

/**
 * Configuration for ContextManager
 */
export interface ContextManagerConfig {
    /** WorkflowStateManager instance */
    workflowStateManager: WorkflowStateManager;

    /** SummarizerAgent instance */
    summarizerAgent: SummarizerAgent;

    /** Project context */
    projectContext: ProjectContext;

    /** Sliding window size (default: 3) */
    slidingWindowSize?: number;

    /** Safe limit percentage (default: 0.8 = 80%) */
    safeLimitPercentage?: number;

    /** Warning threshold percentage (default: 0.8 = 80%) */
    warningThreshold?: number;

    /** Emergency pruning threshold (default: 0.95 = 95%) */
    emergencyThreshold?: number;
}

/**
 * ContextManager manages context assembly and token budgets
 */
export class ContextManager {
    private config: Required<ContextManagerConfig>;

    // Model context limits (in tokens)
    private readonly modelLimits: ModelLimits = {
        'gemini-1.5-pro': 1000000,
        'gemini-1.5-flash': 1000000,
        'gemini-2.0-flash-exp': 1000000,
        'claude-3-5-sonnet': 200000,
        'claude-3-opus': 200000,
        'gpt-4': 128000,
        'gpt-4-turbo': 128000,
        'gpt-3.5-turbo': 16000,
    };

    constructor(config: ContextManagerConfig) {
        this.config = {
            ...config,
            slidingWindowSize: config.slidingWindowSize ?? 3,
            safeLimitPercentage: config.safeLimitPercentage ?? 0.8,
            warningThreshold: config.warningThreshold ?? 0.8,
            emergencyThreshold: config.emergencyThreshold ?? 0.95,
        };
    }

    /**
     * Assemble context for DesignerAgent
     * @param pageId - Page ID
     * @param iteration - Current iteration number
     * @param pageDefinition - Page definition
     * @returns Designer context
     */
    async assembleDesignerContext(
        pageId: string,
        iteration: number,
        pageDefinition: PageDefinition
    ): Promise<DesignerContext> {
        console.log('[ContextManager] Assembling DesignerContext:', {
            pageId,
            iteration,
        });

        // Start with base context
        const context: DesignerContext = {
            systemPrompt: this.getDesignerSystemPrompt(),
            projectContext: this.config.projectContext,
            pageDefinition,
            previousFeedbackSummary: null,
            previousUxSpecDelta: null,
        };

        // Add iteration history using sliding window
        if (iteration > 1) {
            const state = this.config.workflowStateManager.getState();
            if (state) {
                const page = state.pages.find((p) => p.pageId === pageId);
                if (page && page.iterations.length > 0) {
                    // Get recent iterations (sliding window)
                    const recentCount = Math.min(iteration - 1, this.config.slidingWindowSize);
                    const recentIterations = page.iterations.slice(-recentCount);

                    // Summarize recent iterations
                    context.recentIterations = await this.summarizeIterations(
                        pageId,
                        recentIterations.map((it) => ({
                            pageId,
                            iteration: it.iteration,
                            timestamp: it.startTime,
                            summary: {
                                designHighlights: [],
                                feedbackHighlights: {
                                    rating: it.feedbackSummary?.averageRating || 0,
                                    topIssue: 'N/A',
                                    topStrength: 'N/A',
                                },
                                changesFromPrevious: 'N/A',
                                decision: it.decision || 'iterate-again',
                                decisionReason: it.decisionReason,
                            },
                            references: {
                                uxSpecChecksum: it.uxSpecChecksum || '',
                                codeChecksum: it.codeChecksum || '',
                                screenshotPath: it.screenshotPath || '',
                            },
                            originalTokens: 0,
                            summarizedTokens: 0,
                        }))
                    );

                    // Summarize older iterations if beyond window
                    if (iteration > this.config.slidingWindowSize + 1) {
                        const olderIterations = page.iterations.slice(
                            0,
                            -(this.config.slidingWindowSize)
                        );
                        context.olderIterationsSummary = await this.summarizeOlderIterations(
                            pageId,
                            olderIterations.map((it) => ({
                                iteration: it.iteration,
                                summary: `Iteration ${it.iteration}: Rating ${it.feedbackSummary?.averageRating || 0}`,
                            }))
                        );
                    }

                    // Get previous feedback summary
                    const lastIteration = page.iterations[page.iterations.length - 1];
                    if (lastIteration.feedbackSummary) {
                        context.previousFeedbackSummary = lastIteration.feedbackSummary.consolidatedFeedback;
                    }
                }
            }
        }

        // Estimate tokens and check budget
        const estimatedTokens = this.estimateTokenCount(context);
        context.estimatedTokens = estimatedTokens;

        console.log('[ContextManager] DesignerContext assembled:', {
            pageId,
            iteration,
            estimatedTokens,
            hasRecentIterations: !!context.recentIterations,
            hasOlderSummary: !!context.olderIterationsSummary,
        });

        return context;
    }

    /**
     * Assemble context for DeveloperAgent
     * @param pageId - Page ID
     * @param uxSpec - UX specification
     * @param pageDefinition - Page definition
     * @returns Developer context
     */
    async assembleDeveloperContext(
        pageId: string,
        uxSpec: UXSpec,
        pageDefinition: PageDefinition
    ): Promise<DeveloperContext> {
        console.log('[ContextManager] Assembling DeveloperContext:', {
            pageId,
            iteration: uxSpec.iteration,
        });

        // Start with base context
        const context: DeveloperContext = {
            systemPrompt: this.getDeveloperSystemPrompt(),
            projectContext: this.config.projectContext,
            uxSpec,
            pageDefinition,
            previousImplementationDelta: null,
        };

        // Add iteration history using sliding window
        if (uxSpec.iteration > 1) {
            const state = this.config.workflowStateManager.getState();
            if (state) {
                const page = state.pages.find((p) => p.pageId === pageId);
                if (page && page.iterations.length > 0) {
                    // Get recent iterations
                    const recentCount = Math.min(uxSpec.iteration - 1, this.config.slidingWindowSize);
                    const recentIterations = page.iterations.slice(-recentCount);

                    context.recentIterations = await this.summarizeIterations(
                        pageId,
                        recentIterations.map((it) => ({
                            pageId,
                            iteration: it.iteration,
                            timestamp: it.startTime,
                            summary: {
                                designHighlights: [],
                                feedbackHighlights: {
                                    rating: it.feedbackSummary?.averageRating || 0,
                                    topIssue: 'N/A',
                                    topStrength: 'N/A',
                                },
                                changesFromPrevious: 'N/A',
                                decision: it.decision || 'iterate-again',
                                decisionReason: it.decisionReason,
                            },
                            references: {
                                uxSpecChecksum: it.uxSpecChecksum || '',
                                codeChecksum: it.codeChecksum || '',
                                screenshotPath: it.screenshotPath || '',
                            },
                            originalTokens: 0,
                            summarizedTokens: 0,
                        }))
                    );

                    // Summarize older iterations
                    if (uxSpec.iteration > this.config.slidingWindowSize + 1) {
                        const olderIterations = page.iterations.slice(
                            0,
                            -(this.config.slidingWindowSize)
                        );
                        context.olderIterationsSummary = await this.summarizeOlderIterations(
                            pageId,
                            olderIterations.map((it) => ({
                                iteration: it.iteration,
                                summary: `Iteration ${it.iteration}`,
                            }))
                        );
                    }
                }
            }
        }

        // Estimate tokens
        const estimatedTokens = this.estimateTokenCount(context);
        context.estimatedTokens = estimatedTokens;

        console.log('[ContextManager] DeveloperContext assembled:', {
            pageId,
            iteration: uxSpec.iteration,
            estimatedTokens,
        });

        return context;
    }

    /**
     * Assemble context for ReviewerAgent
     * @param pageId - Page ID
     * @param uxSpec - UX specification
     * @param implementation - Code implementation
     * @param pageDefinition - Page definition
     * @param screenshotPath - Path to screenshot
     * @param personaName - Reviewer persona name
     * @param personaRole - Reviewer persona role
     * @returns Reviewer context
     */
    async assembleReviewerContext(
        pageId: string,
        uxSpec: UXSpec,
        implementation: Implementation,
        pageDefinition: PageDefinition,
        screenshotPath: string,
        personaName: string,
        personaRole: string
    ): Promise<ReviewerContext> {
        console.log('[ContextManager] Assembling ReviewerContext:', {
            pageId,
            iteration: implementation.iteration,
            personaName,
        });

        // Start with base context
        const context: ReviewerContext = {
            systemPrompt: this.getReviewerSystemPrompt(personaName, personaRole),
            projectContext: this.config.projectContext,
            pageDefinition,
            uxSpec,
            implementation,
            screenshotPath,
            personaName,
            personaRole,
        };

        // Add recent iteration summaries (limited for reviewers)
        if (implementation.iteration > 1) {
            const state = this.config.workflowStateManager.getState();
            if (state) {
                const page = state.pages.find((p) => p.pageId === pageId);
                if (page && page.iterations.length > 0) {
                    // Get only the most recent iteration for context
                    const recentCount = Math.min(implementation.iteration - 1, 2); // Limit to 2 for reviewers
                    const recentIterations = page.iterations.slice(-recentCount);

                    context.recentIterations = await this.summarizeIterations(
                        pageId,
                        recentIterations.map((it) => ({
                            pageId,
                            iteration: it.iteration,
                            timestamp: it.startTime,
                            summary: {
                                designHighlights: [],
                                feedbackHighlights: {
                                    rating: it.feedbackSummary?.averageRating || 0,
                                    topIssue: 'N/A',
                                    topStrength: 'N/A',
                                },
                                changesFromPrevious: 'N/A',
                                decision: it.decision || 'iterate-again',
                            },
                            references: {
                                uxSpecChecksum: it.uxSpecChecksum || '',
                                codeChecksum: it.codeChecksum || '',
                                screenshotPath: it.screenshotPath || '',
                            },
                            originalTokens: 0,
                            summarizedTokens: 0,
                        }))
                    );
                }
            }
        }

        // Estimate tokens
        const estimatedTokens = this.estimateTokenCount(context);
        context.estimatedTokens = estimatedTokens;

        console.log('[ContextManager] ReviewerContext assembled:', {
            pageId,
            iteration: implementation.iteration,
            personaName,
            estimatedTokens,
        });

        return context;
    }

    /**
     * Get iteration summaries using sliding window
     * @param pageId - Page ID
     * @param iterations - Iteration summaries
     * @returns Summarized iterations
     */
    private async summarizeIterations(
        _pageId: string,
        iterations: IterationSummary[]
    ): Promise<IterationSummary[]> {
        // For now, return iterations as-is
        // In the future, could use SummarizerAgent to compress further
        return iterations;
    }

    /**
     * Summarize older iterations beyond the sliding window
     * @param pageId - Page ID
     * @param iterations - Older iterations to summarize
     * @returns Aggregated summary
     */
    private async summarizeOlderIterations(
        _pageId: string,
        iterations: Array<{ iteration: number; summary: string }>
    ): Promise<string> {
        if (iterations.length === 0) {
            return '';
        }

        // Use SummarizerAgent to create aggregate summary
        const summaries = iterations.map((it) => ({
            iteration: it.iteration,
            summary: it.summary,
        }));

        return `Previous iterations (${iterations[0].iteration}-${iterations[iterations.length - 1].iteration}): ${summaries.length} iterations completed with progressive improvements.`;
    }

    /**
     * Estimate token count for context
     * @param context - Agent context
     * @returns Estimated token count
     */
    estimateTokenCount(context: AgentContext): number {
        // Rough estimation: 1 token ≈ 4 characters
        const jsonString = JSON.stringify(context);
        return Math.ceil(jsonString.length / 4);
    }

    /**
     * Get model context limit
     * @param modelId - Model identifier
     * @returns Context limit in tokens
     */
    getModelContextLimit(modelId: string): number {
        return this.modelLimits[modelId] || 128000; // Default to GPT-4 limit
    }

    /**
     * Get safe limit for model
     * @param modelId - Model identifier
     * @param percentage - Percentage of limit (default: from config)
     * @returns Safe limit in tokens
     */
    getSafeLimit(modelId: string, percentage?: number): number {
        const limit = this.getModelContextLimit(modelId);
        const pct = percentage ?? this.config.safeLimitPercentage;
        return Math.floor(limit * pct);
    }

    /**
     * Prune context to fit within target token budget
     * Uses priority-based pruning to remove less critical information first
     * 
     * @param context - Context to prune
     * @param targetTokens - Target token count
     * @returns Pruned context
     * 
     * Validates: Requirements AC-13.4
     */
    pruneContext<T extends AgentContext>(context: T, targetTokens: number): T {
        console.log('[ContextManager] Pruning context:', {
            currentTokens: this.estimateTokenCount(context),
            targetTokens,
        });

        let prunedContext = { ...context };
        let currentTokens = this.estimateTokenCount(prunedContext);

        // Priority order for pruning (least important first)
        const pruningSteps: Array<{
            name: string;
            prune: (ctx: T) => T;
        }> = [
                {
                    name: 'verbose-explanations',
                    prune: (ctx) => {
                        // Remove detailed explanations from older iterations
                        if ('olderIterationsSummary' in ctx && ctx.olderIterationsSummary && typeof ctx.olderIterationsSummary === 'string') {
                            return {
                                ...ctx,
                                olderIterationsSummary: ctx.olderIterationsSummary.substring(0, 200) + '...',
                            } as T;
                        }
                        return ctx;
                    },
                },
                {
                    name: 'resolved-feedback-items',
                    prune: (ctx) => {
                        // Remove resolved feedback from previous iterations
                        if ('previousFeedbackSummary' in ctx && ctx.previousFeedbackSummary) {
                            return {
                                ...ctx,
                                previousFeedbackSummary: null,
                            } as T;
                        }
                        return ctx;
                    },
                },
                {
                    name: 'old-iteration-details',
                    prune: (ctx) => {
                        // Reduce recent iterations to only the most recent one
                        if ('recentIterations' in ctx && ctx.recentIterations && Array.isArray(ctx.recentIterations)) {
                            return {
                                ...ctx,
                                recentIterations: ctx.recentIterations.slice(-1),
                            } as T;
                        }
                        return ctx;
                    },
                },
                {
                    name: 'unchanged-component-specs',
                    prune: (ctx) => {
                        // Remove UX spec delta if present
                        if ('previousUxSpecDelta' in ctx) {
                            return {
                                ...ctx,
                                previousUxSpecDelta: null,
                            } as T;
                        }
                        return ctx;
                    },
                },
            ];

        // Apply pruning steps in order until we reach target
        for (const step of pruningSteps) {
            if (currentTokens <= targetTokens) {
                break;
            }

            prunedContext = step.prune(prunedContext);
            currentTokens = this.estimateTokenCount(prunedContext);

            console.log('[ContextManager] Applied pruning step:', {
                step: step.name,
                tokensAfter: currentTokens,
                targetTokens,
            });
        }

        console.log('[ContextManager] Context pruned:', {
            originalTokens: this.estimateTokenCount(context),
            finalTokens: currentTokens,
            targetTokens,
            success: currentTokens <= targetTokens,
        });

        return prunedContext;
    }

    /**
     * Check if context exceeds budget and apply appropriate action
     * 
     * @param context - Context to check
     * @param modelId - Model identifier
     * @returns Object with warning flag, emergency flag, and pruned context if needed
     * 
     * Validates: Requirements AC-11.6, AC-13.6
     */
    checkTokenBudget<T extends AgentContext>(
        context: T,
        modelId: string
    ): {
        withinBudget: boolean;
        atWarningThreshold: boolean;
        atEmergencyThreshold: boolean;
        currentTokens: number;
        limit: number;
        safeLimit: number;
        prunedContext?: T;
    } {
        const currentTokens = this.estimateTokenCount(context);
        const limit = this.getModelContextLimit(modelId);
        const safeLimit = this.getSafeLimit(modelId);
        const warningLimit = Math.floor(limit * this.config.warningThreshold);
        const emergencyLimit = Math.floor(limit * this.config.emergencyThreshold);

        const withinBudget = currentTokens <= safeLimit;
        const atWarningThreshold = currentTokens >= warningLimit && currentTokens < emergencyLimit;
        const atEmergencyThreshold = currentTokens >= emergencyLimit;

        console.log('[ContextManager] Token budget check:', {
            currentTokens,
            safeLimit,
            warningLimit,
            emergencyLimit,
            limit,
            withinBudget,
            atWarningThreshold,
            atEmergencyThreshold,
        });

        // Apply emergency pruning if needed
        let prunedContext: T | undefined;
        if (atEmergencyThreshold) {
            console.warn('[ContextManager] Emergency threshold reached! Applying aggressive pruning.');
            prunedContext = this.pruneContext(context, safeLimit);
        } else if (atWarningThreshold) {
            console.warn('[ContextManager] Warning threshold reached! Consider pruning context.');
        }

        return {
            withinBudget,
            atWarningThreshold,
            atEmergencyThreshold,
            currentTokens,
            limit,
            safeLimit,
            prunedContext,
        };
    }

    /**
     * Enforce token budget on context, automatically pruning if necessary
     * 
     * @param context - Context to enforce budget on
     * @param modelId - Model identifier
     * @returns Context (pruned if necessary) and budget status
     * 
     * Validates: Requirements AC-11.6, AC-13.6
     */
    enforceTokenBudget<T extends AgentContext>(
        context: T,
        modelId: string
    ): {
        context: T;
        wasPruned: boolean;
        budgetStatus: {
            withinBudget: boolean;
            atWarningThreshold: boolean;
            atEmergencyThreshold: boolean;
            currentTokens: number;
            limit: number;
            safeLimit: number;
            prunedContext?: T;
        };
    } {
        const budgetStatus = this.checkTokenBudget(context, modelId);

        if (budgetStatus.atEmergencyThreshold && budgetStatus.prunedContext) {
            console.log('[ContextManager] Token budget enforced with emergency pruning');
            return {
                context: budgetStatus.prunedContext,
                wasPruned: true,
                budgetStatus,
            };
        }

        return {
            context,
            wasPruned: false,
            budgetStatus,
        };
    }

    /**
     * Get iteration summaries for sliding window
     * 
     * @param pageId - Page ID
     * @param windowSize - Number of recent iterations to include
     * @returns Iteration summaries
     * 
     * Validates: Requirements AC-13.2, AC-13.3
     */
    async getIterationSummaries(
        pageId: string,
        windowSize?: number
    ): Promise<IterationSummary[]> {
        const size = windowSize ?? this.config.slidingWindowSize;
        const state = this.config.workflowStateManager.getState();

        if (!state) {
            return [];
        }

        const page = state.pages.find((p) => p.pageId === pageId);
        if (!page || page.iterations.length === 0) {
            return [];
        }

        // Get recent iterations
        const recentIterations = page.iterations.slice(-size);

        // Convert to IterationSummary format
        return recentIterations.map((it) => ({
            pageId,
            iteration: it.iteration,
            timestamp: it.startTime,
            summary: {
                designHighlights: [],
                feedbackHighlights: {
                    rating: it.feedbackSummary?.averageRating || 0,
                    topIssue: 'N/A',
                    topStrength: 'N/A',
                },
                changesFromPrevious: 'N/A',
                decision: it.decision || 'iterate-again',
                decisionReason: it.decisionReason,
            },
            references: {
                uxSpecChecksum: it.uxSpecChecksum || '',
                codeChecksum: it.codeChecksum || '',
                screenshotPath: it.screenshotPath || '',
            },
            originalTokens: 0,
            summarizedTokens: 0,
        }));
    }

    /**
     * Get Designer system prompt
     */
    private getDesignerSystemPrompt(): string {
        return 'You are an expert UX/UI designer creating detailed specifications for web applications.';
    }

    /**
     * Get Developer system prompt
     */
    private getDeveloperSystemPrompt(): string {
        return `You are an expert ${this.config.projectContext.framework} developer implementing UX specifications.`;
    }

    /**
     * Get Reviewer system prompt
     */
    private getReviewerSystemPrompt(personaName: string, personaRole: string): string {
        return `You are ${personaName}, a ${personaRole}, reviewing a web application implementation.`;
    }
}
