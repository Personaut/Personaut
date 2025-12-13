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
exports.SettingsService = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Service for managing extension settings
 * Handles reading and writing settings from VS Code configuration and secure storage
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 6.1, 6.2, 6.3
 */
class SettingsService {
    constructor(tokenStorageService) {
        this.tokenStorageService = tokenStorageService;
    }
    /**
     * Get current settings from VS Code configuration and secure storage
     *
     * @returns Current settings object
     */
    async getSettings() {
        const config = vscode.workspace.getConfiguration('personaut');
        // Get API keys from secure storage
        const apiKeys = await this.tokenStorageService.getAllApiKeys();
        // Build settings object from configuration and secure storage
        const settings = {
            provider: config.get('provider', 'nativeIde'),
            theme: config.get('theme', 'match-ide'),
            autoRead: config.get('autoRead', false),
            autoWrite: config.get('autoWrite', false),
            autoExecute: config.get('autoExecute', false),
            geminiModel: config.get('geminiModel', 'gemini-1.5-pro-latest'),
            awsRegion: config.get('awsRegion', 'us-east-1'),
            awsProfile: config.get('awsProfile', 'default'),
            awsUseProfile: config.get('awsUseProfile', false),
            // API keys from secure storage
            geminiApiKey: apiKeys.geminiApiKey,
            awsAccessKey: apiKeys.awsAccessKey,
            awsSecretKey: apiKeys.awsSecretKey,
        };
        return settings;
    }
    /**
     * Save settings to VS Code configuration and secure storage
     * API keys are stored in secure storage, other settings in configuration
     *
     * @param settings - Settings object to save
     */
    async saveSettings(settings) {
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
            await config.update('awsUseProfile', settings.awsUseProfile, vscode.ConfigurationTarget.Global);
        }
        // Save API keys to secure storage
        if (settings.geminiApiKey !== undefined) {
            if (settings.geminiApiKey === '') {
                await this.tokenStorageService.deleteApiKey('gemini');
            }
            else {
                await this.tokenStorageService.storeApiKey('gemini', settings.geminiApiKey);
            }
        }
        if (settings.awsAccessKey !== undefined) {
            if (settings.awsAccessKey === '') {
                await this.tokenStorageService.deleteApiKey('awsAccessKey');
            }
            else {
                await this.tokenStorageService.storeApiKey('awsAccessKey', settings.awsAccessKey);
            }
        }
        if (settings.awsSecretKey !== undefined) {
            if (settings.awsSecretKey === '') {
                await this.tokenStorageService.deleteApiKey('awsSecretKey');
            }
            else {
                await this.tokenStorageService.storeApiKey('awsSecretKey', settings.awsSecretKey);
            }
        }
    }
    /**
     * Reset settings to default values
     */
    async resetSettings() {
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
        // Delete API keys from secure storage
        await this.tokenStorageService.deleteApiKey('gemini');
        await this.tokenStorageService.deleteApiKey('awsAccessKey');
        await this.tokenStorageService.deleteApiKey('awsSecretKey');
    }
}
exports.SettingsService = SettingsService;
//# sourceMappingURL=SettingsService.js.map