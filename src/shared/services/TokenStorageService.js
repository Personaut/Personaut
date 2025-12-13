"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenStorageService = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Service for securely storing API keys using VS Code's SecretStorage API.
 * This ensures API keys are encrypted and not stored in plain text configuration.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.3
 */
class TokenStorageService {
    constructor(secretStorage) {
        this.secretStorage = secretStorage;
    }
    /**
     * Store an API key securely using VS Code's SecretStorage.
     * The key is encrypted at rest.
     *
     * @param provider - The provider identifier (e.g., 'gemini', 'awsAccessKey')
     * @param key - The API key value to store
     */
    async storeApiKey(provider, key) {
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
    async retrieveApiKey(provider) {
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
    async deleteApiKey(provider) {
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
    async hasApiKey(provider) {
        const key = await this.retrieveApiKey(provider);
        return key !== undefined && key !== '';
    }
    /**
     * Migrate API keys from plain text VS Code configuration to SecretStorage.
     * After migration, the keys are removed from the configuration.
     *
     * @returns Object containing migration results
     */
    async migrateFromPlainText() {
        const config = vscode.workspace.getConfiguration('personaut');
        const result = {
            migrated: [],
            removed: [],
            errors: [],
        };
        for (const [configKey, provider] of Object.entries(TokenStorageService.LEGACY_CONFIG_KEYS)) {
            try {
                // Get the value from configuration
                const value = config.get(configKey);
                if (value && value.trim() !== '') {
                    // Store in SecretStorage
                    await this.storeApiKey(provider, value);
                    result.migrated.push(provider);
                    // Remove from configuration (set to empty string)
                    await config.update(configKey, '', vscode.ConfigurationTarget.Global);
                    result.removed.push(configKey);
                }
            }
            catch (error) {
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
    async migrateFromGlobalState(globalState) {
        const result = {
            migrated: [],
            removed: [],
            errors: [],
        };
        const settings = globalState.get('personaut.settings', {});
        const keysToMigrate = {
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
            }
            catch (error) {
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
    async getAllApiKeys() {
        const [geminiApiKey, awsAccessKey, awsSecretKey] = await Promise.all([
            this.retrieveApiKey('gemini'),
            this.retrieveApiKey('awsAccessKey'),
            this.retrieveApiKey('awsSecretKey'),
        ]);
        return {
            geminiApiKey,
            awsAccessKey,
            awsSecretKey,
        };
    }
}
exports.TokenStorageService = TokenStorageService;
TokenStorageService.KEY_PREFIX = 'personaut.apiKey.';
// Known API key configuration keys that need migration
TokenStorageService.LEGACY_CONFIG_KEYS = {
    geminiApiKey: 'gemini',
    awsAccessKey: 'awsAccessKey',
    awsSecretKey: 'awsSecretKey',
};
//# sourceMappingURL=TokenStorageService.js.map