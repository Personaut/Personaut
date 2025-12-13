import * as vscode from 'vscode';
import { TokenStorageService } from '../../../shared/services/TokenStorageService';
import { Settings } from '../types/SettingsTypes';
import { AgentManager } from '../../../core/agent/AgentManager';

/**
 * Service for managing extension settings
 * Handles reading and writing settings from VS Code configuration and secure storage
 *
 * Feature: feature-based-architecture, agent-interaction-fixes
 * Validates: Requirements 6.1, 6.2, 6.3, 5.4
 */
export class SettingsService {
  constructor(
    private readonly tokenStorageService: TokenStorageService,
    private readonly agentManager?: AgentManager
  ) { }

  /**
   * Get current settings from VS Code configuration and secure storage
   *
   * @returns Current settings object
   */
  async getSettings(): Promise<Settings> {
    const config = vscode.workspace.getConfiguration('personaut');

    // Get API keys from secure storage
    const apiKeys = await this.tokenStorageService.getAllApiKeys();

    // Build settings object from configuration and secure storage
    // Ensure API keys are always strings (empty string if not set) for UI compatibility
    const settings: Settings = {
      provider: config.get<'nativeIde' | 'gemini' | 'bedrock'>('provider', 'nativeIde'),
      theme: config.get<'dark' | 'match-ide' | 'personaut'>('theme', 'match-ide'),
      autoRead: config.get<boolean>('autoRead', false),
      autoWrite: config.get<boolean>('autoWrite', false),
      autoExecute: config.get<boolean>('autoExecute', false),
      geminiModel: config.get<string>('geminiModel', 'gemini-1.5-pro-latest'),
      awsRegion: config.get<string>('awsRegion', 'us-east-1'),
      awsProfile: config.get<string>('awsProfile', 'default'),
      awsUseProfile: config.get<boolean>('awsUseProfile', false),
      bedrockModel: config.get<string>('bedrockModel', 'anthropic.claude-3-sonnet-20240229-v1:0'),
      bedrockUseVpcEndpoint: config.get<boolean>('bedrockUseVpcEndpoint', false),
      bedrockVpcEndpoint: config.get<string>('bedrockVpcEndpoint', ''),
      bedrockCrossRegionInference: config.get<boolean>('bedrockCrossRegionInference', false),
      rateLimit: config.get<number>('rateLimit', 100000),
      rateLimitWarningThreshold: config.get<number>('rateLimitWarningThreshold', 80),
      // API keys from secure storage - convert undefined to empty string for UI
      geminiApiKey: apiKeys.geminiApiKey || '',
      awsAccessKey: apiKeys.awsAccessKey || '',
      awsSecretKey: apiKeys.awsSecretKey || '',
      awsSessionToken: apiKeys.awsSessionToken || '',
    };

    return settings;
  }

  /**
   * Validate that required settings exist for a provider
   * 
   * @param provider - Provider to validate ('nativeIde' | 'gemini' | 'bedrock')
   * @returns Validation result with missing settings
   */
  async validateProviderSettings(provider: string): Promise<{
    valid: boolean;
    missingSettings: string[];
  }> {
    const missingSettings: string[] = [];
    const currentSettings = await this.getSettings();

    switch (provider) {
      case 'gemini':
        if (!currentSettings.geminiApiKey || currentSettings.geminiApiKey === '') {
          missingSettings.push('geminiApiKey');
        }
        if (!currentSettings.geminiModel || currentSettings.geminiModel === '') {
          missingSettings.push('geminiModel');
        }
        break;

      case 'bedrock':
        // Check if using profile or access keys
        if (currentSettings.awsUseProfile) {
          if (!currentSettings.awsProfile || currentSettings.awsProfile === '') {
            missingSettings.push('awsProfile');
          }
        } else {
          if (!currentSettings.awsAccessKey || currentSettings.awsAccessKey === '') {
            missingSettings.push('awsAccessKey');
          }
          if (!currentSettings.awsSecretKey || currentSettings.awsSecretKey === '') {
            missingSettings.push('awsSecretKey');
          }
        }
        if (!currentSettings.awsRegion || currentSettings.awsRegion === '') {
          missingSettings.push('awsRegion');
        }
        if (!currentSettings.bedrockModel || currentSettings.bedrockModel === '') {
          missingSettings.push('bedrockModel');
        }
        break;

      case 'nativeIde':
        // Native IDE provider doesn't require additional settings
        break;

      default:
        missingSettings.push('provider');
        break;
    }

    return {
      valid: missingSettings.length === 0,
      missingSettings,
    };
  }

