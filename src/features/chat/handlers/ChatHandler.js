"use strict";
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
exports.ChatHandler = void 0;
const ErrorSanitizer_1 = require("../../../shared/services/ErrorSanitizer");
class ChatHandler {
    constructor(chatService, inputValidator) {
        this.chatService = chatService;
        this.inputValidator = inputValidator;
        this.errorSanitizer = new ErrorSanitizer_1.ErrorSanitizer();
    }
    /**
     * Handle chat-related webview messages
     * Validates: Requirements 10.1, 10.2
     */
    async handle(message, webview) {
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
                default:
                    console.warn(`[ChatHandler] Unknown message type: ${message.type}`);
            }
        }
        catch (error) {
            await this.handleError(error, webview, message.type);
        }
    }
    /**
     * Handle user input message
     */
    async handleUserInput(message, _webview) {
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
        // Send message through service
        await this.chatService.sendMessage(message.value, message.contextFiles || []);
        // Response is handled by the agent's message update callback
    }
    /**
     * Handle get conversations request
     */
    async handleGetConversations(_message, webview) {
        const conversations = this.chatService.getConversations();
        webview.postMessage({
            type: 'conversations-list',
            conversations,
        });
    }
    /**
     * Handle load conversation request
     */
    async handleLoadConversation(message, webview) {
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
    async handleDeleteConversation(message, webview) {
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
    async handleClearConversations(_message, webview) {
        await this.chatService.clearAllConversations();
        webview.postMessage({
            type: 'conversations-cleared',
            success: true,
        });
    }
    /**
     * Handle new conversation request
     */
    async handleNewConversation(_message, webview) {
        const conversationId = this.chatService.createNewConversation();
        webview.postMessage({
            type: 'new-conversation-created',
            conversationId,
        });
    }
    /**
     * Handle check session request
     */
    async handleCheckSession(message, webview) {
        const sessionId = message.sessionId;
        // For now, always validate the session
        // In a real implementation, this would check against stored session data
        if (sessionId) {
            webview.postMessage({
                type: 'session-valid',
                sessionId,
            });
        }
        else {
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
    async handleIsolatedRequest(message, webview) {
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
    async handleGetActiveFile(_message, webview) {
        // This requires VS Code API access
        const vscode = await Promise.resolve().then(() => __importStar(require('vscode')));
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const document = activeEditor.document;
            webview.postMessage({
                type: 'active-file',
                path: document.fileName,
                content: document.getText(),
                language: document.languageId,
            });
        }
        else {
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
    async handleGetHistory(_message, webview) {
        const conversations = this.chatService.getConversations();
        webview.postMessage({
            type: 'history',
            conversations,
        });
    }
    /**
     * Handle reset token usage request
     */
    async handleResetTokenUsage(_message, webview) {
        // Token usage is tracked in the webview state
        // Just acknowledge the reset
        webview.postMessage({
            type: 'token-usage-reset',
            success: true,
        });
    }
    /**
     * Handle open file request
     * Security: Only allows opening files within the workspace
     */
    async handleOpenFile(message, webview) {
        const vscode = await Promise.resolve().then(() => __importStar(require('vscode')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
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
            const isInWorkspace = workspaceFolders.some((folder) => resolvedPath.startsWith(folder.uri.fsPath));
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
        }
        catch (error) {
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
    async handleError(error, webview, messageType) {
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
exports.ChatHandler = ChatHandler;
//# sourceMappingURL=ChatHandler.js.map