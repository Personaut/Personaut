/**
 * ParallelReviewerExecutor - Manages parallel execution of reviewer agents
 * 
 * Responsibilities:
 * - Execute multiple ReviewerAgent instances in parallel
 * - Implement batching for rate limit compliance (max 5 concurrent)
 * - Handle partial feedback acceptance (≥50% threshold)
 * - Track execution timing and completion status
 * 
 * Feature: build-agent-architecture-review
 * Validates: Requirements AC-01.5, AC-07.2, AC-12.1, AC-12.2, AC-12.4, AC-12.5
 */

/**
 * Reviewer execution result
 */
export interface ReviewerResult {
    personaId: string;
    personaName: string;
    success: boolean;
    feedback?: any;
    error?: string;
    startTime: number;
    endTime: number;
    duration: number;
}

/**
 * Parallel execution summary
 */
export interface ParallelExecutionSummary {
    totalReviewers: number;
    successfulReviewers: number;
    failedReviewers: number;
    timedOutReviewers: number;
    completionRate: number;
    results: ReviewerResult[];
    startTime: number;
    endTime: number;
    totalDuration: number;
    batchCount: number;
}

/**
 * Configuration for parallel reviewer execution
 */
export interface ParallelReviewerConfig {
    /** Maximum concurrent reviewers per batch (default: 5) */
    maxConcurrent?: number;

    /** Delay between batches in ms (default: 1000) */
    batchDelay?: number;

    /** Timeout for each reviewer in ms (default: 60000) */
    reviewerTimeout?: number;

    /** Minimum completion rate to proceed (default: 0.5 = 50%) */
    minCompletionRate?: number;
}

/**
 * ParallelReviewerExecutor manages parallel execution of reviewer agents
 */
export class ParallelReviewerExecutor {
    private config: Required<ParallelReviewerConfig>;

    constructor(config?: ParallelReviewerConfig) {
        this.config = {
            maxConcurrent: config?.maxConcurrent ?? 5,
            batchDelay: config?.batchDelay ?? 1000,
            reviewerTimeout: config?.reviewerTimeout ?? 60000,
            minCompletionRate: config?.minCompletionRate ?? 0.5,
        };
    }

    /**
     * Execute reviewers in parallel with batching
     * @param reviewers - Array of reviewer execution functions
     * @returns Execution summary
     * 
     * Validates: Requirements AC-12.1, AC-12.2, AC-12.5
     */
    async executeReviewers(
        reviewers: Array<{
            personaId: string;
            personaName: string;
            execute: () => Promise<any>;
        }>
    ): Promise<ParallelExecutionSummary> {
        const startTime = Date.now();
        const results: ReviewerResult[] = [];

        console.log('[ParallelReviewerExecutor] Starting parallel execution:', {
            totalReviewers: reviewers.length,
            maxConcurrent: this.config.maxConcurrent,
            batchDelay: this.config.batchDelay,
        });

        // Split into batches
        const batches = this.createBatches(reviewers, this.config.maxConcurrent);

        console.log('[ParallelReviewerExecutor] Created batches:', {
            batchCount: batches.length,
            batchSizes: batches.map(b => b.length),
        });

        // Execute batches sequentially
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];

            console.log('[ParallelReviewerExecutor] Executing batch:', {
                batchIndex: i + 1,
                batchSize: batch.length,
            });

            // Execute batch in parallel
            const batchResults = await this.executeBatch(batch);
            results.push(...batchResults);

