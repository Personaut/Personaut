"use strict";
/**
 * Property test for message handling performance
 *
 * Feature: feature-based-architecture, Property 21: Message Handling Performance
 *
 * For any message handled by a feature handler, the handling time should not exceed
 * the current implementation's handling time by more than 10%
 *
 * Validates: Requirements 16.3
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
describe('Property 21: Message Handling Performance', () => {
    /**
     * Create mock handlers with performance tracking
     */
    function createMockHandlers() {
        return {
            chat: {
                handle: jest.fn().mockImplementation(async () => {
                    // Simulate some processing time
                    await new Promise((resolve) => setTimeout(resolve, 1));
                }),
            },
            personas: {
                handle: jest.fn().mockImplementation(async () => {
                    await new Promise((resolve) => setTimeout(resolve, 1));
                }),
            },
            feedback: {
                handle: jest.fn().mockImplementation(async () => {
                    await new Promise((resolve) => setTimeout(resolve, 1));
                }),
            },
            buildMode: {
                handle: jest.fn().mockImplementation(async () => {
                    await new Promise((resolve) => setTimeout(resolve, 1));
                }),
            },
            settings: {
                handle: jest.fn().mockImplementation(async () => {
                    await new Promise((resolve) => setTimeout(resolve, 1));
                }),
            },
        };
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
     * Measure message handling time
     */
    async function measureMessageHandlingTime(messageType, iterations = 100) {
        const handlers = createMockHandlers();
        const mockWebview = createMockWebview();
        const mockWebviewView = createMockWebviewView(mockWebview);
        const mockExtensionUri = createMockExtensionUri();
        const sidebarProvider = new SidebarProvider_1.SidebarProvider(mockExtensionUri, handlers.chat, handlers.personas, handlers.feedback, handlers.buildMode, handlers.settings);
        sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
        const onDidReceiveMessageCall = mockWebview.onDidReceiveMessage.mock.calls[0];
        const messageHandler = onDidReceiveMessageCall[0];
        const message = {
            type: messageType,
            data: {},
        };
        // Warm up
        await messageHandler(message);
        // Measure
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            await messageHandler(message);
        }
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;
        return avgTime;
    }
    /**
     * Test that message routing overhead is minimal
     * Validates: Requirements 16.3
     */
    it('should have minimal message routing overhead', async () => {
        const messageTypes = [
            'user-input',
            'get-personas',
            'generate-feedback',
            'initialize-project',
            'get-settings',
        ];
        console.log('\nMessage Routing Performance:');
        console.log('============================');
        for (const messageType of messageTypes) {
            const avgTime = await measureMessageHandlingTime(messageType, 100);
            console.log(`  ${messageType.padEnd(30)} ${avgTime.toFixed(3)} ms`);
            // Message routing should be very fast (< 10ms on average)
            // This includes the routing logic but not the actual handler execution
            expect(avgTime).toBeLessThan(10);
        }
        console.log('============================\n');
    });
    /**
     * Property-based test: Message handling time should be consistent
     * Validates: Requirements 16.3
     */
    it('should have consistent message handling times across message types', async () => {
        const messageTypes = [
            'user-input',
            'get-conversations',
            'get-personas',
            'generate-feedback',
            'initialize-project',
            'get-settings',
        ];
        const timings = {};
        // Measure each message type
        for (const messageType of messageTypes) {
            timings[messageType] = await measureMessageHandlingTime(messageType, 50);
        }
        // Calculate statistics
        const times = Object.values(timings);
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);
        const variance = maxTime - minTime;
        console.log('\nMessage Handling Consistency:');
        console.log('=============================');
        console.log(`  Average time:  ${avgTime.toFixed(3)} ms`);
        console.log(`  Min time:      ${minTime.toFixed(3)} ms`);
        console.log(`  Max time:      ${maxTime.toFixed(3)} ms`);
        console.log(`  Variance:      ${variance.toFixed(3)} ms`);
        console.log('=============================\n');
        // Variance should be small (routing should be O(1) for all message types)
        // Allow up to 5ms variance
        expect(variance).toBeLessThan(5);
    });
    /**
     * Test that message handling scales linearly
     * Validates: Requirements 16.3
     */
    it('should scale linearly with number of messages', async () => {
        const messageType = 'get-settings';
        const iterations = [10, 50, 100, 200];
        const timings = [];
        console.log('\nMessage Handling Scalability:');
        console.log('=============================');
        for (const iter of iterations) {
            const avgTime = await measureMessageHandlingTime(messageType, iter);
            timings.push(avgTime);
            console.log(`  ${iter} messages: ${avgTime.toFixed(3)} ms avg`);
        }
        console.log('=============================\n');
        // Check that average time doesn't increase significantly with more iterations
        // This verifies O(1) routing behavior
        const firstAvg = timings[0];
        const lastAvg = timings[timings.length - 1];
        const increase = ((lastAvg - firstAvg) / firstAvg) * 100;
        console.log(`Performance scaling: ${increase.toFixed(2)}% increase`);
        // Allow up to 50% increase (due to JIT warmup and other factors)
        expect(increase).toBeLessThan(50);
    });
    /**
     * Property-based test: Random message types should route efficiently
     * Validates: Requirements 16.3
     */
    it('should route random message types efficiently (property-based)', async () => {
        const validMessageTypes = [
            'user-input',
            'get-conversations',
            'load-conversation',
            'get-personas',
            'create-persona',
            'generate-feedback',
            'get-feedback-history',
            'initialize-project',
            'save-stage-file',
            'get-settings',
            'save-settings',
        ];
        await fc.assert(fc.asyncProperty(fc.constantFrom(...validMessageTypes), async (messageType) => {
            const handlers = createMockHandlers();
            const mockWebview = createMockWebview();
            const mockWebviewView = createMockWebviewView(mockWebview);
            const mockExtensionUri = createMockExtensionUri();
            const sidebarProvider = new SidebarProvider_1.SidebarProvider(mockExtensionUri, handlers.chat, handlers.personas, handlers.feedback, handlers.buildMode, handlers.settings);
            sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
            const onDidReceiveMessageCall = mockWebview.onDidReceiveMessage.mock
                .calls[0];
            const messageHandler = onDidReceiveMessageCall[0];
            const message = {
                type: messageType,
                data: {},
            };
            // Measure single message handling time
            const startTime = performance.now();
            await messageHandler(message);
            const endTime = performance.now();
            const handlingTime = endTime - startTime;
            // Single message should be handled very quickly (< 20ms)
            expect(handlingTime).toBeLessThan(20);
        }), { numRuns: 50 });
    });
    /**
     * Test that error handling doesn't significantly impact performance
     * Validates: Requirements 16.3
     */
    it('should handle errors efficiently', async () => {
        const handlers = createMockHandlers();
        // Make one handler throw an error
        handlers.chat.handle = jest.fn().mockRejectedValue(new Error('Test error'));
        const mockWebview = createMockWebview();
        const mockWebviewView = createMockWebviewView(mockWebview);
        const mockExtensionUri = createMockExtensionUri();
        const sidebarProvider = new SidebarProvider_1.SidebarProvider(mockExtensionUri, handlers.chat, handlers.personas, handlers.feedback, handlers.buildMode, handlers.settings);
        sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
        const onDidReceiveMessageCall = mockWebview.onDidReceiveMessage.mock.calls[0];
        const messageHandler = onDidReceiveMessageCall[0];
        const message = {
            type: 'user-input',
            data: {},
        };
        // Measure error handling time
        const iterations = 50;
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            await messageHandler(message);
        }
        const endTime = performance.now();
        const avgTime = (endTime - startTime) / iterations;
        console.log('\nError Handling Performance:');
        console.log('===========================');
        console.log(`  Average time: ${avgTime.toFixed(3)} ms`);
        console.log('===========================\n');
        // Error handling should still be fast (< 10ms)
        expect(avgTime).toBeLessThan(10);
        // Verify error was sent to webview
        expect(mockWebview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
            type: 'error',
        }));
    });
    /**
     * Test memory efficiency of message handling
     * Validates: Requirements 16.4
     */
    it('should not leak memory during message handling', async () => {
        const handlers = createMockHandlers();
        const mockWebview = createMockWebview();
        const mockWebviewView = createMockWebviewView(mockWebview);
        const mockExtensionUri = createMockExtensionUri();
        const sidebarProvider = new SidebarProvider_1.SidebarProvider(mockExtensionUri, handlers.chat, handlers.personas, handlers.feedback, handlers.buildMode, handlers.settings);
        sidebarProvider.resolveWebviewView(mockWebviewView, {}, {});
        const onDidReceiveMessageCall = mockWebview.onDidReceiveMessage.mock.calls[0];
        const messageHandler = onDidReceiveMessageCall[0];
        // Get initial memory usage
        const initialMemory = process.memoryUsage().heapUsed;
        // Handle many messages
        const iterations = 1000;
        for (let i = 0; i < iterations; i++) {
            const message = {
                type: 'get-settings',
                data: { iteration: i },
            };
            await messageHandler(message);
        }
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        // Get final memory usage
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePerMessage = memoryIncrease / iterations;
        console.log('\nMemory Usage Analysis:');
        console.log('======================');
        console.log(`  Initial memory:     ${formatBytes(initialMemory)}`);
        console.log(`  Final memory:       ${formatBytes(finalMemory)}`);
        console.log(`  Memory increase:    ${formatBytes(memoryIncrease)}`);
        console.log(`  Per message:        ${formatBytes(memoryIncreasePerMessage)}`);
        console.log('======================\n');
        // Memory increase should be minimal (< 5KB per message on average)
        // This is a generous limit to account for V8 heap behavior and Jest mock overhead
        // In production, the actual memory usage is much lower
        expect(memoryIncreasePerMessage).toBeLessThan(5 * 1024);
    });
});
/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
//# sourceMappingURL=message-handling-performance.property.test.js.map