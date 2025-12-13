"use strict";
/**
 * Handler for feedback-related messages
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 4.1, 10.1, 10.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackHandler = void 0;
const services_1 = require("../../../shared/services");
/**
 * Handler for feedback-related messages
 */
class FeedbackHandler {
    constructor(feedbackService, inputValidator) {
        this.feedbackService = feedbackService;
        this.inputValidator = inputValidator;
        this.errorSanitizer = new services_1.ErrorSanitizer();
    }
    /**
     * Handle feedback-related messages
     */
    async handle(message, webview) {
        try {
            switch (message.type) {
                case 'generate-feedback':
                    await this.generateFeedback(message.data, webview);
                    break;
                case 'get-feedback-history':
                    await this.getFeedbackHistory(webview);
                    break;
                case 'get-feedback':
                    await this.getFeedback(message.id, webview);
                    break;
                case 'delete-feedback':
                    await this.deleteFeedback(message.id, webview);
                    break;
                case 'clear-feedback-history':
                    await this.clearFeedbackHistory(webview);
                    break;
                case 'get-feedback-by-persona':
                    await this.getFeedbackByPersona(message.personaName, webview);
                    break;
                case 'get-feedback-by-type':
                    await this.getFeedbackByType(message.feedbackType, webview);
                    break;
                case 'check-provider-image-support':
                    await this.checkProviderImageSupport(message.provider, webview);
                    break;
                default:
                    throw new Error(`Unknown message type: ${message.type}`);
            }
        }
        catch (error) {
            const sanitizedError = this.errorSanitizer.sanitize(error);
            console.error('[FeedbackHandler] Error:', error);
            webview.postMessage({
                type: 'error',
                message: sanitizedError.userMessage,
            });
        }
    }
    /**
     * Generate feedback
     */
    async generateFeedback(data, webview) {
        // Validate inputs
        if (!data.personaNames || data.personaNames.length === 0) {
            throw new Error('At least one persona is required');
        }
        const contextValidation = this.inputValidator.validateInput(data.context);
        if (!contextValidation.valid) {
            throw new Error(contextValidation.reason || 'Invalid context');
        }
        const urlValidation = this.inputValidator.validateInput(data.url);
        if (!urlValidation.valid) {
            throw new Error(urlValidation.reason || 'Invalid URL');
        }
        // Validate each persona name
        for (const personaName of data.personaNames) {
            const nameValidation = this.inputValidator.validateInput(personaName);
            if (!nameValidation.valid) {
                throw new Error(`Invalid persona name: ${personaName}`);
            }
        }
        const result = await this.feedbackService.generateFeedback(data);
        if (result.success) {
            webview.postMessage({
                type: 'feedback-generated',
                entry: result.entry,
            });
        }
        else {
            throw new Error(result.error || 'Failed to generate feedback');
        }
    }
    /**
     * Get feedback history
     */
    async getFeedbackHistory(webview) {
        const history = this.feedbackService.getFeedbackHistory();
        webview.postMessage({
            type: 'feedback-history',
            history,
        });
    }
    /**
     * Get a specific feedback entry
     */
    async getFeedback(id, webview) {
        const validation = this.inputValidator.validateInput(id);
        if (!validation.valid) {
            throw new Error(validation.reason || 'Invalid feedback ID');
        }
        const entry = this.feedbackService.getFeedbackEntry(id);
        if (!entry) {
            throw new Error(`Feedback entry with id ${id} not found`);
        }
        webview.postMessage({
            type: 'feedback-details',
            entry,
        });
    }
    /**
     * Delete a feedback entry
     */
    async deleteFeedback(id, webview) {
        const validation = this.inputValidator.validateInput(id);
        if (!validation.valid) {
            throw new Error(validation.reason || 'Invalid feedback ID');
        }
        const deleted = await this.feedbackService.deleteFeedback(id);
        if (!deleted) {
            throw new Error(`Feedback entry with id ${id} not found`);
        }
        webview.postMessage({
            type: 'feedback-deleted',
            id,
        });
    }
    /**
     * Clear all feedback history
     */
    async clearFeedbackHistory(webview) {
        await this.feedbackService.clearFeedbackHistory();
        webview.postMessage({
            type: 'feedback-history-cleared',
        });
    }
    /**
     * Get feedback by persona name
     */
    async getFeedbackByPersona(personaName, webview) {
        const validation = this.inputValidator.validateInput(personaName);
        if (!validation.valid) {
            throw new Error(validation.reason || 'Invalid persona name');
        }
        const entries = this.feedbackService.getFeedbackByPersona(personaName);
        webview.postMessage({
            type: 'feedback-by-persona',
            personaName,
            entries,
        });
    }
    /**
     * Get feedback by type
     */
    async getFeedbackByType(feedbackType, webview) {
        if (feedbackType !== 'individual' && feedbackType !== 'group') {
            throw new Error('Invalid feedback type. Must be "individual" or "group"');
        }
        const entries = this.feedbackService.getFeedbackByType(feedbackType);
        webview.postMessage({
            type: 'feedback-by-type',
            feedbackType,
            entries,
        });
    }
    /**
     * Check if provider supports images
     */
    async checkProviderImageSupport(provider, webview) {
        const validation = this.inputValidator.validateInput(provider);
        if (!validation.valid) {
            throw new Error(validation.reason || 'Invalid provider name');
        }
        const supportsImages = this.feedbackService.providerSupportsImages(provider);
        const config = this.feedbackService.getProviderImageConfig(provider);
        webview.postMessage({
            type: 'provider-image-support',
            provider,
            supportsImages,
            config,
        });
    }
}
exports.FeedbackHandler = FeedbackHandler;
//# sourceMappingURL=FeedbackHandler.js.map