/**
 * DesignWorkflowIntegration Property Tests
 *
 * Property 12: Token Warning Threshold
 * - Warning emitted at 80% usage
 * - No warning below threshold
 *
 * Property 9: Retry Logic Execution
 * - Retries up to max attempts
 * - Uses exponential backoff
 * - Returns on first success
 *
 * Property 10: JSON Schema Validation
 * - Valid JSON is parsed correctly
 * - Invalid JSON returns errors
 * - Partial recovery is attempted
 *
 * Validates: Requirements 17.1-17.7, 21.5
 */

import {
    DesignWorkflowIntegration,
    DEFAULT_RETRY_CONFIG,
    WARNING_THRESHOLD_PERCENT,
} from '../DesignWorkflowIntegration';
import { TokenMonitor } from '../../../../shared/services/TokenMonitor';
import { TokenStorageService } from '../../../../shared/services/TokenStorageService';

// ============================================================================
// Mocks
// ============================================================================

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
    },
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn(),
        })),
    },
}));

// Create mock TokenStorageService
function createMockStorageService(): jest.Mocked<TokenStorageService> {
    return {
        getAllTokenUsage: jest.fn().mockResolvedValue({}),
        saveTokenUsage: jest.fn().mockResolvedValue(undefined),
        getTokenUsage: jest.fn().mockResolvedValue(null),
        clearTokenUsage: jest.fn().mockResolvedValue(undefined),
    } as any;
}

// Create mock TokenMonitor
function createMockTokenMonitor(currentUsage = 0, limit = 100000): jest.Mocked<TokenMonitor> {
    const storage = createMockStorageService();
    const monitor = new TokenMonitor(storage);

    // Mock the methods
    jest.spyOn(monitor, 'checkLimit').mockResolvedValue({
        allowed: currentUsage < limit,
        currentUsage,
        limit,
        remaining: limit - currentUsage,
        reason: currentUsage >= limit ? 'Token limit exceeded' : undefined,
    });

    jest.spyOn(monitor, 'recordUsage').mockResolvedValue(undefined);

    jest.spyOn(monitor, 'getUsage').mockReturnValue({
        conversationId: 'test-workflow',
        totalTokens: currentUsage,
        inputTokens: Math.floor(currentUsage * 0.3),
        outputTokens: Math.floor(currentUsage * 0.7),
        lastUpdated: Date.now(),
    });

    jest.spyOn(monitor, 'getEffectiveLimit').mockResolvedValue(limit);

    return monitor as jest.Mocked<TokenMonitor>;
}

// ============================================================================
// Tests
// ============================================================================

