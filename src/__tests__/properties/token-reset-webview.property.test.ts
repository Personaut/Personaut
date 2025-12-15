/**
 * Property tests for TokenMonitor reset persistence and webview notifications
 *
 * Feature: llm-token-monitoring
 * Tests Properties 13, 16, 17
 *
 * Validates: Requirements 4.4, 6.2, 6.3
 */

import * as fc from 'fast-check';
import { TokenMonitor } from '../../shared/services/TokenMonitor';
import { TokenStorageService } from '../../shared/services/TokenStorageService';
import { DEFAULT_TOKEN_LIMIT, DEFAULT_WARNING_THRESHOLD } from '../../shared/types/TokenMonitorTypes';
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

describe('TokenMonitor Reset and Webview Properties', () => {
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
     * Create a mock webview
     */
    function createMockWebview() {
        const messages: any[] = [];
        return {
            postMessage: jest.fn((message: any) => {
                messages.push(message);
                return Promise.resolve(true);
            }),
            messages,
        } as any;
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
     * Generator for usage data
     */
    const usageDataArb = fc.record({
        inputTokens: fc.integer({ min: 1, max: 10000 }),
        outputTokens: fc.integer({ min: 1, max: 10000 }),
        totalTokens: fc.integer({ min: 1, max: 20000 }),
    });

    /**
     * Property 13: Reset persistence
     * For any conversation that has been reset, the reset state should be persisted
     * and remain zero after a simulated restart.
     * Validates: Requirements 4.4
     */
    describe('Property 13: Reset persistence', () => {
        it('should persist zero values after reset across simulated restarts', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    usageDataArb,
                    async (conversationId, usageData) => {
                        // Create shared state that persists across "restarts"
                        const sharedState: Map<string, any> = new Map();
                        const sharedStore: Map<string, string> = new Map();

                        const createMockGlobalState = () => ({
                            get: jest.fn(<T>(key: string, defaultValue?: T): T => {
                                const value = sharedState.get(key);
                                return value !== undefined ? value : (defaultValue as T);
                            }),
                            update: jest.fn((key: string, value: any) => {
                                sharedState.set(key, value);
                                return Promise.resolve();
                            }),
                        } as any);

                        const mockSecretStorage = {
                            get: jest.fn((key: string) => Promise.resolve(sharedStore.get(key))),
                            store: jest.fn((key: string, value: string) => {
                                sharedStore.set(key, value);
                                return Promise.resolve();
                            }),
                            delete: jest.fn((key: string) => {
                                sharedStore.delete(key);
                                return Promise.resolve();
                            }),
                        } as any;

                        const mockSettingsService = {
                            getSettings: jest.fn().mockResolvedValue({
                                rateLimit: DEFAULT_TOKEN_LIMIT,
                                rateLimitWarningThreshold: DEFAULT_WARNING_THRESHOLD,
                            }),
                        } as unknown as SettingsService;

                        // First instance: record usage and reset
                        const storageService1 = new TokenStorageService(mockSecretStorage);
                        storageService1.setGlobalState(createMockGlobalState());
                        const monitor1 = new TokenMonitor(storageService1, mockSettingsService);

                        await monitor1.recordUsage(conversationId, usageData);

                        // Verify usage was recorded
                        const usageBeforeReset = monitor1.getUsage(conversationId);
                        expect(usageBeforeReset.totalTokens).toBe(usageData.totalTokens);

                        // Reset usage
                        await monitor1.resetUsage(conversationId);

                        // Verify reset
                        const usageAfterReset = monitor1.getUsage(conversationId);
                        expect(usageAfterReset.totalTokens).toBe(0);

                        // Simulate restart: create new instances
                        const storageService2 = new TokenStorageService(mockSecretStorage);
                        storageService2.setGlobalState(createMockGlobalState());
                        const monitor2 = new TokenMonitor(storageService2, mockSettingsService);

                        // Initialize the new monitor (loads from storage)
                        await monitor2.initialize();

                        // Verify reset state persisted
                        const usageAfterRestart = monitor2.getUsage(conversationId);
                        expect(usageAfterRestart.totalTokens).toBe(0);
                        expect(usageAfterRestart.inputTokens).toBe(0);
                        expect(usageAfterRestart.outputTokens).toBe(0);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    /**
     * Property 16: Webview notification on usage update
     * For any usage recorded, a message should be posted to the webview with
     * the updated usage information.
     * Validates: Requirements 6.2
     */
    describe('Property 16: Webview notification on usage update', () => {
        it('should post message to webview after recording usage', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    usageDataArb,
                    async (conversationId, usageData) => {
                        const { tokenStorageService, mockSettingsService } = createMockDependencies();
                        const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

                        const mockWebview = createMockWebview();
                        monitor.setWebview(mockWebview);

                        // Record usage
                        await monitor.recordUsage(conversationId, usageData);

                        // Verify webview received a message
                        expect(mockWebview.postMessage).toHaveBeenCalled();

                        // Find the token-usage-update message
                        const usageMessages = mockWebview.messages.filter(
                            (m: any) => m.type === 'token-usage-update'
                        );

                        expect(usageMessages.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should post message with correct conversation ID', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    usageDataArb,
                    async (conversationId, usageData) => {
                        const { tokenStorageService, mockSettingsService } = createMockDependencies();
                        const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

                        const mockWebview = createMockWebview();
                        monitor.setWebview(mockWebview);

                        await monitor.recordUsage(conversationId, usageData);

                        const usageMessage = mockWebview.messages.find(
                            (m: any) => m.type === 'token-usage-update'
                        );

                        expect(usageMessage.conversationId).toBe(conversationId);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    /**
     * Property 17: Usage message completeness
     * For any usage update message sent to the webview, it should contain
     * totalTokens, limit, remaining, and percentUsed fields.
     * Validates: Requirements 6.3
     */
    describe('Property 17: Usage message completeness', () => {
        it('should include all required fields in usage message', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    usageDataArb,
                    fc.integer({ min: 1000, max: 1000000 }),
                    async (conversationId, usageData, limit) => {
                        const { tokenStorageService, mockSettingsService } = createMockDependencies({
                            rateLimit: limit,
                        });
                        const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

                        const mockWebview = createMockWebview();
                        monitor.setWebview(mockWebview);

                        await monitor.recordUsage(conversationId, usageData);

                        const usageMessage = mockWebview.messages.find(
                            (m: any) => m.type === 'token-usage-update'
                        );

                        // Verify all required fields are present
                        expect(usageMessage).toHaveProperty('conversationId');
                        expect(usageMessage).toHaveProperty('usage');
                        expect(usageMessage.usage).toHaveProperty('totalTokens');
                        expect(usageMessage.usage).toHaveProperty('inputTokens');
                        expect(usageMessage.usage).toHaveProperty('outputTokens');
                        expect(usageMessage.usage).toHaveProperty('limit');
                        expect(usageMessage.usage).toHaveProperty('remaining');
                        expect(usageMessage.usage).toHaveProperty('percentUsed');
                        expect(usageMessage.usage).toHaveProperty('warningThreshold');

                        // Verify field types
                        expect(typeof usageMessage.usage.totalTokens).toBe('number');
                        expect(typeof usageMessage.usage.limit).toBe('number');
                        expect(typeof usageMessage.usage.remaining).toBe('number');
                        expect(typeof usageMessage.usage.percentUsed).toBe('number');
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should correctly calculate remaining tokens', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    usageDataArb,
                    fc.integer({ min: 50000, max: 1000000 }),
                    async (conversationId, usageData, limit) => {
                        const { tokenStorageService, mockSettingsService } = createMockDependencies({
                            rateLimit: limit,
                        });
                        const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

                        const mockWebview = createMockWebview();
                        monitor.setWebview(mockWebview);

                        await monitor.recordUsage(conversationId, usageData);

                        const usageMessage = mockWebview.messages.find(
                            (m: any) => m.type === 'token-usage-update'
                        );

                        // Verify remaining is correctly calculated
                        const expectedRemaining = Math.max(0, limit - usageData.totalTokens);
                        expect(usageMessage.usage.remaining).toBe(expectedRemaining);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should correctly calculate percent used', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    usageDataArb,
                    fc.integer({ min: 10000, max: 1000000 }),
                    async (conversationId, usageData, limit) => {
                        const { tokenStorageService, mockSettingsService } = createMockDependencies({
                            rateLimit: limit,
                        });
                        const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

                        const mockWebview = createMockWebview();
                        monitor.setWebview(mockWebview);

                        await monitor.recordUsage(conversationId, usageData);

                        const usageMessage = mockWebview.messages.find(
                            (m: any) => m.type === 'token-usage-update'
                        );

                        // Verify percent is correctly calculated (rounded)
                        const expectedPercent = Math.round((usageData.totalTokens / limit) * 100);
                        expect(usageMessage.usage.percentUsed).toBe(expectedPercent);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});