  /**
   * Notify AgentManager of settings changes
   * Called after successful settings save to trigger agent reinitialization if needed
   * 
   * @param changedSettings - Settings that were changed
   */
  private async notifySettingsChanged(changedSettings: Partial<Settings>): Promise<void> {
    if (!this.agentManager) {
      // AgentManager not provided, skip notification
      return;
    }

    // Critical settings that require agent reinitialization
    const criticalSettings = [
      'provider',
      'geminiApiKey',
      'awsAccessKey',
      'awsSecretKey',
      'geminiModel',
      'bedrockModel',
      'awsRegion',
    ];

    const changedKeys = Object.keys(changedSettings);
    const isCriticalChange = changedKeys.some((key) => criticalSettings.includes(key));

    if (isCriticalChange) {
      console.log('[SettingsService] Critical settings changed, notifying AgentManager:', {
        changedSettings: changedKeys,
        timestamp: Date.now(),
      });
    } else {
      console.log('[SettingsService] Non-critical settings changed, no agent reinitialization needed:', {
        changedSettings: changedKeys,
        timestamp: Date.now(),
      });
    }

    // Get full current settings to pass to AgentManager
    const currentSettings = await this.getSettings();
    
    // Notify AgentManager - it will determine if reinitialization is needed
    await this.agentManager.updateSettings(currentSettings);
  }

  /**
   * Save settings to VS Code configuration and secure storage
   * API keys are stored in secure storage, other settings in configuration
   *
   * @param settings - Settings object to save
   */
  async saveSettings(settings: Partial<Settings>): Promise<void> {
    const config = vscode.workspace.getConfiguration('personaut');

    // Save non-sensitive settings to configuration
    if (settings.provider !== undefined) {
      await config.update('provider', settings.provider, vscode.ConfigurationTarget.Global);
    }
    if (settings.theme !== undefined) {
      await config.update('theme', settings.theme, vscode.ConfigurationTarget.Global);
    }
    if (settings.autoRead !== undefined) {
      await config.update('autoRead', settings.autoRead, vscode.ConfigurationTarget.Global);
    }
    if (settings.autoWrite !== undefined) {
      await config.update('autoWrite', settings.autoWrite, vscode.ConfigurationTarget.Global);
    }
    if (settings.autoExecute !== undefined) {
      await config.update('autoExecute', settings.autoExecute, vscode.ConfigurationTarget.Global);
    }
    if (settings.geminiModel !== undefined) {
      await config.update('geminiModel', settings.geminiModel, vscode.ConfigurationTarget.Global);
    }
    if (settings.awsRegion !== undefined) {
      await config.update('awsRegion', settings.awsRegion, vscode.ConfigurationTarget.Global);
    }
    if (settings.awsProfile !== undefined) {
      await config.update('awsProfile', settings.awsProfile, vscode.ConfigurationTarget.Global);
    }
    if (settings.awsUseProfile !== undefined) {
      await config.update(
        'awsUseProfile',
        settings.awsUseProfile,
        vscode.ConfigurationTarget.Global
      );
    }
    if (settings.bedrockModel !== undefined) {
      await config.update('bedrockModel', settings.bedrockModel, vscode.ConfigurationTarget.Global);
    }
    if (settings.bedrockUseVpcEndpoint !== undefined) {
      await config.update(
        'bedrockUseVpcEndpoint',
        settings.bedrockUseVpcEndpoint,
        vscode.ConfigurationTarget.Global
      );
    }
    if (settings.bedrockVpcEndpoint !== undefined) {
      await config.update(
        'bedrockVpcEndpoint',
        settings.bedrockVpcEndpoint,
        vscode.ConfigurationTarget.Global
      );
    }
    if (settings.bedrockCrossRegionInference !== undefined) {
      await config.update(
        'bedrockCrossRegionInference',
        settings.bedrockCrossRegionInference,
        vscode.ConfigurationTarget.Global
      );
    }
    if (settings.rateLimit !== undefined) {
      await config.update('rateLimit', settings.rateLimit, vscode.ConfigurationTarget.Global);
    }
    if (settings.rateLimitWarningThreshold !== undefined) {
      await config.update('rateLimitWarningThreshold', settings.rateLimitWarningThreshold, vscode.ConfigurationTarget.Global);
    }

    // Save API keys to secure storage
    if (settings.geminiApiKey !== undefined) {
      if (settings.geminiApiKey === '') {
        await this.tokenStorageService.deleteApiKey('gemini');
      } else {
        await this.tokenStorageService.storeApiKey('gemini', settings.geminiApiKey);
      }
    }
    if (settings.awsAccessKey !== undefined) {
      if (settings.awsAccessKey === '') {
        await this.tokenStorageService.deleteApiKey('awsAccessKey');
      } else {
        await this.tokenStorageService.storeApiKey('awsAccessKey', settings.awsAccessKey);
      }
    }
    if (settings.awsSecretKey !== undefined) {
      if (settings.awsSecretKey === '') {
        await this.tokenStorageService.deleteApiKey('awsSecretKey');
      } else {
        await this.tokenStorageService.storeApiKey('awsSecretKey', settings.awsSecretKey);
      }
    }
    if (settings.awsSessionToken !== undefined) {
      if (settings.awsSessionToken === '') {
        await this.tokenStorageService.deleteApiKey('awsSessionToken');
      } else {
        await this.tokenStorageService.storeApiKey('awsSessionToken', settings.awsSessionToken);
      }
    }

    // Notify AgentManager of settings changes
    await this.notifySettingsChanged(settings);
  }

