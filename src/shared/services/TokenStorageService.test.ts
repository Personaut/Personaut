/**
 * Unit tests for TokenStorageService
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.3
 */

import { TokenStorageService } from './TokenStorageService';

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

jest.mock(
  'vscode',
  () => ({
    workspace: {
      getConfiguration: jest.fn(() => mockWorkspaceConfiguration),
    },
    ConfigurationTarget: {
      Global: 1,
    },
  }),
  { virtual: true }
);

describe('TokenStorageService', () => {
  let tokenStorageService: TokenStorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    tokenStorageService = new TokenStorageService(mockSecretStorage as any);
  });

  describe('storeApiKey', () => {
    it('should store API key with correct prefix', async () => {
      await tokenStorageService.storeApiKey('gemini', 'test-key');

      expect(mockSecretStorage.store).toHaveBeenCalledWith('personaut.apiKey.gemini', 'test-key');
    });

    it('should throw error for empty provider', async () => {
      await expect(tokenStorageService.storeApiKey('', 'test-key')).rejects.toThrow(
        'Provider must be a non-empty string'
      );
    });

    it('should throw error for null/undefined key', async () => {
      await expect(tokenStorageService.storeApiKey('test', null as any)).rejects.toThrow(
        'API key cannot be undefined or null'
      );
      await expect(tokenStorageService.storeApiKey('test', undefined as any)).rejects.toThrow(
        'API key cannot be undefined or null'
      );
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
      await expect(tokenStorageService.retrieveApiKey('')).rejects.toThrow(
        'Provider must be a non-empty string'
      );
    });
  });

  describe('deleteApiKey', () => {
    it('should delete API key with correct prefix', async () => {
      await tokenStorageService.deleteApiKey('gemini');

      expect(mockSecretStorage.delete).toHaveBeenCalledWith('personaut.apiKey.gemini');
    });

    it('should throw error for empty provider', async () => {
      await expect(tokenStorageService.deleteApiKey('')).rejects.toThrow(
        'Provider must be a non-empty string'
      );
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

      const result = await tokenStorageService.migrateFromGlobalState(mockMemento as any);

      expect(mockSecretStorage.store).toHaveBeenCalledWith('personaut.apiKey.gemini', 'gemini-key');
      expect(mockSecretStorage.store).toHaveBeenCalledWith(
        'personaut.apiKey.awsAccessKey',
        'aws-access'
      );
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

      const result = await tokenStorageService.migrateFromGlobalState(mockMemento as any);

      expect(result.migrated.length).toBe(0);
      expect(result.removed.length).toBe(0);
    });

    it('should handle errors during migration', async () => {
      const settings = {
        geminiApiKey: 'test-key',
      };

      mockMemento.get.mockReturnValue(settings);
      mockSecretStorage.store.mockRejectedValueOnce(new Error('Storage failed'));

      const result = await tokenStorageService.migrateFromGlobalState(mockMemento as any);

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].provider).toBe('gemini');
      expect(result.errors[0].error).toBe('Storage failed');
    });
  });

  describe('migrateFromPlainText', () => {
    it('should migrate keys from VS Code configuration to SecretStorage', async () => {
      mockWorkspaceConfiguration.get.mockImplementation((key: string) => {
        if (key === 'geminiApiKey') return 'gemini-secret';
        if (key === 'awsAccessKey') return 'aws-access-key';
        return undefined;
      });

      const result = await tokenStorageService.migrateFromPlainText();

      expect(mockSecretStorage.store).toHaveBeenCalledWith('personaut.apiKey.gemini', 'gemini-secret');
      expect(mockSecretStorage.store).toHaveBeenCalledWith('personaut.apiKey.awsAccessKey', 'aws-access-key');
      expect(result.migrated).toContain('gemini');
      expect(result.migrated).toContain('awsAccessKey');
    });

    it('should not migrate empty or whitespace keys from config', async () => {
      mockWorkspaceConfiguration.get.mockImplementation((key: string) => {
        if (key === 'geminiApiKey') return '   ';
        if (key === 'awsAccessKey') return '';
        return undefined;
      });

      const result = await tokenStorageService.migrateFromPlainText();

      expect(mockSecretStorage.store).not.toHaveBeenCalled();
      expect(result.migrated.length).toBe(0);
    });

    it('should handle errors during plain text migration', async () => {
      mockWorkspaceConfiguration.get.mockReturnValue('test-key');
      mockSecretStorage.store.mockRejectedValueOnce(new Error('Storage failed'));

      const result = await tokenStorageService.migrateFromPlainText();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].error).toBe('Storage failed');
    });
  });

  describe('Token Usage - GlobalState Not Initialized', () => {
    it('getTokenUsage should return null when globalState not set', async () => {
      // Don't set globalState
      const result = await tokenStorageService.getTokenUsage('test-id');
      expect(result).toBeNull();
    });

    it('saveTokenUsage should do nothing when globalState not set', async () => {
      // Don't set globalState
      await tokenStorageService.saveTokenUsage('test-id', {
        conversationId: 'test-id',
        totalTokens: 100,
        inputTokens: 50,
        outputTokens: 50,
        lastUpdated: Date.now(),
      });
      // Should not throw, just log warning
      expect(mockMemento.update).not.toHaveBeenCalled();
    });

    it('clearTokenUsage should do nothing when globalState not set', async () => {
      // Don't set globalState
      await tokenStorageService.clearTokenUsage('test-id');
      // Should not throw, just log warning
      expect(mockMemento.update).not.toHaveBeenCalled();
    });

    it('getAllTokenUsage should return empty object when globalState not set', async () => {
      // Don't set globalState
      const result = await tokenStorageService.getAllTokenUsage();
      expect(result).toEqual({});
    });
  });

  describe('Token Usage - With GlobalState', () => {
    beforeEach(() => {
      tokenStorageService.setGlobalState(mockMemento as any);
    });

    it('getTokenUsage should return usage when exists', async () => {
      const storedUsage = {
        'conv-1': {
          totalTokens: 100,
          inputTokens: 50,
          outputTokens: 50,
          lastUpdated: 12345,
          limit: 1000,
        },
      };
      mockMemento.get.mockReturnValue(storedUsage);

      const result = await tokenStorageService.getTokenUsage('conv-1');

      expect(result).toEqual({
        conversationId: 'conv-1',
        totalTokens: 100,
        inputTokens: 50,
        outputTokens: 50,
        lastUpdated: 12345,
        limit: 1000,
      });
    });

    it('getTokenUsage should return null when conversation not found', async () => {
      mockMemento.get.mockReturnValue({});

      const result = await tokenStorageService.getTokenUsage('nonexistent');

      expect(result).toBeNull();
    });

    it('saveTokenUsage should update globalState', async () => {
      mockMemento.get.mockReturnValue({});

      await tokenStorageService.saveTokenUsage('conv-1', {
        conversationId: 'conv-1',
        totalTokens: 200,
        inputTokens: 100,
        outputTokens: 100,
        lastUpdated: 54321,
      });

      expect(mockMemento.update).toHaveBeenCalled();
      const updateCall = mockMemento.update.mock.calls[0];
      expect(updateCall[0]).toBe('personaut.tokenUsage');
      expect(updateCall[1]['conv-1'].totalTokens).toBe(200);
    });

    it('clearTokenUsage should remove conversation from globalState', async () => {
      const storedUsage = {
        'conv-1': { totalTokens: 100 },
        'conv-2': { totalTokens: 200 },
      };
      mockMemento.get.mockReturnValue(storedUsage);

      await tokenStorageService.clearTokenUsage('conv-1');

      expect(mockMemento.update).toHaveBeenCalled();
      const updateCall = mockMemento.update.mock.calls[0];
      expect(updateCall[1]['conv-1']).toBeUndefined();
      expect(updateCall[1]['conv-2']).toBeDefined();
    });

    it('getAllTokenUsage should return all stored usage', async () => {
      const storedUsage = {
        'conv-1': { totalTokens: 100 },
        'conv-2': { totalTokens: 200 },
      };
      mockMemento.get.mockReturnValue(storedUsage);

      const result = await tokenStorageService.getAllTokenUsage();

      expect(result).toEqual(storedUsage);
    });
  });
});