            // Delay between batches (except after last batch)
            if (i < batches.length - 1) {
                await this.delay(this.config.batchDelay);
            }
        }

        const endTime = Date.now();
        const summary = this.createSummary(results, startTime, endTime, batches.length);

        console.log('[ParallelReviewerExecutor] Execution complete:', {
            totalReviewers: summary.totalReviewers,
            successful: summary.successfulReviewers,
            failed: summary.failedReviewers,
            timedOut: summary.timedOutReviewers,
            completionRate: `${(summary.completionRate * 100).toFixed(1)}%`,
            totalDuration: `${summary.totalDuration}ms`,
        });

        return summary;
    }

    /**
     * Execute a single batch of reviewers in parallel
     * @param batch - Batch of reviewers
     * @returns Batch results
     * 
     * Validates: Requirements AC-12.1, AC-12.2
     */
    private async executeBatch(
        batch: Array<{
            personaId: string;
            personaName: string;
            execute: () => Promise<any>;
        }>
    ): Promise<ReviewerResult[]> {
        const batchStartTime = Date.now();

        // Execute all reviewers in batch simultaneously
        const promises = batch.map(async (reviewer) => {
            const reviewerStartTime = Date.now();

            try {
                // Create timeout promise
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Timeout')), this.config.reviewerTimeout);
                });

                // Race between execution and timeout
                const feedback = await Promise.race([
                    reviewer.execute(),
                    timeoutPromise,
                ]);

                const reviewerEndTime = Date.now();

                return {
                    personaId: reviewer.personaId,
                    personaName: reviewer.personaName,
                    success: true,
                    feedback,
                    startTime: reviewerStartTime,
                    endTime: reviewerEndTime,
                    duration: reviewerEndTime - reviewerStartTime,
                } as ReviewerResult;
            } catch (error) {
                const reviewerEndTime = Date.now();
                const isTimeout = error instanceof Error && error.message === 'Timeout';

                console.warn('[ParallelReviewerExecutor] Reviewer failed:', {
                    personaId: reviewer.personaId,
                    personaName: reviewer.personaName,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    isTimeout,
                });

                return {
                    personaId: reviewer.personaId,
                    personaName: reviewer.personaName,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    startTime: reviewerStartTime,
                    endTime: reviewerEndTime,
                    duration: reviewerEndTime - reviewerStartTime,
                } as ReviewerResult;
            }
        });

        // Wait for all reviewers in batch to complete
        const results = await Promise.all(promises);

        const batchEndTime = Date.now();

        console.log('[ParallelReviewerExecutor] Batch complete:', {
            batchSize: batch.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            batchDuration: `${batchEndTime - batchStartTime}ms`,
        });

        return results;
    }

    /**
     * Create batches from reviewers array
     * @param reviewers - All reviewers
     * @param batchSize - Maximum batch size
     * @returns Array of batches
     * 
     * Validates: Requirements AC-12.5
     */
    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];

        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }

        return batches;
    }

    /**
     * Create execution summary
     * @param results - All results
     * @param startTime - Start timestamp
     * @param endTime - End timestamp
     * @param batchCount - Number of batches
     * @returns Execution summary
     */
    private createSummary(
        results: ReviewerResult[],
        startTime: number,
        endTime: number,
        batchCount: number
    ): ParallelExecutionSummary {
        const successfulReviewers = results.filter(r => r.success).length;
        const failedReviewers = results.filter(r => !r.success && r.error !== 'Timeout').length;
        const timedOutReviewers = results.filter(r => !r.success && r.error === 'Timeout').length;

        return {
            totalReviewers: results.length,
            successfulReviewers,
            failedReviewers,
            timedOutReviewers,
            completionRate: results.length > 0 ? successfulReviewers / results.length : 0,
            results,
            startTime,
            endTime,
            totalDuration: endTime - startTime,
            batchCount,
        };
    }

    /**
     * Check if execution meets minimum completion threshold
     * @param summary - Execution summary
     * @returns True if threshold met
     * 
     * Validates: Requirements AC-12.4
     */
    isCompletionThresholdMet(summary: ParallelExecutionSummary): boolean {
        const met = summary.completionRate >= this.config.minCompletionRate;

        console.log('[ParallelReviewerExecutor] Completion threshold check:', {
            completionRate: `${(summary.completionRate * 100).toFixed(1)}%`,
            threshold: `${(this.config.minCompletionRate * 100).toFixed(1)}%`,
            met,
        });

        return met;
    }

    /**
     * Get successful results from summary
     * @param summary - Execution summary
     * @returns Successful results only
     */
    getSuccessfulResults(summary: ParallelExecutionSummary): ReviewerResult[] {
        return summary.results.filter(r => r.success);
    }

    /**
     * Get failed results from summary
     * @param summary - Execution summary
     * @returns Failed results only
     */
    getFailedResults(summary: ParallelExecutionSummary): ReviewerResult[] {
        return summary.results.filter(r => !r.success);
    }

    /**
     * Get timed out reviewers
     * @param summary - Execution summary
     * @returns Timed out results
     */
    getTimedOutResults(summary: ParallelExecutionSummary): ReviewerResult[] {
        return summary.results.filter(r => !r.success && r.error === 'Timeout');
    }

    /**
     * Verify parallel execution (start times within 100ms)
     * @param results - Execution results
     * @returns True if executed in parallel
     * 
     * Validates: Requirements AC-01.5, AC-07.2
     */
    verifyParallelExecution(results: ReviewerResult[]): boolean {
        if (results.length <= 1) {
            return true; // Single or no reviewers
        }

        // Check first batch only (subsequent batches are sequential)
        const batchSize = Math.min(results.length, this.config.maxConcurrent);
        const firstBatch = results.slice(0, batchSize);

        const startTimes = firstBatch.map(r => r.startTime);
        const minStartTime = Math.min(...startTimes);
        const maxStartTime = Math.max(...startTimes);
        const spread = maxStartTime - minStartTime;

        const isParallel = spread <= 100; // Within 100ms

        console.log('[ParallelReviewerExecutor] Parallel execution verification:', {
            batchSize: firstBatch.length,
            minStartTime,
            maxStartTime,
            spread: `${spread}ms`,
            isParallel,
        });

        return isParallel;
    }

    /**
     * Delay helper
     * @param ms - Milliseconds to delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
