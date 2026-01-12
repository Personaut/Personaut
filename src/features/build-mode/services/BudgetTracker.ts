/**
 * BudgetTracker - Manages cost tracking and budget alerts
 * 
 * Responsibilities:
 * - Track token usage and costs per iteration
 * - Estimate costs before iteration execution
 * - Alert at budget thresholds (80%, 100%)
 * - Pause workflow at budget limit
 * 
 * Feature: build-agent-architecture-review
 * Validates: Requirements AC-14.1, AC-14.3
 */

/**
 * Cost estimation for an iteration
 */
export interface IterationCostEstimate {
    designPhaseTokens: number;
    developmentPhaseTokens: number;
    reviewPhaseTokens: number;
    consolidationPhaseTokens: number;
    totalTokens: number;
    estimatedCost: number; // In USD
}

/**
 * Budget status
 */
export interface BudgetStatus {
    totalBudget: number; // In USD
    spentSoFar: number; // In USD
    remainingBudget: number; // In USD
    percentageUsed: number; // 0-100
    atWarningThreshold: boolean; // 80%
    atLimitThreshold: boolean; // 100%
}

/**
 * Budget alert
 */
export interface BudgetAlert {
    type: 'warning' | 'limit' | 'info';
    message: string;
    currentSpend: number;
    totalBudget: number;
    percentageUsed: number;
    shouldPause: boolean;
}

/**
 * Token pricing (per 1M tokens)
 */
interface TokenPricing {
    input: number; // USD per 1M input tokens
    output: number; // USD per 1M output tokens
}

/**
 * Configuration for budget tracker
 */
export interface BudgetTrackerConfig {
    totalBudget: number; // Total budget in USD
    warningThreshold?: number; // Default: 0.8 (80%)
    limitThreshold?: number; // Default: 1.0 (100%)
    modelPricing?: Record<string, TokenPricing>; // Custom pricing
}

/**
 * BudgetTracker manages cost tracking and budget alerts
 */
export class BudgetTracker {
    private config: Required<BudgetTrackerConfig>;
    private totalSpent: number = 0;
    private iterationCosts: Array<{
        pageId: string;
        iteration: number;
        cost: number;
        tokens: number;
    }> = [];

    // Default pricing (as of 2024, approximate)
    private defaultPricing: Record<string, TokenPricing> = {
        'gemini-1.5-pro': { input: 1.25, output: 5.0 },
        'gemini-1.5-flash': { input: 0.075, output: 0.3 },
        'gpt-4': { input: 30.0, output: 60.0 },
        'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
        'claude-3-5-sonnet': { input: 3.0, output: 15.0 },
    };

    constructor(config: BudgetTrackerConfig) {
        this.config = {
            totalBudget: config.totalBudget,
            warningThreshold: config.warningThreshold ?? 0.8,
            limitThreshold: config.limitThreshold ?? 1.0,
            modelPricing: config.modelPricing ?? this.defaultPricing,
        };

        console.log('[BudgetTracker] Initialized:', {
            totalBudget: `$${this.config.totalBudget.toFixed(2)}`,
            warningThreshold: `${(this.config.warningThreshold * 100).toFixed(0)}%`,
            limitThreshold: `${(this.config.limitThreshold * 100).toFixed(0)}%`,
        });
    }

    /**
     * Estimate cost for an iteration
     * @param reviewerCount - Number of reviewers
     * @param modelId - Model being used
     * @returns Cost estimate
     * 
     * Validates: Requirements AC-14.1
     */
    estimateIterationCost(reviewerCount: number, modelId: string = 'gemini-1.5-pro'): IterationCostEstimate {
        // Rough estimates based on typical usage
        const designPhaseTokens = 5000; // UX spec generation
        const developmentPhaseTokens = 15000; // Code generation
        const reviewPhaseTokens = 3000 * reviewerCount; // Per reviewer
        const consolidationPhaseTokens = 2000; // Feedback consolidation

        const totalTokens =
            designPhaseTokens +
            developmentPhaseTokens +
            reviewPhaseTokens +
            consolidationPhaseTokens;

        const pricing = this.config.modelPricing[modelId] || this.defaultPricing['gemini-1.5-pro'];

        // Assume 70% input, 30% output tokens
        const inputTokens = totalTokens * 0.7;
        const outputTokens = totalTokens * 0.3;

        const estimatedCost =
            (inputTokens / 1_000_000) * pricing.input +
            (outputTokens / 1_000_000) * pricing.output;

        const estimate: IterationCostEstimate = {
            designPhaseTokens,
            developmentPhaseTokens,
            reviewPhaseTokens,
            consolidationPhaseTokens,
            totalTokens,
            estimatedCost,
        };

        console.log('[BudgetTracker] Iteration cost estimate:', {
            reviewerCount,
            modelId,
            totalTokens: totalTokens.toLocaleString(),
            estimatedCost: `$${estimatedCost.toFixed(4)}`,
        });

        return estimate;
    }

