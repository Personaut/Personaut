/**
 * Unit tests for DeveloperAgent.generateCode()
 * Tests the promise-based callback and response extraction
 */

import { DeveloperAgent } from '../DeveloperAgent';
import { BaseAgentConfig } from '../../base/BaseAgent';

describe('DeveloperAgent.generateCode()', () => {
    let agent: DeveloperAgent;
    let mockChat: jest.Mock;
    let mockOnDidUpdateMessages: jest.Mock;

    beforeEach(() => {
        // Create mock config
        const mockConfig: Partial<BaseAgentConfig> = {
            conversationId: 'test-conversation',
            agentType: 'developer',
            onDidUpdateMessages: jest.fn(),
        };

        // Create agent
        agent = new DeveloperAgent(
            mockConfig as BaseAgentConfig,
            {
                framework: 'react',
                projectPath: '/test/path',
            }
        );

        // Mock the chat method
        mockChat = jest.fn();
        mockOnDidUpdateMessages = jest.fn();

        (agent as any).chat = mockChat;
        (agent as any).onDidUpdateMessages = mockOnDidUpdateMessages;
    });

    test('should call generateCode and return code', async () => {
        // Arrange
        const spec = 'Create a button component';
        const expectedCode = 'import React from "react";\n\nconst Button = () => <button>Click</button>;';

        // Mock chat to trigger callback with model response
        mockChat.mockImplementation(() => {
            // Simulate callback being triggered
            const callback = (agent as any).onDidUpdateMessages;
            callback([
                { role: 'user', text: 'Generate code...' },
                { role: 'model', text: expectedCode }
            ]);
            return Promise.resolve();
        });

        // Act
        const result = await agent.generateCode(spec);

        // Assert
        expect(mockChat).toHaveBeenCalledTimes(1);
        expect(result).toBe(expectedCode);
        expect(result.length).toBeGreaterThan(0);
    });

    test('should return empty string if no model response', async () => {
        // Arrange
        const spec = 'Create a button component';

        // Mock chat with no model response
        mockChat.mockImplementation(() => {
            const callback = (agent as any).onDidUpdateMessages;
            callback([
                { role: 'user', text: 'Generate code...' }
            ]);
            return Promise.resolve();
        });

        // Act
        const result = await agent.generateCode(spec);

        // Assert
        expect(result).toBe('');
    });

    test('should handle chat error gracefully', async () => {
        // Arrange
        const spec = 'Create a button component';

        // Mock chat to throw error
        mockChat.mockRejectedValue(new Error('API Error'));

        // Act
        const result = await agent.generateCode(spec);

        // Assert
        expect(result).toBe('');
    });

    test('should restore original callback after completion', async () => {
        // Arrange
        const spec = 'Create a button component';
        const originalCallback = (agent as any).onDidUpdateMessages;

        mockChat.mockImplementation(() => {
            const callback = (agent as any).onDidUpdateMessages;
            callback([
                { role: 'user', text: 'Generate code...' },
                { role: 'model', text: 'const code = "test";' }
            ]);
            return Promise.resolve();
        });

        // Act
        await agent.generateCode(spec);

        // Assert
        expect((agent as any).onDidUpdateMessages).toBe(originalCallback);
    });

    test('should log all steps when generating code', async () => {
        // Arrange
        const spec = 'Create a button component';
        const consoleSpy = jest.spyOn(console, 'log');

        mockChat.mockImplementation(() => {
            const callback = (agent as any).onDidUpdateMessages;
            callback([
                { role: 'user', text: 'Generate code...' },
                { role: 'model', text: 'const code = "test";' }
            ]);
            return Promise.resolve();
        });

        // Act
        await agent.generateCode(spec);

        // Assert
        expect(consoleSpy).toHaveBeenCalledWith('[DeveloperAgent] generateCode called');
        expect(consoleSpy).toHaveBeenCalledWith('[DeveloperAgent] Spec length:', expect.any(Number));
        expect(consoleSpy).toHaveBeenCalledWith('[DeveloperAgent] Sending chat...');
        expect(consoleSpy).toHaveBeenCalledWith('[DeveloperAgent] Chat completed');

        consoleSpy.mockRestore();
    });

    test('should handle multiple messages and extract last model message', async () => {
        // Arrange
        const spec = 'Create a button component';
        const expectedCode = 'const FinalCode = () => {};';

        mockChat.mockImplementation(() => {
            const callback = (agent as any).onDidUpdateMessages;
            callback([
                { role: 'user', text: 'Generate code...' },
                { role: 'model', text: 'First attempt' },
                { role: 'user', text: 'Try again' },
                { role: 'model', text: expectedCode }
            ]);
            return Promise.resolve();
        });

        // Act
        const result = await agent.generateCode(spec);

        // Assert
        expect(result).toBe(expectedCode);
    });

    test('should handle empty text in model message', async () => {
        // Arrange
        const spec = 'Create a button component';

        mockChat.mockImplementation(() => {
            const callback = (agent as any).onDidUpdateMessages;
            callback([
                { role: 'user', text: 'Generate code...' },
                { role: 'model', text: '' }
            ]);
            return Promise.resolve();
        });

        // Act
        const result = await agent.generateCode(spec);

        // Assert
        expect(result).toBe('');
    });

    test('should create proper prompt with framework', async () => {
        // Arrange
        const spec = 'Create a button component';
        let capturedPrompt = '';

        mockChat.mockImplementation((prompt: string) => {
            capturedPrompt = prompt;
            const callback = (agent as any).onDidUpdateMessages;
            callback([
                { role: 'user', text: prompt },
                { role: 'model', text: 'code' }
            ]);
            return Promise.resolve();
        });

        // Act
        await agent.generateCode(spec);

        // Assert
        expect(capturedPrompt).toContain('react');
        expect(capturedPrompt).toContain(spec);
        expect(capturedPrompt).toContain('best practices');
    });
});
