"use strict";
/**
 * Unit tests for TokenStorageService
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
const TokenStorageService_1 = require("./TokenStorageService");
// Mock vscode module
const mockSecretStorage = {
    store: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
};
const mockMemento = {
    get: jest.fn(),
    update: jest.fn(),
};
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
describe('TokenStorageService', () => {
    let tokenStorageService;
    beforeEach(() => {
        jest.clearAllMocks();
        tokenStorageService = new TokenStorageService_1.TokenStorageService(mockSecretStorage);
    });
    describe('storeApiKey', () => {
        it('should store API key with correct prefix', async () => {
            await tokenStorageService.storeApiKey('gemini', 'test-key');
            expect(mockSecretStorage.store).toHaveBeenCalledWith('personaut.apiKey.gemini', 'test-key');
        });
        it('should throw error for empty provider', async () => {
            await expect(tokenStorageService.storeApiKey('', 'test-key')).rejects.toThrow('Provider must be a non-empty string');
        });
        it('should throw error for null/undefined key', async () => {
            await expect(tokenStorageService.storeApiKey('test', null)).rejects.toThrow('API key cannot be undefined or null');
            await expect(tokenStorageService.storeApiKey('test', undefined)).rejects.toThrow('API key cannot be undefined or null');
        });
    });
    describe('retrieveApiKey', () => {
        it('should retrieve API key with correct prefix', async () => {
            mockSecretStorage.get.mockResolvedValue('test-key');
            const result = await tokenStorageService.retrieveApiKey('gemini');
            expect(mockSecretStorage.get).toHaveBeenCalledWith('personaut.apiKey.gemini');
            expect(result).toBe('test-key');
        });
        it('should return undefined for non-existent key', async () => {
            mockSecretStorage.get.mockResolvedValue(undefined);
            const result = await tokenStorageService.retrieveApiKey('nonexistent');
            expect(result).toBeUndefined();
        });
        it('should throw error for empty provider', async () => {
            await expect(tokenStorageService.retrieveApiKey('')).rejects.toThrow('Provider must be a non-empty string');
        });
    });
    describe('deleteApiKey', () => {
        it('should delete API key with correct prefix', async () => {
            await tokenStorageService.deleteApiKey('gemini');
            expect(mockSecretStorage.delete).toHaveBeenCalledWith('personaut.apiKey.gemini');
        });
        it('should throw error for empty provider', async () => {
            await expect(tokenStorageService.deleteApiKey('')).rejects.toThrow('Provider must be a non-empty string');
        });
    });
    describe('hasApiKey', () => {
        it('should return true when key exists', async () => {
            mockSecretStorage.get.mockResolvedValue('test-key');
            const result = await tokenStorageService.hasApiKey('gemini');
            expect(result).toBe(true);
        });
        it('should return false when key does not exist', async () => {
            mockSecretStorage.get.mockResolvedValue(undefined);
            const result = await tokenStorageService.hasApiKey('gemini');
            expect(result).toBe(false);
        });
        it('should return false for empty key', async () => {
            mockSecretStorage.get.mockResolvedValue('');
            const result = await tokenStorageService.hasApiKey('gemini');
            expect(result).toBe(false);
        });
    });
    describe('getAllApiKeys', () => {
        it('should retrieve all API keys', async () => {
            mockSecretStorage.get
                .mockResolvedValueOnce('gemini-key')
                .mockResolvedValueOnce('aws-access')
                .mockResolvedValueOnce('aws-secret');
            const result = await tokenStorageService.getAllApiKeys();
            expect(result.geminiApiKey).toBe('gemini-key');
            expect(result.awsAccessKey).toBe('aws-access');
            expect(result.awsSecretKey).toBe('aws-secret');
        });
    });
    describe('migrateFromGlobalState', () => {
        it('should migrate keys from globalState to SecretStorage', async () => {
            const settings = {
                geminiApiKey: 'gemini-key',
                awsAccessKey: 'aws-access',
                apiProvider: 'gemini',
            };
            mockMemento.get.mockReturnValue(settings);
            const result = await tokenStorageService.migrateFromGlobalState(mockMemento);
            expect(mockSecretStorage.store).toHaveBeenCalledWith('personaut.apiKey.gemini', 'gemini-key');
            expect(mockSecretStorage.store).toHaveBeenCalledWith('personaut.apiKey.awsAccessKey', 'aws-access');
            expect(result.migrated).toContain('gemini');
            expect(result.migrated).toContain('awsAccessKey');
            expect(result.removed).toContain('geminiApiKey');
            expect(result.removed).toContain('awsAccessKey');
        });
        it('should not migrate empty or whitespace keys', async () => {
            const settings = {
                geminiApiKey: '   ',
                awsAccessKey: '',
            };
            mockMemento.get.mockReturnValue(settings);
            const result = await tokenStorageService.migrateFromGlobalState(mockMemento);
            expect(result.migrated.length).toBe(0);
            expect(result.removed.length).toBe(0);
        });
    });
});
//# sourceMappingURL=TokenStorageService.test.js.map