    /**
     * Record actual iteration cost
     * @param pageId - Page ID
     * @param iteration - Iteration number
     * @param tokens - Actual tokens used
     * @param modelId - Model used
     */
    recordIterationCost(
        pageId: string,
        iteration: number,
        tokens: number,
        modelId: string = 'gemini-1.5-pro'
    ): void {
        const pricing = this.config.modelPricing[modelId] || this.defaultPricing['gemini-1.5-pro'];

        // Assume 70% input, 30% output
        const inputTokens = tokens * 0.7;
        const outputTokens = tokens * 0.3;

        const cost =
            (inputTokens / 1_000_000) * pricing.input +
            (outputTokens / 1_000_000) * pricing.output;

        this.totalSpent += cost;
        this.iterationCosts.push({
            pageId,
            iteration,
            cost,
            tokens,
        });

        console.log('[BudgetTracker] Recorded iteration cost:', {
            pageId,
            iteration,
            tokens: tokens.toLocaleString(),
            cost: `$${cost.toFixed(4)}`,
            totalSpent: `$${this.totalSpent.toFixed(2)}`,
        });
    }

    /**
     * Get current budget status
     * @returns Budget status
     * 
     * Validates: Requirements AC-14.3
     */
    getBudgetStatus(): BudgetStatus {
        const remainingBudget = this.config.totalBudget - this.totalSpent;
        const percentageUsed = (this.totalSpent / this.config.totalBudget) * 100;

        const status: BudgetStatus = {
            totalBudget: this.config.totalBudget,
            spentSoFar: this.totalSpent,
            remainingBudget: Math.max(0, remainingBudget),
            percentageUsed: Math.min(100, percentageUsed),
            atWarningThreshold: percentageUsed >= this.config.warningThreshold * 100,
            atLimitThreshold: percentageUsed >= this.config.limitThreshold * 100,
        };

        return status;
    }

    /**
     * Check for budget alerts
     * @returns Alert if threshold reached, null otherwise
     * 
     * Validates: Requirements AC-14.3
     */
    checkBudgetAlert(): BudgetAlert | null {
        const status = this.getBudgetStatus();

        if (status.atLimitThreshold) {
            const alert: BudgetAlert = {
                type: 'limit',
                message: `Budget limit reached! Spent $${status.spentSoFar.toFixed(2)} of $${status.totalBudget.toFixed(2)} (${status.percentageUsed.toFixed(1)}%)`,
                currentSpend: status.spentSoFar,
                totalBudget: status.totalBudget,
                percentageUsed: status.percentageUsed,
                shouldPause: true,
            };

            console.warn('[BudgetTracker] BUDGET LIMIT ALERT:', alert.message);
            return alert;
        }

        if (status.atWarningThreshold) {
            const alert: BudgetAlert = {
                type: 'warning',
                message: `Budget warning! Spent $${status.spentSoFar.toFixed(2)} of $${status.totalBudget.toFixed(2)} (${status.percentageUsed.toFixed(1)}%)`,
                currentSpend: status.spentSoFar,
                totalBudget: status.totalBudget,
                percentageUsed: status.percentageUsed,
                shouldPause: false,
            };

            console.warn('[BudgetTracker] BUDGET WARNING:', alert.message);
            return alert;
        }

        return null;
    }

    /**
     * Check if iteration can proceed within budget
     * @param estimate - Iteration cost estimate
     * @returns True if can proceed
     */
    canProceedWithIteration(estimate: IterationCostEstimate): boolean {
        const projectedTotal = this.totalSpent + estimate.estimatedCost;
        const canProceed = projectedTotal <= this.config.totalBudget;

        console.log('[BudgetTracker] Iteration budget check:', {
            currentSpend: `$${this.totalSpent.toFixed(2)}`,
            estimatedCost: `$${estimate.estimatedCost.toFixed(4)}`,
            projectedTotal: `$${projectedTotal.toFixed(2)}`,
            totalBudget: `$${this.config.totalBudget.toFixed(2)}`,
            canProceed,
        });

        return canProceed;
    }

    /**
     * Get cost breakdown by page
     * @returns Cost breakdown
     */
    getCostBreakdownByPage(): Record<string, { cost: number; iterations: number; tokens: number }> {
        const breakdown: Record<string, { cost: number; iterations: number; tokens: number }> = {};

        for (const entry of this.iterationCosts) {
            if (!breakdown[entry.pageId]) {
                breakdown[entry.pageId] = { cost: 0, iterations: 0, tokens: 0 };
            }

            breakdown[entry.pageId].cost += entry.cost;
            breakdown[entry.pageId].iterations += 1;
            breakdown[entry.pageId].tokens += entry.tokens;
        }

        return breakdown;
    }

    /**
     * Get total spent
     * @returns Total spent in USD
     */
    getTotalSpent(): number {
        return this.totalSpent;
    }

    /**
     * Get remaining budget
     * @returns Remaining budget in USD
     */
    getRemainingBudget(): number {
        return Math.max(0, this.config.totalBudget - this.totalSpent);
    }

    /**
     * Reset budget tracker
     */
    reset(): void {
        this.totalSpent = 0;
        this.iterationCosts = [];

        console.log('[BudgetTracker] Reset');
    }

    /**
     * Get iteration history
     * @returns Iteration cost history
     */
    getIterationHistory(): Array<{
        pageId: string;
        iteration: number;
        cost: number;
        tokens: number;
    }> {
        return [...this.iterationCosts];
    }
}
