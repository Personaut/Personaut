"use strict";
/**
 * SidebarProvider - Thin routing layer for webview messages
 *
 * Responsibilities:
 * - Webview lifecycle management
 * - Message routing to feature handlers
 * - Dependency injection
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
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
exports.SidebarProvider = void 0;
const vscode = __importStar(require("vscode"));
/**
 * SidebarProvider manages the webview and routes messages to feature handlers
 *
 * This is a thin routing layer that delegates all business logic to feature modules.
 * It should remain under 500 lines of code.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */
class SidebarProvider {
    constructor(extensionUri, chatHandler, personasHandler, feedbackHandler, buildModeHandler, settingsHandler) {
        this.extensionUri = extensionUri;
        this.chatHandler = chatHandler;
        this.personasHandler = personasHandler;
        this.feedbackHandler = feedbackHandler;
        this.buildModeHandler = buildModeHandler;
        this.settingsHandler = settingsHandler;
        console.log('[SidebarProvider] Initialized');
    }
    /**
     * Resolve the webview view
     * Validates: Requirements 9.1
     */
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        // Configure webview options
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };
        // Set webview HTML content
        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
        // Set up message listener
        webviewView.webview.onDidReceiveMessage(async (message) => {
            await this.handleMessage(message, webviewView.webview);
        });
        console.log('[SidebarProvider] Webview resolved');
    }
    /**
     * Route messages to appropriate feature handlers
     * Validates: Requirements 9.2
     */
    async handleMessage(message, webview) {
        try {
            // Route based on message type
            const handler = this.getHandlerForMessage(message);
            if (handler) {
                await handler.handle(message, webview);
            }
            else {
                console.warn(`[SidebarProvider] No handler found for message type: ${message.type}`);
                webview.postMessage({
                    type: 'error',
                    message: `Unknown message type: ${message.type}`,
                });
            }
        }
        catch (error) {
            console.error('[SidebarProvider] Error handling message:', error);
            webview.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'An unknown error occurred',
            });
        }
    }
    /**
     * Get the appropriate handler for a message
     * Validates: Requirements 9.2
     */
    getHandlerForMessage(message) {
        // Chat messages
        if (this.isChatMessage(message.type)) {
            return this.chatHandler;
        }
        // Personas messages
        if (this.isPersonasMessage(message.type)) {
            return this.personasHandler;
        }
        // Feedback messages
        if (this.isFeedbackMessage(message.type)) {
            return this.feedbackHandler;
        }
        // Build mode messages
        if (this.isBuildModeMessage(message.type)) {
            return this.buildModeHandler;
        }
        // Settings messages
        if (this.isSettingsMessage(message.type)) {
            return this.settingsHandler;
        }
        return null;
    }
    /**
     * Check if message type is a chat message
     */
    isChatMessage(type) {
        const chatMessageTypes = [
            'user-input',
            'get-conversations',
            'load-conversation',
            'delete-conversation',
            'clear-conversations',
            'new-conversation',
            'check-session',
            'isolated-request',
            'get-active-file',
            'get-history',
            'reset-token-usage',
            'open-file',
        ];
        return chatMessageTypes.includes(type);
    }
    /**
     * Check if message type is a personas message
     */
    isPersonasMessage(type) {
        const personasMessageTypes = [
            'get-personas',
            'get-persona',
            'search-personas',
            'create-persona',
            'update-persona',
            'delete-persona',
            'generate-persona-prompt',
            'generate-persona-backstory',
        ];
        return personasMessageTypes.includes(type);
    }
    /**
     * Check if message type is a feedback message
     */
    isFeedbackMessage(type) {
        const feedbackMessageTypes = [
            'generate-feedback',
            'get-feedback-history',
            'get-feedback',
            'delete-feedback',
            'clear-feedback-history',
            'get-feedback-by-persona',
            'get-feedback-by-type',
            'check-provider-image-support',
        ];
        return feedbackMessageTypes.includes(type);
    }
    /**
     * Check if message type is a build mode message
     */
    isBuildModeMessage(type) {
        const buildModeMessageTypes = [
            'initialize-project',
            'save-stage-file',
            'load-stage-file',
            'generate-content-streaming',
            'get-build-projects',
            'delete-build-project',
            'get-stage-status',
            'validate-stage-transition',
            'get-build-logs',
            'clear-build-logs',
            'get-build-state',
            'append-build-log',
            'load-build-log',
            'retry-generation',
            'check-project-files',
            'load-build-data',
            'save-build-data',
            'get-project-history',
            'check-project-name',
            'capture-screenshot',
        ];
        return buildModeMessageTypes.includes(type);
    }
    /**
     * Check if message type is a settings message
     */
    isSettingsMessage(type) {
        const settingsMessageTypes = ['get-settings', 'save-settings', 'reset-settings'];
        return settingsMessageTypes.includes(type);
    }
    /**
     * Generate HTML for the webview
     * Validates: Requirements 9.1
     */
    getHtmlForWebview(webview) {
        // Get URIs for resources
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'compiled', 'bundle.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'style.css'));
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'assets', 'personaut-logo.png'));
        const iconUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'assets', 'personaut-icon.png'));
        // Use a nonce to whitelist which scripts can be run
        const nonce = this.getNonce();
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; worker-src 'none'; img-src ${webview.cspSource} data: https:; font-src ${webview.cspSource}; connect-src ${webview.cspSource} https:;">
  <link href="${styleUri}" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
  <title>Personaut AI</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">
    window.logoUri = "${logoUri}";
    window.iconUri = "${iconUri}";
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
    /**
     * Generate a nonce for CSP
     */
    getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    /**
     * Get the current webview instance
     */
    get view() {
        return this._view;
    }
}
exports.SidebarProvider = SidebarProvider;
//# sourceMappingURL=SidebarProvider.js.map