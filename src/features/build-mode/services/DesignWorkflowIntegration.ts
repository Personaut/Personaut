/**
 * DesignWorkflowIntegration - Service integration layer for Design workflow
 *
 * Integrates the Design workflow with existing services:
 * - TokenMonitor for token tracking and warnings
 * - Error handling with retry logic and exponential backoff
 * - JSON schema validation for agent outputs
 *
 * **Part of Build-to-Design Transformation**
 * Validates: Requirements 17.1-17.7, 21.1-21.5
 */

import { TokenMonitor } from '../../../shared/services/TokenMonitor';
import { UsageData, TokenCheckResult, TokenUsage } from '../../../shared/types/TokenMonitorTypes';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Retry configuration for agent calls
 */
export interface RetryConfig {
    /** Maximum number of retry attempts (default: 3) */
    maxAttempts: number;
    /** Initial delay in milliseconds (default: 1000) */
    initialDelayMs: number;
    /** Backoff multiplier (default: 2) */
    backoffMultiplier: number;
    /** Maximum delay in milliseconds (default: 10000) */
    maxDelayMs: number;
}

/**
 * Result of an operation with retry
 */
export interface RetryResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    attempts: number;
    totalDelayMs: number;
}

/**
 * JSON validation result
 */
export interface JSONValidationResult {
    valid: boolean;
    data?: unknown;
    errors: string[];
    partialData?: unknown;
}

/**
 * Token usage update callback
 */
export type TokenUsageCallback = (usage: TokenUsage, limit: number, percentUsed: number) => void;

/**
 * Token warning callback
 */
export type TokenWarningCallback = (message: string, percentUsed: number) => void;

/**
 * Agent call options
 */
export interface AgentCallOptions {
    /** Workflow ID for token tracking */
    workflowId: string;
    /** Agent name for logging */
    agentName: string;
    /** Retry configuration */
    retryConfig?: Partial<RetryConfig>;
    /** Token usage callback */
    onTokenUsage?: TokenUsageCallback;
    /** Token warning callback */
    onTokenWarning?: TokenWarningCallback;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default retry configuration following existing patterns
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 10000,
};

/**
 * Warning threshold percentage (80%)
 */
export const WARNING_THRESHOLD_PERCENT = 80;

// ============================================================================
// DESIGN WORKFLOW INTEGRATION
// ============================================================================

/**
 * DesignWorkflowIntegration - Integrates Design workflow with existing services
 */
export class DesignWorkflowIntegration {
    private tokenMonitor: TokenMonitor;
    private readonly workflowId: string;
    private onTokenWarning: TokenWarningCallback | null = null;
    private onTokenUsage: TokenUsageCallback | null = null;

    constructor(tokenMonitor: TokenMonitor, workflowId: string) {
        this.tokenMonitor = tokenMonitor;
        this.workflowId = workflowId;
    }

    /**
     * Set callback for token usage updates
     */
    public setTokenUsageCallback(callback: TokenUsageCallback): void {
        this.onTokenUsage = callback;
    }

    /**
     * Set callback for token warnings
     */
    public setTokenWarningCallback(callback: TokenWarningCallback): void {
        this.onTokenWarning = callback;
    }

    // ========================================================================
    // Token Management (Requirements 21.1-21.5)
    // ========================================================================

    /**
     * Check if token limit allows the next operation
     * Integrates with existing TokenMonitor.checkLimit()
     *
     * @param estimatedTokens - Estimated tokens for the operation
     * @returns TokenCheckResult from existing TokenMonitor
     */
    public async checkTokenLimit(estimatedTokens: number): Promise<TokenCheckResult> {
        return await this.tokenMonitor.checkLimit(this.workflowId, estimatedTokens);
    }

    /**
     * Record token usage after an agent call
     * Integrates with existing TokenMonitor.recordUsage()
     *
     * @param usage - Usage data from the agent call
     */
    public async recordTokenUsage(usage: UsageData): Promise<void> {
        await this.tokenMonitor.recordUsage(this.workflowId, usage);

        // Get updated usage for callbacks
        const currentUsage = this.tokenMonitor.getUsage(this.workflowId);
        const limit = await this.tokenMonitor.getEffectiveLimit(this.workflowId);
        const percentUsed = Math.round((currentUsage.totalTokens / limit) * 100);

        // Notify callback
        if (this.onTokenUsage) {
            this.onTokenUsage(currentUsage, limit, percentUsed);
        }

        // Check for warning threshold
        if (percentUsed >= WARNING_THRESHOLD_PERCENT) {
            this.emitWarning(currentUsage, limit, percentUsed);
        }
    }

