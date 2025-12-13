"use strict";
/**
 * FeedbackService handles feedback generation with image support and history management.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 4.1, 4.2, 4.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackService = void 0;
/**
 * FeedbackService manages feedback generation, image support, and history.
 */
class FeedbackService {
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Generate feedback for given parameters
     * This is a placeholder - actual AI generation would be done by the caller
     */
    async generateFeedback(params) {
        try {
            // Validate parameters
            if (!params.personaNames || params.personaNames.length === 0) {
                throw new Error('At least one persona is required');
            }
            if (!params.context || params.context.trim() === '') {
                throw new Error('Context is required');
            }
            if (!params.url || params.url.trim() === '') {
                throw new Error('URL is required');
            }
            // Create title from context
            const title = params.context.length > 50 ? params.context.substring(0, 50) + '...' : params.context;
            // Create feedback entry (content would be filled by AI generation)
            const entry = {
                title,
                feedbackType: params.feedbackType,
                personaNames: params.personaNames,
                context: params.context,
                url: params.url,
                content: '', // Will be filled by AI generation
                screenshot: params.screenshot,
            };
            // Save the entry
            const savedEntry = await this.saveFeedbackEntry(entry);
            return {
                entry: savedEntry,
                success: true,
            };
        }
        catch (error) {
            return {
                entry: {},
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Check if a provider supports images
     */
    providerSupportsImages(provider) {
        const config = FeedbackService.PROVIDER_IMAGE_SUPPORT.find((p) => p.provider.toLowerCase() === provider.toLowerCase());
        return config?.supportsImages ?? false;
    }
    /**
     * Get image support configuration for a provider
     */
    getProviderImageConfig(provider) {
        return (FeedbackService.PROVIDER_IMAGE_SUPPORT.find((p) => p.provider.toLowerCase() === provider.toLowerCase()) ?? null);
    }
    /**
     * Validate image for a specific provider
     */
    validateImageForProvider(provider, imageData, mimeType) {
        const config = this.getProviderImageConfig(provider);
        if (!config) {
            return { valid: false, error: `Unknown provider: ${provider}` };
        }
        if (!config.supportsImages) {
            return { valid: false, error: `Provider ${provider} does not support images` };
        }
        // Check format
        if (config.supportedFormats && !config.supportedFormats.includes(mimeType)) {
            return {
                valid: false,
                error: `Unsupported image format: ${mimeType}. Supported: ${config.supportedFormats.join(', ')}`,
            };
        }
        // Check size (base64 is ~33% larger than binary)
        if (config.maxImageSize) {
            const estimatedSize = (imageData.length * 3) / 4;
            if (estimatedSize > config.maxImageSize) {
                return {
                    valid: false,
                    error: `Image too large. Max size: ${Math.round(config.maxImageSize / 1024 / 1024)}MB`,
                };
            }
        }
        return { valid: true };
    }
    /**
     * Handle screenshot capture result
     */
    handleScreenshotResult(result) {
        if (result.success && result.data) {
            return {
                success: true,
                screenshot: result.data,
                userMessage: 'Screenshot captured successfully',
            };
        }
        // Handle various error scenarios gracefully
        const errorMessage = result.error || 'Unknown error occurred';
        const errorLower = errorMessage.toLowerCase();
        let userMessage;
        if (errorLower.includes('timeout')) {
            userMessage = 'Screenshot capture timed out. The page may be loading slowly.';
        }
        else if (errorLower.includes('navigation')) {
            userMessage = 'Could not navigate to the URL. Please check if the URL is correct.';
        }
        else if (errorLower.includes('blocked') || errorLower.includes('denied')) {
            userMessage = 'Access to the page was blocked. The site may have security restrictions.';
        }
        else if (errorLower.includes('network') || errorLower.includes('connection')) {
            userMessage = 'Network error occurred. Please check your internet connection.';
        }
        else {
            userMessage = `Screenshot capture failed: ${errorMessage}`;
        }
        return {
            success: false,
            userMessage,
        };
    }
    /**
     * Get all feedback entries from storage
     */
    getFeedbackHistory() {
        const history = this.storage.get(FeedbackService.STORAGE_KEY, []);
        return history.sort((a, b) => b.timestamp - a.timestamp);
    }
    /**
     * Save a feedback entry to storage
     */
    async saveFeedbackEntry(entry) {
        const history = this.getFeedbackHistory();
        const newEntry = {
            ...entry,
            id: this.generateId(),
            timestamp: Date.now(),
        };
        // Add to beginning of history
        history.unshift(newEntry);
        // Enforce max history size
        const trimmedHistory = history.slice(0, FeedbackService.MAX_HISTORY_SIZE);
        await this.storage.update(FeedbackService.STORAGE_KEY, trimmedHistory);
        return newEntry;
    }
    /**
     * Get a specific feedback entry by ID
     */
    getFeedbackEntry(id) {
        const history = this.getFeedbackHistory();
        return history.find((e) => e.id === id) ?? null;
    }
    /**
     * Delete a feedback entry
     */
    async deleteFeedback(id) {
        const history = this.getFeedbackHistory();
        const filteredHistory = history.filter((e) => e.id !== id);
        if (filteredHistory.length === history.length) {
            return false; // Entry not found
        }
        await this.storage.update(FeedbackService.STORAGE_KEY, filteredHistory);
        return true;
    }
    /**
     * Clear all feedback history
     */
    async clearFeedbackHistory() {
        await this.storage.update(FeedbackService.STORAGE_KEY, []);
    }
    /**
     * Generate a unique ID for feedback entries
     */
    generateId() {
        return `feedback-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    /**
     * Verify feedback entry has required metadata
     */
    verifyFeedbackMetadata(entry) {
        const requiredFields = [
            'id',
            'title',
            'timestamp',
            'feedbackType',
            'personaNames',
            'content',
        ];
        const missingFields = [];
        for (const field of requiredFields) {
            if (entry[field] === undefined || entry[field] === null) {
                missingFields.push(field);
            }
        }
        // Check personaNames is not empty
        if (entry.personaNames && entry.personaNames.length === 0) {
            missingFields.push('personaNames (empty array)');
        }
        return {
            valid: missingFields.length === 0,
            missingFields,
        };
    }
    /**
     * Get feedback entries by persona name
     */
    getFeedbackByPersona(personaName) {
        const history = this.getFeedbackHistory();
        return history.filter((e) => e.personaNames.includes(personaName));
    }
    /**
     * Get feedback entries by type
     */
    getFeedbackByType(feedbackType) {
        const history = this.getFeedbackHistory();
        return history.filter((e) => e.feedbackType === feedbackType);
    }
    /**
     * Get all supported providers
     */
    getSupportedProviders() {
        return FeedbackService.PROVIDER_IMAGE_SUPPORT.filter((p) => p.supportsImages).map((p) => p.provider);
    }
}
exports.FeedbackService = FeedbackService;
FeedbackService.STORAGE_KEY = 'feedbackHistory';
FeedbackService.MAX_HISTORY_SIZE = 100;
// Provider image support configuration
FeedbackService.PROVIDER_IMAGE_SUPPORT = [
    {
        provider: 'gemini',
        supportsImages: true,
        maxImageSize: 20 * 1024 * 1024, // 20MB
        supportedFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    },
    {
        provider: 'bedrock',
        supportsImages: true,
        maxImageSize: 5 * 1024 * 1024, // 5MB for Claude
        supportedFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    },
    {
        provider: 'nativeIde',
        supportsImages: true,
        maxImageSize: 10 * 1024 * 1024, // 10MB
        supportedFormats: ['image/png', 'image/jpeg', 'image/webp'],
    },
];
//# sourceMappingURL=FeedbackService.js.map