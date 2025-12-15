/**
 * Property tests for TokenMonitor warning system
 *
 * Feature: llm-token-monitoring
 * Tests Properties 6, 7, 8
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */

import * as fc from 'fast-check';
import { TokenMonitor } from '../../shared/services/TokenMonitor';
import { TokenStorageService } from '../../shared/services/TokenStorageService';
import { TokenUsage, DEFAULT_TOKEN_LIMIT, DEFAULT_WARNING_THRESHOLD } from '../../shared/types/TokenMonitorTypes';
import { SettingsService } from '../../features/settings/services/SettingsService';

// Mock vscode module
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn((key: string) => {
                const defaults: Record<string, any> = {
                    rateLimit: DEFAULT_TOKEN_LIMIT,
                    rateLimitWarningThreshold: DEFAULT_WARNING_THRESHOLD,
                };
                return defaults[key];
            }),
            update: jest.fn(),
        })),
    },
    window: {
        showWarningMessage: jest.fn(),
    },
}));

describe('TokenMonitor Warning Properties', () => {
    /**
     * Create mock dependencies
     */
    function createMockDependencies(options: {
        rateLimit?: number;
        warningThreshold?: number;
    } = {}) {
        const state: Map<string, any> = new Map();
        const store: Map<string, string> = new Map();

        const mockSecretStorage = {
            get: jest.fn((key: string) => Promise.resolve(store.get(key))),
            store: jest.fn((key: string, value: string) => {
                store.set(key, value);
                return Promise.resolve();
            }),
            delete: jest.fn((key: string) => {
                store.delete(key);
                return Promise.resolve();
            }),
        } as any;

        const mockGlobalState = {
            get: jest.fn(<T>(key: string, defaultValue?: T): T => {
                const value = state.get(key);
                return value !== undefined ? value : (defaultValue as T);
            }),
            update: jest.fn((key: string, value: any) => {
                state.set(key, value);
                return Promise.resolve();
            }),
        } as any;

        const tokenStorageService = new TokenStorageService(mockSecretStorage);
        tokenStorageService.setGlobalState(mockGlobalState);

        const mockSettingsService = {
            getSettings: jest.fn().mockResolvedValue({
                rateLimit: options.rateLimit ?? DEFAULT_TOKEN_LIMIT,
                rateLimitWarningThreshold: options.warningThreshold ?? DEFAULT_WARNING_THRESHOLD,
            }),
        } as unknown as SettingsService;

        return { tokenStorageService, mockSettingsService, mockGlobalState };
    }

    /**
     * Generator for conversation IDs (excluding reserved names)
     */
    const reservedPropertyNames = new Set([
        'constructor', '__proto__', 'prototype', 'hasOwnProperty',
        'toString', 'valueOf', 'toLocaleString', 'isPrototypeOf',
        'propertyIsEnumerable',
    ]);
    const conversationIdArb = fc.string({ minLength: 1, maxLength: 50 })
        .filter(s => s.trim().length > 0 && !reservedPropertyNames.has(s));

    /**
     * Property 6: Warning triggers at threshold
     * For any usage that crosses the warning threshold (e.g., 80% of rate limit),
     * a warning notification should be triggered once.
     * Validates: Requirements 2.1
     */
    describe('Property 6: Warning triggers at threshold', () => {
        it('should trigger warning when usage crosses threshold', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    fc.integer({ min: 1000, max: 100000 }),
                    async (conversationId, limit) => {
                        const { tokenStorageService, mockSettingsService } = createMockDependencies({
                            rateLimit: limit,
                        });
                        const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

                        // Track warnings
                        const warnings: { conversationId: string; usage: TokenUsage; limit: number }[] = [];
                        monitor.setWarningEmitter((cid, usage, lim) => {
                            warnings.push({ conversationId: cid, usage, limit: lim });
                        });

                        // Calculate threshold crossing point
                        const threshold = Math.floor(limit * (DEFAULT_WARNING_THRESHOLD / 100));

                        // Start just below threshold
                        const usageBelowThreshold = threshold - 100;
                        if (usageBelowThreshold > 0) {
                            await monitor.recordUsage(conversationId, {
                                inputTokens: Math.floor(usageBelowThreshold / 2),
                                outputTokens: Math.floor(usageBelowThreshold / 2),
                                totalTokens: usageBelowThreshold,
                            });
                        }

                        // Clear any warnings from the initial recording
                        warnings.length = 0;

                        // Now cross the threshold
                        const usageToAdd = 200; // Enough to cross threshold
                        await monitor.recordUsage(conversationId, {
                            inputTokens: Math.floor(usageToAdd / 2),
                            outputTokens: Math.floor(usageToAdd / 2),
                            totalTokens: usageToAdd,
                        });

                        // Verify warning was triggered
                        expect(warnings.length).toBe(1);
                        expect(warnings[0].conversationId).toBe(conversationId);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should not trigger warning when usage is below threshold', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    fc.integer({ min: 10000, max: 100000 }),
                    async (conversationId, limit) => {
                        const { tokenStorageService, mockSettingsService } = createMockDependencies({
                            rateLimit: limit,
                        });
                        const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

                        // Track warnings
                        const warnings: any[] = [];
                        monitor.setWarningEmitter((cid, usage, lim) => {
                            warnings.push({ conversationId: cid, usage, limit: lim });
                        });

                        // Use only 50% of limit (well below 80% threshold)
                        const usageAmount = Math.floor(limit * 0.5);
                        await monitor.recordUsage(conversationId, {
                            inputTokens: Math.floor(usageAmount / 2),
                            outputTokens: Math.floor(usageAmount / 2),
                            totalTokens: usageAmount,
                        });

                        // No warning should be triggered
                        expect(warnings.length).toBe(0);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    /**
     * Property 7: Warning messages contain usage data
     * For any warning triggered, the warning message should contain
     * current usage, limit, and remaining tokens.
     * Validates: Requirements 2.2
     */
    describe('Property 7: Warning messages contain usage data', () => {
        it('should include complete usage data in warning', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    fc.integer({ min: 1000, max: 100000 }),
                    async (conversationId, limit) => {
                        const { tokenStorageService, mockSettingsService } = createMockDependencies({
                            rateLimit: limit,
                        });
                        const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

                        // Track warnings
                        let lastWarning: { conversationId: string; usage: TokenUsage; limit: number } | null = null;
                        monitor.setWarningEmitter((cid, usage, lim) => {
                            lastWarning = { conversationId: cid, usage, limit: lim };
                        });

                        // Directly exceed threshold
                        const usageAmount = Math.floor(limit * 0.85); // 85% usage
                        await monitor.recordUsage(conversationId, {
                            inputTokens: Math.floor(usageAmount / 2),
                            outputTokens: Math.floor(usageAmount / 2),
                            totalTokens: usageAmount,
                        });

                        // Verify warning contains all required data
                        expect(lastWarning).not.toBeNull();
                        expect(lastWarning!.conversationId).toBe(conversationId);
                        expect(lastWarning!.usage).toHaveProperty('totalTokens');
                        expect(lastWarning!.usage).toHaveProperty('inputTokens');
                        expect(lastWarning!.usage).toHaveProperty('outputTokens');
                        expect(lastWarning!.limit).toBe(limit);
                        expect(lastWarning!.usage.totalTokens).toBe(usageAmount);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    /**
     * Property 8: Warning idempotence
     * For any usage that has already triggered a warning, additional usage records
     * (that don't drop below and re-cross threshold) should NOT trigger duplicate warnings.
     * Validates: Requirements 2.3
     */
    describe('Property 8: Warning idempotence', () => {
        it('should not trigger duplicate warnings for same threshold crossing', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    fc.integer({ min: 5000, max: 100000 }),
                    fc.integer({ min: 1, max: 10 }),
                    async (conversationId, limit, additionalRecords) => {
                        const { tokenStorageService, mockSettingsService } = createMockDependencies({
                            rateLimit: limit,
                        });
                        const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

                        // Track warnings
                        const warnings: any[] = [];
                        monitor.setWarningEmitter((cid, usage, lim) => {
                            warnings.push({ conversationId: cid, usage, limit: lim });
                        });

                        // Exceed threshold immediately
                        const initialUsage = Math.floor(limit * 0.85);
                        await monitor.recordUsage(conversationId, {
                            inputTokens: Math.floor(initialUsage / 2),
                            outputTokens: Math.floor(initialUsage / 2),
                            totalTokens: initialUsage,
                        });

                        const warningsAfterFirst = warnings.length;

                        // Record additional usage (staying above threshold)
                        for (let i = 0; i < additionalRecords; i++) {
                            await monitor.recordUsage(conversationId, {
                                inputTokens: 10,
                                outputTokens: 10,
                                totalTokens: 20,
                            });
                        }

                        // Should only have triggered one warning
                        expect(warnings.length).toBe(warningsAfterFirst);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should re-trigger warning after reset and re-crossing threshold', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    fc.integer({ min: 5000, max: 100000 }),
                    async (conversationId, limit) => {
                        const { tokenStorageService, mockSettingsService } = createMockDependencies({
                            rateLimit: limit,
                        });
                        const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

                        // Track warnings
                        const warnings: any[] = [];
                        monitor.setWarningEmitter((cid, usage, lim) => {
                            warnings.push({ conversationId: cid, usage, limit: lim });
                        });

                        // Exceed threshold
                        const usageAmount = Math.floor(limit * 0.85);
                        await monitor.recordUsage(conversationId, {
                            inputTokens: Math.floor(usageAmount / 2),
                            outputTokens: Math.floor(usageAmount / 2),
                            totalTokens: usageAmount,
                        });

                        expect(warnings.length).toBe(1);

                        // Reset usage
                        await monitor.resetUsage(conversationId);

                        // Exceed threshold again
                        await monitor.recordUsage(conversationId, {
                            inputTokens: Math.floor(usageAmount / 2),
                            outputTokens: Math.floor(usageAmount / 2),
                            totalTokens: usageAmount,
                        });

                        // Should have triggered a second warning
                        expect(warnings.length).toBe(2);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});
