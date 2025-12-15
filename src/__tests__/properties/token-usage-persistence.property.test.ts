/**
 * Property tests for token usage persistence
 *
 * Feature: llm-token-monitoring
 * Property 3: Persistence round-trip preserves usage
 * Property 20: Conversation limit persistence
 *
 * Validates: Requirements 1.3, 7.5
 */

import * as fc from 'fast-check';
import { TokenStorageService } from '../../shared/services/TokenStorageService';
import { TokenUsage } from '../../shared/types/TokenMonitorTypes';

// Mock vscode module
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn(),
            update: jest.fn(),
        })),
    },
}));

describe('Token Usage Persistence Properties', () => {
    /**
     * Create a mock SecretStorage
     */
    function createMockSecretStorage() {
        const store: Map<string, string> = new Map();
        return {
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
    }

    /**
     * Create a mock GlobalState (Memento)
     */
    function createMockGlobalState() {
        const state: Map<string, any> = new Map();
        return {
            get: jest.fn(<T>(key: string, defaultValue?: T): T => {
                const value = state.get(key);
                return value !== undefined ? value : (defaultValue as T);
            }),
            update: jest.fn((key: string, value: any) => {
                state.set(key, value);
                return Promise.resolve();
            }),
        } as any;
    }

    /**
     * Generator for conversation IDs
     * Filters out JavaScript reserved property names that could cause false positives
     */
    const reservedPropertyNames = new Set([
        'constructor', '__proto__', 'prototype', 'hasOwnProperty',
        'toString', 'valueOf', 'toLocaleString', 'isPrototypeOf',
        'propertyIsEnumerable',
    ]);
    const conversationIdArb = fc.string({ minLength: 1, maxLength: 50 })
        .filter(s => s.trim().length > 0 && !reservedPropertyNames.has(s));

    /**
     * Generator for token usage data
     */
    const tokenUsageArb = fc.record({
        totalTokens: fc.integer({ min: 0, max: 1000000 }),
        inputTokens: fc.integer({ min: 0, max: 500000 }),
        outputTokens: fc.integer({ min: 0, max: 500000 }),
        lastUpdated: fc.integer({ min: 1000000000000, max: Date.now() + 1000000000 }),
        limit: fc.option(fc.integer({ min: 1, max: 10000000 }), { nil: undefined }),
    });

    /**
     * Property 3: Persistence round-trip preserves usage
     * For any token usage data recorded for a conversation, retrieving it from storage
     * after a simulated restart should return equivalent values.
     * Validates: Requirements 1.3
     */
    describe('Property 3: Persistence round-trip preserves usage', () => {
        it('should preserve token usage data through persistence round-trip', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    tokenUsageArb,
                    async (conversationId, usageData) => {
                        // Create a fresh mock global state (simulating state that will persist)
                        const mockGlobalState = createMockGlobalState();
                        const mockSecretStorage = createMockSecretStorage();

                        // Create TokenStorageService and set global state
                        const storageService = new TokenStorageService(mockSecretStorage);
                        storageService.setGlobalState(mockGlobalState);

                        // Create full TokenUsage object
                        const originalUsage: TokenUsage = {
                            conversationId,
                            totalTokens: usageData.totalTokens,
                            inputTokens: usageData.inputTokens,
                            outputTokens: usageData.outputTokens,
                            lastUpdated: usageData.lastUpdated,
                            limit: usageData.limit,
                        };

                        // Save the usage
                        await storageService.saveTokenUsage(conversationId, originalUsage);

                        // Simulate restart - create a new service instance with same underlying state
                        const newStorageService = new TokenStorageService(mockSecretStorage);
                        newStorageService.setGlobalState(mockGlobalState);

                        // Retrieve the usage
                        const retrievedUsage = await newStorageService.getTokenUsage(conversationId);

                        // Verify the data is preserved
                        expect(retrievedUsage).not.toBeNull();
                        expect(retrievedUsage!.conversationId).toBe(conversationId);
                        expect(retrievedUsage!.totalTokens).toBe(originalUsage.totalTokens);
                        expect(retrievedUsage!.inputTokens).toBe(originalUsage.inputTokens);
                        expect(retrievedUsage!.outputTokens).toBe(originalUsage.outputTokens);
                        expect(retrievedUsage!.lastUpdated).toBe(originalUsage.lastUpdated);
                        expect(retrievedUsage!.limit).toBe(originalUsage.limit);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return null for non-existent conversation usage', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    async (conversationId) => {
                        const mockGlobalState = createMockGlobalState();
                        const mockSecretStorage = createMockSecretStorage();

                        const storageService = new TokenStorageService(mockSecretStorage);
                        storageService.setGlobalState(mockGlobalState);

                        const usage = await storageService.getTokenUsage(conversationId);

                        expect(usage).toBeNull();
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should clear usage data correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    tokenUsageArb,
                    async (conversationId, usageData) => {
                        const mockGlobalState = createMockGlobalState();
                        const mockSecretStorage = createMockSecretStorage();

                        const storageService = new TokenStorageService(mockSecretStorage);
                        storageService.setGlobalState(mockGlobalState);

                        // Save usage
                        await storageService.saveTokenUsage(conversationId, {
                            conversationId,
                            ...usageData,
                        } as TokenUsage);

                        // Clear usage
                        await storageService.clearTokenUsage(conversationId);

                        // Verify it's cleared
                        const retrieved = await storageService.getTokenUsage(conversationId);
                        expect(retrieved).toBeNull();
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    /**
     * Property 20: Conversation limit persistence
     * For any conversation-specific limit, setting it and then retrieving it
     * after simulating a restart should return the same limit value.
     * Validates: Requirements 7.5
     */
    describe('Property 20: Conversation limit persistence', () => {
        it('should preserve conversation-specific limits through persistence', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    fc.integer({ min: 1, max: 10000000 }),
                    tokenUsageArb,
                    async (conversationId, limit, usageData) => {
                        const mockGlobalState = createMockGlobalState();
                        const mockSecretStorage = createMockSecretStorage();

                        const storageService = new TokenStorageService(mockSecretStorage);
                        storageService.setGlobalState(mockGlobalState);

                        // Create usage with specific limit
                        const usage: TokenUsage = {
                            conversationId,
                            totalTokens: usageData.totalTokens,
                            inputTokens: usageData.inputTokens,
                            outputTokens: usageData.outputTokens,
                            lastUpdated: usageData.lastUpdated,
                            limit: limit,
                        };

                        // Save the usage
                        await storageService.saveTokenUsage(conversationId, usage);

                        // Simulate restart
                        const newStorageService = new TokenStorageService(mockSecretStorage);
                        newStorageService.setGlobalState(mockGlobalState);

                        // Retrieve and verify limit
                        const retrieved = await newStorageService.getTokenUsage(conversationId);

                        expect(retrieved).not.toBeNull();
                        expect(retrieved!.limit).toBe(limit);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should preserve undefined limit (using global) through persistence', async () => {
            await fc.assert(
                fc.asyncProperty(
                    conversationIdArb,
                    tokenUsageArb.filter(u => u.limit === undefined),
                    async (conversationId, usageData) => {
                        const mockGlobalState = createMockGlobalState();
                        const mockSecretStorage = createMockSecretStorage();

                        const storageService = new TokenStorageService(mockSecretStorage);
                        storageService.setGlobalState(mockGlobalState);

                        // Create usage without specific limit
                        const usage: TokenUsage = {
                            conversationId,
                            totalTokens: usageData.totalTokens,
                            inputTokens: usageData.inputTokens,
                            outputTokens: usageData.outputTokens,
                            lastUpdated: usageData.lastUpdated,
                            limit: undefined,
                        };

                        // Save the usage
                        await storageService.saveTokenUsage(conversationId, usage);

                        // Simulate restart
                        const newStorageService = new TokenStorageService(mockSecretStorage);
                        newStorageService.setGlobalState(mockGlobalState);

                        // Retrieve and verify limit is undefined
                        const retrieved = await newStorageService.getTokenUsage(conversationId);

                        expect(retrieved).not.toBeNull();
                        expect(retrieved!.limit).toBeUndefined();
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    /**
     * Additional property: getAllTokenUsage returns all stored data
     */
    describe('getAllTokenUsage completeness', () => {
        it('should return all stored token usage data', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.tuple(conversationIdArb, tokenUsageArb),
                        { minLength: 1, maxLength: 5 }
                    ).map(entries => {
                        // Ensure unique conversation IDs
                        const unique = new Map<string, any>();
                        let counter = 0;
                        for (const [id, data] of entries) {
                            const uniqueId = unique.has(id) ? `${id}_${counter++}` : id;
                            unique.set(uniqueId, data);
                        }
                        return Array.from(unique.entries());
                    }),
                    async (entries) => {
                        const mockGlobalState = createMockGlobalState();
                        const mockSecretStorage = createMockSecretStorage();

                        const storageService = new TokenStorageService(mockSecretStorage);
                        storageService.setGlobalState(mockGlobalState);

                        // Save all entries
                        for (const [conversationId, usageData] of entries) {
                            await storageService.saveTokenUsage(conversationId, {
                                conversationId,
                                totalTokens: usageData.totalTokens,
                                inputTokens: usageData.inputTokens,
                                outputTokens: usageData.outputTokens,
                                lastUpdated: usageData.lastUpdated,
                                limit: usageData.limit,
                            } as TokenUsage);
                        }

                        // Get all usage
                        const allUsage = await storageService.getAllTokenUsage();

                        // Verify all entries are present
                        expect(Object.keys(allUsage).length).toBe(entries.length);

                        for (const [conversationId, usageData] of entries) {
                            expect(allUsage[conversationId]).toBeDefined();
                            expect(allUsage[conversationId].totalTokens).toBe(usageData.totalTokens);
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});
