"use strict";
/**
 * Property test for message routing
 *
 * Feature: feature-based-architecture, Property 15: Message Routing
 *
 * For any webview message received by SidebarProvider,
 * the message should be routed to exactly one feature handler based on message type
 *
 * Validates: Requirements 9.2
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
const fc = __importStar(require("fast-check"));
const SidebarProvider_1 = require("../../presentation/SidebarProvider");
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
describe('Property 15: Message Routing', () => {
    /**
     * Create mock handlers with call tracking
     */
    function createMockHandlers() {
        const handlers = {
            chat: {
                handle: jest.fn().mockResolvedValue(undefined),
                callCount: 0,
            },
            personas: {
                handle: jest.fn().mockResolvedValue(undefined),
                callCount: 0,
            },
            feedback: {
                handle: jest.fn().mockResolvedValue(undefined),
                callCount: 0,
            },
            buildMode: {
                handle: jest.fn().mockResolvedValue(undefined),
                callCount: 0,
            },
            settings: {
                handle: jest.fn().mockResolvedValue(undefined),
                callCount: 0,
            },
        };
        return handlers;
    }
    /**
     * Create mock webview
     */
    function createMockWebview() {
        return {
            options: {},
            html: '',
            onDidReceiveMessage: jest.fn(),
            postMessage: jest.fn().mockResolvedValue(true),
            asWebviewUri: jest.fn((uri) => uri),
            cspSource: 'mock-csp-source',
        };
    }
    /**
     * Create mock webview view
     */
    function createMockWebviewView(webview) {
        return {
            webview,
            visible: true,
            viewType: 'personaut.chatView',
            onDidDispose: jest.fn(),
            onDidChangeVisibility: jest.fn(),
            show: jest.fn(),
            title: 'Personaut',
            description: '',
            badge: undefined,
        };
    }
    /**
     * Create mock extension URI
     */
    function createMockExtensionUri() {
        return {
            fsPath: '/mock/extension/path',
            scheme: 'file',
            authority: '',
            path: '/mock/extension/path',
            query: '',
            fragment: '',
            with: jest.fn(),
            toJSON: jest.fn(),
        };
    }
    /**
     * Test that each message type routes to exactly one handler
     * Validates: Requirements 9.2
     */
    it('should route each message type to exactly one handler', async () => {
        // Define all known message types and their expected handlers
        const messageTypeToHandler = {
            // Chat messages
            'user-input': 'chat',
            'get-conversations': 'chat',
            'load-conversation': 'chat',
            'delete-conversation': 'chat',
            'clear-conversations': 'chat',
            'new-conversation': 'chat',
            // Personas messages
            'get-personas': 'personas',
            'get-persona': 'personas',
            'search-personas': 'personas',
            'create-persona': 'personas',
            'update-persona': 'personas',
            'delete-persona': 'personas',
            'generate-persona-prompt': 'personas',
            'generate-persona-backstory': 'personas',
            // Feedback messages
            'generate-feedback': 'feedback',
            'get-feedback-history': 'feedback',
            'get-feedback': 'feedback',
            'delete-feedback': 'feedback',
            'clear-feedback-history': 'feedback',
            'get-feedback-by-persona': 'feedback',
            'get-feedback-by-type': 'feedback',
            'check-provider-image-support': 'feedback',
            // Build mode messages
            'initialize-project': 'buildMode',
            'save-stage-file': 'buildMode',
            'load-stage-file': 'buildMode',
            'generate-content-streaming': 'buildMode',
            'get-build-projects': 'buildMode',
            'delete-build-project': 'buildMode',
            'get-stage-status': 'buildMode',
            'validate-stage-transition': 'buildMode',
            'get-build-logs': 'buildMode',
            'clear-build-logs': 'buildMode',
            // Settings messages
            'get-settings': 'settings',
            'save-settings': 'settings',
            'reset-settings': 'settings',
        };
        // Test each message type
        for (const [messageType, expectedHandler] of Object.entries(messageTypeToHandler)) {
            // Create fresh mocks for each test
            const handlers = createMockHandlers();
            const mockWebview = createMockWebview();
            const mockWebviewView = createMockWebviewView(mockWebview);
            const mockExtensionUri = createMockExtensionUri();
            // Create SidebarProvider
            const sidebarProvider = new SidebarProvider_1.SidebarProvider(mockExtensionUri, handlers.chat, handlers.personas, handlers.feedback, handlers.buildMode, handlers.settings);
            // Resolve webview
            sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
            // Get message handler
            const onDidReceiveMessageCall = mockWebview.onDidReceiveMessage.mock.calls[0];
            const messageHandler = onDidReceiveMessageCall[0];
            // Create message
            const message = {
                type: messageType,
                data: {},
            };
            // Handle message
            await messageHandler(message);
            // Count how many handlers were called
            const callCounts = {
                chat: handlers.chat.handle.mock.calls.length,
                personas: handlers.personas.handle.mock.calls.length,
                feedback: handlers.feedback.handle.mock.calls.length,
                buildMode: handlers.buildMode.handle.mock.calls.length,
                settings: handlers.settings.handle.mock.calls.length,
            };
            const totalCalls = Object.values(callCounts).reduce((sum, count) => sum + count, 0);
            // Assert exactly one handler was called
            expect(totalCalls).toBe(1);
            // Assert the correct handler was called
            expect(callCounts[expectedHandler]).toBe(1);
            // Log for debugging
            if (totalCalls !== 1 || callCounts[expectedHandler] !== 1) {
                console.error(`Message type "${messageType}" routing failed:`);
                console.error(`  Expected handler: ${expectedHandler}`);
                console.error(`  Call counts:`, callCounts);
            }
        }
    });
    /**
     * Property-based test: For any valid message type, exactly one handler is called
     * Validates: Requirements 9.2
     */
    it('should route any valid message to exactly one handler (property-based)', async () => {
        // Define all valid message types
        const chatMessageTypes = [
            'user-input',
            'get-conversations',
            'load-conversation',
            'delete-conversation',
            'clear-conversations',
            'new-conversation',
        ];
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
        ];
        const settingsMessageTypes = ['get-settings', 'save-settings', 'reset-settings'];
        const allMessageTypes = [
            ...chatMessageTypes,
            ...personasMessageTypes,
            ...feedbackMessageTypes,
            ...buildModeMessageTypes,
            ...settingsMessageTypes,
        ];
        await fc.assert(fc.asyncProperty(fc.constantFrom(...allMessageTypes), fc.record({
            data: fc.anything(),
            value: fc.option(fc.string(), { nil: undefined }),
            id: fc.option(fc.string(), { nil: undefined }),
        }), async (messageType, additionalProps) => {
            // Create fresh mocks
            const handlers = createMockHandlers();
            const mockWebview = createMockWebview();
            const mockWebviewView = createMockWebviewView(mockWebview);
            const mockExtensionUri = createMockExtensionUri();
            // Create SidebarProvider
            const sidebarProvider = new SidebarProvider_1.SidebarProvider(mockExtensionUri, handlers.chat, handlers.personas, handlers.feedback, handlers.buildMode, handlers.settings);
            // Resolve webview
            sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
            // Get message handler
            const onDidReceiveMessageCall = mockWebview.onDidReceiveMessage.mock
                .calls[0];
            const messageHandler = onDidReceiveMessageCall[0];
            // Create message with random additional properties
            const message = {
                type: messageType,
                ...additionalProps,
            };
            // Handle message
            await messageHandler(message);
            // Count handler calls
            const totalCalls = handlers.chat.handle.mock.calls.length +
                handlers.personas.handle.mock.calls.length +
                handlers.feedback.handle.mock.calls.length +
                handlers.buildMode.handle.mock.calls.length +
                handlers.settings.handle.mock.calls.length;
            // Exactly one handler should be called
            expect(totalCalls).toBe(1);
        }), { numRuns: 100 });
    });
    /**
     * Test that unknown message types don't route to any handler
     * Validates: Requirements 9.2
     */
    it('should not route unknown message types to any handler', async () => {
        await fc.assert(fc.asyncProperty(fc.string().filter((str) => {
            // Filter out known message types
            const knownTypes = [
                'user-input',
                'get-conversations',
                'load-conversation',
                'delete-conversation',
                'clear-conversations',
                'new-conversation',
                'get-personas',
                'get-persona',
                'search-personas',
                'create-persona',
                'update-persona',
                'delete-persona',
                'generate-persona-prompt',
                'generate-persona-backstory',
                'generate-feedback',
                'get-feedback-history',
                'get-feedback',
                'delete-feedback',
                'clear-feedback-history',
                'get-feedback-by-persona',
                'get-feedback-by-type',
                'check-provider-image-support',
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
                'get-settings',
                'save-settings',
                'reset-settings',
            ];
            return !knownTypes.includes(str);
        }), async (unknownMessageType) => {
            // Create fresh mocks
            const handlers = createMockHandlers();
            const mockWebview = createMockWebview();
            const mockWebviewView = createMockWebviewView(mockWebview);
            const mockExtensionUri = createMockExtensionUri();
            // Create SidebarProvider
            const sidebarProvider = new SidebarProvider_1.SidebarProvider(mockExtensionUri, handlers.chat, handlers.personas, handlers.feedback, handlers.buildMode, handlers.settings);
            // Resolve webview
            sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
            // Get message handler
            const onDidReceiveMessageCall = mockWebview.onDidReceiveMessage.mock
                .calls[0];
            const messageHandler = onDidReceiveMessageCall[0];
            // Create message with unknown type
            const message = {
                type: unknownMessageType,
            };
            // Handle message
            await messageHandler(message);
            // No handler should be called
            const totalCalls = handlers.chat.handle.mock.calls.length +
                handlers.personas.handle.mock.calls.length +
                handlers.feedback.handle.mock.calls.length +
                handlers.buildMode.handle.mock.calls.length +
                handlers.settings.handle.mock.calls.length;
            expect(totalCalls).toBe(0);
            // Error message should be sent to webview
            expect(mockWebview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                type: 'error',
                message: expect.stringContaining('Unknown message type'),
            }));
        }), { numRuns: 50 });
    });
});
//# sourceMappingURL=message-routing.property.test.js.map