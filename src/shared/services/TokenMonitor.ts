import * as vscode from 'vscode';
import { TokenStorageService } from './TokenStorageService';
import { SettingsService } from '../../features/settings/services/SettingsService';
import {
    TokenUsage,
    TokenCheckResult,
    UsageData,
    DEFAULT_TOKEN_LIMIT,
    DEFAULT_WARNING_THRESHOLD,
} from '../types/TokenMonitorTypes';

/**
 * Token Monitor Service
 * 
 * Tracks and enforces token usage limits across LLM provider interactions.
 * Maintains separate usage counts for each conversation and supports both
 * global and per-conversation limits.
 * 
 * Feature: llm-token-monitoring
 * Validates: Requirements 1.1-1.5, 2.1-2.4, 3.1, 3.3, 4.1-4.4, 5.1-5.5, 7.1-7.5
 */
export class TokenMonitor {
    private usageMap: Map<string, TokenUsage> = new Map();
    private warningShown: Map<string, boolean> = new Map();
    private updateQueue: Promise<void> = Promise.resolve();
    private webview: vscode.Webview | null = null;
    private warningEmitter: (
        (conversationId: string, usage: TokenUsage, limit: number) => void
    ) | null = null;
    private initPromise: Promise<void> | null = null;
    private initialized = false;

    // SettingsService is optional to break circular dependency during initialization
    private settingsService: SettingsService | null = null;

    constructor(
        private readonly storageService: TokenStorageService,
        settingsService?: SettingsService | null
    ) {
        this.settingsService = settingsService || null;
    }

    /**
     * Set the settings service after construction (lazy injection).
     * This allows breaking circular dependencies during initialization.
     * 
     * @param settingsService - The SettingsService instance to inject
     */
    setSettingsService(settingsService: SettingsService): void {
        this.settingsService = settingsService;
        console.log('[TokenMonitor] SettingsService injected (lazy dependency)');
    }

    /**
     * Initialize the token monitor by loading existing usage from storage.
     * Safe to call multiple times - will only initialize once.
     */
    async initialize(): Promise<void> {
        // Return existing promise if already initializing
        if (this.initPromise) {
            return this.initPromise;
        }

        // Already initialized
        if (this.initialized) {
            return;
        }

        this.initPromise = this._doInitialize();
        return this.initPromise;
    }

    private async _doInitialize(): Promise<void> {
        try {
            const storedUsage = await this.storageService.getAllTokenUsage();
            for (const [conversationId, usage] of Object.entries(storedUsage)) {
                this.usageMap.set(conversationId, {
                    conversationId,
                    totalTokens: usage.totalTokens,
                    inputTokens: usage.inputTokens,
                    outputTokens: usage.outputTokens,
                    lastUpdated: usage.lastUpdated,
                    limit: usage.limit,
                });
                // Initialize warning state based on current usage
                const limit = await this.getEffectiveLimit(conversationId);
                const warningThreshold = await this.getWarningThreshold();
                const isAboveThreshold = usage.totalTokens >= limit * (warningThreshold / 100);
                this.warningShown.set(conversationId, isAboveThreshold);
            }
            this.initialized = true;
            console.log('[TokenMonitor] Initialized with', this.usageMap.size, 'conversations');
        } catch (error) {
            console.error('[TokenMonitor] Failed to initialize:', error);
            this.initialized = true; // Mark as initialized even on error to prevent retries
        }
    }

    /**
     * Ensure initialization is complete before accessing data.
     * This is useful when you need to guarantee data is loaded.
     */
    async ensureInitialized(): Promise<void> {
        if (this.initialized) {
            return;
        }
        await this.initialize();
    }

    /**
     * Set the webview for posting token usage updates.
     */
    setWebview(webview: vscode.Webview): void {
        this.webview = webview;
    }

    /**
     * Set a custom warning emitter for testing purposes.
     */
    setWarningEmitter(
        emitter: (conversationId: string, usage: TokenUsage, limit: number) => void
    ): void {
        this.warningEmitter = emitter;
    }

