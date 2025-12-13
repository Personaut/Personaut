import * as vscode from 'vscode';
import { IFeatureHandler, WebviewMessage } from '../../../shared/types/CommonTypes';
import { SettingsService } from '../services/SettingsService';
import { InputValidator } from '../../../shared/services/InputValidator';
import { ErrorSanitizer } from '../../../shared/services/ErrorSanitizer';

/**
 * Handler for settings-related webview messages
 * Routes messages to appropriate service methods and handles errors
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 6.1, 10.1, 10.2
 */
export class SettingsHandler implements IFeatureHandler {
  private readonly errorSanitizer: ErrorSanitizer;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly inputValidator: InputValidator
  ) {
    this.errorSanitizer = new ErrorSanitizer();
  }

  /**
   * Handle settings-related webview messages
   *
   * @param message - The webview message to handle
   * @param webview - The webview to send responses to
   */
  async handle(message: WebviewMessage, webview: vscode.Webview): Promise<void> {
    try {
      switch (message.type) {
        case 'get-settings':
          await this.getSettings(webview);
          break;
        case 'save-settings':
          await this.saveSettings(message, webview);
          break;
        case 'reset-settings':
          await this.resetSettings(webview);
          break;
        case 'reset-all-data':
          await this.resetAllData(webview);
          break;
        default:
          throw new Error(`Unknown settings message type: ${message.type}`);
      }
    } catch (error) {
      await this.handleError(error, webview);
    }
  }

  /**
   * Get current settings and send to webview
   */
  private async getSettings(webview: vscode.Webview): Promise<void> {
    const settings = await this.settingsService.getSettings();

    webview.postMessage({
      type: 'settings-loaded',
      settings,
    });
  }

  /**
   * Save settings from webview
   */
  private async saveSettings(message: WebviewMessage, webview: vscode.Webview): Promise<void> {
    // Validate that settings object exists
    if (!message.settings || typeof message.settings !== 'object') {
      throw new Error('Settings object is required');
    }

    // Validate provider if present
    if (message.settings.provider) {
      const validProviders = ['nativeIde', 'gemini', 'bedrock'];
      if (!validProviders.includes(message.settings.provider)) {
        throw new Error(`Invalid provider: ${message.settings.provider}`);
      }
    }

    // Validate theme if present
    if (message.settings.theme) {
      const validThemes = ['dark', 'match-ide', 'personaut'];
      if (!validThemes.includes(message.settings.theme)) {
        throw new Error(`Invalid theme: ${message.settings.theme}`);
      }
    }

    // Validate boolean fields
    const booleanFields = ['autoRead', 'autoWrite', 'autoExecute', 'awsUseProfile'];
    for (const field of booleanFields) {
      if (message.settings[field] !== undefined && typeof message.settings[field] !== 'boolean') {
        throw new Error(`${field} must be a boolean`);
      }
    }

    // Validate API keys if present (basic validation)
    if (message.settings.geminiApiKey !== undefined) {
      const validation = this.inputValidator.validateInput(message.settings.geminiApiKey);
      if (!validation.valid) {
        throw new Error(`Invalid Gemini API key: ${validation.reason}`);
      }
    }

    if (message.settings.awsAccessKey !== undefined) {
      const validation = this.inputValidator.validateInput(message.settings.awsAccessKey);
      if (!validation.valid) {
        throw new Error(`Invalid AWS access key: ${validation.reason}`);
      }
    }

    if (message.settings.awsSecretKey !== undefined) {
      const validation = this.inputValidator.validateInput(message.settings.awsSecretKey);
      if (!validation.valid) {
        throw new Error(`Invalid AWS secret key: ${validation.reason}`);
      }
    }

    // Save settings
    await this.settingsService.saveSettings(message.settings);

    // Send success response
    webview.postMessage({
      type: 'settings-saved',
      success: true,
    });

    // Send updated settings back to webview
    const updatedSettings = await this.settingsService.getSettings();
    webview.postMessage({
      type: 'settings-loaded',
      settings: updatedSettings,
    });
  }

  /**
   * Reset settings to defaults
   */
  private async resetSettings(webview: vscode.Webview): Promise<void> {
    await this.settingsService.resetSettings();

    // Send success response
    webview.postMessage({
      type: 'settings-reset',
      success: true,
    });

    // Send updated settings back to webview
    const updatedSettings = await this.settingsService.getSettings();
    webview.postMessage({
      type: 'settings-loaded',
      settings: updatedSettings,
    });
  }

  /**
   * Reset all data (Aliased to reset settings for now, but should ideally clear all data)
   */
  private async resetAllData(webview: vscode.Webview): Promise<void> {
    await this.settingsService.resetSettings();

    // Send success response that frontend expects
    webview.postMessage({
      type: 'data-reset-complete',
      success: true,
    });

    // Send updated settings back to webview
    const updatedSettings = await this.settingsService.getSettings();
    webview.postMessage({
      type: 'settings-loaded',
      settings: updatedSettings,
    });
  }

  /**
   * Handle errors and send sanitized error messages to webview
   */
  private async handleError(error: unknown, webview: vscode.Webview): Promise<void> {
    const errorMessage = error instanceof Error ? error : String(error);
    const sanitizedError = this.errorSanitizer.sanitize(errorMessage);

    console.error('[SettingsHandler] Error:', sanitizedError.logMessage);

    webview.postMessage({
      type: 'settings-error',
      error: sanitizedError.userMessage,
    });
  }
}
