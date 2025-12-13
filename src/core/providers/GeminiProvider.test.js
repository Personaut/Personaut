"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GeminiProvider_1 = require("./GeminiProvider");
// Mock fetch globally
global.fetch = jest.fn();
describe('GeminiProvider', () => {
    let provider;
    let config;
    beforeEach(() => {
        config = {
            provider: 'gemini',
            apiKey: 'test-api-key',
            modelId: 'gemini-2.5-flash',
        };
        provider = new GeminiProvider_1.GeminiProvider(config);
        jest.clearAllMocks();
    });
    describe('initialization', () => {
        it('should initialize with valid config', () => {
            expect(provider).toBeInstanceOf(GeminiProvider_1.GeminiProvider);
        });
        it('should throw error when API key is missing', () => {
            const invalidConfig = { provider: 'gemini' };
            expect(() => new GeminiProvider_1.GeminiProvider(invalidConfig)).toThrow('Gemini API Key is required');
        });
        it('should use default model when modelId is not provided', () => {
            const configWithoutModel = {
                provider: 'gemini',
                apiKey: 'test-api-key',
            };
            const providerWithDefault = new GeminiProvider_1.GeminiProvider(configWithoutModel);
            expect(providerWithDefault).toBeInstanceOf(GeminiProvider_1.GeminiProvider);
        });
    });
    describe('chat method', () => {
        it('should send request with correct format', async () => {
            const history = [{ role: 'user', text: 'Hello' }];
            const systemPrompt = 'You are a helpful assistant';
            const mockResponse = {
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: 'Hello! How can I help you?' }],
                            },
                        },
                    ],
                    usageMetadata: {
                        promptTokenCount: 10,
                        candidatesTokenCount: 8,
                        totalTokenCount: 18,
                    },
                }),
            };
            global.fetch.mockResolvedValue(mockResponse);
            const response = await provider.chat(history, systemPrompt);
            expect(response.text).toBe('Hello! How can I help you?');
            expect(response.usage).toEqual({
                inputTokens: 10,
                outputTokens: 8,
                totalTokens: 18,
            });
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('aiplatform.googleapis.com'), expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            }));
        });
        it('should handle conversation history', async () => {
            const history = [
                { role: 'user', text: 'What is 2+2?' },
                { role: 'model', text: '4' },
                { role: 'user', text: 'What about 3+3?' },
            ];
            const systemPrompt = 'You are a math tutor';
            const mockResponse = {
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: '6' }],
                            },
                        },
                    ],
                }),
            };
            global.fetch.mockResolvedValue(mockResponse);
            const response = await provider.chat(history, systemPrompt);
            expect(response.text).toBe('6');
            const callArgs = global.fetch.mock.calls[0];
            const requestBody = JSON.parse(callArgs[1].body);
            expect(requestBody.contents).toHaveLength(3);
            expect(requestBody.systemInstruction.parts[0].text).toBe(systemPrompt);
        });
        it('should throw error when no user message in history', async () => {
            const history = [{ role: 'model', text: 'Hello' }];
            const systemPrompt = 'You are a helpful assistant';
            await expect(provider.chat(history, systemPrompt)).rejects.toThrow('No user message found in history');
        });
        it('should handle API errors', async () => {
            const history = [{ role: 'user', text: 'Hello' }];
            const systemPrompt = 'You are a helpful assistant';
            const mockResponse = {
                ok: false,
                text: async () => 'API Error: Invalid request',
            };
            global.fetch.mockResolvedValue(mockResponse);
            await expect(provider.chat(history, systemPrompt)).rejects.toThrow('API Error: Invalid request');
        });
        it('should filter out error messages from history', async () => {
            const history = [
                { role: 'user', text: 'Hello' },
                { role: 'error', text: 'Something went wrong' },
                { role: 'user', text: 'Try again' },
            ];
            const systemPrompt = 'You are a helpful assistant';
            const mockResponse = {
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: 'Sure!' }],
                            },
                        },
                    ],
                }),
            };
            global.fetch.mockResolvedValue(mockResponse);
            await provider.chat(history, systemPrompt);
            const callArgs = global.fetch.mock.calls[0];
            const requestBody = JSON.parse(callArgs[1].body);
            // Should only have 2 messages (error filtered out)
            expect(requestBody.contents).toHaveLength(2);
            expect(requestBody.contents.every((c) => c.role !== 'error')).toBe(true);
        });
    });
});
//# sourceMappingURL=GeminiProvider.test.js.map