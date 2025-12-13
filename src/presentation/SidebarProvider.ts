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

import * as vscode from 'vscode';
import { IFeatureHandler, WebviewMessage } from '../shared/types/CommonTypes';
import { ChatHandler } from '../features/chat/handlers/ChatHandler';
import { PersonasHandler } from '../features/personas/handlers/PersonasHandler';
import { FeedbackHandler } from '../features/feedback/handlers/FeedbackHandler';
import { BuildModeHandler } from '../features/build-mode/handlers/BuildModeHandler';
import { SettingsHandler } from '../features/settings/handlers/SettingsHandler';

/**
 * SidebarProvider manages the webview and routes messages to feature handlers
 *
 * This is a thin routing layer that delegates all business logic to feature modules.
 * It should remain under 500 lines of code.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */
export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onWebviewReady: (webview: vscode.Webview) => void,
    private readonly chatHandler: ChatHandler,
    private readonly personasHandler: PersonasHandler,
    private readonly feedbackHandler: FeedbackHandler,
    private readonly buildModeHandler: BuildModeHandler,
    private readonly settingsHandler: SettingsHandler
  ) {
    console.log('[SidebarProvider] Initialized');
  }

  /**
   * Resolve the webview view
   * Validates: Requirements 9.1
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    // Configure webview options
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    // Set webview HTML content
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Initialize AgentManager with webview reference
    this.onWebviewReady(webviewView.webview);

    // Set up message listener
    webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      await this.handleMessage(message, webviewView.webview);
    });

    console.log('[SidebarProvider] Webview resolved');
  }

  /**
   * Route messages to appropriate feature handlers
   * Validates: Requirements 9.2
   */
  private async handleMessage(message: WebviewMessage, webview: vscode.Webview): Promise<void> {
    try {
      // Route based on message type
      const handler = this.getHandlerForMessage(message);

      if (handler) {
        await handler.handle(message, webview);
      } else {
        console.warn(`[SidebarProvider] No handler found for message type: ${message.type}`);
        webview.postMessage({
          type: 'error',
          message: `Unknown message type: ${message.type}`,
        });
      }
    } catch (error) {
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
  private getHandlerForMessage(message: WebviewMessage): IFeatureHandler | null {
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
  private isChatMessage(type: string): boolean {
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
      'abort',
    ];
    return chatMessageTypes.includes(type);
  }

  /**
   * Check if message type is a personas message
   */
  private isPersonasMessage(type: string): boolean {
    const personasMessageTypes = [
      'get-personas',
      'get-persona',
      'search-personas',
      'create-persona',
      'update-persona',
      'delete-persona',
      'save-persona',
      'generate-persona-prompt',
      'generate-persona-backstory',
      'generate-backstory',
    ];
    return personasMessageTypes.includes(type);
  }

  /**
   * Check if message type is a feedback message
   */
  private isFeedbackMessage(type: string): boolean {
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
  private isBuildModeMessage(type: string): boolean {
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
      'clear-build-context',
    ];
    return buildModeMessageTypes.includes(type);
  }

  /**
   * Check if message type is a settings message
   */
  private isSettingsMessage(type: string): boolean {
    const settingsMessageTypes = [
      'get-settings',
      'save-settings',
      'reset-settings',
      'reset-all-data',
    ];
    return settingsMessageTypes.includes(type);
  }

  /**
   * Generate HTML for the webview
   * Validates: Requirements 9.1
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    // Get URIs for resources
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'out', 'compiled', 'bundle.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'style.css')
    );
    const logoUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'assets', 'personaut-logo.png')
    );
    const iconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'assets', 'personaut-icon.png')
    );

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
  private getNonce(): string {
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
  public get view(): vscode.WebviewView | undefined {
    return this._view;
  }
}
