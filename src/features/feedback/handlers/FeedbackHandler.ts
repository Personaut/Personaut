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
        case 'capture-url-screenshot':
          await this.captureUrlScreenshot(message.url, webview);
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

    // Only validate URL if it's provided and not a data URL (data URLs can be very large)
    if (data.url && !data.url.startsWith('data:')) {
      const urlValidation = this.inputValidator.validateInput(data.url);
      if (!urlValidation.valid) {
        throw new Error(urlValidation.reason || 'Invalid URL');
      }
    }

    // Validate each persona name
    for (const personaName of data.personaNames) {
      const nameValidation = this.inputValidator.validateInput(personaName);
      if (!nameValidation.valid) {
        throw new Error(`Invalid persona name: ${personaName}`);
      }
    }

    // Debug: Log screenshot info
    console.log('[FeedbackHandler] Screenshot info:', {
      hasScreenshot: !!data.screenshot,
      screenshotLength: data.screenshot?.length || 0,
      screenshotPrefix: data.screenshot?.substring(0, 50) || 'none',
    });

    const result = await this.feedbackService.generateFeedbackWithAI(data);

    if (result.success) {
      // Send each entry separately to the frontend
      if (result.entries && result.entries.length > 0) {
        for (const entry of result.entries) {
          webview.postMessage({
            type: 'feedback-generated',
            entry: entry,
          });
        }

        // Send summary if available
        if (result.summary) {
          webview.postMessage({
            type: 'feedback-summary',
            summary: result.summary.summary, // The actual summary text
          });
        }
      } else if (result.entry) {
        // Backward compatibility: single entry
        webview.postMessage({
          type: 'feedback-generated',
          entry: result.entry,
        });
      }
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

  /**
   * Capture screenshot of a URL using Puppeteer
   * Simple flow: spin up browser → screenshot → spin down
   */
  private async captureUrlScreenshot(url: string, webview: vscode.Webview): Promise<void> {
    const validation = this.inputValidator.validateInput(url);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid URL');
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format. Please enter a valid URL starting with http:// or https://');
    }

    console.log('[FeedbackHandler] Capturing screenshot of:', url);

    let browser: any = null;
    try {
      webview.postMessage({
        type: 'screenshot-status',
        status: 'capturing',
        message: 'Capturing screenshot...',
      });

      // Spin up Puppeteer
      const puppeteer = require('puppeteer');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      // Navigate and screenshot
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const screenshotBuffer = await page.screenshot({ type: 'png', fullPage: false });
      const base64Data = screenshotBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Data}`;

      console.log('[FeedbackHandler] Screenshot captured successfully');

      webview.postMessage({
        type: 'screenshot-captured',
        url,
        screenshot: dataUrl,
      });
    } catch (error: any) {
      console.error('[FeedbackHandler] Screenshot capture error:', error);
      webview.postMessage({
        type: 'screenshot-error',
        error: error.message || 'Failed to capture screenshot',
        url,
      });
    } finally {
      // Spin down - always close browser
      if (browser) {
        try {
          await browser.close();
          console.log('[FeedbackHandler] Browser closed');
        } catch { /* ignore */ }
      }
    }
  }
}
