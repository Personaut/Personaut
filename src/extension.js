"use strict";
/**
 * Extension entry point
 * Sets up dependency injection and activates the extension
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const Container_1 = require("./di/Container");
// Shared services
const services_1 = require("./shared/services");
const GeminiProvider_1 = require("./core/providers/GeminiProvider");
const BedrockProvider_1 = require("./core/providers/BedrockProvider");
const NativeIDEProvider_1 = require("./core/providers/NativeIDEProvider");
// Build mode services
const build_mode_1 = require("./features/build-mode");
// Chat services
const chat_1 = require("./features/chat");
// Personas services
const personas_1 = require("./features/personas");
// Feedback services
const feedback_1 = require("./features/feedback");
// Settings services
const settings_1 = require("./features/settings");
// Presentation layer
const presentation_1 = require("./presentation");
/**
 * Get the workspace root path
 */
function getWorkspaceRoot() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder is open');
    }
    return workspaceFolders[0].uri.fsPath;
}
/**
 * Create an AI provider based on configuration
 */
async function createAIProvider(config, tokenStorageService) {
    const provider = config.get('provider', 'nativeIde');
    // Build ApiConfiguration from workspace config and token storage
    const apiConfig = {
        provider,
        apiKey: await tokenStorageService.retrieveApiKey('gemini'),
        awsAccessKey: await tokenStorageService.retrieveApiKey('awsAccessKey'),
        awsSecretKey: await tokenStorageService.retrieveApiKey('awsSecretKey'),
        awsRegion: config.get('awsRegion', 'us-east-1'),
        awsProfile: config.get('awsProfile', 'default'),
        awsUseProfile: config.get('bedrockUseAwsProfile', false),
    };
    switch (provider) {
        case 'gemini':
            return new GeminiProvider_1.GeminiProvider(apiConfig);
        case 'bedrock':
            return new BedrockProvider_1.BedrockProvider(apiConfig);
        case 'nativeIde':
        default:
            return new NativeIDEProvider_1.NativeIDEProvider();
    }
}
/**
 * Activate the extension
 */
