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
import { ChatService } from '../services/ChatService';

export class ChatHandler implements IFeatureHandler {
  private readonly errorSanitizer: ErrorSanitizer;

  constructor(
    private readonly chatService: ChatService,
    private readonly inputValidator: InputValidator
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
          await this.handleNewConversation(message, webview);
          break;
        case 'check-session':
          await this.handleCheckSession(message, webview);
          break;
        case 'isolated-request':
          await this.handleIsolatedRequest(message, webview);
          break;
        case 'get-active-file':
          await this.handleGetActiveFile(message, webview);
          break;
        case 'get-history':
          await this.handleGetHistory(message, webview);
          break;
        case 'reset-token-usage':
          await this.handleResetTokenUsage(message, webview);
          break;
        case 'open-file':
          await this.handleOpenFile(message, webview);
          break;
        case 'abort':
          await this.handleAbort(message, webview);
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

    // Extract additional parameters from message
    const systemInstruction = message.systemInstruction as string | undefined;
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
   * Handle get conversations request
   */
  private async handleGetConversations(_message: WebviewMessage, webview: any): Promise<void> {
    const conversations = this.chatService.getConversations();

    webview.postMessage({
      type: 'conversations-list',
      conversations,
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
      throw new Error('Conversation ID is required');
    }

    const deleted = await this.chatService.deleteConversation(message.conversationId);

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
   */
  private async handleGetActiveFile(_message: WebviewMessage, webview: any): Promise<void> {
    // This requires VS Code API access
    const vscode = await import('vscode');
    const activeEditor = vscode.window.activeTextEditor;

    if (activeEditor) {
      const document = activeEditor.document;
      webview.postMessage({
        type: 'active-file',
        path: document.fileName,
        content: document.getText(),
        language: document.languageId,
      });
    } else {
      webview.postMessage({
        type: 'active-file',
        path: null,
        content: null,
        error: 'No active file',
      });
    }
  }

  /**
   * Handle get history request (alias for get-conversations)
   */
  private async handleGetHistory(_message: WebviewMessage, webview: any): Promise<void> {
    const conversations = this.chatService.getConversations();

    webview.postMessage({
      type: 'history-updated',
      history: conversations,
    });
  }

  /**
   * Handle reset token usage request
   */
  private async handleResetTokenUsage(_message: WebviewMessage, webview: any): Promise<void> {
    // Token usage is tracked in the webview state
    // Just acknowledge the reset
    webview.postMessage({
      type: 'token-usage-reset',
      success: true,
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
}
