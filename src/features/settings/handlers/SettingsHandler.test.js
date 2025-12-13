"use strict";
/**
 * Unit tests for SettingsHandler
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 6.1, 10.1, 10.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
const SettingsHandler_1 = require("./SettingsHandler");
describe('SettingsHandler', () => {
    let settingsHandler;
    let mockSettingsService;
    let mockInputValidator;
    let mockWebview;
    beforeEach(() => {
        jest.clearAllMocks();
        // Create mock services
        mockSettingsService = {
            getSettings: jest.fn(),
            saveSettings: jest.fn(),
            resetSettings: jest.fn(),
        };
        mockInputValidator = {
            validateInput: jest.fn(),
        };
        // Create mock webview
        mockWebview = {
            postMessage: jest.fn(),
        };
        settingsHandler = new SettingsHandler_1.SettingsHandler(mockSettingsService, mockInputValidator);
    });
    describe('handle - get-settings', () => {
        it('should get settings and send to webview', async () => {
            const mockSettings = {
                provider: 'gemini',
                theme: 'dark',
                autoRead: true,
                autoWrite: false,
                autoExecute: true,
                geminiApiKey: 'test-key',
                geminiModel: 'gemini-1.5-pro',
                awsRegion: 'us-east-1',
                awsProfile: 'default',
                awsUseProfile: false,
            };
            mockSettingsService.getSettings.mockResolvedValue(mockSettings);
            await settingsHandler.handle({ type: 'get-settings' }, mockWebview);
            expect(mockSettingsService.getSettings).toHaveBeenCalled();
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'settings-loaded',
                settings: mockSettings,
            });
        });
    });
    describe('handle - save-settings', () => {
        it('should validate and save settings', async () => {
            const settingsToSave = {
                provider: 'bedrock',
                theme: 'personaut',
                autoRead: true,
            };
            const updatedSettings = {
                provider: 'bedrock',
                theme: 'personaut',
                autoRead: true,
                autoWrite: false,
                autoExecute: false,
                geminiModel: 'gemini-1.5-pro-latest',
                awsRegion: 'us-east-1',
                awsProfile: 'default',
                awsUseProfile: false,
            };
            mockSettingsService.getSettings.mockResolvedValue(updatedSettings);
            await settingsHandler.handle({
                type: 'save-settings',
                settings: settingsToSave,
            }, mockWebview);
            expect(mockSettingsService.saveSettings).toHaveBeenCalledWith(settingsToSave);
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'settings-saved',
                success: true,
            });
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'settings-loaded',
                settings: updatedSettings,
            });
        });
        it('should validate API keys before saving', async () => {
            const settingsToSave = {
                geminiApiKey: 'valid-key',
            };
            mockInputValidator.validateInput.mockReturnValue({
                valid: true,
                reason: '',
            });
            mockSettingsService.getSettings.mockResolvedValue({});
            await settingsHandler.handle({
                type: 'save-settings',
                settings: settingsToSave,
            }, mockWebview);
            expect(mockInputValidator.validateInput).toHaveBeenCalledWith('valid-key');
            expect(mockSettingsService.saveSettings).toHaveBeenCalled();
        });
        it('should reject invalid provider', async () => {
            const settingsToSave = {
                provider: 'invalid-provider',
            };
            await settingsHandler.handle({
                type: 'save-settings',
                settings: settingsToSave,
            }, mockWebview);
            expect(mockSettingsService.saveSettings).not.toHaveBeenCalled();
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'settings-error',
                error: expect.any(String),
            });
        });
        it('should reject invalid theme', async () => {
            const settingsToSave = {
                theme: 'invalid-theme',
            };
            await settingsHandler.handle({
                type: 'save-settings',
                settings: settingsToSave,
            }, mockWebview);
            expect(mockSettingsService.saveSettings).not.toHaveBeenCalled();
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'settings-error',
                error: expect.any(String),
            });
        });
        it('should reject non-boolean values for boolean fields', async () => {
            const settingsToSave = {
                autoRead: 'true', // Should be boolean, not string
            };
            await settingsHandler.handle({
                type: 'save-settings',
                settings: settingsToSave,
            }, mockWebview);
            expect(mockSettingsService.saveSettings).not.toHaveBeenCalled();
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'settings-error',
                error: expect.any(String),
            });
        });
        it('should reject invalid API keys', async () => {
            const settingsToSave = {
                geminiApiKey: '<script>alert("xss")</script>',
            };
            mockInputValidator.validateInput.mockReturnValue({
                valid: false,
                reason: 'Contains invalid characters',
            });
            await settingsHandler.handle({
                type: 'save-settings',
                settings: settingsToSave,
            }, mockWebview);
            expect(mockSettingsService.saveSettings).not.toHaveBeenCalled();
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'settings-error',
                error: expect.any(String),
            });
        });
        it('should reject missing settings object', async () => {
            await settingsHandler.handle({
                type: 'save-settings',
            }, mockWebview);
            expect(mockSettingsService.saveSettings).not.toHaveBeenCalled();
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'settings-error',
                error: expect.any(String),
            });
        });
    });
    describe('handle - reset-settings', () => {
        it('should reset settings and send updated settings to webview', async () => {
            const defaultSettings = {
                provider: 'nativeIde',
                theme: 'match-ide',
                autoRead: false,
                autoWrite: false,
                autoExecute: false,
                geminiModel: 'gemini-1.5-pro-latest',
                awsRegion: 'us-east-1',
                awsProfile: 'default',
                awsUseProfile: false,
            };
            mockSettingsService.getSettings.mockResolvedValue(defaultSettings);
            await settingsHandler.handle({ type: 'reset-settings' }, mockWebview);
            expect(mockSettingsService.resetSettings).toHaveBeenCalled();
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'settings-reset',
                success: true,
            });
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'settings-loaded',
                settings: defaultSettings,
            });
        });
    });
    describe('error handling', () => {
        it('should handle errors and send sanitized error messages', async () => {
            mockSettingsService.getSettings.mockRejectedValue(new Error('Database error'));
            await settingsHandler.handle({ type: 'get-settings' }, mockWebview);
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'settings-error',
                error: expect.any(String),
            });
        });
        it('should handle unknown message types', async () => {
            await settingsHandler.handle({ type: 'unknown-type' }, mockWebview);
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'settings-error',
                error: expect.any(String),
            });
        });
    });
});
//# sourceMappingURL=SettingsHandler.test.js.map