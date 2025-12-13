"use strict";
/**
 * Unit tests for SettingsService
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 6.1, 6.2, 6.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
const SettingsService_1 = require("./SettingsService");
// Mock vscode module
const mockWorkspaceConfiguration = {
    get: jest.fn(),
    update: jest.fn(),
};
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn(() => mockWorkspaceConfiguration),
    },
    ConfigurationTarget: {
        Global: 1,
    },
}), { virtual: true });
describe('SettingsService', () => {
    let settingsService;
    let mockTokenStorageService;
    beforeEach(() => {
        jest.clearAllMocks();
        // Create mock TokenStorageService
        mockTokenStorageService = {
            getAllApiKeys: jest.fn(),
            storeApiKey: jest.fn(),
            deleteApiKey: jest.fn(),
            retrieveApiKey: jest.fn(),
            hasApiKey: jest.fn(),
            migrateFromPlainText: jest.fn(),
            migrateFromGlobalState: jest.fn(),
        };
        settingsService = new SettingsService_1.SettingsService(mockTokenStorageService);
    });
    describe('getSettings', () => {
        it('should retrieve settings from configuration and secure storage', async () => {
            // Mock configuration values
            mockWorkspaceConfiguration.get.mockImplementation((key, defaultValue) => {
                const values = {
                    provider: 'gemini',
                    theme: 'dark',
                    autoRead: true,
                    autoWrite: false,
                    autoExecute: true,
                    geminiModel: 'gemini-1.5-pro',
                    awsRegion: 'us-west-2',
                    awsProfile: 'my-profile',
                    awsUseProfile: true,
                };
                return values[key] ?? defaultValue;
            });
            // Mock API keys from secure storage
            mockTokenStorageService.getAllApiKeys.mockResolvedValue({
                geminiApiKey: 'test-gemini-key',
                awsAccessKey: 'test-aws-access',
                awsSecretKey: 'test-aws-secret',
            });
            const settings = await settingsService.getSettings();
            expect(settings.provider).toBe('gemini');
            expect(settings.theme).toBe('dark');
            expect(settings.autoRead).toBe(true);
            expect(settings.autoWrite).toBe(false);
            expect(settings.autoExecute).toBe(true);
            expect(settings.geminiModel).toBe('gemini-1.5-pro');
            expect(settings.awsRegion).toBe('us-west-2');
            expect(settings.awsProfile).toBe('my-profile');
            expect(settings.awsUseProfile).toBe(true);
            expect(settings.geminiApiKey).toBe('test-gemini-key');
            expect(settings.awsAccessKey).toBe('test-aws-access');
            expect(settings.awsSecretKey).toBe('test-aws-secret');
        });
        it('should use default values when configuration is not set', async () => {
            mockWorkspaceConfiguration.get.mockImplementation((_key, defaultValue) => {
                return defaultValue;
            });
            mockTokenStorageService.getAllApiKeys.mockResolvedValue({});
            const settings = await settingsService.getSettings();
            expect(settings.provider).toBe('nativeIde');
            expect(settings.theme).toBe('match-ide');
            expect(settings.autoRead).toBe(false);
            expect(settings.autoWrite).toBe(false);
            expect(settings.autoExecute).toBe(false);
            expect(settings.geminiModel).toBe('gemini-1.5-pro-latest');
            expect(settings.awsRegion).toBe('us-east-1');
            expect(settings.awsProfile).toBe('default');
            expect(settings.awsUseProfile).toBe(false);
        });
        it('should handle missing API keys gracefully', async () => {
            mockWorkspaceConfiguration.get.mockImplementation((_key, defaultValue) => {
                return defaultValue;
            });
            mockTokenStorageService.getAllApiKeys.mockResolvedValue({
                geminiApiKey: undefined,
                awsAccessKey: undefined,
                awsSecretKey: undefined,
            });
            const settings = await settingsService.getSettings();
            expect(settings.geminiApiKey).toBeUndefined();
            expect(settings.awsAccessKey).toBeUndefined();
            expect(settings.awsSecretKey).toBeUndefined();
        });
    });
    describe('saveSettings', () => {
        it('should save non-sensitive settings to configuration', async () => {
            const settingsToSave = {
                provider: 'bedrock',
                theme: 'personaut',
                autoRead: true,
                autoWrite: true,
                autoExecute: false,
                geminiModel: 'gemini-1.5-flash',
                awsRegion: 'eu-west-1',
                awsProfile: 'production',
                awsUseProfile: true,
            };
            await settingsService.saveSettings(settingsToSave);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('provider', 'bedrock', 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('theme', 'personaut', 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('autoRead', true, 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('autoWrite', true, 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('autoExecute', false, 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('geminiModel', 'gemini-1.5-flash', 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('awsRegion', 'eu-west-1', 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('awsProfile', 'production', 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('awsUseProfile', true, 1);
        });
        it('should save API keys to secure storage', async () => {
            const settingsToSave = {
                geminiApiKey: 'new-gemini-key',
                awsAccessKey: 'new-aws-access',
                awsSecretKey: 'new-aws-secret',
            };
            await settingsService.saveSettings(settingsToSave);
            expect(mockTokenStorageService.storeApiKey).toHaveBeenCalledWith('gemini', 'new-gemini-key');
            expect(mockTokenStorageService.storeApiKey).toHaveBeenCalledWith('awsAccessKey', 'new-aws-access');
            expect(mockTokenStorageService.storeApiKey).toHaveBeenCalledWith('awsSecretKey', 'new-aws-secret');
        });
        it('should delete API keys when empty string is provided', async () => {
            const settingsToSave = {
                geminiApiKey: '',
                awsAccessKey: '',
                awsSecretKey: '',
            };
            await settingsService.saveSettings(settingsToSave);
            expect(mockTokenStorageService.deleteApiKey).toHaveBeenCalledWith('gemini');
            expect(mockTokenStorageService.deleteApiKey).toHaveBeenCalledWith('awsAccessKey');
            expect(mockTokenStorageService.deleteApiKey).toHaveBeenCalledWith('awsSecretKey');
        });
        it('should only update provided settings', async () => {
            const settingsToSave = {
                provider: 'gemini',
                autoRead: true,
            };
            await settingsService.saveSettings(settingsToSave);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('provider', 'gemini', 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('autoRead', true, 1);
            expect(mockWorkspaceConfiguration.update).not.toHaveBeenCalledWith('theme', expect.anything(), expect.anything());
            expect(mockWorkspaceConfiguration.update).not.toHaveBeenCalledWith('autoWrite', expect.anything(), expect.anything());
        });
        it('should handle partial API key updates', async () => {
            const settingsToSave = {
                geminiApiKey: 'only-gemini-key',
            };
            await settingsService.saveSettings(settingsToSave);
            expect(mockTokenStorageService.storeApiKey).toHaveBeenCalledWith('gemini', 'only-gemini-key');
            expect(mockTokenStorageService.storeApiKey).not.toHaveBeenCalledWith('awsAccessKey', expect.anything());
            expect(mockTokenStorageService.storeApiKey).not.toHaveBeenCalledWith('awsSecretKey', expect.anything());
        });
    });
    describe('resetSettings', () => {
        it('should reset all settings to defaults', async () => {
            await settingsService.resetSettings();
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('provider', 'nativeIde', 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('theme', 'match-ide', 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('autoRead', false, 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('autoWrite', false, 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('autoExecute', false, 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('geminiModel', 'gemini-1.5-pro-latest', 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('awsRegion', 'us-east-1', 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('awsProfile', 'default', 1);
            expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('awsUseProfile', false, 1);
        });
        it('should delete all API keys from secure storage', async () => {
            await settingsService.resetSettings();
            expect(mockTokenStorageService.deleteApiKey).toHaveBeenCalledWith('gemini');
            expect(mockTokenStorageService.deleteApiKey).toHaveBeenCalledWith('awsAccessKey');
            expect(mockTokenStorageService.deleteApiKey).toHaveBeenCalledWith('awsSecretKey');
        });
    });
});
//# sourceMappingURL=SettingsService.test.js.map