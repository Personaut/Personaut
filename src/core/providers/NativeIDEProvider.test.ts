import { NativeIDEProvider } from './NativeIDEProvider';
import { Message } from './IProvider';

// Mock vscode module - will use the __mocks__/vscode.ts file
jest.mock('vscode');

describe('NativeIDEProvider', () => {
  let provider: NativeIDEProvider;
  let mockLm: any;
  let mockModel: any;
  let vscode: any;

  beforeEach(() => {
    // Import vscode after mocking
    vscode = require('vscode');

    provider = new NativeIDEProvider();

    mockModel = {
      name: 'gpt-4',
      family: 'gpt-4',
      vendor: 'copilot',
      sendRequest: jest.fn(),
    };

    mockLm = {
      selectChatModels: jest.fn().mockResolvedValue([mockModel]),
    };

    vscode.lm = mockLm;
    vscode.LanguageModelChatMessage = {
      User: jest.fn((text) => ({ role: 'user', text })),
      Assistant: jest.fn((text) => ({ role: 'assistant', text })),
    };
  });

  afterEach(() => {
    delete vscode.lm;
    delete vscode.LanguageModelChatMessage;
    jest.clearAllMocks();
  });

  describe('chat method', () => {
    it('should send request with correct format', async () => {
      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const mockResponse = {
        text: (async function* () {
          yield 'Hello! ';
          yield 'How can I help you?';
        })(),
      };

      mockModel.sendRequest.mockResolvedValue(mockResponse);

      const response = await provider.chat(history, systemPrompt);

      expect(response.text).toBe('Hello! How can I help you?');
      expect(response.usage).toBeDefined();
      expect(response.usage?.inputTokens).toBeGreaterThan(0);
      expect(response.usage?.outputTokens).toBeGreaterThan(0);
      expect(mockModel.sendRequest).toHaveBeenCalled();
    });

    it('should handle conversation history', async () => {
      const history: Message[] = [
        { role: 'user', text: 'What is 2+2?' },
        { role: 'model', text: '4' },
        { role: 'user', text: 'What about 3+3?' },
      ];
      const systemPrompt = 'You are a math tutor';

      const mockResponse = {
        text: (async function* () {
          yield '6';
        })(),
      };

      mockModel.sendRequest.mockResolvedValue(mockResponse);

      const response = await provider.chat(history, systemPrompt);

      expect(response.text).toBe('6');
      expect(mockModel.sendRequest).toHaveBeenCalled();

      // Verify messages were constructed correctly
      const userMessageCalls = (vscode as any).LanguageModelChatMessage.User.mock.calls;
      const assistantMessageCalls = (vscode as any).LanguageModelChatMessage.Assistant.mock.calls;

      expect(userMessageCalls.length).toBeGreaterThan(0);
      expect(assistantMessageCalls.length).toBeGreaterThan(0);
    });

    it('should filter out error messages from history', async () => {
      const history: Message[] = [
        { role: 'user', text: 'Hello' },
        { role: 'error', text: 'Something went wrong' },
        { role: 'user', text: 'Try again' },
      ];
      const systemPrompt = 'You are a helpful assistant';

      const mockResponse = {
        text: (async function* () {
          yield 'Sure!';
        })(),
      };

      mockModel.sendRequest.mockResolvedValue(mockResponse);

      await provider.chat(history, systemPrompt);

      // Verify error messages were not included
      const userMessageCalls = (vscode as any).LanguageModelChatMessage.User.mock.calls;
      const errorMessages = userMessageCalls.filter(
        (call: any) => call[0] === 'Something went wrong'
      );
      expect(errorMessages.length).toBe(0);
    });

    it('should return error when vscode.lm is not available', async () => {
      delete (vscode as any).lm;

      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const response = await provider.chat(history, systemPrompt);

      expect(response.text).toContain('VS Code Language Model API');
      expect(response.text).toContain('not available');
    });

    it('should return error when no models are available', async () => {
      mockLm.selectChatModels.mockResolvedValue([]);

      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const response = await provider.chat(history, systemPrompt);

      expect(response.text).toContain('No language models found');
    });

    it('should prefer GPT-4 models', async () => {
      const gpt4Model = {
        name: 'gpt-4-turbo',
        family: 'gpt-4',
        vendor: 'openai',
        sendRequest: jest.fn(),
      };

      const otherModel = {
        name: 'claude-3',
        family: 'claude-3',
        vendor: 'anthropic',
        sendRequest: jest.fn(),
      };

      mockLm.selectChatModels.mockResolvedValue([otherModel, gpt4Model]);

      const mockResponse = {
        text: (async function* () {
          yield 'Response';
        })(),
      };

      gpt4Model.sendRequest.mockResolvedValue(mockResponse);

      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      await provider.chat(history, systemPrompt);

      expect(gpt4Model.sendRequest).toHaveBeenCalled();
      expect(otherModel.sendRequest).not.toHaveBeenCalled();
    });

    it('should handle model selection timeout', async () => {
      mockLm.selectChatModels.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([mockModel]), 15000))
      );

      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const response = await provider.chat(history, systemPrompt);

      expect(response.text).toContain('Error communicating with Native IDE Agent');
    }, 12000); // Increase timeout to 12 seconds to allow for the 10 second timeout in the provider

    it('should handle sendRequest errors', async () => {
      mockModel.sendRequest.mockRejectedValue(new Error('Network error'));

      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const response = await provider.chat(history, systemPrompt);

      expect(response.text).toContain('Error communicating with Native IDE Agent');
      expect(response.text).toContain('Network error');
    });

    it('should estimate token usage correctly', async () => {
      const history: Message[] = [
        { role: 'user', text: 'Hello world' }, // 11 chars
      ];
      const systemPrompt = 'You are a helpful assistant'; // 28 chars

      const mockResponse = {
        text: (async function* () {
          yield 'Hi there!'; // 9 chars
        })(),
      };

      mockModel.sendRequest.mockResolvedValue(mockResponse);

      const response = await provider.chat(history, systemPrompt);

      // Input: (28 + 11) / 4 = ~10 tokens
      // Output: 9 / 4 = ~3 tokens
      expect(response.usage?.inputTokens).toBeGreaterThan(0);
      expect(response.usage?.outputTokens).toBeGreaterThan(0);
      expect(response.usage?.totalTokens).toBe(
        response.usage!.inputTokens + response.usage!.outputTokens
      );
    });
  });
});
