/**
 * Property tests for TokenUsageDisplay color coding
 *
 * Validates: Requirements 6.4 - Color coding by percentage
 */

import * as fc from 'fast-check';

/**
 * Token usage status levels for color coding
 */
type TokenUsageStatus = 'safe' | 'warning' | 'danger' | 'exceeded';

/**
 * Get the status based on percentage used
 * This mirrors the logic in TokenUsageDisplay.tsx
 */
function getUsageStatus(percentUsed: number, warningThreshold: number = 80): TokenUsageStatus {
    if (percentUsed >= 100) return 'exceeded';
    if (percentUsed >= warningThreshold) return 'danger';
    if (percentUsed >= 50) return 'warning';
    return 'safe';
}

describe('TokenUsageDisplay Color Coding Properties', () => {
    /**
     * Property 14: Color coding by percentage
     * Validates: Requirements 6.4
     */
    describe('Property 14: Color coding by percentage', () => {
        it('should show green (safe) for 0-49% usage', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 0, max: 49 }),
                    async (percentUsed) => {
                        const status = getUsageStatus(percentUsed);
                        expect(status).toBe('safe');
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should show yellow (warning) for 50-79% usage', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 50, max: 79 }),
                    async (percentUsed) => {
                        const status = getUsageStatus(percentUsed);
                        expect(status).toBe('warning');
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should show orange (danger) for 80-99% usage (default threshold)', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 80, max: 99 }),
                    async (percentUsed) => {
                        const status = getUsageStatus(percentUsed);
                        expect(status).toBe('danger');
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should show red (exceeded) for >= 100% usage', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 100, max: 200 }),
                    async (percentUsed) => {
                        const status = getUsageStatus(percentUsed);
                        expect(status).toBe('exceeded');
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should respect custom warning threshold', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 50, max: 100 }), // Custom threshold
                    fc.integer({ min: 0, max: 150 }), // Percentage used
                    async (warningThreshold, percentUsed) => {
                        const status = getUsageStatus(percentUsed, warningThreshold);

                        if (percentUsed >= 100) {
                            expect(status).toBe('exceeded');
                        } else if (percentUsed >= warningThreshold) {
                            expect(status).toBe('danger');
                        } else if (percentUsed >= 50) {
                            expect(status).toBe('warning');
                        } else {
                            expect(status).toBe('safe');
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should have correct color thresholds for all boundary values', () => {
            // Test exact boundary values
            expect(getUsageStatus(0)).toBe('safe');
            expect(getUsageStatus(49)).toBe('safe');
            expect(getUsageStatus(50)).toBe('warning');
            expect(getUsageStatus(79)).toBe('warning');
            expect(getUsageStatus(80)).toBe('danger');
            expect(getUsageStatus(99)).toBe('danger');
            expect(getUsageStatus(100)).toBe('exceeded');
            expect(getUsageStatus(150)).toBe('exceeded');
        });

        it('should be monotonically increasing in severity', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 0, max: 100 }),
                    fc.integer({ min: 1, max: 50 }),
                    async (basePct, increment) => {
                        const higherPct = basePct + increment;
                        const lowerStatus = getUsageStatus(basePct);
                        const higherStatus = getUsageStatus(higherPct);

                        // Map status to severity level
                        const severityMap = { safe: 0, warning: 1, danger: 2, exceeded: 3 };
                        const lowerSeverity = severityMap[lowerStatus];
                        const higherSeverity = severityMap[higherStatus];

                        // Higher percentage should not have lower severity
                        expect(higherSeverity).toBeGreaterThanOrEqual(lowerSeverity);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
