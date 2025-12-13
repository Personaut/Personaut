import * as vscode from 'vscode';

/**
 * Service for securely storing API keys using VS Code's SecretStorage API.
 * This ensures API keys are encrypted and not stored in plain text configuration.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.3
 */
export class TokenStorageService {
  private static readonly KEY_PREFIX = 'personaut.apiKey.';

  // Known API key configuration keys that need migration
  private static readonly LEGACY_CONFIG_KEYS: Record<string, string> = {
    geminiApiKey: 'gemini',
    awsAccessKey: 'awsAccessKey',
    awsSecretKey: 'awsSecretKey',
  };

  constructor(private readonly secretStorage: vscode.SecretStorage) { }

  /**
   * Store an API key securely using VS Code's SecretStorage.
   * The key is encrypted at rest.
   *
   * @param provider - The provider identifier (e.g., 'gemini', 'awsAccessKey')
   * @param key - The API key value to store
   */
  async storeApiKey(provider: string, key: string): Promise<void> {
    if (!provider || typeof provider !== 'string') {
      throw new Error('Provider must be a non-empty string');
    }
    if (key === undefined || key === null) {
      throw new Error('API key cannot be undefined or null');
    }

    const storageKey = `${TokenStorageService.KEY_PREFIX}${provider}`;
    await this.secretStorage.store(storageKey, key);
  }

  /**
   * Retrieve an API key from SecretStorage.
   *
   * @param provider - The provider identifier
   * @returns The API key or undefined if not found
   */
  async retrieveApiKey(provider: string): Promise<string | undefined> {
    if (!provider || typeof provider !== 'string') {
      throw new Error('Provider must be a non-empty string');
    }

    const storageKey = `${TokenStorageService.KEY_PREFIX}${provider}`;
    return await this.secretStorage.get(storageKey);
  }

  /**
   * Delete an API key from SecretStorage.
   *
   * @param provider - The provider identifier
   */
  async deleteApiKey(provider: string): Promise<void> {
    if (!provider || typeof provider !== 'string') {
      throw new Error('Provider must be a non-empty string');
    }

    const storageKey = `${TokenStorageService.KEY_PREFIX}${provider}`;
    await this.secretStorage.delete(storageKey);
  }

  /**
   * Check if an API key exists in SecretStorage.
   *
   * @param provider - The provider identifier
   * @returns true if the key exists
   */
  async hasApiKey(provider: string): Promise<boolean> {
    const key = await this.retrieveApiKey(provider);
    return key !== undefined && key !== '';
  }

  /**
   * Migrate API keys from plain text VS Code configuration to SecretStorage.
   * After migration, the keys are removed from the configuration.
   *
   * @returns Object containing migration results
   */
  async migrateFromPlainText(): Promise<MigrationResult> {
    const config = vscode.workspace.getConfiguration('personaut');
    const result: MigrationResult = {
      migrated: [],
      removed: [],
      errors: [],
    };

    for (const [configKey, provider] of Object.entries(TokenStorageService.LEGACY_CONFIG_KEYS)) {
      try {
        // Get the value from configuration
        const value = config.get<string>(configKey);

        if (value && value.trim() !== '') {
          // Store in SecretStorage
          await this.storeApiKey(provider, value);
          result.migrated.push(provider);

          // Remove from configuration (set to empty string)
          await config.update(configKey, '', vscode.ConfigurationTarget.Global);
          result.removed.push(configKey);
        }
      } catch (error: any) {
        result.errors.push({
          provider,
          configKey,
          error: error.message,
        });
      }
    }

    return result;
  }

  /**
   * Migrate API keys from globalState settings to SecretStorage.
   * This handles the case where keys were stored in globalState.
   *
   * @param globalState - The VS Code global state
   * @returns Object containing migration results
   */
  async migrateFromGlobalState(globalState: vscode.Memento): Promise<MigrationResult> {
    const result: MigrationResult = {
      migrated: [],
      removed: [],
      errors: [],
    };

    const settings = globalState.get<Record<string, any>>('personaut.settings', {});

    const keysToMigrate: Record<string, string> = {
      geminiApiKey: 'gemini',
      awsAccessKey: 'awsAccessKey',
      awsSecretKey: 'awsSecretKey',
    };

    let settingsModified = false;

    for (const [settingKey, provider] of Object.entries(keysToMigrate)) {
      try {
        const value = settings[settingKey];

        if (value && typeof value === 'string' && value.trim() !== '') {
          // Store in SecretStorage
          await this.storeApiKey(provider, value);
          result.migrated.push(provider);

          // Remove from settings object
          delete settings[settingKey];
          result.removed.push(settingKey);
          settingsModified = true;
        }
      } catch (error: any) {
        result.errors.push({
          provider,
          configKey: settingKey,
          error: error.message,
        });
      }
    }

    // Update globalState if we modified settings
    if (settingsModified) {
      await globalState.update('personaut.settings', settings);
    }

    return result;
  }

  /**
   * Get all API keys for building an ApiConfiguration object.
   * This is a convenience method for retrieving all keys at once.
   *
   * @returns Object with all API keys
   */
  async getAllApiKeys(): Promise<ApiKeys> {
    const [geminiApiKey, awsAccessKey, awsSecretKey, awsSessionToken] = await Promise.all([
      this.retrieveApiKey('gemini'),
      this.retrieveApiKey('awsAccessKey'),
      this.retrieveApiKey('awsSecretKey'),
      this.retrieveApiKey('awsSessionToken'),
    ]);

    return {
      geminiApiKey,
      awsAccessKey,
      awsSecretKey,
      awsSessionToken,
    };
  }
}

export interface MigrationResult {
  migrated: string[];
  removed: string[];
  errors: Array<{
    provider: string;
    configKey: string;
    error: string;
  }>;
}

export interface ApiKeys {
  geminiApiKey?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsSessionToken?: string;
}
