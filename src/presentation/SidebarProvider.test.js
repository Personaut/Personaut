"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const SidebarProvider_1 = require("./SidebarProvider");
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
    let sidebarProvider;
    let mockChatHandler;
    let mockPersonasHandler;
    let mockFeedbackHandler;
    let mockBuildModeHandler;
    let mockSettingsHandler;
    let mockExtensionUri;
    let mockWebviewView;
    let mockWebview;
    beforeEach(() => {
        // Create mock handlers
        mockChatHandler = {
            handle: jest.fn().mockResolvedValue(undefined),
        };
        mockPersonasHandler = {
            handle: jest.fn().mockResolvedValue(undefined),
        };
        mockFeedbackHandler = {
            handle: jest.fn().mockResolvedValue(undefined),
        };
        mockBuildModeHandler = {
            handle: jest.fn().mockResolvedValue(undefined),
        };
        mockSettingsHandler = {
            handle: jest.fn().mockResolvedValue(undefined),
        };
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
        };
        // Create mock webview
        mockWebview = {
            options: {},
            html: '',
            onDidReceiveMessage: jest.fn(),
            postMessage: jest.fn().mockResolvedValue(true),
            asWebviewUri: jest.fn((uri) => uri),
            cspSource: 'mock-csp-source',
        };
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
        };
        // Create SidebarProvider instance
        sidebarProvider = new SidebarProvider_1.SidebarProvider(mockExtensionUri, mockChatHandler, mockPersonasHandler, mockFeedbackHandler, mockBuildModeHandler, mockSettingsHandler);
    });
    describe('Webview Initialization', () => {
        /**
         * Test webview initialization
         * Validates: Requirements 9.1
         */
        it('should initialize webview with correct options', () => {
            sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
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
            sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
            expect(mockWebview.html).toBeTruthy();
            expect(mockWebview.html).toContain('<!DOCTYPE html>');
            expect(mockWebview.html).toContain('<div id="root"></div>');
        });
        /**
         * Test message listener setup
         * Validates: Requirements 9.1
         */
        it('should set up message listener', () => {
            sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
            expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();
        });
        /**
         * Test view property
         * Validates: Requirements 9.1
         */
        it('should expose webview view through view property', () => {
            expect(sidebarProvider.view).toBeUndefined();
            sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
            expect(sidebarProvider.view).toBe(mockWebviewView);
        });
    });
    describe('Message Routing', () => {
        let messageHandler;
        beforeEach(() => {
            sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
            // Extract the message handler from onDidReceiveMessage call
            const onDidReceiveMessageCall = mockWebview.onDidReceiveMessage.mock.calls[0];
            messageHandler = onDidReceiveMessageCall[0];
        });
        /**
         * Test routing chat messages
         * Validates: Requirements 9.2
         */
        it('should route user-input message to chat handler', async () => {
            const message = {
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
            const message = {
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
            const message = {
                type: 'get-personas',
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
            const message = {
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
            const message = {
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
            const message = {
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
            const messages = [
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
            const message = {
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
        let messageHandler;
        beforeEach(() => {
            sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
            const onDidReceiveMessageCall = mockWebview.onDidReceiveMessage.mock.calls[0];
            messageHandler = onDidReceiveMessageCall[0];
        });
        /**
         * Test error handling when handler throws
         * Validates: Requirements 9.4
         */
        it('should handle errors from handlers', async () => {
            const error = new Error('Handler error');
            mockChatHandler.handle.mockRejectedValueOnce(error);
            const message = {
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
            const message = {
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
            const message1 = { type: 'user-input', value: 'test1' };
            const message2 = { type: 'user-input', value: 'test2' };
            await messageHandler(message1);
            await messageHandler(message2);
            expect(mockChatHandler.handle).toHaveBeenCalledTimes(2);
            expect(mockWebview.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
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
            sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
            const onDidReceiveMessageCall = mockWebview.onDidReceiveMessage.mock.calls[0];
            const messageHandler = onDidReceiveMessageCall[0];
            const chatMessage = { type: 'user-input', value: 'test' };
            messageHandler(chatMessage);
            expect(mockChatHandler.handle).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=SidebarProvider.test.js.map