/**
 * Integration tests for ParallelReviewerExecutor
 * 
 * Feature: build-agent-architecture-review
 * Validates: Requirements AC-01.5, AC-07.2, AC-12.1, AC-12.2, AC-12.4, AC-12.5
 */

import { ParallelReviewerExecutor } from '../../features/build-mode/services/ParallelReviewerExecutor';

describe('ParallelReviewerExecutor Integration Tests', () => {
    let executor: ParallelReviewerExecutor;

    beforeEach(() => {
        executor = new ParallelReviewerExecutor({
            maxConcurrent: 5,
            batchDelay: 100, // Shorter for tests
            reviewerTimeout: 5000,
            minCompletionRate: 0.5,
        });
    });

    describe('Parallel Execution', () => {
        it('should execute reviewers in parallel', async () => {
            const reviewers = [
                {
                    personaId: 'sarah',
                    personaName: 'Sarah',
                    execute: async () => {
                        await delay(100);
                        return { rating: 5 };
                    },
                },
                {
                    personaId: 'john',
                    personaName: 'John',
                    execute: async () => {
                        await delay(100);
                        return { rating: 4 };
                    },
                },
                {
                    personaId: 'alice',
                    personaName: 'Alice',
                    execute: async () => {
                        await delay(100);
                        return { rating: 5 };
                    },
                },
            ];

            const summary = await executor.executeReviewers(reviewers);

            expect(summary.totalReviewers).toBe(3);
            expect(summary.successfulReviewers).toBe(3);
            expect(summary.failedReviewers).toBe(0);
            expect(summary.completionRate).toBe(1.0);
            expect(summary.batchCount).toBe(1); // All in one batch
        });

        it('should verify parallel execution timing (within 100ms)', async () => {
            const reviewers = Array.from({ length: 3 }, (_, i) => ({
                personaId: `reviewer${i}`,
                personaName: `Reviewer ${i}`,
                execute: async () => {
                    await delay(50);
                    return { rating: 5 };
                },
            }));

            const summary = await executor.executeReviewers(reviewers);

            // Verify parallel execution
            const isParallel = executor.verifyParallelExecution(summary.results);
            expect(isParallel).toBe(true);

            // Check that start times are within 100ms
            const startTimes = summary.results.map(r => r.startTime);
            const minStart = Math.min(...startTimes);
            const maxStart = Math.max(...startTimes);
            const spread = maxStart - minStart;

            expect(spread).toBeLessThanOrEqual(100);
        });
    });

    describe('Batching for Rate Limits', () => {
        it('should batch reviewers into groups of 5', async () => {
            const reviewers = Array.from({ length: 12 }, (_, i) => ({
                personaId: `reviewer${i}`,
                personaName: `Reviewer ${i}`,
                execute: async () => {
                    await delay(50);
                    return { rating: 5 };
                },
            }));

            const summary = await executor.executeReviewers(reviewers);

            expect(summary.totalReviewers).toBe(12);
            expect(summary.successfulReviewers).toBe(12);
            expect(summary.batchCount).toBe(3); // 5 + 5 + 2
        });

        it('should execute batches sequentially with delay', async () => {
            const executionOrder: number[] = [];

            const reviewers = Array.from({ length: 7 }, (_, i) => ({
                personaId: `reviewer${i}`,
                personaName: `Reviewer ${i}`,
                execute: async () => {
                    executionOrder.push(i);
                    await delay(50);
                    return { rating: 5 };
                },
            }));

            const startTime = Date.now();
            const summary = await executor.executeReviewers(reviewers);
            const endTime = Date.now();

            expect(summary.batchCount).toBe(2); // 5 + 2

            // Should have delay between batches (100ms configured)
            // Total time should be > batch delay
            const totalTime = endTime - startTime;
            expect(totalTime).toBeGreaterThan(100); // At least one batch delay
        });

        it('should handle single reviewer (no batching needed)', async () => {
            const reviewers = [
                {
                    personaId: 'sarah',
                    personaName: 'Sarah',
                    execute: async () => ({ rating: 5 }),
                },
            ];

            const summary = await executor.executeReviewers(reviewers);

            expect(summary.totalReviewers).toBe(1);
            expect(summary.batchCount).toBe(1);
            expect(summary.successfulReviewers).toBe(1);
        });
    });

    describe('Partial Feedback Acceptance', () => {
        it('should accept partial feedback if ≥50% complete', async () => {
            const reviewers = [
                {
                    personaId: 'sarah',
                    personaName: 'Sarah',
                    execute: async () => ({ rating: 5 }),
                },
                {
                    personaId: 'john',
                    personaName: 'John',
                    execute: async () => ({ rating: 4 }),
                },
                {
                    personaId: 'alice',
                    personaName: 'Alice',
                    execute: async () => {
                        throw new Error('Failed');
                    },
                },
            ];

            const summary = await executor.executeReviewers(reviewers);

            expect(summary.totalReviewers).toBe(3);
            expect(summary.successfulReviewers).toBe(2);
            expect(summary.failedReviewers).toBe(1);
            expect(summary.completionRate).toBeCloseTo(0.667, 2);

            // Should meet threshold (66.7% > 50%)
            const thresholdMet = executor.isCompletionThresholdMet(summary);
            expect(thresholdMet).toBe(true);
        });

        it('should reject if <50% complete', async () => {
            const reviewers = [
                {
                    personaId: 'sarah',
                    personaName: 'Sarah',
                    execute: async () => ({ rating: 5 }),
                },
                {
                    personaId: 'john',
                    personaName: 'John',
                    execute: async () => {
                        throw new Error('Failed');
                    },
                },
                {
                    personaId: 'alice',
                    personaName: 'Alice',
                    execute: async () => {
                        throw new Error('Failed');
                    },
                },
            ];

            const summary = await executor.executeReviewers(reviewers);

            expect(summary.totalReviewers).toBe(3);
            expect(summary.successfulReviewers).toBe(1);
            expect(summary.failedReviewers).toBe(2);
            expect(summary.completionRate).toBeCloseTo(0.333, 2);

            // Should NOT meet threshold (33.3% < 50%)
            const thresholdMet = executor.isCompletionThresholdMet(summary);
            expect(thresholdMet).toBe(false);
        });

        it('should handle exact 50% threshold', async () => {
            const reviewers = [
                {
                    personaId: 'sarah',
                    personaName: 'Sarah',
                    execute: async () => ({ rating: 5 }),
                },
                {
                    personaId: 'john',
                    personaName: 'John',
                    execute: async () => {
                        throw new Error('Failed');
                    },
                },
            ];

            const summary = await executor.executeReviewers(reviewers);

            expect(summary.completionRate).toBe(0.5);

            // Should meet threshold (50% = 50%)
            const thresholdMet = executor.isCompletionThresholdMet(summary);
            expect(thresholdMet).toBe(true);
        });
    });

    describe('Timeout Handling', () => {
        it('should timeout slow reviewers', async () => {
            const reviewers = [
                {
                    personaId: 'fast',
                    personaName: 'Fast Reviewer',
                    execute: async () => {
                        await delay(100);
                        return { rating: 5 };
                    },
                },
                {
                    personaId: 'slow',
                    personaName: 'Slow Reviewer',
                    execute: async () => {
                        await delay(10000); // Longer than timeout
                        return { rating: 4 };
                    },
                },
            ];

            const summary = await executor.executeReviewers(reviewers);

            expect(summary.totalReviewers).toBe(2);
            expect(summary.successfulReviewers).toBe(1);
            expect(summary.timedOutReviewers).toBe(1);

            const timedOut = executor.getTimedOutResults(summary);
            expect(timedOut).toHaveLength(1);
            expect(timedOut[0].personaId).toBe('slow');
            expect(timedOut[0].error).toBe('Timeout');
        }, 15000); // Increase timeout for this test

        it('should distinguish timeouts from errors', async () => {
            const reviewers = [
                {
                    personaId: 'timeout',
                    personaName: 'Timeout Reviewer',
                    execute: async () => {
                        await delay(10000);
                        return { rating: 5 };
                    },
                },
                {
                    personaId: 'error',
                    personaName: 'Error Reviewer',
                    execute: async () => {
                        throw new Error('Execution failed');
                    },
                },
            ];

            const summary = await executor.executeReviewers(reviewers);

            expect(summary.timedOutReviewers).toBe(1);
            expect(summary.failedReviewers).toBe(1);

            const timedOut = executor.getTimedOutResults(summary);
            const failed = executor.getFailedResults(summary);

            expect(timedOut[0].personaId).toBe('timeout');
            expect(failed.find(r => r.personaId === 'error')).toBeDefined();
        }, 15000); // Increase timeout for this test
    });

    describe('Result Filtering', () => {
        it('should get successful results only', async () => {
            const reviewers = [
                {
                    personaId: 'success1',
                    personaName: 'Success 1',
                    execute: async () => ({ rating: 5 }),
                },
                {
                    personaId: 'success2',
                    personaName: 'Success 2',
                    execute: async () => ({ rating: 4 }),
                },
                {
                    personaId: 'failed',
                    personaName: 'Failed',
                    execute: async () => {
                        throw new Error('Failed');
                    },
                },
            ];

            const summary = await executor.executeReviewers(reviewers);
            const successful = executor.getSuccessfulResults(summary);

            expect(successful).toHaveLength(2);
            expect(successful.map(r => r.personaId)).toEqual(['success1', 'success2']);
            expect(successful.every(r => r.success)).toBe(true);
        });

        it('should get failed results only', async () => {
            const reviewers = [
                {
                    personaId: 'success',
                    personaName: 'Success',
                    execute: async () => ({ rating: 5 }),
                },
                {
                    personaId: 'failed1',
                    personaName: 'Failed 1',
                    execute: async () => {
                        throw new Error('Error 1');
                    },
                },
                {
                    personaId: 'failed2',
                    personaName: 'Failed 2',
                    execute: async () => {
                        throw new Error('Error 2');
                    },
                },
            ];

            const summary = await executor.executeReviewers(reviewers);
            const failed = executor.getFailedResults(summary);

            expect(failed).toHaveLength(2);
            expect(failed.map(r => r.personaId)).toEqual(['failed1', 'failed2']);
            expect(failed.every(r => !r.success)).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty reviewer array', async () => {
            const summary = await executor.executeReviewers([]);

            expect(summary.totalReviewers).toBe(0);
            expect(summary.successfulReviewers).toBe(0);
            expect(summary.completionRate).toBe(0);
            expect(summary.batchCount).toBe(0);
        });

        it('should handle all reviewers failing', async () => {
            const reviewers = Array.from({ length: 3 }, (_, i) => ({
                personaId: `reviewer${i}`,
                personaName: `Reviewer ${i}`,
                execute: async () => {
                    throw new Error('Failed');
                },
            }));

            const summary = await executor.executeReviewers(reviewers);

            expect(summary.totalReviewers).toBe(3);
            expect(summary.successfulReviewers).toBe(0);
            expect(summary.failedReviewers).toBe(3);
            expect(summary.completionRate).toBe(0);

            const thresholdMet = executor.isCompletionThresholdMet(summary);
            expect(thresholdMet).toBe(false);
        });

        it('should handle all reviewers succeeding', async () => {
            const reviewers = Array.from({ length: 5 }, (_, i) => ({
                personaId: `reviewer${i}`,
                personaName: `Reviewer ${i}`,
                execute: async () => ({ rating: 5 }),
            }));

            const summary = await executor.executeReviewers(reviewers);

            expect(summary.totalReviewers).toBe(5);
            expect(summary.successfulReviewers).toBe(5);
            expect(summary.failedReviewers).toBe(0);
            expect(summary.completionRate).toBe(1.0);

            const thresholdMet = executor.isCompletionThresholdMet(summary);
            expect(thresholdMet).toBe(true);
        });
    });
});

// Helper function
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