    /**
     * Get current token usage for the workflow
     * Integrates with existing TokenMonitor.getUsage()
     */
    public getTokenUsage(): TokenUsage {
        return this.tokenMonitor.getUsage(this.workflowId);
    }

    /**
     * Get token usage as display data
     * Returns formatted data suitable for UI display
     */
    public async getTokenUsageDisplay(): Promise<{
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
        limit: number;
        remaining: number;
        percentUsed: number;
        warningShown: boolean;
    }> {
        const usage = this.tokenMonitor.getUsage(this.workflowId);
        const limit = await this.tokenMonitor.getEffectiveLimit(this.workflowId);
        const percentUsed = Math.round((usage.totalTokens / limit) * 100);

        return {
            totalTokens: usage.totalTokens,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            limit,
            remaining: Math.max(0, limit - usage.totalTokens),
            percentUsed,
            warningShown: percentUsed >= WARNING_THRESHOLD_PERCENT,
        };
    }

    /**
     * Emit token warning
     */
    private emitWarning(usage: TokenUsage, limit: number, percentUsed: number): void {
        const remaining = limit - usage.totalTokens;
        const message = `Token usage at ${percentUsed}% (${remaining.toLocaleString()} tokens remaining)`;

        if (this.onTokenWarning) {
            this.onTokenWarning(message, percentUsed);
        }
    }

    // ========================================================================
    // Retry Logic (Requirements 17.1-17.3)
    // ========================================================================

    /**
     * Execute an operation with retry logic and exponential backoff
     *
     * @param operation - Async operation to execute
     * @param config - Retry configuration
     * @returns RetryResult with success status and data/error
     */
    public async executeWithRetry<T>(
        operation: () => Promise<T>,
        config: Partial<RetryConfig> = {}
    ): Promise<RetryResult<T>> {
        const retryConfig: RetryConfig = {
            ...DEFAULT_RETRY_CONFIG,
            ...config,
        };

        let lastError: Error | undefined;
        let totalDelayMs = 0;
        let currentDelayMs = retryConfig.initialDelayMs;

        for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
            try {
                const data = await operation();
                return {
                    success: true,
                    data,
                    attempts: attempt,
                    totalDelayMs,
                };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Log retry attempt
                console.warn(
                    `[DesignWorkflowIntegration] Attempt ${attempt}/${retryConfig.maxAttempts} failed:`,
                    lastError.message
                );

                // Don't delay after the last attempt
                if (attempt < retryConfig.maxAttempts) {
                    await this.delay(currentDelayMs);
                    totalDelayMs += currentDelayMs;

                    // Calculate next delay with exponential backoff
                    currentDelayMs = Math.min(
                        currentDelayMs * retryConfig.backoffMultiplier,
                        retryConfig.maxDelayMs
                    );
                }
            }
        }