    /**
     * Check if a call with estimated tokens would exceed the limit.
     * Uses per-conversation usage for custom limits, global usage for global limits.
     * 
     * @param conversationId - The conversation identifier
     * @param estimatedTokens - Estimated tokens for the next call
     * @returns TokenCheckResult indicating if the call is allowed
     */
    async checkLimit(conversationId: string, estimatedTokens: number): Promise<TokenCheckResult> {
        const currentUsage = this.getUsage(conversationId);
        const globalUsage = this.getGlobalUsage();
        const limit = await this.getEffectiveLimit(conversationId);

        // Check if this conversation has a custom limit set
        const hasCustomLimit = this.usageMap.get(conversationId)?.limit !== undefined;

        // Use per-conversation usage for custom limits, global usage for global limits
        const usageToCheck = hasCustomLimit ? currentUsage.totalTokens : globalUsage.totalTokens;
        const projectedUsage = usageToCheck + estimatedTokens;
        const remaining = limit - usageToCheck;

        console.log('[TokenMonitor] checkLimit:', {
            conversationId,
            conversationUsage: currentUsage.totalTokens,
            globalUsage: globalUsage.totalTokens,
            usageToCheck,
            estimatedTokens,
            projectedUsage,
            limit,
            hasCustomLimit,
            allowed: projectedUsage <= limit,
        });

        if (projectedUsage > limit) {
            console.log('[TokenMonitor] BLOCKING - Token limit exceeded');
            return {
                allowed: false,
                reason: `Token limit exceeded. Current usage: ${usageToCheck}, Estimated: ${estimatedTokens}, Limit: ${limit}. Please reset token usage or increase your limit in settings.`,
                currentUsage: usageToCheck,
                limit,
                remaining: Math.max(0, remaining),
            };
        }

        return {
            allowed: true,
            currentUsage: usageToCheck,
            limit,
            remaining,
        };
    }

    /**
     * Record actual usage after a provider call.
     * Uses a queue to ensure atomic updates and prevent race conditions.
     * 
     * @param conversationId - The conversation identifier
     * @param usage - The usage data from the provider response
     */
    async recordUsage(conversationId: string, usage: UsageData): Promise<void> {
        this.updateQueue = this.updateQueue.then(async () => {
            try {
                // Validate and sanitize usage data
                const sanitizedUsage = this.sanitizeUsageData(usage);

                // Get or create current usage
                const current = this.usageMap.get(conversationId) ||
                    this.createEmptyUsage(conversationId);

                // Accumulate usage
                current.totalTokens += sanitizedUsage.totalTokens;
                current.inputTokens += sanitizedUsage.inputTokens;
                current.outputTokens += sanitizedUsage.outputTokens;
                current.lastUpdated = Date.now();

                // Update in-memory map
                this.usageMap.set(conversationId, current);

                // Persist to storage
                try {
                    await this.storageService.saveTokenUsage(conversationId, current);
                } catch (error) {
                    console.error('[TokenMonitor] Failed to persist usage:', error);
                    // Continue with in-memory data even if persistence fails
                }

                // Check for warnings
                const limit = await this.getEffectiveLimit(conversationId);
                if (this.shouldShowWarning(conversationId, current.totalTokens, limit)) {
                    this.emitWarning(conversationId, current, limit);
                }

                // Post update to webview
                await this.postUsageUpdate(conversationId, current, limit);
            } catch (error) {
                console.error('[TokenMonitor] Failed to record usage:', error);
            }
        });

        return this.updateQueue;
    }

    /**
     * Get current usage for a conversation.
     * 
     * @param conversationId - The conversation identifier
     * @returns TokenUsage data (returns empty usage if not found)
     */
    getUsage(conversationId: string): TokenUsage {
        return this.usageMap.get(conversationId) || this.createEmptyUsage(conversationId);
    }

