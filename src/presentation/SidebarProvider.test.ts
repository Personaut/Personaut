/**
 * Unit tests for SidebarProvider
 *
 * Tests:
 * - Webview initialization
 * - Message routing to correct handlers
 * - Error handling
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 9.1, 9.2, 9.4
 */

import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
import { ChatHandler } from '../features/chat/handlers/ChatHandler';
import { PersonasHandler } from '../features/personas/handlers/PersonasHandler';
import { FeedbackHandler } from '../features/feedback/handlers/FeedbackHandler';
import { BuildModeHandler } from '../features/build-mode/handlers/BuildModeHandler';
import { SettingsHandler } from '../features/settings/handlers/SettingsHandler';
import { WebviewMessage } from '../shared/types/CommonTypes';

// Mock vscode module
jest.mock('vscode', () => ({
  Uri: {
    joinPath: jest.fn((base, ...paths) => ({
      fsPath: `${base.fsPath}/${paths.join('/')}`,
      scheme: 'file',
      authority: '',
      path: `${base.fsPath}/${paths.join('/')}`,
      query: '',
      fragment: '',
      with: jest.fn(),
      toJSON: jest.fn(),
    })),
  },
  window: {
    registerWebviewViewProvider: jest.fn(),
  },
}));

describe('SidebarProvider', () => {
  let sidebarProvider: SidebarProvider;
  let mockChatHandler: jest.Mocked<ChatHandler>;
  let mockPersonasHandler: jest.Mocked<PersonasHandler>;
  let mockFeedbackHandler: jest.Mocked<FeedbackHandler>;
  let mockBuildModeHandler: jest.Mocked<BuildModeHandler>;
  let mockSettingsHandler: jest.Mocked<SettingsHandler>;
  let mockExtensionUri: vscode.Uri;
  let mockWebviewView: jest.Mocked<vscode.WebviewView>;
  let mockWebview: jest.Mocked<vscode.Webview>;

  beforeEach(() => {
    // Create mock handlers
    mockChatHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockPersonasHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockFeedbackHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockBuildModeHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockSettingsHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Create mock extension URI
    mockExtensionUri = {
      fsPath: '/mock/extension/path',
      scheme: 'file',
      authority: '',
      path: '/mock/extension/path',
      query: '',
      fragment: '',
      with: jest.fn(),
      toJSON: jest.fn(),
    } as any;

    // Create mock webview
    mockWebview = {
      options: {},
      html: '',
      onDidReceiveMessage: jest.fn(),
      postMessage: jest.fn().mockResolvedValue(true),
      asWebviewUri: jest.fn((uri) => uri),
      cspSource: 'mock-csp-source',
    } as any;

    // Create mock webview view
    mockWebviewView = {
      webview: mockWebview,
      visible: true,
      viewType: 'personaut.chatView',
      onDidDispose: jest.fn(),
      onDidChangeVisibility: jest.fn(),
      show: jest.fn(),
      title: 'Personaut',
      description: '',
      badge: undefined,
    } as any;

    // Create SidebarProvider instance with mock webview ready callback
    const mockOnWebviewReady = jest.fn();
    sidebarProvider = new SidebarProvider(
      mockExtensionUri,
      mockOnWebviewReady,
      mockChatHandler,
      mockPersonasHandler,
      mockFeedbackHandler,
      mockBuildModeHandler,
      mockSettingsHandler
    );
  });

  describe('Webview Initialization', () => {
    /**
     * Test webview initialization
     * Validates: Requirements 9.1
     */
    it('should initialize webview with correct options', () => {
      sidebarProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(mockWebview.options).toEqual({
        enableScripts: true,
        localResourceRoots: [mockExtensionUri],
      });
    });

    /**
     * Test HTML content generation
     * Validates: Requirements 9.1
     */
    it('should set HTML content for webview', () => {
      sidebarProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(mockWebview.html).toBeTruthy();
      expect(mockWebview.html).toContain('<!DOCTYPE html>');
      expect(mockWebview.html).toContain('<div id="root"></div>');
    });

    /**
     * Test message listener setup
     * Validates: Requirements 9.1
     */
    it('should set up message listener', () => {
      sidebarProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();
    });

    /**
     * Test view property
     * Validates: Requirements 9.1
     */
    it('should expose webview view through view property', () => {
      expect(sidebarProvider.view).toBeUndefined();

      sidebarProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(sidebarProvider.view).toBe(mockWebviewView);
    });
  });

  describe('Message Routing', () => {
    let messageHandler: (message: WebviewMessage) => Promise<void>;

    beforeEach(() => {
      sidebarProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      // Extract the message handler from onDidReceiveMessage call
      const onDidReceiveMessageCall = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0];
      messageHandler = onDidReceiveMessageCall[0];
    });

    /**
     * Test routing chat messages
     * Validates: Requirements 9.2
     */
    it('should route user-input message to chat handler', async () => {
      const message: WebviewMessage = {
        type: 'user-input',
        value: 'Hello',
      };

      await messageHandler(message);

      expect(mockChatHandler.handle).toHaveBeenCalledWith(message, mockWebview);
      expect(mockPersonasHandler.handle).not.toHaveBeenCalled();
      expect(mockFeedbackHandler.handle).not.toHaveBeenCalled();
      expect(mockBuildModeHandler.handle).not.toHaveBeenCalled();
      expect(mockSettingsHandler.handle).not.toHaveBeenCalled();
    });

    /**
     * Test routing conversation messages
     * Validates: Requirements 9.2
     */
    it('should route get-conversations message to chat handler', async () => {
      const message: WebviewMessage = {
        type: 'get-conversations',
      };

      await messageHandler(message);

      expect(mockChatHandler.handle).toHaveBeenCalledWith(message, mockWebview);
    });

    /**
     * Test routing personas messages
     * Validates: Requirements 9.2
     */
    it('should route get-personas message to personas handler', async () => {
      const message: WebviewMessage = {
        type: 'get-personas',
      };

      await messageHandler(message);

      expect(mockPersonasHandler.handle).toHaveBeenCalledWith(message, mockWebview);
      expect(mockChatHandler.handle).not.toHaveBeenCalled();
    });

    /**
     * Test routing generate-backstory message to personas handler
     * Validates: Requirements 9.2
     */
    it('should route generate-backstory message to personas handler', async () => {
      const message: WebviewMessage = {
        type: 'generate-backstory',
        id: '123',
      };

      await messageHandler(message);

      expect(mockPersonasHandler.handle).toHaveBeenCalledWith(message, mockWebview);
      expect(mockChatHandler.handle).not.toHaveBeenCalled();
    });

    /**
     * Test routing feedback messages
     * Validates: Requirements 9.2
     */
    it('should route generate-feedback message to feedback handler', async () => {
      const message: WebviewMessage = {
        type: 'generate-feedback',
        data: {},
      };

      await messageHandler(message);

      expect(mockFeedbackHandler.handle).toHaveBeenCalledWith(message, mockWebview);
      expect(mockChatHandler.handle).not.toHaveBeenCalled();
    });

    /**
     * Test routing build mode messages
     * Validates: Requirements 9.2
     */
    it('should route initialize-project message to build mode handler', async () => {
      const message: WebviewMessage = {
        type: 'initialize-project',
        projectName: 'test-project',
      };

      await messageHandler(message);

      expect(mockBuildModeHandler.handle).toHaveBeenCalledWith(message, mockWebview);
      expect(mockChatHandler.handle).not.toHaveBeenCalled();
    });

    /**
     * Test routing settings messages
     * Validates: Requirements 9.2
     */
    it('should route get-settings message to settings handler', async () => {
      const message: WebviewMessage = {
        type: 'get-settings',
      };

      await messageHandler(message);

      expect(mockSettingsHandler.handle).toHaveBeenCalledWith(message, mockWebview);
      expect(mockChatHandler.handle).not.toHaveBeenCalled();
    });

    /**
     * Test routing multiple message types
     * Validates: Requirements 9.2
     */
    it('should route different message types to correct handlers', async () => {
      const messages: WebviewMessage[] = [
        { type: 'user-input', value: 'test' },
        { type: 'get-personas' },
        { type: 'generate-feedback', data: {} },
        { type: 'save-stage-file', projectName: 'test' },
        { type: 'save-settings', settings: {} },
      ];

      for (const message of messages) {
        await messageHandler(message);
      }

      expect(mockChatHandler.handle).toHaveBeenCalledTimes(1);
      expect(mockPersonasHandler.handle).toHaveBeenCalledTimes(1);
      expect(mockFeedbackHandler.handle).toHaveBeenCalledTimes(1);
      expect(mockBuildModeHandler.handle).toHaveBeenCalledTimes(1);
      expect(mockSettingsHandler.handle).toHaveBeenCalledTimes(1);
    });

    /**
     * Test unknown message type handling
     * Validates: Requirements 9.2
     */
    it('should handle unknown message types gracefully', async () => {
      const message: WebviewMessage = {
        type: 'unknown-message-type',
      };

      await messageHandler(message);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: 'Unknown message type: unknown-message-type',
      });
    });
  });

  describe('Error Handling', () => {
    let messageHandler: (message: WebviewMessage) => Promise<void>;

    beforeEach(() => {
      sidebarProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      const onDidReceiveMessageCall = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0];
      messageHandler = onDidReceiveMessageCall[0];
    });

    /**
     * Test error handling when handler throws
     * Validates: Requirements 9.4
     */
    it('should handle errors from handlers', async () => {
      const error = new Error('Handler error');
      mockChatHandler.handle.mockRejectedValueOnce(error);

      const message: WebviewMessage = {
        type: 'user-input',
        value: 'test',
      };

      await messageHandler(message);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: 'Handler error',
      });
    });

    /**
     * Test error handling for non-Error objects
     * Validates: Requirements 9.4
     */
    it('should handle non-Error exceptions', async () => {
      mockChatHandler.handle.mockRejectedValueOnce('String error');

      const message: WebviewMessage = {
        type: 'user-input',
        value: 'test',
      };

      await messageHandler(message);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: 'An unknown error occurred',
      });
    });

    /**
     * Test that errors don't crash the provider
     * Validates: Requirements 9.4
     */
    it('should continue processing messages after error', async () => {
      mockChatHandler.handle.mockRejectedValueOnce(new Error('First error'));

      const message1: WebviewMessage = { type: 'user-input', value: 'test1' };
      const message2: WebviewMessage = { type: 'user-input', value: 'test2' };

      await messageHandler(message1);
      await messageHandler(message2);

      expect(mockChatHandler.handle).toHaveBeenCalledTimes(2);
      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });

  describe('Handler Injection', () => {
    /**
     * Test that handlers are properly injected
     * Validates: Requirements 9.3
     */
    it('should inject all required handlers via constructor', () => {
      expect(sidebarProvider).toBeDefined();

      // Verify handlers are used by checking they're called when appropriate messages are sent
      sidebarProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
      const onDidReceiveMessageCall = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0];
      const messageHandler = onDidReceiveMessageCall[0];

      const chatMessage: WebviewMessage = { type: 'user-input', value: 'test' };
      messageHandler(chatMessage);

      expect(mockChatHandler.handle).toHaveBeenCalled();
    });
  });
});
