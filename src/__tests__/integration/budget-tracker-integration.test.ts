/**
 * Integration tests for BudgetTracker
 * 
 * Feature: build-agent-architecture-review
 * Validates: Requirements AC-14.1, AC-14.3
 */

import { BudgetTracker } from '../../features/build-mode/services/BudgetTracker';

describe('BudgetTracker Integration Tests', () => {
    let budgetTracker: BudgetTracker;

    beforeEach(() => {
        budgetTracker = new BudgetTracker({
            totalBudget: 10.0, // $10 budget
            warningThreshold: 0.8, // 80%
            limitThreshold: 1.0, // 100%
        });
    });

    describe('Cost Estimation', () => {
        it('should estimate iteration cost', () => {
            const estimate = budgetTracker.estimateIterationCost(3, 'gemini-1.5-pro');

            expect(estimate).toBeDefined();
            expect(estimate.designPhaseTokens).toBeGreaterThan(0);
            expect(estimate.developmentPhaseTokens).toBeGreaterThan(0);
            expect(estimate.reviewPhaseTokens).toBeGreaterThan(0);
            expect(estimate.consolidationPhaseTokens).toBeGreaterThan(0);
            expect(estimate.totalTokens).toBeGreaterThan(0);
            expect(estimate.estimatedCost).toBeGreaterThan(0);
        });

        it('should scale review phase cost with reviewer count', () => {
            const estimate1 = budgetTracker.estimateIterationCost(1, 'gemini-1.5-pro');
            const estimate3 = budgetTracker.estimateIterationCost(3, 'gemini-1.5-pro');

            expect(estimate3.reviewPhaseTokens).toBe(estimate1.reviewPhaseTokens * 3);
            expect(estimate3.totalTokens).toBeGreaterThan(estimate1.totalTokens);
            expect(estimate3.estimatedCost).toBeGreaterThan(estimate1.estimatedCost);
        });

        it('should use different pricing for different models', () => {
            const geminiEstimate = budgetTracker.estimateIterationCost(3, 'gemini-1.5-pro');
            const gpt4Estimate = budgetTracker.estimateIterationCost(3, 'gpt-4');

            // GPT-4 is more expensive than Gemini
            expect(gpt4Estimate.estimatedCost).toBeGreaterThan(geminiEstimate.estimatedCost);
        });
    });

    describe('Cost Recording', () => {
        it('should record iteration cost', () => {
            budgetTracker.recordIterationCost('login', 1, 25000, 'gemini-1.5-pro');

            expect(budgetTracker.getTotalSpent()).toBeGreaterThan(0);
            expect(budgetTracker.getRemainingBudget()).toBeLessThan(10.0);
        });

        it('should accumulate costs across iterations', () => {
            budgetTracker.recordIterationCost('login', 1, 25000, 'gemini-1.5-pro');
            const firstCost = budgetTracker.getTotalSpent();

            budgetTracker.recordIterationCost('login', 2, 25000, 'gemini-1.5-pro');
            const secondCost = budgetTracker.getTotalSpent();

            expect(secondCost).toBeGreaterThan(firstCost);
            expect(secondCost).toBeCloseTo(firstCost * 2, 4);
        });

        it('should track costs per page', () => {
            budgetTracker.recordIterationCost('login', 1, 25000, 'gemini-1.5-pro');
            budgetTracker.recordIterationCost('dashboard', 1, 25000, 'gemini-1.5-pro');

            const breakdown = budgetTracker.getCostBreakdownByPage();

            expect(breakdown['login']).toBeDefined();
            expect(breakdown['dashboard']).toBeDefined();
            expect(breakdown['login'].iterations).toBe(1);
            expect(breakdown['dashboard'].iterations).toBe(1);
        });
    });

    describe('Budget Status', () => {
        it('should return accurate budget status', () => {
            const status = budgetTracker.getBudgetStatus();

            expect(status.totalBudget).toBe(10.0);
            expect(status.spentSoFar).toBe(0);
            expect(status.remainingBudget).toBe(10.0);
            expect(status.percentageUsed).toBe(0);
            expect(status.atWarningThreshold).toBe(false);
            expect(status.atLimitThreshold).toBe(false);
        });

        it('should update status after spending', () => {
            budgetTracker.recordIterationCost('login', 1, 100000, 'gemini-1.5-pro');

            const status = budgetTracker.getBudgetStatus();

            expect(status.spentSoFar).toBeGreaterThan(0);
            expect(status.remainingBudget).toBeLessThan(10.0);
            expect(status.percentageUsed).toBeGreaterThan(0);
        });
    });

    describe('Budget Alerts', () => {
        it('should not alert when under warning threshold', () => {
            // Spend small amount (well under 80%)
            budgetTracker.recordIterationCost('login', 1, 50000, 'gemini-1.5-flash');

            const alert = budgetTracker.checkBudgetAlert();

            expect(alert).toBeNull();
        });

        it('should alert at warning threshold (80%)', () => {
            // GPT-4: $30 input + $60 output per 1M tokens
            // For 1000 tokens: (700*$30 + 300*$60)/1M = $0.039
            // To reach $8 (80% of $10): need ~205,000 tokens
            budgetTracker.recordIterationCost('login', 1, 210000, 'gpt-4');

            const finalAlert = budgetTracker.checkBudgetAlert();
            expect(finalAlert).toBeDefined();
            expect(finalAlert?.type).toBe('warning');
            expect(finalAlert?.shouldPause).toBe(false);
        });

        it('should alert at limit threshold (100%)', () => {
            // To reach $10 (100% of $10): need ~256,000 tokens with GPT-4
            budgetTracker.recordIterationCost('login', 1, 260000, 'gpt-4');

            const alert = budgetTracker.checkBudgetAlert();

            expect(alert).toBeDefined();
            expect(alert?.type).toBe('limit');
            expect(alert?.shouldPause).toBe(true);
        });

        it('should prioritize limit alert over warning', () => {
            // Spend 100% of budget (both thresholds met)
            budgetTracker.recordIterationCost('login', 1, 260000, 'gpt-4');

            const alert = budgetTracker.checkBudgetAlert();

            expect(alert?.type).toBe('limit');
        });
    });

    describe('Iteration Budget Check', () => {
        it('should allow iteration within budget', () => {
            const estimate = budgetTracker.estimateIterationCost(3, 'gemini-1.5-pro');
            const canProceed = budgetTracker.canProceedWithIteration(estimate);

            expect(canProceed).toBe(true);
        });

        it('should prevent iteration exceeding budget', () => {
            // Spend $9.5 of $10 budget with GPT-4 (~244,000 tokens)
            budgetTracker.recordIterationCost('login', 1, 244000, 'gpt-4');

            const estimate = budgetTracker.estimateIterationCost(3, 'gpt-4');
            const canProceed = budgetTracker.canProceedWithIteration(estimate);

            expect(canProceed).toBe(false);
        });
    });

    describe('Cost Breakdown', () => {
        it('should provide cost breakdown by page', () => {
            budgetTracker.recordIterationCost('login', 1, 25000, 'gemini-1.5-pro');
            budgetTracker.recordIterationCost('login', 2, 25000, 'gemini-1.5-pro');
            budgetTracker.recordIterationCost('dashboard', 1, 30000, 'gemini-1.5-pro');

            const breakdown = budgetTracker.getCostBreakdownByPage();

            expect(breakdown['login'].iterations).toBe(2);
            expect(breakdown['login'].tokens).toBe(50000);
            expect(breakdown['dashboard'].iterations).toBe(1);
            expect(breakdown['dashboard'].tokens).toBe(30000);
        });
    });

    describe('Iteration History', () => {
        it('should track iteration history', () => {
            budgetTracker.recordIterationCost('login', 1, 25000, 'gemini-1.5-pro');
            budgetTracker.recordIterationCost('login', 2, 25000, 'gemini-1.5-pro');

            const history = budgetTracker.getIterationHistory();

            expect(history).toHaveLength(2);
            expect(history[0].pageId).toBe('login');
            expect(history[0].iteration).toBe(1);
            expect(history[1].iteration).toBe(2);
        });

        it('should preserve iteration order', () => {
            budgetTracker.recordIterationCost('login', 1, 25000, 'gemini-1.5-pro');
            budgetTracker.recordIterationCost('dashboard', 1, 30000, 'gemini-1.5-pro');
            budgetTracker.recordIterationCost('login', 2, 25000, 'gemini-1.5-pro');

            const history = budgetTracker.getIterationHistory();

            expect(history[0].pageId).toBe('login');
            expect(history[1].pageId).toBe('dashboard');
            expect(history[2].pageId).toBe('login');
        });
    });

    describe('Reset', () => {
        it('should reset budget tracker', () => {
            budgetTracker.recordIterationCost('login', 1, 25000, 'gemini-1.5-pro');
            budgetTracker.reset();

            expect(budgetTracker.getTotalSpent()).toBe(0);
            expect(budgetTracker.getRemainingBudget()).toBe(10.0);
            expect(budgetTracker.getIterationHistory()).toHaveLength(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero reviewers', () => {
            const estimate = budgetTracker.estimateIterationCost(0, 'gemini-1.5-pro');

            expect(estimate.reviewPhaseTokens).toBe(0);
            expect(estimate.totalTokens).toBeGreaterThan(0);
        });

        it('should handle unknown model (use default)', () => {
            const estimate = budgetTracker.estimateIterationCost(3, 'unknown-model');

            expect(estimate.estimatedCost).toBeGreaterThan(0);
        });

        it('should handle spending over budget', () => {
            // Spend $12 (120% of budget) with GPT-4 (~308,000 tokens)
            budgetTracker.recordIterationCost('login', 1, 308000, 'gpt-4');

            const status = budgetTracker.getBudgetStatus();

            expect(status.spentSoFar).toBeGreaterThan(status.totalBudget);
            expect(status.remainingBudget).toBe(0);
            expect(status.percentageUsed).toBeGreaterThanOrEqual(100);
        });
    });

    describe('Custom Configuration', () => {
        it('should accept custom warning threshold', () => {
            const customTracker = new BudgetTracker({
                totalBudget: 10.0,
                warningThreshold: 0.5, // 50%
            });

            // Spend $5 (50% of budget) with GPT-4 (~128,000 tokens)
            customTracker.recordIterationCost('login', 1, 130000, 'gpt-4');

            const alert = customTracker.checkBudgetAlert();

            expect(alert).toBeDefined();
            expect(alert?.type).toBe('warning');
        });

        it('should accept custom limit threshold', () => {
            const customTracker = new BudgetTracker({
                totalBudget: 10.0,
                limitThreshold: 0.9, // 90%
            });

            // Spend $9 (90% of budget) with GPT-4 (~231,000 tokens)
            customTracker.recordIterationCost('login', 1, 231000, 'gpt-4');

            const alert = customTracker.checkBudgetAlert();

            expect(alert).toBeDefined();
            expect(alert?.type).toBe('limit');
        });
    });
});
