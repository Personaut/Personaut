/**
 * ChatHandler handles chat-related webview messages
 *
 * Responsibilities:
 * - Route chat messages to appropriate service methods
 * - Validate input before processing
 * - Handle errors and send responses to webview
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 2.1, 10.1, 10.2
 */

import { IFeatureHandler, WebviewMessage } from '../../../shared/types/CommonTypes';
import { InputValidator } from '../../../shared/services/InputValidator';
import { ErrorSanitizer } from '../../../shared/services/ErrorSanitizer';
import { TokenMonitor } from '../../../shared/services/TokenMonitor';
import { ChatService } from '../services/ChatService';
import { getChatPersonaPrompt, ChatPersonaConfig } from '../../../core/prompts';

export class ChatHandler implements IFeatureHandler {
  private readonly errorSanitizer: ErrorSanitizer;

  constructor(
    private readonly chatService: ChatService,
    private readonly inputValidator: InputValidator,
    private readonly tokenMonitor?: TokenMonitor
  ) {
    this.errorSanitizer = new ErrorSanitizer();
  }

  /**
   * Handle chat-related webview messages
   * Validates: Requirements 10.1, 10.2
   */
  async handle(message: WebviewMessage, webview: any): Promise<void> {
    try {
      switch (message.type) {
        case 'user-input':
        case 'send-message': // New webview architecture uses this
          await this.handleUserInput(message, webview);
          break;
        case 'get-conversations':
          await this.handleGetConversations(message, webview);
          break;
        case 'load-conversation':
          await this.handleLoadConversation(message, webview);
          break;
        case 'delete-conversation':
          await this.handleDeleteConversation(message, webview);
          break;
        case 'clear-conversations':
          await this.handleClearConversations(message, webview);
          break;
        case 'new-conversation':
        case 'new-chat': // New webview architecture uses this
          await this.handleNewConversation(message, webview);
          break;
        case 'check-session':
          await this.handleCheckSession(message, webview);
          break;
        case 'isolated-request':
          await this.handleIsolatedRequest(message, webview);
          break;
        case 'get-active-file':
        case 'add-active-file': // Alias used by new webview
          await this.handleGetActiveFile(message, webview);
          break;
        case 'get-history':
          await this.handleGetHistory(message, webview);
          break;
        case 'get-token-usage':
          await this.handleGetTokenUsage(message, webview);
          break;
        case 'reset-token-usage':
          await this.handleResetTokenUsage(message, webview);
          break;
        case 'open-file':
          await this.handleOpenFile(message, webview);
          break;
        case 'open-external':
          await this.handleOpenExternal(message, webview);
          break;
        case 'abort':
          await this.handleAbort(message, webview);
          break;
        // Chat enhancement handlers
        case 'select-persona':
          await this.handleSelectPersona(message, webview);
          break;
        case 'get-personas':
          await this.handleGetPersonas(message, webview);
          break;
        case 'update-chat-settings':
          await this.handleUpdateChatSettings(message, webview);
          break;
        case 'get-chat-settings':
          await this.handleGetChatSettings(message, webview);
          break;
        case 'create-session':
          await this.handleCreateSession(message, webview);
          break;
        case 'switch-session':
          await this.handleSwitchSession(message, webview);
          break;
        case 'toggle-incognito':
          await this.handleToggleIncognito(message, webview);
          break;
        case 'get-session-history':
          await this.handleGetSessionHistory(message, webview);
          break;
        case 'show-warning':
          await this.handleShowWarning(message, webview);
          break;
        case 'load-session-messages':
          await this.handleLoadSessionMessages(message, webview);
          break;
        default:
          throw new Error(`Unknown chat message type: ${message.type}`);
      }
    } catch (error) {
      await this.handleError(error, webview, message.type);
    }
  }

  /**
   * Handle user input message
   */
  private async handleUserInput(message: WebviewMessage, _webview: any): Promise<void> {
    // Validate input
    const validation = this.inputValidator.validateInput(message.value || '');
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid input');
    }

