/**
 * Extension entry point
 * Sets up dependency injection and activates the extension
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */

import * as vscode from 'vscode';
import { Container } from './di/Container';

// Shared services
import {
  TokenStorageService,
  InputValidator,
  ErrorSanitizer,
  TokenMonitor,
} from './shared/services';

// Core services
import { IProvider, ApiConfiguration } from './core/providers/IProvider';
import { GeminiProvider } from './core/providers/GeminiProvider';
import { BedrockProvider } from './core/providers/BedrockProvider';
import { NativeIDEProvider } from './core/providers/NativeIDEProvider';
import { AgentManager } from './core/agent/AgentManager';

// Build mode services
import {
  StageManager,
  BuildLogManager,
  ContentStreamer,
  BuildModeService,
  BuildModeHandler,
} from './features/build-mode';

// Chat services
import {
  ChatService,
  ConversationManager,
  ChatHandler,
  ConversationStorage,
} from './features/chat';

// Chat file storage
import {
  ConversationFileStorage,
} from './features/chat/services';

// File storage service
import { FileStorageService } from './shared/services/FileStorageService';
import { MigrationService } from './shared/services/MigrationService';

// Personas services
import { PersonasService, PersonasHandler } from './features/personas';
import { PersonaFileStorage } from './features/personas/services/PersonaFileStorage';
import { PersonaMigrationService } from './features/personas/services/PersonaMigrationService';

// Feedback services
import { FeedbackService, FeedbackHandler, FeedbackStorage } from './features/feedback';
import { FeedbackFileStorage } from './features/feedback/services/FeedbackFileStorage';

// Settings services
import { SettingsService, SettingsHandler } from './features/settings';

// Presentation layer
import { SidebarProvider } from './presentation';

/**
 * Get the workspace root path
 */
function getWorkspaceRoot(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error('No workspace folder is open');
  }
  return workspaceFolders[0].uri.fsPath;
}

/**
 * Create an AI provider based on configuration
 */
async function createAIProvider(
  config: vscode.WorkspaceConfiguration,
  tokenStorageService: TokenStorageService
): Promise<IProvider> {
  const provider = config.get<string>('provider', 'nativeIde');

  // Build ApiConfiguration from workspace config and token storage
  const apiConfig: ApiConfiguration = {
    provider,
    apiKey: await tokenStorageService.retrieveApiKey('gemini'),
    awsAccessKey: await tokenStorageService.retrieveApiKey('awsAccessKey'),
    awsSecretKey: await tokenStorageService.retrieveApiKey('awsSecretKey'),
    awsRegion: config.get<string>('awsRegion', 'us-east-1'),
    awsProfile: config.get<string>('awsProfile', 'default'),
    awsUseProfile: config.get<boolean>('bedrockUseAwsProfile', false),
  };

  switch (provider) {
    case 'gemini':
      return new GeminiProvider(apiConfig);
    case 'bedrock':
      return new BedrockProvider(apiConfig);
    case 'nativeIde':
    default:
      return new NativeIDEProvider();
  }
}

/**
 * Clear all legacy globalState keys to free up storage
 * This should be called after successful migration to file storage
 */
async function clearLegacyGlobalState(context: vscode.ExtensionContext): Promise<void> {
  const keysToClean = [
    // Conversation storage
    'conversations',
    'personaut.conversations',
    'conversationHistory', // The main key used by ConversationManager
    'feedbackHistory',

    // Persona storage
    'personaut.customerProfiles',
    'personaut.favoritePersonas',
    'personaut.personas',
    'personaut.favorites',

    // Settings (keep for now as it's small)
    // 'personaut.settings',

    // Token usage (keep for now as it's small and needed for tracking)
    // 'personaut.tokenUsage',

    // Migration flags (keep these)
    // 'personaut.migrated',
    // 'personaut.migratedV2',
    // 'personaut.chat.migration',
  ];

  for (const key of keysToClean) {
    await context.globalState.update(key, undefined);
  }

  console.log(`[Personaut] Cleared ${keysToClean.length} legacy globalState keys`);
}

