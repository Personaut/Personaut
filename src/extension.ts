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
  PersonaStorage,
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

// Personas services
import { PersonasService, PersonasHandler } from './features/personas';

// Feedback services
import { FeedbackService, FeedbackHandler, FeedbackStorage } from './features/feedback';

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
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('[Personaut] Extension activating...');

  const container = new Container();

  // Register shared services
  container.register('tokenStorageService', () => new TokenStorageService(context.secrets));

  container.register('inputValidator', () => new InputValidator());

  container.register('errorSanitizer', () => new ErrorSanitizer());

  container.register('personaStorage', () => new PersonaStorage(context));

  // Register storage implementations
  container.register<ConversationStorage>('conversationStorage', () => ({
    get: <T>(key: string, defaultValue: T): T => {
      return context.globalState.get(key, defaultValue);
    },
    update: async (key: string, value: unknown): Promise<void> => {
      await context.globalState.update(key, value);
    },
  }));

  container.register<FeedbackStorage>('feedbackStorage', () => ({
    get: <T>(key: string, defaultValue: T): T => {
      return context.globalState.get(key, defaultValue);
    },
    update: async (key: string, value: unknown): Promise<void> => {
      await context.globalState.update(key, value);
    },
  }));

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
      return new StageManager(workspaceRoot);
    } catch (error) {
      console.warn('[Personaut] No workspace folder open, using default path');
      return new StageManager('.personaut');
    }
  });

  container.register('buildLogManager', () => {
    try {
      const workspaceRoot = getWorkspaceRoot();
      return new BuildLogManager(workspaceRoot);
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

  // Register AgentManager (will be initialized with webview after SidebarProvider is created)
  let agentManagerInstance: AgentManager | null = null;
  container.register('agentManager', () => {
    if (!agentManagerInstance) {
      throw new Error('AgentManager not initialized. SidebarProvider must be created first.');
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
    const personaStorage = container.resolve<PersonaStorage>('personaStorage');
    const aiProvider = container.resolve<IProvider>('aiProvider');
    return new PersonasService(personaStorage, aiProvider);
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
    // AgentManager is optional - it will be available after SidebarProvider initialization
    // We pass undefined initially, and the service will work without agent notifications
    try {
      const agentManager = container.resolve<AgentManager>('agentManager');
      return new SettingsService(tokenStorageService, agentManager);
    } catch {
      // AgentManager not yet initialized, create without it
      return new SettingsService(tokenStorageService);
    }
  });

  // Register feature handlers (lazy initialization to allow AgentManager to be created first)
  container.register('chatHandler', () => {
    const chatService = container.resolve<ChatService>('chatService');
    const inputValidator = container.resolve<InputValidator>('inputValidator');
    return new ChatHandler(chatService, inputValidator);
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
    return new BuildModeHandler(
      buildModeService,
      stageManager,
      contentStreamer,
      buildLogManager,
      inputValidator
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
      if (!agentManagerInstance) {
        console.log('[Extension] Initializing AgentManager with webview');
        const tokenStorageService = container.resolve<TokenStorageService>('tokenStorageService');
        const conversationManager = container.resolve<ConversationManager>('conversationManager');
        
        agentManagerInstance = new AgentManager({
          webview,
          tokenStorageService,
          conversationManager,
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
      container.clear();
    },
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('personaut.clearCache', async () => {
      await context.globalState.update('conversations', undefined);
      await context.globalState.update('feedbackHistory', undefined);
      vscode.window.showInformationMessage('Personaut cache cleared');
    })
  );

  console.log('[Personaut] Extension activated successfully');
  console.log('[Personaut] Registered services:', container.getRegisteredKeys());
}

/**
 * Deactivate the extension
 */
export function deactivate() {
  console.log('[Personaut] Extension deactivating...');
}