    // Validate context files if present
    if (message.contextFiles) {
      for (const file of message.contextFiles) {
        if (!file.path || !file.content) {
          throw new Error('Invalid context file format');
        }
      }
    }

    // Get conversation ID from message or create a new one
    const conversationId = message.conversationId || this.chatService.createNewConversation();

    // Extract persona and build system instruction
    const persona = message.persona as { type: string; id: string; name: string; context?: string } | undefined;
    let systemInstruction = message.systemInstruction as string | undefined;

    // If a persona is selected, build the system instruction from it
    if (persona && !systemInstruction) {
      systemInstruction = this.buildPersonaSystemInstruction(persona);
    }

    const isPersonaChat = message.isPersonaChat as boolean | undefined;
    const settings = message.settings as Record<string, any> | undefined;

    // Send message through service with all parameters
    await this.chatService.sendMessage(
      conversationId,
      message.value,
      message.contextFiles || [],
      settings,
      systemInstruction,
      isPersonaChat
    );

    // Response is handled by the agent's message update callback
  }

  /**
   * Build system instruction from persona
   */
  private buildPersonaSystemInstruction(persona: { type: string; id: string; name: string; context?: string }): string {
    // Convert to ChatPersonaConfig and use centralized prompts
    const personaConfig: ChatPersonaConfig = {
      id: persona.id,
      name: persona.name,
      context: persona.context,
      type: persona.type as 'agent' | 'team' | 'user',
    };

    return getChatPersonaPrompt(personaConfig);
  }

  /**
   * Handle get conversations request
   */
  private async handleGetConversations(_message: WebviewMessage, webview: any): Promise<void> {
    const conversations = this.chatService.getConversations();

    console.log('[ChatHandler] Enriching conversations with token data');
    console.log('[ChatHandler] Conversation IDs:', conversations.map(c => c.id));

    // Enrich conversations with token usage data
    const enrichedConversations = conversations.map((conv) => {
      const tokenUsage = this.tokenMonitor.getUsage(conv.id);
      console.log(`[ChatHandler] Conv ${conv.id}: tokens=${tokenUsage.totalTokens}, in=${tokenUsage.inputTokens}, out=${tokenUsage.outputTokens}`);
      return {
        ...conv,
        totalInputTokens: tokenUsage.inputTokens || 0,
        totalOutputTokens: tokenUsage.outputTokens || 0,
        totalTokens: tokenUsage.totalTokens || 0,
      };
    });

    console.log('[ChatHandler] Enriched conversations:', enrichedConversations.map(c => ({ id: c.id, total: c.totalTokens })));

    webview.postMessage({
      type: 'conversations-list',
      conversations: enrichedConversations,
    });
  }

  /**
   * Handle load conversation request
   */
  private async handleLoadConversation(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.conversationId) {
      throw new Error('Conversation ID is required');
    }

    const conversation = await this.chatService.loadConversation(message.conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    webview.postMessage({
      type: 'conversation-loaded',
      conversation,
    });
  }

  /**
   * Handle delete conversation request
   */
  private async handleDeleteConversation(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.conversationId) {
      console.error('[ChatHandler] Delete conversation failed: No conversation ID provided');
      throw new Error('Conversation ID is required');
    }

    console.log('[ChatHandler] Deleting conversation:', message.conversationId);

    const deleted = await this.chatService.deleteConversation(message.conversationId);

    console.log('[ChatHandler] Delete result:', { conversationId: message.conversationId, success: deleted });

    webview.postMessage({
      type: 'conversation-deleted',
      conversationId: message.conversationId,
      success: deleted,
    });
  }

  /**
   * Handle clear all conversations request
   */
  private async handleClearConversations(_message: WebviewMessage, webview: any): Promise<void> {
    await this.chatService.clearAllConversations();

    webview.postMessage({
      type: 'conversations-cleared',
      success: true,
    });
  }

  /**
   * Handle new conversation request
   */
  private async handleNewConversation(_message: WebviewMessage, webview: any): Promise<void> {
    const conversationId = this.chatService.createNewConversation();

    webview.postMessage({
      type: 'new-conversation-created',
      conversationId,
    });
  }

  /**
   * Handle check session request
   */
  private async handleCheckSession(message: WebviewMessage, webview: any): Promise<void> {
    const sessionId = message.sessionId;

    // For now, always validate the session
    // In a real implementation, this would check against stored session data
    if (sessionId) {
      webview.postMessage({
        type: 'session-valid',
        sessionId,
      });
    } else {
      // Generate a new session ID
      const newSessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      webview.postMessage({
        type: 'session-invalid',
        sessionId: newSessionId,
      });
    }
  }

  /**
   * Handle isolated request (AI request without chat history)
   */
  private async handleIsolatedRequest(message: WebviewMessage, webview: any): Promise<void> {
    // This would integrate with an AI provider for isolated requests
    // For now, acknowledge the request
    webview.postMessage({
      type: 'isolated-response',
      requestId: message.requestId,
      response: null,
      error: 'Isolated requests are not yet implemented',
    });
  }

  /**
   * Handle get active file request
   * Only allows text files and images
   */
  private async handleGetActiveFile(_message: WebviewMessage, webview: any): Promise<void> {
    // This requires VS Code API access
    const vscode = await import('vscode');
    const activeEditor = vscode.window.activeTextEditor;

    if (activeEditor) {
      const document = activeEditor.document;
      const fileName = document.fileName;

      // Check if file type is allowed (text files or images)
      const allowedTextExtensions = [
        '.txt', '.md', '.json', '.yaml', '.yml', '.xml', '.html', '.htm',
        '.css', '.scss', '.less', '.js', '.jsx', '.ts', '.tsx', '.py',
        '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.rb',
        '.php', '.swift', '.kt', '.scala', '.r', '.sql', '.sh', '.bash',
        '.zsh', '.ps1', '.bat', '.cmd', '.dockerfile', '.toml', '.ini',
        '.cfg', '.conf', '.env', '.gitignore', '.editorconfig', '.vue',
        '.svelte', '.astro',
      ];
      const allowedImageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
      const allAllowedExtensions = [...allowedTextExtensions, ...allowedImageExtensions];

      const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
      const isAllowed = allAllowedExtensions.includes(fileExtension);

      if (!isAllowed) {
        webview.postMessage({
          type: 'status',
          text: `File type ${fileExtension} not supported. Only text files and images are allowed.`,
        });
        return;
      }

      const isImage = allowedImageExtensions.includes(fileExtension);

      if (isImage) {
        // For images, read as base64
        const fs = await import('fs');
        try {
          const imageBuffer = fs.readFileSync(fileName);
          const base64 = imageBuffer.toString('base64');
          const mimeType = fileExtension === '.svg' ? 'image/svg+xml' : `image/${fileExtension.slice(1)}`;

          webview.postMessage({
            type: 'add-context',
            data: {
              path: fileName,
              content: `data:${mimeType};base64,${base64}`,
              language: 'image',
              isImage: true,
            },
          });
        } catch (error: any) {
          webview.postMessage({
            type: 'status',
            text: `Failed to read image: ${error.message}`,
          });
        }
      } else {
        // For text files, read content
        webview.postMessage({
          type: 'add-context',
          data: {
            path: fileName,
            content: document.getText(),
            language: document.languageId,
            isImage: false,
          },
        });
      }
    } else {
      webview.postMessage({
        type: 'status',
        text: 'No active file. Please open a file in the editor first.',
      });
    }
  }

  /**
   * Handle get history request (alias for get-conversations)
   */
  private async handleGetHistory(_message: WebviewMessage, webview: any): Promise<void> {
    const conversations = this.chatService.getConversations();

    // Enrich conversations with token usage data
    const enrichedHistory = conversations.map((conv) => {
      const tokenUsage = this.tokenMonitor.getUsage(conv.id);
      return {
        ...conv,
        totalInputTokens: tokenUsage.inputTokens || 0,
        totalOutputTokens: tokenUsage.outputTokens || 0,
        totalTokens: tokenUsage.totalTokens || 0,
      };
    });

    webview.postMessage({
      type: 'history-updated',
      history: enrichedHistory,
    });
  }

  /**
   * Handle get token usage request
   */
  private async handleGetTokenUsage(message: WebviewMessage, webview: any): Promise<void> {
    // Get conversation ID from message or use 'global'
    const conversationId = (message.conversationId as string) || 'global';

    if (this.tokenMonitor) {
      // Ensure token monitor is initialized before getting usage
      await this.tokenMonitor.ensureInitialized();

      // Use global aggregation when 'global' is requested, otherwise get specific conversation
      const usage = conversationId === 'global'
        ? this.tokenMonitor.getGlobalUsage()
        : this.tokenMonitor.getUsage(conversationId);
      const limit = await this.tokenMonitor.getEffectiveLimit(conversationId);
      const remaining = limit - usage.totalTokens;
      const percentUsed = limit > 0 ? Math.round((usage.totalTokens / limit) * 100) : 0;

      webview.postMessage({
        type: 'token-usage-update',
        conversationId,
        usage: {
          totalTokens: usage.totalTokens,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          limit,
          remaining: Math.max(0, remaining),
          percentUsed,
        },
      });
    } else {
      // Return zero usage if no token monitor
      webview.postMessage({
        type: 'token-usage-update',
        conversationId,
        usage: {
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          limit: 100000,
          remaining: 100000,
          percentUsed: 0,
        },
      });
    }
  }

  /**
   * Handle reset token usage request
   */
  private async handleResetTokenUsage(message: WebviewMessage, webview: any): Promise<void> {
    // Get conversation ID from message or use 'global'
    const conversationId = (message.conversationId as string) || 'global';

    if (this.tokenMonitor) {
      // Reset all conversations when 'global' is requested, otherwise reset specific conversation
      if (conversationId === 'global') {
        await this.tokenMonitor.resetAllUsage();
        console.log('[ChatHandler] All token usage reset');
      } else {
        await this.tokenMonitor.resetUsage(conversationId);
        console.log('[ChatHandler] Token usage reset for conversation:', conversationId);
      }
    }

    // Send reset confirmation to webview
    webview.postMessage({
      type: 'token-usage-reset',
      success: true,
      conversationId,
    });
  }

  /**
   * Handle abort request
   */
  private async handleAbort(message: WebviewMessage, _webview: any): Promise<void> {
    const conversationId = message.conversationId as string | undefined;
    await this.chatService.abort(conversationId);
  }

  /**
   * Handle open file request
   * Security: Only allows opening files within the workspace
   */
  private async handleOpenFile(message: WebviewMessage, webview: any): Promise<void> {
    const vscode = await import('vscode');
    const path = await import('path');
    const filePath = message.value;

    if (!filePath) {
      webview.postMessage({
        type: 'file-opened',
        success: false,
        error: 'No file path provided',
      });
      return;
    }

    try {
      // Security: Validate file is within workspace to prevent arbitrary file access
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        webview.postMessage({
          type: 'file-opened',
          success: false,
          error: 'No workspace folder is open',
        });
        return;
      }

      // Resolve the path to handle relative paths and normalize
      const resolvedPath = path.resolve(filePath);

      // Check if the file is within any workspace folder
      const isInWorkspace = workspaceFolders.some((folder) =>
        resolvedPath.startsWith(folder.uri.fsPath)
      );

      if (!isInWorkspace) {
        webview.postMessage({
          type: 'file-opened',
          success: false,
          error: 'File must be within the workspace',
        });
        return;
      }

      const uri = vscode.Uri.file(resolvedPath);
      await vscode.window.showTextDocument(uri);

      webview.postMessage({
        type: 'file-opened',
        success: true,
        path: resolvedPath,
      });
    } catch (error) {
      webview.postMessage({
        type: 'file-opened',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open file',
      });
    }
  }

  /**
   * Handle opening an external URL in the default browser
   */
  private async handleOpenExternal(message: WebviewMessage, webview: any): Promise<void> {
    const vscode = await import('vscode');
    const url = message.url as string;

    if (!url) {
      webview.postMessage({
        type: 'external-opened',
        success: false,
        error: 'No URL provided',
      });
      return;
    }

    try {
      // Validate URL format
      const parsedUrl = new URL(url);

      // Only allow http/https URLs for security
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are allowed');
      }

      // Open URL in default browser
      await vscode.env.openExternal(vscode.Uri.parse(url));

      webview.postMessage({
        type: 'external-opened',
        success: true,
        url,
      });
    } catch (error) {
      webview.postMessage({
        type: 'external-opened',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open URL',
      });
    }
  }

  /**
   * Handle errors and send sanitized error messages to webview
   */
  private async handleError(error: unknown, webview: any, messageType: string): Promise<void> {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const sanitizedError = this.errorSanitizer.sanitize(errorObj);

    console.error(`[ChatHandler] Error handling ${messageType}:`, error);

    webview.postMessage({
      type: 'error',
      message: sanitizedError.userMessage,
      context: 'chat',
    });
  }

  // ============== Chat Enhancement Handlers ==============

  /**
   * Handle persona selection
   * Validates: Requirements 1.2
   */
  private async handleSelectPersona(message: WebviewMessage, webview: any): Promise<void> {
    const personaId = message.personaId as string;
    const personaType = message.personaType as string || 'system_agent';

    // For now, store selection in the message to be used by subsequent messages
    // Full implementation would integrate with PersonaManager
    webview.postMessage({
      type: 'persona-selected',
      personaId,
      personaType,
      success: true,
    });
  }

  /**
   * Handle get personas request
   * Validates: Requirements 4.1, 4.2
   */
  private async handleGetPersonas(_message: WebviewMessage, webview: any): Promise<void> {
    // Return built-in personas
    const systemAgents = [
      { id: 'pippet', name: 'Pippet', icon: '🐾', type: 'system_agent' },
      { id: 'ux-designer', name: 'UX Designer', icon: '🎨', type: 'system_agent' },
      { id: 'developer', name: 'Developer', icon: '💻', type: 'system_agent' },
    ];

    webview.postMessage({
      type: 'personas-list',
      systemAgents,
      userPersonas: [], // Would be populated from PersonaStorage
    });
  }

  /**
   * Handle chat settings update
   * Validates: Requirements 5.1, 9.1, 9.4
   */
  private async handleUpdateChatSettings(message: WebviewMessage, webview: any): Promise<void> {
    const settings = message.settings as {
      trackHistory?: boolean;
      userMessageColor?: string;
      agentMessageColor?: string;
      incognitoMode?: boolean;
    };

    // Settings would be saved via ChatSettingsService
    console.log('[ChatHandler] Chat settings updated:', settings);

    webview.postMessage({
      type: 'chat-settings-updated',
      settings,
      success: true,
    });
  }

  /**
   * Handle get chat settings request
   * Validates: Requirements 5.1, 9.1
   */
  private async handleGetChatSettings(_message: WebviewMessage, webview: any): Promise<void> {
    // Default settings - would be loaded from ChatSettingsService
    const settings = {
      trackHistory: true,
      userMessageColor: '#3b82f6',
      agentMessageColor: '#10b981',
      incognitoMode: false,
    };

    webview.postMessage({
      type: 'chat-settings',
      settings,
    });
  }

  /**
   * Handle create session request
   * Validates: Requirements 7.1, 7.2, 7.3
   */
  private async handleCreateSession(message: WebviewMessage, webview: any): Promise<void> {
    const isIncognito = message.incognito as boolean || false;

    // Generate a new session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    console.log('[ChatHandler] Created new session:', { sessionId, isIncognito });

    webview.postMessage({
      type: 'session-created',
      sessionId,
      isIncognito,
      createdAt: Date.now(),
    });
  }

  /**
   * Handle switch session request
   * Validates: Requirements 7.5, 6.5
   */
  private async handleSwitchSession(message: WebviewMessage, webview: any): Promise<void> {
    const sessionId = message.sessionId as string;

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Session would be loaded from ChatHistoryService
    console.log('[ChatHandler] Switching to session:', sessionId);

    webview.postMessage({
      type: 'session-switched',
      sessionId,
      success: true,
    });
  }

  /**
   * Handle incognito mode toggle
   * Validates: Requirements 6.1, 6.2, 6.4
   */
  private async handleToggleIncognito(message: WebviewMessage, webview: any): Promise<void> {
    // If enabled is explicitly specified, use that value; otherwise toggle
    // The client sends the desired new state, not the current state
    const enabled = message.enabled as boolean | undefined;
    const newState = enabled !== undefined ? enabled : true;

    console.log('[ChatHandler] Incognito mode:', newState ? 'enabled' : 'disabled');

    webview.postMessage({
      type: 'incognito-toggled',
      enabled: newState,
      success: true,
    });
  }

  /**
   * Handle get session history request
   * Validates: Requirements 3.1, 3.2, 3.5
   */
  private async handleGetSessionHistory(_message: WebviewMessage, webview: any): Promise<void> {
    // Refresh conversations from disk to get latest data
    const conversations = await this.chatService.refreshConversations();

    console.log('[ChatHandler] Loading session history, found conversations:', conversations.length);

    // Filter out build-related conversations (they have their own logs)
    const chatConversations = conversations.filter(conv => 
      !conv.id.startsWith('build-screen-') &&
      !conv.id.startsWith('build-ux-') &&
      !conv.id.startsWith('build-dev-') &&
      !conv.id.startsWith('code-repair-') &&
      !conv.id.startsWith('feedback-')
    );

    console.log('[ChatHandler] Filtered conversations:', {
      total: conversations.length,
      chat: chatConversations.length,
      filtered: conversations.length - chatConversations.length
    });

    // Transform conversations to session format matching SessionSummary interface
    // Enrich with token usage data from TokenMonitor
    const sessions = chatConversations.map(conv => {
      const tokenUsage = this.tokenMonitor.getUsage(conv.id);
      return {
        sessionId: conv.id,
        createdAt: conv.timestamp || Date.now(),
        closedAt: conv.lastUpdated,
        messageCount: conv.messages?.length || 0,
        totalInputTokens: tokenUsage.inputTokens || 0,
        totalOutputTokens: tokenUsage.outputTokens || 0,
        totalTokens: tokenUsage.totalTokens || 0,
        ideSession: false,
      };
    });

    webview.postMessage({
      type: 'session-history',
      sessions,
    });
  }

  /**
   * Handle load session messages request
   * Validates: Requirements 3.3, 3.4
   */
  private async handleLoadSessionMessages(message: WebviewMessage, webview: any): Promise<void> {
    const sessionId = message.sessionId as string;

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    console.log('[ChatHandler] Loading session messages for:', sessionId);

    // Load the conversation from storage
    const conversations = this.chatService.getConversations();
    const conversation = conversations.find(c => c.id === sessionId);

    if (!conversation) {
      console.warn('[ChatHandler] Conversation not found:', sessionId);
      webview.postMessage({
        type: 'session-messages-loaded',
        sessionId,
        messages: [],
        error: 'Conversation not found',
      });
      return;
    }

    // Transform messages to the expected format for the webview
    const messages = (conversation.messages || []).map((msg) => ({
      role: msg.role,
      text: msg.text,
      timestamp: conversation.lastUpdated || conversation.timestamp,
    }));

    console.log('[ChatHandler] Loaded', messages.length, 'messages for session:', sessionId);

    webview.postMessage({
      type: 'session-messages-loaded',
      sessionId,
      messages,
    });
  }

  /**
   * Handle show warning request
   */
  private async handleShowWarning(message: WebviewMessage, _webview: any): Promise<void> {
    const warningMessage = message.message as string;

    if (!warningMessage) {
      console.warn('[ChatHandler] No warning message provided');
      return;
    }

    console.log('[ChatHandler] Showing warning:', warningMessage);

    // Show VS Code warning notification
    const vscode = await import('vscode');
    vscode.window.showWarningMessage(warningMessage);
  }
}

