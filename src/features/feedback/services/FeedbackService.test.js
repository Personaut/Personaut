"use strict";
/**
 * Unit tests for FeedbackService
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 4.1, 4.2, 4.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
const FeedbackService_1 = require("./FeedbackService");
/**
 * Mock storage implementation for testing
 */
class MockStorage {
    constructor() {
        this.data = new Map();
    }
    get(key, defaultValue) {
        return this.data.has(key) ? this.data.get(key) : defaultValue;
    }
    async update(key, value) {
        this.data.set(key, value);
    }
    clear() {
        this.data.clear();
    }
}
describe('FeedbackService', () => {
    let service;
    let storage;
    beforeEach(() => {
        storage = new MockStorage();
        service = new FeedbackService_1.FeedbackService(storage);
    });
    describe('generateFeedback', () => {
        it('should generate feedback with valid parameters', async () => {
            const params = {
                personaNames: ['Alice', 'Bob'],
                context: 'Testing the login page',
                url: 'https://example.com/login',
                feedbackType: 'group',
            };
            const result = await service.generateFeedback(params);
            expect(result.success).toBe(true);
            expect(result.entry).toBeDefined();
            expect(result.entry.personaNames).toEqual(['Alice', 'Bob']);
            expect(result.entry.context).toBe('Testing the login page');
            expect(result.entry.url).toBe('https://example.com/login');
            expect(result.entry.feedbackType).toBe('group');
            expect(result.entry.id).toBeDefined();
            expect(result.entry.timestamp).toBeDefined();
        });
        it('should reject empty persona names', async () => {
            const params = {
                personaNames: [],
                context: 'Testing',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            const result = await service.generateFeedback(params);
            expect(result.success).toBe(false);
            expect(result.error).toContain('persona');
        });
        it('should reject empty context', async () => {
            const params = {
                personaNames: ['Alice'],
                context: '',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            const result = await service.generateFeedback(params);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Context');
        });
        it('should reject empty URL', async () => {
            const params = {
                personaNames: ['Alice'],
                context: 'Testing',
                url: '',
                feedbackType: 'individual',
            };
            const result = await service.generateFeedback(params);
            expect(result.success).toBe(false);
            expect(result.error).toContain('URL');
        });
        it('should create title from context', async () => {
            const params = {
                personaNames: ['Alice'],
                context: 'This is a very long context that should be truncated to 50 characters',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            const result = await service.generateFeedback(params);
            expect(result.success).toBe(true);
            expect(result.entry.title).toHaveLength(53); // 50 chars + '...'
            expect(result.entry.title).toContain('...');
        });
        it('should include screenshot if provided', async () => {
            const params = {
                personaNames: ['Alice'],
                context: 'Testing',
                url: 'https://example.com',
                screenshot: 'base64-encoded-image-data',
                feedbackType: 'individual',
            };
            const result = await service.generateFeedback(params);
            expect(result.success).toBe(true);
            expect(result.entry.screenshot).toBe('base64-encoded-image-data');
        });
    });
    describe('getFeedbackHistory', () => {
        it('should return empty array when no feedback exists', () => {
            const history = service.getFeedbackHistory();
            expect(history).toEqual([]);
        });
        it('should return feedback entries sorted by timestamp descending', async () => {
            const params1 = {
                personaNames: ['Alice'],
                context: 'First feedback',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            const params2 = {
                personaNames: ['Bob'],
                context: 'Second feedback',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            await service.generateFeedback(params1);
            // Small delay to ensure different timestamps
            await new Promise((resolve) => setTimeout(resolve, 10));
            await service.generateFeedback(params2);
            const history = service.getFeedbackHistory();
            expect(history).toHaveLength(2);
            expect(history[0].context).toBe('Second feedback');
            expect(history[1].context).toBe('First feedback');
        });
    });
    describe('getFeedbackEntry', () => {
        it('should return null for non-existent ID', () => {
            const entry = service.getFeedbackEntry('non-existent-id');
            expect(entry).toBeNull();
        });
        it('should return feedback entry by ID', async () => {
            const params = {
                personaNames: ['Alice'],
                context: 'Testing',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            const result = await service.generateFeedback(params);
            const entry = service.getFeedbackEntry(result.entry.id);
            expect(entry).not.toBeNull();
            expect(entry?.id).toBe(result.entry.id);
            expect(entry?.context).toBe('Testing');
        });
    });
    describe('deleteFeedback', () => {
        it('should return false for non-existent ID', async () => {
            const deleted = await service.deleteFeedback('non-existent-id');
            expect(deleted).toBe(false);
        });
        it('should delete feedback entry and return true', async () => {
            const params = {
                personaNames: ['Alice'],
                context: 'Testing',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            const result = await service.generateFeedback(params);
            const deleted = await service.deleteFeedback(result.entry.id);
            expect(deleted).toBe(true);
            expect(service.getFeedbackEntry(result.entry.id)).toBeNull();
        });
        it('should not affect other entries when deleting', async () => {
            const params1 = {
                personaNames: ['Alice'],
                context: 'First',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            const params2 = {
                personaNames: ['Bob'],
                context: 'Second',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            const result1 = await service.generateFeedback(params1);
            const result2 = await service.generateFeedback(params2);
            await service.deleteFeedback(result1.entry.id);
            expect(service.getFeedbackEntry(result1.entry.id)).toBeNull();
            expect(service.getFeedbackEntry(result2.entry.id)).not.toBeNull();
        });
    });
    describe('clearFeedbackHistory', () => {
        it('should clear all feedback entries', async () => {
            const params = {
                personaNames: ['Alice'],
                context: 'Testing',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            await service.generateFeedback(params);
            await service.generateFeedback(params);
            expect(service.getFeedbackHistory()).toHaveLength(2);
            await service.clearFeedbackHistory();
            expect(service.getFeedbackHistory()).toHaveLength(0);
        });
    });
    describe('providerSupportsImages', () => {
        it('should return true for gemini provider', () => {
            expect(service.providerSupportsImages('gemini')).toBe(true);
        });
        it('should return true for bedrock provider', () => {
            expect(service.providerSupportsImages('bedrock')).toBe(true);
        });
        it('should return true for nativeIde provider', () => {
            expect(service.providerSupportsImages('nativeIde')).toBe(true);
        });
        it('should return false for unknown provider', () => {
            expect(service.providerSupportsImages('unknown')).toBe(false);
        });
        it('should be case-insensitive', () => {
            expect(service.providerSupportsImages('GEMINI')).toBe(true);
            expect(service.providerSupportsImages('Bedrock')).toBe(true);
        });
    });
    describe('getProviderImageConfig', () => {
        it('should return config for gemini', () => {
            const config = service.getProviderImageConfig('gemini');
            expect(config).not.toBeNull();
            expect(config?.provider).toBe('gemini');
            expect(config?.supportsImages).toBe(true);
            expect(config?.maxImageSize).toBe(20 * 1024 * 1024);
        });
        it('should return null for unknown provider', () => {
            const config = service.getProviderImageConfig('unknown');
            expect(config).toBeNull();
        });
    });
    describe('validateImageForProvider', () => {
        it('should validate image for supported provider', () => {
            const imageData = 'base64-encoded-data';
            const result = service.validateImageForProvider('gemini', imageData, 'image/png');
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });
        it('should reject unknown provider', () => {
            const imageData = 'base64-encoded-data';
            const result = service.validateImageForProvider('unknown', imageData, 'image/png');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Unknown provider');
        });
        it('should reject unsupported image format', () => {
            const imageData = 'base64-encoded-data';
            const result = service.validateImageForProvider('gemini', imageData, 'image/bmp');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Unsupported image format');
        });
        it('should reject image that is too large', () => {
            // Create a large base64 string (> 20MB when decoded)
            const largeImageData = 'a'.repeat(30 * 1024 * 1024);
            const result = service.validateImageForProvider('gemini', largeImageData, 'image/png');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('too large');
        });
    });
    describe('handleScreenshotResult', () => {
        it('should handle successful screenshot', () => {
            const result = {
                success: true,
                data: 'base64-screenshot-data',
            };
            const handled = service.handleScreenshotResult(result);
            expect(handled.success).toBe(true);
            expect(handled.screenshot).toBe('base64-screenshot-data');
            expect(handled.userMessage).toContain('success');
        });
        it('should handle timeout error', () => {
            const result = {
                success: false,
                error: 'Screenshot capture timeout',
            };
            const handled = service.handleScreenshotResult(result);
            expect(handled.success).toBe(false);
            expect(handled.screenshot).toBeUndefined();
            expect(handled.userMessage).toContain('timed out');
        });
        it('should handle navigation error', () => {
            const result = {
                success: false,
                error: 'Navigation failed',
            };
            const handled = service.handleScreenshotResult(result);
            expect(handled.success).toBe(false);
            expect(handled.userMessage).toContain('navigate');
        });
        it('should handle blocked/denied error', () => {
            const result = {
                success: false,
                error: 'Access blocked by security policy',
            };
            const handled = service.handleScreenshotResult(result);
            expect(handled.success).toBe(false);
            expect(handled.userMessage).toContain('blocked');
        });
        it('should handle network error', () => {
            const result = {
                success: false,
                error: 'Network connection failed',
            };
            const handled = service.handleScreenshotResult(result);
            expect(handled.success).toBe(false);
            expect(handled.userMessage).toContain('Network');
        });
        it('should handle unknown error', () => {
            const result = {
                success: false,
                error: 'Some unknown error',
            };
            const handled = service.handleScreenshotResult(result);
            expect(handled.success).toBe(false);
            expect(handled.userMessage).toContain('Some unknown error');
        });
    });
    describe('verifyFeedbackMetadata', () => {
        it('should verify complete feedback entry', async () => {
            const params = {
                personaNames: ['Alice'],
                context: 'Testing',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            const result = await service.generateFeedback(params);
            // Add content to make it complete
            result.entry.content = 'Feedback content';
            const verification = service.verifyFeedbackMetadata(result.entry);
            expect(verification.valid).toBe(true);
            expect(verification.missingFields).toHaveLength(0);
        });
        it('should detect missing required fields', () => {
            const incompleteEntry = {
                id: 'test-id',
                title: 'Test',
                timestamp: Date.now(),
                feedbackType: 'individual',
                personaNames: ['Alice'],
                context: 'Testing',
                url: 'https://example.com',
                content: '', // Empty content
            };
            // Remove required field
            delete incompleteEntry.content;
            const verification = service.verifyFeedbackMetadata(incompleteEntry);
            expect(verification.valid).toBe(false);
            expect(verification.missingFields).toContain('content');
        });
        it('should detect empty personaNames array', () => {
            const entry = {
                id: 'test-id',
                title: 'Test',
                timestamp: Date.now(),
                feedbackType: 'individual',
                personaNames: [], // Empty array
                context: 'Testing',
                url: 'https://example.com',
                content: 'Content',
            };
            const verification = service.verifyFeedbackMetadata(entry);
            expect(verification.valid).toBe(false);
            expect(verification.missingFields.some((f) => f.includes('personaNames'))).toBe(true);
        });
    });
    describe('getFeedbackByPersona', () => {
        it('should return empty array when no feedback for persona', () => {
            const entries = service.getFeedbackByPersona('Alice');
            expect(entries).toEqual([]);
        });
        it('should return feedback entries for specific persona', async () => {
            const params1 = {
                personaNames: ['Alice'],
                context: 'Alice feedback',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            const params2 = {
                personaNames: ['Bob'],
                context: 'Bob feedback',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            const params3 = {
                personaNames: ['Alice', 'Bob'],
                context: 'Group feedback',
                url: 'https://example.com',
                feedbackType: 'group',
            };
            await service.generateFeedback(params1);
            await service.generateFeedback(params2);
            await service.generateFeedback(params3);
            const aliceEntries = service.getFeedbackByPersona('Alice');
            expect(aliceEntries).toHaveLength(2);
            expect(aliceEntries.every((e) => e.personaNames.includes('Alice'))).toBe(true);
        });
    });
    describe('getFeedbackByType', () => {
        it('should return empty array when no feedback of type', () => {
            const entries = service.getFeedbackByType('individual');
            expect(entries).toEqual([]);
        });
        it('should return feedback entries of specific type', async () => {
            const params1 = {
                personaNames: ['Alice'],
                context: 'Individual feedback',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            const params2 = {
                personaNames: ['Alice', 'Bob'],
                context: 'Group feedback',
                url: 'https://example.com',
                feedbackType: 'group',
            };
            await service.generateFeedback(params1);
            await service.generateFeedback(params2);
            const individualEntries = service.getFeedbackByType('individual');
            const groupEntries = service.getFeedbackByType('group');
            expect(individualEntries).toHaveLength(1);
            expect(individualEntries[0].feedbackType).toBe('individual');
            expect(groupEntries).toHaveLength(1);
            expect(groupEntries[0].feedbackType).toBe('group');
        });
    });
    describe('getSupportedProviders', () => {
        it('should return list of supported providers', () => {
            const providers = service.getSupportedProviders();
            expect(providers).toContain('gemini');
            expect(providers).toContain('bedrock');
            expect(providers).toContain('nativeIde');
            expect(providers.length).toBeGreaterThan(0);
        });
    });
    describe('storage integration', () => {
        it('should persist feedback across service instances', async () => {
            const params = {
                personaNames: ['Alice'],
                context: 'Testing',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            const result = await service.generateFeedback(params);
            // Create new service instance with same storage
            const newService = new FeedbackService_1.FeedbackService(storage);
            const entry = newService.getFeedbackEntry(result.entry.id);
            expect(entry).not.toBeNull();
            expect(entry?.id).toBe(result.entry.id);
        });
        it('should enforce max history size', async () => {
            const params = {
                personaNames: ['Alice'],
                context: 'Testing',
                url: 'https://example.com',
                feedbackType: 'individual',
            };
            // Generate more than max history size (100)
            for (let i = 0; i < 110; i++) {
                await service.generateFeedback({
                    ...params,
                    context: `Testing ${i}`,
                });
            }
            const history = service.getFeedbackHistory();
            expect(history.length).toBeLessThanOrEqual(100);
        });
    });
});
//# sourceMappingURL=FeedbackService.test.js.map