function activate(context) {
    console.log('[Personaut] Extension activating...');
    const container = new Container_1.Container();
    // Register shared services
    container.register('tokenStorageService', () => new services_1.TokenStorageService(context.secrets));
    container.register('inputValidator', () => new services_1.InputValidator());
    container.register('errorSanitizer', () => new services_1.ErrorSanitizer());
    container.register('personaStorage', () => new services_1.PersonaStorage(context));
    // Register storage implementations
    container.register('conversationStorage', () => ({
        get: (key, defaultValue) => {
            return context.globalState.get(key, defaultValue);
        },
        update: async (key, value) => {
            await context.globalState.update(key, value);
        },
    }));
    container.register('feedbackStorage', () => ({
        get: (key, defaultValue) => {
            return context.globalState.get(key, defaultValue);
        },
        update: async (key, value) => {
            await context.globalState.update(key, value);
        },
    }));
    // Register AI provider (lazy initialization)
    let aiProviderInstance = null;
    container.register('aiProvider', () => {
        if (!aiProviderInstance) {
            // Create provider synchronously using NativeIDEProvider as default
            // This will be replaced when settings are loaded
            aiProviderInstance = new NativeIDEProvider_1.NativeIDEProvider();
        }
        return aiProviderInstance;
    });
    // Register core services
    container.register('stageManager', () => {
        try {
            const workspaceRoot = getWorkspaceRoot();
            return new build_mode_1.StageManager(workspaceRoot);
        }
        catch (error) {
            console.warn('[Personaut] No workspace folder open, using default path');
            return new build_mode_1.StageManager('.personaut');
        }
    });
    container.register('buildLogManager', () => {
        try {
            const workspaceRoot = getWorkspaceRoot();
            return new build_mode_1.BuildLogManager(workspaceRoot);
        }
        catch (error) {
            console.warn('[Personaut] No workspace folder open, using default path');
            return new build_mode_1.BuildLogManager('.personaut');
        }
    });
    container.register('contentStreamer', () => {
        const stageManager = container.resolve('stageManager');
        return new build_mode_1.ContentStreamer(stageManager);
    });
    // Register conversation manager
    container.register('conversationManager', () => {
        const storage = container.resolve('conversationStorage');
        return new chat_1.ConversationManager(storage);
    });
    // Register feature services
    container.register('chatService', () => {
        const conversationManager = container.resolve('conversationManager');
        const tokenStorageService = container.resolve('tokenStorageService');
        // Note: Agent will be created when needed by the ChatHandler
        // For now, we create a placeholder that will be replaced when the webview is ready
        // This is a temporary solution until we refactor to create agents per-conversation
        return new chat_1.ChatService(null, conversationManager);
    });
    container.register('personasService', () => {
        const personaStorage = container.resolve('personaStorage');
        const aiProvider = container.resolve('aiProvider');
        return new personas_1.PersonasService(personaStorage, aiProvider);
    });
    container.register('feedbackService', () => {
        const storage = container.resolve('feedbackStorage');
        return new feedback_1.FeedbackService(storage);
    });
    container.register('buildModeService', () => {
        const stageManager = container.resolve('stageManager');
        const buildLogManager = container.resolve('buildLogManager');
        const contentStreamer = container.resolve('contentStreamer');
        return new build_mode_1.BuildModeService(stageManager, buildLogManager, contentStreamer);
    });
    container.register('settingsService', () => {
        const tokenStorageService = container.resolve('tokenStorageService');
        return new settings_1.SettingsService(tokenStorageService);
    });
    // Register feature handlers
    container.register('chatHandler', () => {
        const chatService = container.resolve('chatService');
        const inputValidator = container.resolve('inputValidator');
        return new chat_1.ChatHandler(chatService, inputValidator);
    });
    container.register('personasHandler', () => {
        const personasService = container.resolve('personasService');
        const inputValidator = container.resolve('inputValidator');
        return new personas_1.PersonasHandler(personasService, inputValidator);
    });
    container.register('feedbackHandler', () => {
        const feedbackService = container.resolve('feedbackService');
        const inputValidator = container.resolve('inputValidator');
        return new feedback_1.FeedbackHandler(feedbackService, inputValidator);
    });
    container.register('buildModeHandler', () => {
        const buildModeService = container.resolve('buildModeService');
        const stageManager = container.resolve('stageManager');
        const contentStreamer = container.resolve('contentStreamer');
        const buildLogManager = container.resolve('buildLogManager');
        const inputValidator = container.resolve('inputValidator');
        return new build_mode_1.BuildModeHandler(buildModeService, stageManager, contentStreamer, buildLogManager, inputValidator);
    });
    container.register('settingsHandler', () => {
        const settingsService = container.resolve('settingsService');
        const inputValidator = container.resolve('inputValidator');
        return new settings_1.SettingsHandler(settingsService, inputValidator);
    });
    // Create SidebarProvider with injected handlers
    const sidebarProvider = new presentation_1.SidebarProvider(context.extensionUri, container.resolve('chatHandler'), container.resolve('personasHandler'), container.resolve('feedbackHandler'), container.resolve('buildModeHandler'), container.resolve('settingsHandler'));
    // Register webview provider
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('personaut.chatView', sidebarProvider));
    // Store container in context for access by other parts of the extension
    context.subscriptions.push({
        dispose: () => {
            container.clear();
        },
    });
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('personaut.clearCache', async () => {
        await context.globalState.update('conversations', undefined);
        await context.globalState.update('feedbackHistory', undefined);
        vscode.window.showInformationMessage('Personaut cache cleared');
    }));
    console.log('[Personaut] Extension activated successfully');
    console.log('[Personaut] Registered services:', container.getRegisteredKeys());
}
/**
 * Deactivate the extension
 */
function deactivate() {
    console.log('[Personaut] Extension deactivating...');
}
//# sourceMappingURL=extension.js.map