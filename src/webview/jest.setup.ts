/**
 * Jest Setup File for Webview Tests
 * 
 * This file is automatically executed before each test file.
 * It sets up the testing environment with necessary matchers and mocks.
 */

// Import jest-dom matchers for DOM assertions
import '@testing-library/jest-dom';

// Mock window.acquireVsCodeApi for all tests
const mockVSCodeApi = {
    postMessage: jest.fn(),
    getState: jest.fn(() => ({})),
    setState: jest.fn(),
};

(global as any).window = {
    ...(global as any).window,
    acquireVsCodeApi: jest.fn(() => mockVSCodeApi),
    logoUri: 'test-logo-uri',
    iconUri: 'test-icon-uri',
};

// Reset mocks between tests
beforeEach(() => {
    mockVSCodeApi.postMessage.mockClear();
    mockVSCodeApi.getState.mockClear();
    mockVSCodeApi.setState.mockClear();
});