  /**
   * Reset settings to default values
   */
  async resetSettings(): Promise<void> {
    const config = vscode.workspace.getConfiguration('personaut');

    // Reset configuration to defaults
    await config.update('provider', 'nativeIde', vscode.ConfigurationTarget.Global);
    await config.update('theme', 'match-ide', vscode.ConfigurationTarget.Global);
    await config.update('autoRead', false, vscode.ConfigurationTarget.Global);
    await config.update('autoWrite', false, vscode.ConfigurationTarget.Global);
    await config.update('autoExecute', false, vscode.ConfigurationTarget.Global);
    await config.update('geminiModel', 'gemini-1.5-pro-latest', vscode.ConfigurationTarget.Global);
    await config.update('awsRegion', 'us-east-1', vscode.ConfigurationTarget.Global);
    await config.update('awsProfile', 'default', vscode.ConfigurationTarget.Global);
    await config.update('awsUseProfile', false, vscode.ConfigurationTarget.Global);
    await config.update('bedrockModel', 'anthropic.claude-3-sonnet-20240229-v1:0', vscode.ConfigurationTarget.Global);
    await config.update('bedrockUseVpcEndpoint', false, vscode.ConfigurationTarget.Global);
    await config.update('bedrockVpcEndpoint', '', vscode.ConfigurationTarget.Global);
    await config.update('bedrockCrossRegionInference', false, vscode.ConfigurationTarget.Global);
    await config.update('rateLimit', 100000, vscode.ConfigurationTarget.Global);
    await config.update('rateLimitWarningThreshold', 80, vscode.ConfigurationTarget.Global);

    // Delete API keys from secure storage
    await this.tokenStorageService.deleteApiKey('gemini');
    await this.tokenStorageService.deleteApiKey('awsAccessKey');
    await this.tokenStorageService.deleteApiKey('awsSecretKey');
    await this.tokenStorageService.deleteApiKey('awsSessionToken');
  }
}
