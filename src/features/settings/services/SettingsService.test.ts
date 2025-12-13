/**
 * Unit tests for SettingsService
 *
 * Feature: feature-based-architecture, agent-interaction-fixes
 * Validates: Requirements 6.1, 6.2, 6.3, 5.4
 */

import { SettingsService } from './SettingsService';
import { TokenStorageService } from '../../../shared/services/TokenStorageService';
import { AgentManager } from '../../../core/agent/AgentManager';

// Mock vscode module
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

describe('SettingsService', () => {
  let settingsService: SettingsService;
  let mockTokenStorageService: jest.Mocked<TokenStorageService>;
  let mockAgentManager: jest.Mocked<AgentManager>;

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
    } as any;

    // Create mock AgentManager
    mockAgentManager = {
      updateSettings: jest.fn(),
      reinitializeAgents: jest.fn(),
    } as any;

    settingsService = new SettingsService(mockTokenStorageService, mockAgentManager);
  });

  describe('getSettings', () => {
    it('should retrieve settings from configuration and secure storage', async () => {
      // Mock configuration values
      mockWorkspaceConfiguration.get.mockImplementation((key: string, defaultValue?: any) => {
        const values: Record<string, any> = {
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
      mockWorkspaceConfiguration.get.mockImplementation((_key: string, defaultValue?: any) => {
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
      mockWorkspaceConfiguration.get.mockImplementation((_key: string, defaultValue?: any) => {
        return defaultValue;
      });

      mockTokenStorageService.getAllApiKeys.mockResolvedValue({
        geminiApiKey: undefined,
        awsAccessKey: undefined,
        awsSecretKey: undefined,
      });

      const settings = await settingsService.getSettings();

      // API keys are converted to empty string for UI compatibility
      expect(settings.geminiApiKey).toBe('');
      expect(settings.awsAccessKey).toBe('');
      expect(settings.awsSecretKey).toBe('');
    });
  });

  describe('saveSettings', () => {
    it('should save non-sensitive settings to configuration', async () => {
      // Mock getAllApiKeys for notifySettingsChanged
      mockTokenStorageService.getAllApiKeys.mockResolvedValue({});
      mockWorkspaceConfiguration.get.mockImplementation((_key: string, defaultValue?: any) => {
        return defaultValue;
      });

      const settingsToSave = {
        provider: 'bedrock' as const,
        theme: 'personaut' as const,
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
      expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith(
        'geminiModel',
        'gemini-1.5-flash',
        1
      );
      expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('awsRegion', 'eu-west-1', 1);
      expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('awsProfile', 'production', 1);
      expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('awsUseProfile', true, 1);
    });

    it('should save API keys to secure storage', async () => {
      // Mock getAllApiKeys for notifySettingsChanged
      mockTokenStorageService.getAllApiKeys.mockResolvedValue({});
      mockWorkspaceConfiguration.get.mockImplementation((_key: string, defaultValue?: any) => {
        return defaultValue;
      });

      const settingsToSave = {
        geminiApiKey: 'new-gemini-key',
        awsAccessKey: 'new-aws-access',
        awsSecretKey: 'new-aws-secret',
      };

      await settingsService.saveSettings(settingsToSave);

      expect(mockTokenStorageService.storeApiKey).toHaveBeenCalledWith('gemini', 'new-gemini-key');
      expect(mockTokenStorageService.storeApiKey).toHaveBeenCalledWith(
        'awsAccessKey',
        'new-aws-access'
      );
      expect(mockTokenStorageService.storeApiKey).toHaveBeenCalledWith(
        'awsSecretKey',
        'new-aws-secret'
      );
    });

    it('should delete API keys when empty string is provided', async () => {
      // Mock getAllApiKeys for notifySettingsChanged
      mockTokenStorageService.getAllApiKeys.mockResolvedValue({});
      mockWorkspaceConfiguration.get.mockImplementation((_key: string, defaultValue?: any) => {
        return defaultValue;
      });

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
      // Mock getAllApiKeys for notifySettingsChanged
      mockTokenStorageService.getAllApiKeys.mockResolvedValue({});
      mockWorkspaceConfiguration.get.mockImplementation((_key: string, defaultValue?: any) => {
        return defaultValue;
      });

      const settingsToSave = {
        provider: 'gemini' as const,
        autoRead: true,
      };

      await settingsService.saveSettings(settingsToSave);

      expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('provider', 'gemini', 1);
      expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith('autoRead', true, 1);
      expect(mockWorkspaceConfiguration.update).not.toHaveBeenCalledWith(
        'theme',
        expect.anything(),
        expect.anything()
      );
      expect(mockWorkspaceConfiguration.update).not.toHaveBeenCalledWith(
        'autoWrite',
        expect.anything(),
        expect.anything()
      );
    });

    it('should handle partial API key updates', async () => {
      // Mock getAllApiKeys for notifySettingsChanged
      mockTokenStorageService.getAllApiKeys.mockResolvedValue({});
      mockWorkspaceConfiguration.get.mockImplementation((_key: string, defaultValue?: any) => {
        return defaultValue;
      });

      const settingsToSave = {
        geminiApiKey: 'only-gemini-key',
      };

      await settingsService.saveSettings(settingsToSave);

      expect(mockTokenStorageService.storeApiKey).toHaveBeenCalledWith('gemini', 'only-gemini-key');
      expect(mockTokenStorageService.storeApiKey).not.toHaveBeenCalledWith(
        'awsAccessKey',
        expect.anything()
      );
      expect(mockTokenStorageService.storeApiKey).not.toHaveBeenCalledWith(
        'awsSecretKey',
        expect.anything()
      );
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
      expect(mockWorkspaceConfiguration.update).toHaveBeenCalledWith(
        'geminiModel',
        'gemini-1.5-pro-latest',
        1
      );
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

  describe('validateProviderSettings', () => {
    it('should validate gemini provider settings', async () => {
      mockWorkspaceConfiguration.get.mockImplementation((key: string, defaultValue?: any) => {
        const values: Record<string, any> = {
          geminiModel: 'gemini-1.5-pro',
        };
        return values[key] ?? defaultValue;
      });

      mockTokenStorageService.getAllApiKeys.mockResolvedValue({
        geminiApiKey: 'test-key',
      });

      const result = await settingsService.validateProviderSettings('gemini');

      expect(result.valid).toBe(true);
      expect(result.missingSettings).toEqual([]);
    });

    it('should detect missing gemini API key', async () => {
      mockWorkspaceConfiguration.get.mockImplementation((key: string, defaultValue?: any) => {
        const values: Record<string, any> = {
          geminiModel: 'gemini-1.5-pro',
        };
        return values[key] ?? defaultValue;
      });

      mockTokenStorageService.getAllApiKeys.mockResolvedValue({
        geminiApiKey: '',
      });

      const result = await settingsService.validateProviderSettings('gemini');

      expect(result.valid).toBe(false);
      expect(result.missingSettings).toContain('geminiApiKey');
    });

    it('should validate bedrock provider settings with access keys', async () => {
      mockWorkspaceConfiguration.get.mockImplementation((key: string, defaultValue?: any) => {
        const values: Record<string, any> = {
          awsRegion: 'us-east-1',
          bedrockModel: 'anthropic.claude-3-sonnet',
          awsUseProfile: false,
        };
        return values[key] ?? defaultValue;
      });

      mockTokenStorageService.getAllApiKeys.mockResolvedValue({
        awsAccessKey: 'test-access',
        awsSecretKey: 'test-secret',
      });

      const result = await settingsService.validateProviderSettings('bedrock');

      expect(result.valid).toBe(true);
      expect(result.missingSettings).toEqual([]);
    });

    it('should validate bedrock provider settings with profile', async () => {
      mockWorkspaceConfiguration.get.mockImplementation((key: string, defaultValue?: any) => {
        const values: Record<string, any> = {
          awsRegion: 'us-east-1',
          bedrockModel: 'anthropic.claude-3-sonnet',
          awsUseProfile: true,
          awsProfile: 'my-profile',
        };
        return values[key] ?? defaultValue;
      });

      mockTokenStorageService.getAllApiKeys.mockResolvedValue({});

      const result = await settingsService.validateProviderSettings('bedrock');

      expect(result.valid).toBe(true);
      expect(result.missingSettings).toEqual([]);
    });

    it('should detect missing bedrock settings', async () => {
      mockWorkspaceConfiguration.get.mockImplementation((key: string, defaultValue?: any) => {
        const values: Record<string, any> = {
          awsUseProfile: false,
        };
        return values[key] ?? defaultValue;
      });

      mockTokenStorageService.getAllApiKeys.mockResolvedValue({});

      const result = await settingsService.validateProviderSettings('bedrock');

      expect(result.valid).toBe(false);
      expect(result.missingSettings).toContain('awsAccessKey');
      expect(result.missingSettings).toContain('awsSecretKey');
    });

    it('should validate nativeIde provider without additional settings', async () => {
      mockWorkspaceConfiguration.get.mockImplementation((_key: string, defaultValue?: any) => {
        return defaultValue;
      });

      mockTokenStorageService.getAllApiKeys.mockResolvedValue({});

      const result = await settingsService.validateProviderSettings('nativeIde');

      expect(result.valid).toBe(true);
      expect(result.missingSettings).toEqual([]);
    });
  });

  describe('notifySettingsChanged', () => {
    it('should not notify when AgentManager is not provided', async () => {
      const serviceWithoutAgent = new SettingsService(mockTokenStorageService);
      
      const settingsToSave = {
        provider: 'gemini' as const,
      };

      // Should not throw
      await serviceWithoutAgent.saveSettings(settingsToSave);
    });

    it('should log critical settings changes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockWorkspaceConfiguration.get.mockImplementation((key: string, defaultValue?: any) => {
        const values: Record<string, any> = {
          provider: 'gemini',
        };
        return values[key] ?? defaultValue;
      });

      mockTokenStorageService.getAllApiKeys.mockResolvedValue({
        geminiApiKey: 'test-key',
      });

      const settingsToSave = {
        provider: 'gemini' as const,
        geminiApiKey: 'new-key',
      };

      await settingsService.saveSettings(settingsToSave);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SettingsService] Critical settings changed, notifying AgentManager:',
        expect.objectContaining({
          changedSettings: expect.arrayContaining(['provider', 'geminiApiKey']),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log non-critical settings changes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockWorkspaceConfiguration.get.mockImplementation((_key: string, defaultValue?: any) => {
        return defaultValue;
      });

      mockTokenStorageService.getAllApiKeys.mockResolvedValue({});

      const settingsToSave = {
        theme: 'dark' as const,
        autoRead: true,
      };

      await settingsService.saveSettings(settingsToSave);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SettingsService] Non-critical settings changed, no agent reinitialization needed:',
        expect.objectContaining({
          changedSettings: expect.arrayContaining(['theme', 'autoRead']),
        })
      );

      consoleSpy.mockRestore();
    });
  });
});