        return {
            success: false,
            error: lastError,
            attempts: retryConfig.maxAttempts,
            totalDelayMs,
        };
    }

    /**
     * Delay for specified milliseconds
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========================================================================
    // JSON Schema Validation (Requirements 17.4-17.5)
    // ========================================================================

    /**
     * Validate and parse JSON from agent response
     *
     * @param response - Raw string response from agent
     * @param expectedFields - Optional list of required top-level fields
     * @returns JSONValidationResult with parsed data or errors
     */
    public validateJSON(
        response: string,
        expectedFields: string[] = []
    ): JSONValidationResult {
        const errors: string[] = [];

        // Try to extract JSON from markdown code blocks
        let jsonString = response;
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonString = jsonMatch[1].trim();
        }

        // Attempt to parse JSON
        let data: unknown;
        try {
            data = JSON.parse(jsonString);
        } catch (parseError) {
            errors.push(`JSON parse error: ${(parseError as Error).message}`);

            // Attempt to recover partial data
            const partialData = this.attemptPartialRecovery(jsonString);
            if (partialData) {
                return {
                    valid: false,
                    errors,
                    partialData,
                };
            }

            return { valid: false, errors };
        }

        // Validate expected fields
        if (expectedFields.length > 0 && typeof data === 'object' && data !== null) {
            for (const field of expectedFields) {
                if (!(field in data)) {
                    errors.push(`Missing required field: ${field}`);
                }
            }
        }

        if (errors.length > 0) {
            return {
                valid: false,
                data,
                errors,
            };
        }

        return {
            valid: true,
            data,
            errors: [],
        };
    }

    /**
     * Attempt to recover partial data from malformed JSON
     */
    private attemptPartialRecovery(jsonString: string): unknown | null {
        // Try adding missing closing brackets
        const openBraces = (jsonString.match(/{/g) || []).length;
        const closeBraces = (jsonString.match(/}/g) || []).length;
        const openBrackets = (jsonString.match(/\[/g) || []).length;
        const closeBrackets = (jsonString.match(/]/g) || []).length;

        let fixedJson = jsonString;

        // Add missing closing brackets
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
            fixedJson += ']';
        }

        // Add missing closing braces
        for (let i = 0; i < openBraces - closeBraces; i++) {
            fixedJson += '}';
        }

        try {
            return JSON.parse(fixedJson);
        } catch {
            // Try removing trailing comma
            const noTrailingComma = fixedJson.replace(/,\s*([}\]])/g, '$1');
            try {
                return JSON.parse(noTrailingComma);
            } catch {
                return null;
            }
        }
    }

    /**
     * Validate that data matches expected schema
     *
     * @param data - Data to validate
     * @param schema - Schema definition
     * @returns Validation result
     */
    public validateSchema(
        data: unknown,
        schema: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object'>
    ): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (typeof data !== 'object' || data === null) {
            return { valid: false, errors: ['Data must be an object'] };
        }

        const dataObj = data as Record<string, unknown>;

        for (const [field, expectedType] of Object.entries(schema)) {
            const value = dataObj[field];

            if (value === undefined) {
                errors.push(`Missing required field: ${field}`);
                continue;
            }

            const actualType = Array.isArray(value) ? 'array' : typeof value;

            if (actualType !== expectedType) {
                errors.push(
                    `Field '${field}' expected ${expectedType}, got ${actualType}`
                );
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    // ========================================================================
    // Agent Call Wrapper
    // ========================================================================

    /**
     * Execute an agent call with full integration
     * Combines token checking, retry logic, and usage recording
     *
     * @param agentCall - The agent call to execute
     * @param options - Call options
     * @returns Result of the agent call
     */
    public async executeAgentCall<T>(
        agentCall: () => Promise<{ result: T; usage?: UsageData }>,
        options: Partial<AgentCallOptions> = {}
    ): Promise<RetryResult<T>> {
        const agentName = options.agentName || 'Unknown Agent';

        // Check token limit before call
        const estimatedTokens = 1000; // Conservative estimate
        const limitCheck = await this.checkTokenLimit(estimatedTokens);

        if (!limitCheck.allowed) {
            return {
                success: false,
                error: new Error(limitCheck.reason || 'Token limit exceeded'),
                attempts: 0,
                totalDelayMs: 0,
            };
        }

        // Execute with retry
        const result = await this.executeWithRetry(async () => {
            const response = await agentCall();

            // Record usage if available
            if (response.usage) {
                await this.recordTokenUsage(response.usage);
            }

            return response.result;
        }, options.retryConfig);

        // Log result
        if (result.success) {
            console.log(
                `[DesignWorkflowIntegration] ${agentName} completed in ${result.attempts} attempt(s)`
            );
        } else {
            console.error(
                `[DesignWorkflowIntegration] ${agentName} failed after ${result.attempts} attempts:`,
                result.error?.message
            );
        }

        // Apply callbacks from options
        if (options.onTokenUsage) {
            const usage = this.getTokenUsage();
            const limit = await this.tokenMonitor.getEffectiveLimit(this.workflowId);
            const percentUsed = Math.round((usage.totalTokens / limit) * 100);
            options.onTokenUsage(usage, limit, percentUsed);
        }

        return result;
    }
}
