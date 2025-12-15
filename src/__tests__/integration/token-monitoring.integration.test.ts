/**
 * Integration tests for LLM Token Monitoring
 *
 * Feature: llm-token-monitoring
 * Tests the complete token monitoring flow end-to-end
 *
 * Validates: Requirements 1-7 (all requirements)
 */

import { TokenMonitor } from '../../shared/services/TokenMonitor';
import { TokenStorageService } from '../../shared/services/TokenStorageService';
// Types not directly used but imported for reference
import { SettingsService } from '../../features/settings/services/SettingsService';

// Mock vscode module
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn((key: string) => {
                const defaults: Record<string, any> = {
                    rateLimit: 10000,
                    rateLimitWarningThreshold: 80,
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

describe('Token Monitoring Integration Tests', () => {
    // Shared state for persistence tests
    let sharedState: Map<string, any>;
    let sharedStore: Map<string, string>;

    beforeEach(() => {
        sharedState = new Map();
        sharedStore = new Map();
        jest.clearAllMocks();
    });

    /**
     * Create mock dependencies with optional configuration
     */
    function createMockDependencies(options: {
        rateLimit?: number;
        warningThreshold?: number;
        useSharedState?: boolean;
    } = {}) {
        const state = options.useSharedState ? sharedState : new Map<string, any>();
        const store = options.useSharedState ? sharedStore : new Map<string, string>();

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
                rateLimit: options.rateLimit ?? 10000,
                rateLimitWarningThreshold: options.warningThreshold ?? 80,
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

    describe('Complete Flow: Create agent, send messages, approach limit, verify warnings, exceed limit, verify blocking', () => {
        it('should track usage through complete conversation lifecycle', async () => {
            const limit = 1000;
            const { tokenStorageService, mockSettingsService } = createMockDependencies({
                rateLimit: limit,
            });
            const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);
            const mockWebview = createMockWebview();
            monitor.setWebview(mockWebview);

            // Track warnings
            const warnings: any[] = [];
            monitor.setWarningEmitter((cid, usage, lim) => {
                warnings.push({ conversationId: cid, usage, limit: lim });
            });

            const conversationId = 'test-conversation-1';

            // Step 1: Initial usage (well below threshold)
            await monitor.recordUsage(conversationId, {
                inputTokens: 100,
                outputTokens: 100,
                totalTokens: 200,
            });

            let usage = monitor.getUsage(conversationId);
            expect(usage.totalTokens).toBe(200);
            expect(warnings.length).toBe(0);

            // Step 2: Add more usage, still below threshold (80% = 800 tokens)
            await monitor.recordUsage(conversationId, {
                inputTokens: 200,
                outputTokens: 200,
                totalTokens: 400,
            });

            usage = monitor.getUsage(conversationId);
            expect(usage.totalTokens).toBe(600);
            expect(warnings.length).toBe(0);

            // Step 3: Cross the warning threshold
            await monitor.recordUsage(conversationId, {
                inputTokens: 150,
                outputTokens: 150,
                totalTokens: 300,
            });

            usage = monitor.getUsage(conversationId);
            expect(usage.totalTokens).toBe(900); // 90% of limit
            expect(warnings.length).toBe(1);
            expect(warnings[0].conversationId).toBe(conversationId);

            // Step 4: Check if we can still make a small request
            const smallCheck = await monitor.checkLimit(conversationId, 50);
            expect(smallCheck.allowed).toBe(true);

            // Step 5: Check if a large request would be blocked
            const largeCheck = await monitor.checkLimit(conversationId, 200);
            expect(largeCheck.allowed).toBe(false);
            expect(largeCheck.reason).toContain('Token limit exceeded');

            // Step 6: Verify webview received updates
            const usageMessages = mockWebview.messages.filter(
                (m: any) => m.type === 'token-usage-update'
            );
            expect(usageMessages.length).toBe(3); // One for each recordUsage call
        });

        it('should block new requests when limit is exceeded', async () => {
            const limit = 500;
            const { tokenStorageService, mockSettingsService } = createMockDependencies({
                rateLimit: limit,
            });
            const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

            const conversationId = 'test-conversation-blocked';

            // Use up all tokens
            await monitor.recordUsage(conversationId, {
                inputTokens: 250,
                outputTokens: 250,
                totalTokens: 500,
            });

            // Any additional request should be blocked
            const checkResult = await monitor.checkLimit(conversationId, 1);
            expect(checkResult.allowed).toBe(false);
            expect(checkResult.currentUsage).toBe(500);
            expect(checkResult.limit).toBe(500);
            expect(checkResult.remaining).toBe(0);
        });
    });

    describe('Multi-conversation scenarios with separate usage tracking', () => {
        it('should track usage separately for multiple conversations', async () => {
            const { tokenStorageService, mockSettingsService } = createMockDependencies({
                rateLimit: 1000,
            });
            const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

            const conversationA = 'conversation-a';
            const conversationB = 'conversation-b';
            const conversationC = 'conversation-c';

            // Record different amounts for each conversation
            await monitor.recordUsage(conversationA, {
                inputTokens: 100,
                outputTokens: 100,
                totalTokens: 200,
            });

            await monitor.recordUsage(conversationB, {
                inputTokens: 200,
                outputTokens: 200,
                totalTokens: 400,
            });

            await monitor.recordUsage(conversationC, {
                inputTokens: 300,
                outputTokens: 300,
                totalTokens: 600,
            });

            // Verify each conversation has its own count
            expect(monitor.getUsage(conversationA).totalTokens).toBe(200);
            expect(monitor.getUsage(conversationB).totalTokens).toBe(400);
            expect(monitor.getUsage(conversationC).totalTokens).toBe(600);

            // Add more to conversation A
            await monitor.recordUsage(conversationA, {
                inputTokens: 50,
                outputTokens: 50,
                totalTokens: 100,
            });

            // Verify only A changed
            expect(monitor.getUsage(conversationA).totalTokens).toBe(300);
            expect(monitor.getUsage(conversationB).totalTokens).toBe(400);
            expect(monitor.getUsage(conversationC).totalTokens).toBe(600);

            // Reset conversation B
            await monitor.resetUsage(conversationB);

            // Verify only B was reset
            expect(monitor.getUsage(conversationA).totalTokens).toBe(300);
            expect(monitor.getUsage(conversationB).totalTokens).toBe(0);
            expect(monitor.getUsage(conversationC).totalTokens).toBe(600);
        });

        it('should support different limits for different conversations', async () => {
            const { tokenStorageService, mockSettingsService } = createMockDependencies({
                rateLimit: 1000, // Global limit
            });
            const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

            const conversationGlobal = 'conversation-global';
            const conversationCustom = 'conversation-custom';

            // Set custom limit for one conversation
            await monitor.setConversationLimit(conversationCustom, 500);

            // Verify effective limits
            const globalLimit = await monitor.getEffectiveLimit(conversationGlobal);
            const customLimit = await monitor.getEffectiveLimit(conversationCustom);

            expect(globalLimit).toBe(1000);
            expect(customLimit).toBe(500);

            // Use 400 tokens in each
            await monitor.recordUsage(conversationGlobal, {
                inputTokens: 200,
                outputTokens: 200,
                totalTokens: 400,
            });

            await monitor.recordUsage(conversationCustom, {
                inputTokens: 200,
                outputTokens: 200,
                totalTokens: 400,
            });

            // Global conversation can still use 200 more
            const globalCheck = await monitor.checkLimit(conversationGlobal, 200);
            expect(globalCheck.allowed).toBe(true);

            // Custom conversation can only use 100 more
            const customCheckSmall = await monitor.checkLimit(conversationCustom, 100);
            expect(customCheckSmall.allowed).toBe(true);

            const customCheckLarge = await monitor.checkLimit(conversationCustom, 150);
            expect(customCheckLarge.allowed).toBe(false);
        });
    });

    describe('Persistence across simulated restarts', () => {
        it('should persist and restore usage data across restarts', async () => {
            // First session
            const deps1 = createMockDependencies({
                rateLimit: 1000,
                useSharedState: true,
            });
            const monitor1 = new TokenMonitor(deps1.tokenStorageService, deps1.mockSettingsService);

            const conversationId = 'persistent-conversation';

            // Record usage
            await monitor1.recordUsage(conversationId, {
                inputTokens: 250,
                outputTokens: 250,
                totalTokens: 500,
            });

            // Verify in first session
            expect(monitor1.getUsage(conversationId).totalTokens).toBe(500);

            // Simulate restart - create new monitor with same underlying state
            const deps2 = createMockDependencies({
                rateLimit: 1000,
                useSharedState: true,
            });
            const monitor2 = new TokenMonitor(deps2.tokenStorageService, deps2.mockSettingsService);
            await monitor2.initialize();

            // Verify usage was restored
            expect(monitor2.getUsage(conversationId).totalTokens).toBe(500);

            // Add more usage
            await monitor2.recordUsage(conversationId, {
                inputTokens: 100,
                outputTokens: 100,
                totalTokens: 200,
            });

            expect(monitor2.getUsage(conversationId).totalTokens).toBe(700);
        });

        it('should persist conversation-specific limits across restarts', async () => {
            const conversationId = 'conversation-with-limit';

            // First session
            const deps1 = createMockDependencies({
                rateLimit: 1000,
                useSharedState: true,
            });
            const monitor1 = new TokenMonitor(deps1.tokenStorageService, deps1.mockSettingsService);

            // Set custom limit
            await monitor1.setConversationLimit(conversationId, 500);
            expect(await monitor1.getEffectiveLimit(conversationId)).toBe(500);

            // Simulate restart
            const deps2 = createMockDependencies({
                rateLimit: 1000,
                useSharedState: true,
            });
            const monitor2 = new TokenMonitor(deps2.tokenStorageService, deps2.mockSettingsService);
            await monitor2.initialize();

            // Verify limit was restored
            expect(await monitor2.getEffectiveLimit(conversationId)).toBe(500);
        });
    });

    describe('Settings changes affecting limits', () => {
        it('should use updated global limit from settings', async () => {
            const conversationId = 'test-settings-change';

            // Start with limit of 1000
            const { tokenStorageService, mockSettingsService } = createMockDependencies({
                rateLimit: 1000,
            });
            const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

            // Check initial limit
            expect(await monitor.getEffectiveLimit(conversationId)).toBe(1000);

            // Simulate settings change - update the mock
            mockSettingsService.getSettings = jest.fn().mockResolvedValue({
                rateLimit: 2000,
                rateLimitWarningThreshold: 80,
            });

            // New effective limit should reflect the change
            expect(await monitor.getEffectiveLimit(conversationId)).toBe(2000);
        });

        it('should prioritize conversation-specific limit over changed global limit', async () => {
            const conversationId = 'test-limit-priority';

            const { tokenStorageService, mockSettingsService } = createMockDependencies({
                rateLimit: 1000,
            });
            const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

            // Set conversation-specific limit
            await monitor.setConversationLimit(conversationId, 500);

            // Simulate global settings change
            mockSettingsService.getSettings = jest.fn().mockResolvedValue({
                rateLimit: 2000,
                rateLimitWarningThreshold: 80,
            });

            // Conversation-specific limit should still take precedence
            expect(await monitor.getEffectiveLimit(conversationId)).toBe(500);

            // New conversation should use new global limit
            const newConversationId = 'new-conversation';
            expect(await monitor.getEffectiveLimit(newConversationId)).toBe(2000);
        });
    });

    describe('Token estimation', () => {
        it('should estimate tokens proportionally to text length', async () => {
            const { tokenStorageService, mockSettingsService } = createMockDependencies();
            const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

            // Test various text lengths
            expect(monitor.estimateTokens('')).toBe(1); // Minimum
            expect(monitor.estimateTokens('test')).toBe(1); // 4 chars = 1 token
            expect(monitor.estimateTokens('testing')).toBe(2); // 7 chars = 2 tokens
            expect(monitor.estimateTokens('a'.repeat(100))).toBe(25); // 100 chars = 25 tokens
            expect(monitor.estimateTokens('a'.repeat(1000))).toBe(250); // 1000 chars = 250 tokens
        });
    });

    describe('Warning behavior', () => {
        it('should only warn once per threshold crossing', async () => {
            const limit = 1000;
            const { tokenStorageService, mockSettingsService } = createMockDependencies({
                rateLimit: limit,
            });
            const monitor = new TokenMonitor(tokenStorageService, mockSettingsService);

            const warnings: any[] = [];
            monitor.setWarningEmitter((cid, usage, lim) => {
                warnings.push({ conversationId: cid, usage, limit: lim });
            });

            const conversationId = 'warning-test';

            // Cross threshold
            await monitor.recordUsage(conversationId, {
                inputTokens: 450,
                outputTokens: 450,
                totalTokens: 900, // 90% of limit
            });

            expect(warnings.length).toBe(1);

            // Add more usage (still above threshold)
            await monitor.recordUsage(conversationId, {
                inputTokens: 25,
                outputTokens: 25,
                totalTokens: 50,
            });

            // Should still only have one warning
            expect(warnings.length).toBe(1);

            // Reset
            await monitor.resetUsage(conversationId);

            // Cross threshold again
            await monitor.recordUsage(conversationId, {
                inputTokens: 450,
                outputTokens: 450,
                totalTokens: 900,
            });

            // Should now have two warnings
            expect(warnings.length).toBe(2);
        });
    });
});