    /**
     * Reset usage for a conversation.
     * 
     * @param conversationId - The conversation identifier
     */
    async resetUsage(conversationId: string): Promise<void> {
        const emptyUsage = this.createEmptyUsage(conversationId);

        // Preserve any conversation-specific limit
        const existingUsage = this.usageMap.get(conversationId);
        if (existingUsage?.limit) {
            emptyUsage.limit = existingUsage.limit;
        }

        this.usageMap.set(conversationId, emptyUsage);
        this.warningShown.set(conversationId, false);

        try {
            await this.storageService.saveTokenUsage(conversationId, emptyUsage);
        } catch (error) {
            console.error('[TokenMonitor] Failed to persist reset:', error);
        }

        // Post update to webview
        const limit = await this.getEffectiveLimit(conversationId);
        await this.postUsageUpdate(conversationId, emptyUsage, limit);
    }

    /**
     * Set a conversation-specific limit.
     * 
     * @param conversationId - The conversation identifier
     * @param limit - The limit to set
     */
    async setConversationLimit(conversationId: string, limit: number): Promise<void> {
        const current = this.usageMap.get(conversationId) || this.createEmptyUsage(conversationId);
        current.limit = limit;

        this.usageMap.set(conversationId, current);

        try {
            await this.storageService.saveTokenUsage(conversationId, current);
        } catch (error) {
            console.error('[TokenMonitor] Failed to persist conversation limit:', error);
        }

        // Recalculate warning state
        const warningThreshold = await this.getWarningThreshold();
        const isAboveThreshold = current.totalTokens >= limit * (warningThreshold / 100);
        this.warningShown.set(conversationId, isAboveThreshold);

        // Post update to webview
        await this.postUsageUpdate(conversationId, current, limit);
    }

    /**
     * Get the effective limit for a conversation.
     * Returns conversation-specific limit if set, otherwise global limit.
     * Falls back to DEFAULT_TOKEN_LIMIT if SettingsService is unavailable.
     * 
     * @param conversationId - The conversation identifier
     * @returns The effective token limit
     */
    async getEffectiveLimit(conversationId: string): Promise<number> {
        const usage = this.usageMap.get(conversationId);
        if (usage?.limit !== undefined) {
            return usage.limit;
        }

        // Try to get from settings, fall back to default if SettingsService unavailable
        if (this.settingsService) {
            try {
                const settings = await this.settingsService.getSettings();
                return settings.rateLimit ?? DEFAULT_TOKEN_LIMIT;
            } catch {
                // Fall through to default
            }
        }

        return DEFAULT_TOKEN_LIMIT;
    }

    /**
     * Get the warning threshold percentage from settings.
     * Falls back to DEFAULT_WARNING_THRESHOLD if SettingsService is unavailable.
     */
    private async getWarningThreshold(): Promise<number> {
        if (this.settingsService) {
            try {
                const settings = await this.settingsService.getSettings();
                return settings.rateLimitWarningThreshold ?? DEFAULT_WARNING_THRESHOLD;
            } catch {
                // Fall through to default
            }
        }

        return DEFAULT_WARNING_THRESHOLD;
    }

    /**
     * Check if a warning should be shown based on current usage.
     */
    private shouldShowWarning(conversationId: string, usage: number, limit: number): boolean {
        const threshold = limit * (DEFAULT_WARNING_THRESHOLD / 100);
        const isAboveThreshold = usage >= threshold;
        const alreadyShown = this.warningShown.get(conversationId) || false;

        if (isAboveThreshold && !alreadyShown) {
            this.warningShown.set(conversationId, true);
            return true;
        }

        if (!isAboveThreshold && alreadyShown) {
            this.warningShown.set(conversationId, false);
        }

        return false;
    }

