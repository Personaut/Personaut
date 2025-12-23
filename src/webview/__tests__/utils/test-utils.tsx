/**
 * Test Utilities for Webview Components
 *
 * Provides common utilities for testing React components
 * with proper mocking and rendering.
 *
 * **Validates: Requirements 9.3**
 */

import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { setupVSCodeMock, MockVSCodeAPI } from '../__mocks__/vscode';
import { ThemeProvider } from '../shared/theme';

/**
 * Extended render result with mock API access
 */
interface CustomRenderResult extends RenderResult {
    mockVSCode: MockVSCodeAPI;
}

/**
 * Custom render options
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    initialState?: Record<string, unknown>;
}

/**
 * All-in-one provider wrapper for tests
 */
function createAllProviders(mockVSCode: MockVSCodeAPI) {
    return function AllProviders({ children }: { children: React.ReactNode }) {
        return <ThemeProvider>{children}</ThemeProvider>;
    };
}

/**
 * Custom render function that wraps components with necessary providers
 * and sets up VS Code mock.
 *
 * @example
 * ```tsx
 * const { getByText, mockVSCode } = renderWithProviders(<MyComponent />);
 *
 * // Simulate receiving a message
 * mockVSCode.receiveMessage({ type: 'data-loaded', data: {...} });
 *
 * // Check what messages were posted
 * expect(mockVSCode.getLastPostedMessage()).toEqual({ type: 'request-data' });
 * ```
 */
export function renderWithProviders(
    ui: React.ReactElement,
    options: CustomRenderOptions = {}
): CustomRenderResult {
    const { initialState, ...renderOptions } = options;

    // Setup VS Code mock
    const mockVSCode = setupVSCodeMock();

    // Set initial state if provided
    if (initialState) {
        mockVSCode.setState(initialState);
    }

    // Create wrapper with providers
    const Wrapper = createAllProviders(mockVSCode);

    // Render with wrapper
    const result = render(ui, { wrapper: Wrapper, ...renderOptions });

    return {
        ...result,
        mockVSCode,
    };
}

/**
 * Wait for async operations in tests
 */
export async function waitForAsync(ms: number = 0): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock persona for testing
 */
export function createMockPersona(overrides: Partial<any> = {}) {
    return {
        id: 'test-persona-1',
        name: 'Test User',
        age: 30,
        occupation: 'Software Developer',
        location: 'San Francisco',
        background: 'A test persona for unit testing',
        goals: ['Learn new technologies', 'Build great products'],
        frustrations: ['Slow builds', 'Complex documentation'],
        behaviors: ['Reads documentation', 'Asks questions'],
        quotes: ['Testing is important'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
    };
}

/**
 * Create a mock message for testing
 */
export function createMockMessage(role: 'user' | 'model' | 'error', text: string) {
    return { role, text };
}

/**
 * Create mock settings for testing
 */
export function createMockSettings(overrides: Partial<any> = {}) {
    return {
        provider: 'gemini',
        theme: 'match-ide',
        geminiApiKey: '',
        geminiModel: 'gemini-2.5-flash',
        openaiApiKey: '',
        awsAccessKey: '',
        awsSecretKey: '',
        awsRegion: 'us-east-1',
        awsSessionToken: '',
        bedrockModel: 'anthropic.claude-sonnet-4-20250514-v1:0',
        bedrockUseVpcEndpoint: false,
        bedrockVpcEndpoint: '',
        bedrockCrossRegionInference: false,
        awsUseProfile: false,
        awsProfile: 'default',
        artifacts: {
            generateBackstories: true,
            generateFeedback: true,
            saveToWorkspace: false,
            outputFormat: 'markdown',
        },
        rateLimit: 100000,
        rateLimitWarningThreshold: 80,
        autoRead: false,
        autoWrite: false,
        autoExecute: false,
        ...overrides,
    };
}

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