/**
 * Activate the extension
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('[Personaut] Extension activating...');

  // Initialize file-based storage FIRST and await it
  const fileStorage = new FileStorageService(context.globalStorageUri.fsPath);
  const conversationFileStorage = new ConversationFileStorage(fileStorage);

  try {
    await conversationFileStorage.initialize();
    console.log('[Personaut] File storage initialized successfully');

    // Run migration from globalState if needed
    const migrationService = new MigrationService(context.globalState, conversationFileStorage);
    const migrationResult = await migrationService.runMigrationIfNeeded();
    if (migrationResult) {
      console.log(`[Personaut] Migration complete: ${migrationResult.conversationsMigrated} conversations migrated`);
    }

    // Preload conversations into memory cache for sync get() operations
    await conversationFileStorage.preloadCache();
  } catch (err) {
    console.error('[Personaut] Failed to initialize file storage:', err);
  }

  // Initialize persona file-based storage
  const personaFileStorage = new PersonaFileStorage(fileStorage);
  try {
    await personaFileStorage.initialize();
    console.log('[Personaut] Persona file storage initialized successfully');

    // Run persona migration from globalState if needed
    const personaMigrationService = new PersonaMigrationService(context.globalState, personaFileStorage);
    const personaMigrationResult = await personaMigrationService.runMigrationIfNeeded();
    if (personaMigrationResult) {
      console.log(`[Personaut] Persona migration complete: ${personaMigrationResult.personasMigrated} personas migrated`);
    }

    // Preload personas into memory cache
    await personaFileStorage.preloadCache();
  } catch (err) {
    console.error('[Personaut] Failed to initialize persona file storage:', err);
  }

  // Initialize feedback file-based storage
  const feedbackFileStorage = new FeedbackFileStorage(fileStorage);
  try {
    await feedbackFileStorage.initialize();
    console.log('[Personaut] Feedback file storage initialized successfully');

    // Preload feedback into memory cache
    await feedbackFileStorage.preloadCache();
  } catch (err) {
    console.error('[Personaut] Failed to initialize feedback file storage:', err);
  }

  // Always clear legacy globalState data to free up space
  // This runs after all file-based storage is initialized
  try {
    await clearLegacyGlobalState(context);
    console.log('[Personaut] Legacy globalState cleaned up automatically');
  } catch (err) {
    console.error('[Personaut] Failed to cleanup legacy globalState:', err);
  }

  const container = new Container();

  // Register shared services
  container.register('tokenStorageService', () => {
    const service = new TokenStorageService(context.secrets);
    // Set globalState for token usage persistence
    service.setGlobalState(context.globalState);
    return service;
  });

  container.register('inputValidator', () => new InputValidator());

  container.register('errorSanitizer', () => new ErrorSanitizer());

  container.register('personaStorage', () => personaFileStorage);

  // Register TokenMonitor for LLM token usage tracking
  // IMPORTANT: Initialize WITHOUT SettingsService to break circular dependency
  // TokenMonitor → SettingsService → AgentManager → TokenMonitor
  // SettingsService will be injected lazily after all services are initialized
  let tokenMonitorInstance: TokenMonitor | null = null;
  container.register('tokenMonitor', () => {
    if (!tokenMonitorInstance) {
      const tokenStorageService = container.resolve<TokenStorageService>('tokenStorageService');
      // Pass null for settingsService to break circular dependency
      // setSettingsService() will be called after all services are initialized
      tokenMonitorInstance = new TokenMonitor(tokenStorageService, null);
      // Initialize asynchronously
      tokenMonitorInstance.initialize().catch(err => {
        console.error('[Personaut] Failed to initialize TokenMonitor:', err);
      });
      console.log('[Personaut] TokenMonitor initialized (without SettingsService - will be injected lazily)');
    }
    return tokenMonitorInstance;
  });

  // Register the pre-initialized file storage for conversations (replaces globalState)
  // This was initialized at the top of activate() and is ready to use
  container.register<ConversationStorage>('conversationStorage', () => conversationFileStorage);

  // Register the pre-initialized file storage for feedback (replaces globalState)
  // This was initialized at the top of activate() and is ready to use
  container.register<FeedbackStorage>('feedbackStorage', () => feedbackFileStorage);

  // Register AI provider (lazy initialization)
  let aiProviderInstance: IProvider | null = null;
  container.register('aiProvider', () => {
    if (!aiProviderInstance) {
      // Get necessary dependencies
      const tokenStorage = container.resolve<TokenStorageService>('tokenStorageService');
      const config = vscode.workspace.getConfiguration('personaut');

      // Initialize provider (Note: This returns a Promise, but the factory is sync. 
      // We'll wrap it or use a proxy. For now, we'll initialize asynchronously and update.)
      // better pattern: Return an initialized provider or a proxy that delegates.

      // Ideally, the container should support async factories or we initialize activation events.
      // Given the current DI simplicity, we'll return the NativeIDEProvider initially 
      // but trigger the async creation immediately.

      aiProviderInstance = new NativeIDEProvider(); // Fallback prompt "Initializing..."

      createAIProvider(config, tokenStorage).then(provider => {
        aiProviderInstance = provider;
        console.log('[Personaut] AI Provider initialized:', config.get('provider'));
      }).catch(err => {
        console.error('[Personaut] Failed to initialize AI provider:', err);
      });
    }
    return aiProviderInstance;
  });

  // Register core services
  container.register('stageManager', () => {
    try {
      const workspaceRoot = getWorkspaceRoot();
      // Always use .personaut subdirectory within workspace
      const personautDir = vscode.Uri.joinPath(vscode.Uri.file(workspaceRoot), '.personaut').fsPath;
      return new StageManager(personautDir);
    } catch (error) {
      console.warn('[Personaut] No workspace folder open, using default path');
      return new StageManager('.personaut');
    }
  });

  container.register('buildLogManager', () => {
    try {
      const workspaceRoot = getWorkspaceRoot();
      // Always use .personaut subdirectory within workspace
      const personautDir = vscode.Uri.joinPath(vscode.Uri.file(workspaceRoot), '.personaut').fsPath;
      return new BuildLogManager(personautDir);
    } catch (error) {
      console.warn('[Personaut] No workspace folder open, using default path');
      return new BuildLogManager('.personaut');
    }
  });

  container.register('contentStreamer', () => {
    const stageManager = container.resolve<StageManager>('stageManager');
    return new ContentStreamer(stageManager);
  });

  // Register conversation manager
  container.register('conversationManager', () => {
    const storage = container.resolve<ConversationStorage>('conversationStorage');
    return new ConversationManager(storage);
  });

  // Register AgentManager (will be initialized with a temporary webview, then updated when real webview is ready)
  let agentManagerInstance: AgentManager | null = null;
  container.register('agentManager', () => {
    if (!agentManagerInstance) {
      // Create a temporary AgentManager with a mock webview
      // This will be updated with the real webview when SidebarProvider is ready
      const tokenStorageService = container.resolve<TokenStorageService>('tokenStorageService');
      const conversationManager = container.resolve<ConversationManager>('conversationManager');
      // Resolve tokenMonitor for token usage tracking
      let tokenMonitor: TokenMonitor | undefined;
      try {
        tokenMonitor = container.resolve<TokenMonitor>('tokenMonitor');
      } catch {
        console.warn('[Extension] TokenMonitor not available, token tracking disabled');
      }

      // Create a minimal mock webview for initialization
      const mockWebview = {
        postMessage: () => Promise.resolve(true),
        onDidReceiveMessage: () => ({ dispose: () => { } }),
        asWebviewUri: (uri: vscode.Uri) => uri,
        cspSource: '',
        html: '',
        options: {},
      } as any as vscode.Webview;

      agentManagerInstance = new AgentManager({
        webview: mockWebview,
        tokenStorageService,
        conversationManager,
        tokenMonitor,
      });
      console.log('[Extension] AgentManager initialized with mock webview');
    }
    return agentManagerInstance;
  });

  // Register feature services
  container.register('chatService', () => {
    const agentManager = container.resolve<AgentManager>('agentManager');
    const conversationManager = container.resolve<ConversationManager>('conversationManager');
    return new ChatService(agentManager, conversationManager);
  });

  container.register('personasService', () => {
    const personaStorage = container.resolve<PersonaFileStorage>('personaStorage');
    const agentManager = container.resolve<AgentManager>('agentManager');
    return new PersonasService(personaStorage, agentManager);
  });

  container.register('feedbackService', () => {
    const storage = container.resolve<FeedbackStorage>('feedbackStorage');
    const agentManager = container.resolve<AgentManager>('agentManager');
    return new FeedbackService(storage, agentManager);
  });

  container.register('buildModeService', () => {
    const stageManager = container.resolve<StageManager>('stageManager');
    const buildLogManager = container.resolve<BuildLogManager>('buildLogManager');
    const contentStreamer = container.resolve<ContentStreamer>('contentStreamer');
    const agentManager = container.resolve<AgentManager>('agentManager');
    return new BuildModeService(stageManager, buildLogManager, contentStreamer, agentManager);
  });

  container.register('settingsService', () => {
    const tokenStorageService = container.resolve<TokenStorageService>('tokenStorageService');
    const agentManager = container.resolve<AgentManager>('agentManager');
    return new SettingsService(tokenStorageService, agentManager);
  });

  // CRITICAL: Inject SettingsService into TokenMonitor AFTER all services are registered
  // This breaks the circular dependency: TokenMonitor → SettingsService → AgentManager → TokenMonitor
  try {
    const tokenMonitor = container.resolve<TokenMonitor>('tokenMonitor');
    const settingsService = container.resolve<SettingsService>('settingsService');
    tokenMonitor.setSettingsService(settingsService);
    console.log('[Personaut] SettingsService injected into TokenMonitor (lazy dependency completed)');
  } catch (error) {
    console.error('[Personaut] Failed to inject SettingsService into TokenMonitor:', error);
    // Continue - TokenMonitor will use default values
  }

  // Register feature handlers (lazy initialization to allow AgentManager to be created first)
  container.register('chatHandler', () => {
    const chatService = container.resolve<ChatService>('chatService');
    const inputValidator = container.resolve<InputValidator>('inputValidator');
    let tokenMonitor: TokenMonitor | undefined;
    try {
      tokenMonitor = container.resolve<TokenMonitor>('tokenMonitor');
    } catch {
      // TokenMonitor not available
    }
    return new ChatHandler(chatService, inputValidator, tokenMonitor);
  });

  container.register('personasHandler', () => {
    const personasService = container.resolve<PersonasService>('personasService');
    const inputValidator = container.resolve<InputValidator>('inputValidator');
    return new PersonasHandler(personasService, inputValidator);
  });

  container.register('feedbackHandler', () => {
    const feedbackService = container.resolve<FeedbackService>('feedbackService');
    const inputValidator = container.resolve<InputValidator>('inputValidator');
    return new FeedbackHandler(feedbackService, inputValidator);
  });

  container.register('buildModeHandler', () => {
    const buildModeService = container.resolve<BuildModeService>('buildModeService');
    const stageManager = container.resolve<StageManager>('stageManager');
    const contentStreamer = container.resolve<ContentStreamer>('contentStreamer');
    const buildLogManager = container.resolve<BuildLogManager>('buildLogManager');
    const inputValidator = container.resolve<InputValidator>('inputValidator');
    const personasService = container.resolve<PersonasService>('personasService');
    return new BuildModeHandler(
      buildModeService,
      stageManager,
      contentStreamer,
      buildLogManager,
      inputValidator,
      personasService
    );
  });

  container.register('settingsHandler', () => {
    const settingsService = container.resolve<SettingsService>('settingsService');
    const inputValidator = container.resolve<InputValidator>('inputValidator');
    return new SettingsHandler(settingsService, inputValidator);
  });

  // Create a custom SidebarProvider that initializes AgentManager when webview is ready
  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    // Pass a callback to initialize AgentManager when webview is created
    (webview: vscode.Webview) => {
      // Set tokenMonitor webview reference for token usage updates
      let tokenMonitor: TokenMonitor | undefined;
      try {
        tokenMonitor = container.resolve<TokenMonitor>('tokenMonitor');
        tokenMonitor.setWebview(webview);
        console.log('[Extension] TokenMonitor webview reference set');
      } catch {
        console.warn('[Extension] TokenMonitor not available, token tracking disabled');
      }

      if (!agentManagerInstance) {
        console.log('[Extension] Initializing AgentManager with webview');
        const tokenStorageService = container.resolve<TokenStorageService>('tokenStorageService');
        const conversationManager = container.resolve<ConversationManager>('conversationManager');

        agentManagerInstance = new AgentManager({
          webview,
          tokenStorageService,
          conversationManager,
          tokenMonitor,
        });
        console.log('[Extension] AgentManager initialized successfully');
      } else {
        // Update webview reference if AgentManager already exists
        console.log('[Extension] Updating AgentManager webview reference');
        agentManagerInstance.updateWebview(webview);
      }
    },
    container.resolve<ChatHandler>('chatHandler'),
    container.resolve<PersonasHandler>('personasHandler'),
    container.resolve<FeedbackHandler>('feedbackHandler'),
    container.resolve<BuildModeHandler>('buildModeHandler'),
    container.resolve<SettingsHandler>('settingsHandler')
  );

  // Register webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('personaut.chatView', sidebarProvider)
  );

  // Store container in context for access by other parts of the extension
  context.subscriptions.push({
    dispose: () => {
      // File storage doesn't need explicit closing (uses fs operations)
      container.clear();
    },
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('personaut.clearCache', async () => {
      // Clear file-based storage
      if (conversationFileStorage) {
        await conversationFileStorage.clearAllConversations();
      }
      if (personaFileStorage) {
        // Note: PersonaFileStorage doesn't have clearAll yet, clear via iteration
        const personas = await personaFileStorage.getAllPersonas();
        for (const p of personas) {
          await personaFileStorage.deletePersona(p.id);
        }
      }

      // Clear all legacy globalState data
      await clearLegacyGlobalState(context);

      vscode.window.showInformationMessage('Personaut cache cleared - all data has been reset');
    })
  );

  // Command to cleanup legacy globalState without affecting file storage (for existing users)
  context.subscriptions.push(
    vscode.commands.registerCommand('personaut.cleanupLegacyStorage', async () => {
      console.log('[Personaut] Cleaning up legacy globalState storage...');
      await clearLegacyGlobalState(context);
      vscode.window.showInformationMessage('Legacy storage cleaned up. Your data is now stored in files for better performance.');
    })
  );

  // Token management commands
  context.subscriptions.push(
    vscode.commands.registerCommand('personaut.resetTokenUsage', async () => {
      try {
        const tokenMonitor = container.resolve<TokenMonitor>('tokenMonitor');
        // Reset all conversation token usage
        await tokenMonitor.resetAllUsage();
        vscode.window.showInformationMessage('Token usage has been reset for all conversations.');
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to reset token usage: ${error.message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('personaut.viewTokenUsage', async () => {
      try {
        const tokenMonitor = container.resolve<TokenMonitor>('tokenMonitor');
        // Get aggregated usage across all conversations
        const usage = tokenMonitor.getGlobalUsage();
        const limit = await tokenMonitor.getEffectiveLimit('global');
        const percentUsed = limit > 0 ? Math.round((usage.totalTokens / limit) * 100) : 0;

        vscode.window.showInformationMessage(
          `Token Usage: ${usage.totalTokens.toLocaleString()} / ${limit.toLocaleString()} (${percentUsed}%)\n` +
          `Input: ${usage.inputTokens.toLocaleString()} | Output: ${usage.outputTokens.toLocaleString()}`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to view token usage: ${error.message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('personaut.setConversationLimit', async () => {
      try {
        const tokenMonitor = container.resolve<TokenMonitor>('tokenMonitor');
        const conversationId = 'global';

        const currentLimit = await tokenMonitor.getEffectiveLimit(conversationId);

        const input = await vscode.window.showInputBox({
          prompt: 'Enter new token limit',
          value: currentLimit.toString(),
          validateInput: (value) => {
            const num = parseInt(value, 10);
            if (isNaN(num) || num < 1) {
              return 'Please enter a valid positive number';
            }
            return null;
          },
        });

        if (input) {
          const newLimit = parseInt(input, 10);
          await tokenMonitor.setConversationLimit(conversationId, newLimit);
          vscode.window.showInformationMessage(`Token limit set to ${newLimit.toLocaleString()}.`);
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to set conversation limit: ${error.message}`);
      }
    })
  );

  // NOTE: SessionLifecycleManager has been deprecated along with SQLite storage.
  // File-based storage handles session differently - conversations are persisted
  // immediately and don't require explicit session management.

  console.log('[Personaut] Extension activated successfully');
  console.log('[Personaut] Registered services:', container.getRegisteredKeys());
}

/**
 * Deactivate the extension
 */
export function deactivate() {
  console.log('[Personaut] Extension deactivating...');
  // Session lifecycle cleanup is handled by the disposable registered in activate()
}