    /**
     * Emit a warning notification.
     */
    private emitWarning(conversationId: string, usage: TokenUsage, limit: number): void {
        const remaining = limit - usage.totalTokens;
        const percentUsed = Math.round((usage.totalTokens / limit) * 100);

        // If a custom emitter is set (for testing), use it
        if (this.warningEmitter) {
            this.warningEmitter(conversationId, usage, limit);
            return;
        }

        // Show VS Code warning notification
        vscode.window.showWarningMessage(
            `Token usage warning: You have used ${percentUsed}% of your token limit. ` +
            `${remaining.toLocaleString()} tokens remaining. ` +
            `Consider resetting usage or increasing your limit.`
        );

        // Post warning to webview
        if (this.webview) {
            this.webview.postMessage({
                type: 'token-warning',
                conversationId,
                currentUsage: usage.totalTokens,
                limit,
                remaining,
                percentUsed,
            });
        }
    }

    /**
     * Post token usage update to webview.
     * Public to allow optimistic updates from Agent.
     */
    async postUsageUpdate(
        conversationId: string,
        usage: TokenUsage,
        limit: number
    ): Promise<void> {
        if (!this.webview) {
            return;
        }

        const warningThreshold = await this.getWarningThreshold();
        const remaining = limit - usage.totalTokens;
        const percentUsed = Math.round((usage.totalTokens / limit) * 100);

        console.log('[TokenMonitor] Posting usage update to webview:', {
            conversationId,
            totalTokens: usage.totalTokens,
            webviewAvailable: !!this.webview,
        });

        this.webview.postMessage({
            type: 'token-usage-update',
            conversationId,
            usage: {
                totalTokens: usage.totalTokens,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                limit,
                remaining: Math.max(0, remaining),
                percentUsed,
                warningThreshold,
            },
        });
    }

    /**
     * Get aggregated usage across all conversations.
     * Useful for displaying total usage in the UI.
     * 
     * @returns TokenUsage with combined totals from all conversations
     */
    getGlobalUsage(): TokenUsage {
        let totalTokens = 0;
        let inputTokens = 0;
        let outputTokens = 0;
        let lastUpdated = 0;

        for (const usage of this.usageMap.values()) {
            totalTokens += usage.totalTokens;
            inputTokens += usage.inputTokens;
            outputTokens += usage.outputTokens;
            if (usage.lastUpdated > lastUpdated) {
                lastUpdated = usage.lastUpdated;
            }
        }

        return {
            conversationId: 'global',
            totalTokens,
            inputTokens,
            outputTokens,
            lastUpdated: lastUpdated || Date.now(),
        };
    }

    /**
     * Reset all usage across all conversations.
     */
    async resetAllUsage(): Promise<void> {
        const conversationIds = Array.from(this.usageMap.keys());

        for (const conversationId of conversationIds) {
            await this.resetUsage(conversationId);
        }

        console.log('[TokenMonitor] All usage reset for', conversationIds.length, 'conversations');
    }

    /**
     * Create an empty usage object for a conversation.
     */
    private createEmptyUsage(conversationId: string): TokenUsage {
        return {
            conversationId,
            totalTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            lastUpdated: Date.now(),
        };
    }

    /**
     * Sanitize usage data to ensure valid values.
     * Handles negative values, missing fields, and malformed data.
     */
    private sanitizeUsageData(usage: UsageData): UsageData {
        return {
            inputTokens: Math.max(0, usage.inputTokens || 0),
            outputTokens: Math.max(0, usage.outputTokens || 0),
            totalTokens: Math.max(0, usage.totalTokens || 0),
        };
    }

    /**
     * Estimate tokens for a message when usage data is not provided.
     * Uses a conservative estimate of ~4 characters per token.
     * 
     * @param text - The text to estimate tokens for
     * @returns Estimated token count
     */
    estimateTokens(text: string): number {
        if (!text || text.length === 0) {
            return 1; // Minimum 1 token
        }
        const estimatedTokens = Math.ceil(text.length / 4);
        return Math.max(1, estimatedTokens);
    }
}
