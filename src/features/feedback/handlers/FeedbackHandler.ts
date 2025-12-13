/**
 * Handler for feedback-related messages
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 4.1, 10.1, 10.2
 */

import * as vscode from 'vscode';
import { FeedbackService } from '../services/FeedbackService';
import { InputValidator, ErrorSanitizer } from '../../../shared/services';
import { WebviewMessage, IFeatureHandler } from '../../../shared/types/CommonTypes';
import { GenerateFeedbackParams } from '../types/FeedbackTypes';

/**
 * Handler for feedback-related messages
 */
export class FeedbackHandler implements IFeatureHandler {
  private readonly errorSanitizer: ErrorSanitizer;

  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly inputValidator: InputValidator
  ) {
    this.errorSanitizer = new ErrorSanitizer();
  }

  /**
   * Handle feedback-related messages
   */
  public async handle(message: WebviewMessage, webview: vscode.Webview): Promise<void> {
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
    } catch (error) {
      const sanitizedError = this.errorSanitizer.sanitize(error as Error);
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
  private async generateFeedback(
    data: GenerateFeedbackParams,
    webview: vscode.Webview
  ): Promise<void> {
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
    } else {
      throw new Error(result.error || 'Failed to generate feedback');
    }
  }

  /**
   * Get feedback history
   */
  private async getFeedbackHistory(webview: vscode.Webview): Promise<void> {
    const history = this.feedbackService.getFeedbackHistory();
    webview.postMessage({
      type: 'feedback-history',
      history,
    });
  }

  /**
   * Get a specific feedback entry
   */
  private async getFeedback(id: string, webview: vscode.Webview): Promise<void> {
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
  private async deleteFeedback(id: string, webview: vscode.Webview): Promise<void> {
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
  private async clearFeedbackHistory(webview: vscode.Webview): Promise<void> {
    await this.feedbackService.clearFeedbackHistory();
    webview.postMessage({
      type: 'feedback-history-cleared',
    });
  }

  /**
   * Get feedback by persona name
   */
  private async getFeedbackByPersona(personaName: string, webview: vscode.Webview): Promise<void> {
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
  private async getFeedbackByType(
    feedbackType: 'individual' | 'group',
    webview: vscode.Webview
  ): Promise<void> {
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
  private async checkProviderImageSupport(
    provider: string,
    webview: vscode.Webview
  ): Promise<void> {
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