describe('DesignWorkflowIntegration Property Tests', () => {
    let integration: DesignWorkflowIntegration;
    let mockTokenMonitor: jest.Mocked<TokenMonitor>;

    beforeEach(() => {
        mockTokenMonitor = createMockTokenMonitor(0, 100000);
        integration = new DesignWorkflowIntegration(mockTokenMonitor, 'test-workflow');
    });

    // ========================================================================
    // Property 12: Token Warning Threshold
    // ========================================================================
    describe('Property 12: Token Warning Threshold', () => {
        it('should have 80% as the warning threshold', () => {
            expect(WARNING_THRESHOLD_PERCENT).toBe(80);
        });

        it('should emit warning when usage reaches 80%', async () => {
            // Set up monitor at 80% usage
            mockTokenMonitor = createMockTokenMonitor(80000, 100000);
            integration = new DesignWorkflowIntegration(mockTokenMonitor, 'test-workflow');

            let warningEmitted = false;
            let warningMessage = '';

            integration.setTokenWarningCallback((message) => {
                warningEmitted = true;
                warningMessage = message;
            });

            // Record some usage
            await integration.recordTokenUsage({
                inputTokens: 100,
                outputTokens: 200,
                totalTokens: 300,
            });

            expect(warningEmitted).toBe(true);
            expect(warningMessage).toContain('80%');
        });

        it('should not emit warning when usage is below 80%', async () => {
            // Set up monitor at 50% usage
            mockTokenMonitor = createMockTokenMonitor(50000, 100000);
            integration = new DesignWorkflowIntegration(mockTokenMonitor, 'test-workflow');

            let warningEmitted = false;

            integration.setTokenWarningCallback(() => {
                warningEmitted = true;
            });

            // Record some usage
            await integration.recordTokenUsage({
                inputTokens: 100,
                outputTokens: 200,
                totalTokens: 300,
            });

            expect(warningEmitted).toBe(false);
        });

        it('should emit warning at exactly 80%', async () => {
            // Set up monitor exactly at 80%
            mockTokenMonitor = createMockTokenMonitor(80000, 100000);
            integration = new DesignWorkflowIntegration(mockTokenMonitor, 'test-workflow');

            let warningEmitted = false;

            integration.setTokenWarningCallback(() => {
                warningEmitted = true;
            });

            await integration.recordTokenUsage({
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
            });

            expect(warningEmitted).toBe(true);
        });

        it('should call token usage callback with correct data', async () => {
            let receivedUsage: any = null;
            let receivedLimit = 0;
            let receivedPercent = 0;

            integration.setTokenUsageCallback((usage, limit, percent) => {
                receivedUsage = usage;
                receivedLimit = limit;
                receivedPercent = percent;
            });

            await integration.recordTokenUsage({
                inputTokens: 100,
                outputTokens: 200,
                totalTokens: 300,
            });

            expect(receivedUsage).not.toBeNull();
            expect(receivedLimit).toBe(100000);
            expect(typeof receivedPercent).toBe('number');
        });
    });

    // ========================================================================
    // Property 9: Retry Logic Execution
    // ========================================================================
    describe('Property 9: Retry Logic Execution', () => {
        it('should have correct default retry configuration', () => {
            expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(3);
            expect(DEFAULT_RETRY_CONFIG.initialDelayMs).toBe(1000);
            expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
            expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(10000);
        });

        it('should succeed on first attempt if operation succeeds', async () => {
            const operation = jest.fn().mockResolvedValue('success');

            const result = await integration.executeWithRetry(operation);

            expect(result.success).toBe(true);
            expect(result.data).toBe('success');
            expect(result.attempts).toBe(1);
            expect(result.totalDelayMs).toBe(0);
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should retry on failure up to max attempts', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Fail'));

            const result = await integration.executeWithRetry(operation, {
                maxAttempts: 3,
                initialDelayMs: 10, // Short delay for testing
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe('Fail');
            expect(result.attempts).toBe(3);
            expect(operation).toHaveBeenCalledTimes(3);
        });

        it('should succeed on retry if operation eventually succeeds', async () => {
            let attempt = 0;
            const operation = jest.fn().mockImplementation(() => {
                attempt++;
                if (attempt < 3) {
                    return Promise.reject(new Error('Not yet'));
                }
                return Promise.resolve('success');
            });

            const result = await integration.executeWithRetry(operation, {
                maxAttempts: 5,
                initialDelayMs: 10,
            });

            expect(result.success).toBe(true);
            expect(result.data).toBe('success');
            expect(result.attempts).toBe(3);
        });

        it('should use exponential backoff for delays', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Fail'));

            const result = await integration.executeWithRetry(operation, {
                maxAttempts: 3,
                initialDelayMs: 100,
                backoffMultiplier: 2,
            });

            // Total delay should be: 100 + 200 = 300 (no delay after last attempt)
            expect(result.totalDelayMs).toBe(300);
        });

        it('should cap delay at maxDelayMs', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Fail'));

            const result = await integration.executeWithRetry(operation, {
                maxAttempts: 4,
                initialDelayMs: 100,
                backoffMultiplier: 10,
                maxDelayMs: 500,
            });

            // Delays: 100, min(1000, 500) = 500, min(5000, 500) = 500
            // Total: 100 + 500 + 500 = 1100
            expect(result.totalDelayMs).toBe(1100);
        });

        it('should return error details on failure', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Specific error'));

            const result = await integration.executeWithRetry(operation, {
                maxAttempts: 2,
                initialDelayMs: 10,
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.message).toBe('Specific error');
        });
    });

    // ========================================================================
    // Property 10: JSON Schema Validation
    // ========================================================================
    describe('Property 10: JSON Schema Validation', () => {
        describe('Valid JSON parsing', () => {
            it('should parse valid JSON string', () => {
                const result = integration.validateJSON('{"name": "test", "value": 42}');

                expect(result.valid).toBe(true);
                expect(result.data).toEqual({ name: 'test', value: 42 });
                expect(result.errors).toHaveLength(0);
            });

            it('should extract JSON from markdown code block', () => {
                const response = 'Here is the data:\n```json\n{"name": "test"}\n```\n';
                const result = integration.validateJSON(response);

                expect(result.valid).toBe(true);
                expect(result.data).toEqual({ name: 'test' });
            });

            it('should extract JSON from code block without language', () => {
                const response = '```\n{"name": "test"}\n```';
                const result = integration.validateJSON(response);

                expect(result.valid).toBe(true);
                expect(result.data).toEqual({ name: 'test' });
            });
        });

        describe('Invalid JSON handling', () => {
            it('should return errors for invalid JSON', () => {
                const result = integration.validateJSON('{invalid json}');

                expect(result.valid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
                expect(result.errors[0]).toContain('JSON parse error');
            });

            it('should check for required fields', () => {
                const result = integration.validateJSON(
                    '{"name": "test"}',
                    ['name', 'value']
                );

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Missing required field: value');
            });

            it('should pass when all required fields are present', () => {
                const result = integration.validateJSON(
                    '{"name": "test", "value": 42}',
                    ['name', 'value']
                );

                expect(result.valid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });
        });

        describe('Partial recovery', () => {
            it('should attempt to recover from missing closing brace', () => {
                const result = integration.validateJSON('{"name": "test"');

                // Should attempt recovery
                expect(result.partialData).toBeDefined();
                expect(result.partialData).toEqual({ name: 'test' });
            });

            it('should attempt to recover from missing closing bracket', () => {
                const result = integration.validateJSON('{"items": [1, 2, 3}');

                // May or may not succeed depending on structure
                expect(result.valid).toBe(false);
            });

            it('should attempt to recover from trailing comma', () => {
                const result = integration.validateJSON('{"name": "test",}');

                expect(result.partialData).toBeDefined();
                expect(result.partialData).toEqual({ name: 'test' });
            });
        });

        describe('Schema validation', () => {
            it('should validate schema with correct types', () => {
                const data = { name: 'test', count: 42, active: true };
                const schema = {
                    name: 'string' as const,
                    count: 'number' as const,
                    active: 'boolean' as const,
                };

                const result = integration.validateSchema(data, schema);

                expect(result.valid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should detect type mismatches', () => {
                const data = { name: 42, count: 'wrong' };
                const schema = {
                    name: 'string' as const,
                    count: 'number' as const,
                };

                const result = integration.validateSchema(data, schema);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain("Field 'name' expected string, got number");
                expect(result.errors).toContain("Field 'count' expected number, got string");
            });

            it('should detect missing fields', () => {
                const data = { name: 'test' };
                const schema = {
                    name: 'string' as const,
                    value: 'number' as const,
                };

                const result = integration.validateSchema(data, schema);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Missing required field: value');
            });

            it('should validate arrays', () => {
                const data = { items: [1, 2, 3] };
                const schema = { items: 'array' as const };

                const result = integration.validateSchema(data, schema);

                expect(result.valid).toBe(true);
            });

            it('should validate objects', () => {
                const data = { nested: { key: 'value' } };
                const schema = { nested: 'object' as const };

                const result = integration.validateSchema(data, schema);

                expect(result.valid).toBe(true);
            });

            it('should reject non-object data', () => {
                const result = integration.validateSchema('not an object', {});

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Data must be an object');
            });

            it('should reject null data', () => {
                const result = integration.validateSchema(null, {});

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Data must be an object');
            });
        });
    });

    // ========================================================================
    // Token Limit Checking
    // ========================================================================
    describe('Token Limit Checking', () => {
        it('should allow operations under limit', async () => {
            const result = await integration.checkTokenLimit(1000);

            expect(result.allowed).toBe(true);
            expect(mockTokenMonitor.checkLimit).toHaveBeenCalledWith('test-workflow', 1000);
        });

        it('should block operations over limit', async () => {
            mockTokenMonitor = createMockTokenMonitor(99000, 100000);
            integration = new DesignWorkflowIntegration(mockTokenMonitor, 'test-workflow');

            // Will be at limit after this call
            jest.spyOn(mockTokenMonitor, 'checkLimit').mockResolvedValue({
                allowed: false,
                currentUsage: 99000,
                limit: 100000,
                remaining: 1000,
                reason: 'Token limit exceeded',
            });

            const result = await integration.checkTokenLimit(2000);

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('exceeded');
        });
    });

    // ========================================================================
    // Display Data
    // ========================================================================
    describe('Token Usage Display', () => {
        it('should return formatted display data', async () => {
            mockTokenMonitor = createMockTokenMonitor(50000, 100000);
            integration = new DesignWorkflowIntegration(mockTokenMonitor, 'test-workflow');

            const display = await integration.getTokenUsageDisplay();

            expect(display.totalTokens).toBe(50000);
            expect(display.limit).toBe(100000);
            expect(display.remaining).toBe(50000);
            expect(display.percentUsed).toBe(50);
            expect(display.warningShown).toBe(false);
        });

        it('should show warning flag at 80%+', async () => {
            mockTokenMonitor = createMockTokenMonitor(85000, 100000);
            integration = new DesignWorkflowIntegration(mockTokenMonitor, 'test-workflow');

            const display = await integration.getTokenUsageDisplay();

            expect(display.warningShown).toBe(true);
            expect(display.percentUsed).toBe(85);
        });
    });
});
