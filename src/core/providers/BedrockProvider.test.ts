import { BedrockProvider } from './BedrockProvider';
import { Message, ApiConfiguration } from './IProvider';

// Mock AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@aws-sdk/credential-providers');

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { fromEnv, fromIni } from '@aws-sdk/credential-providers';

describe('BedrockProvider', () => {
  let provider: BedrockProvider;
  let config: ApiConfiguration;
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockSend = jest.fn();
    (BedrockRuntimeClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    config = {
      provider: 'bedrock',
      awsAccessKey: 'test-access-key',
      awsSecretKey: 'test-secret-key',
      awsRegion: 'us-east-1',
      modelId: 'claude-sonnet-4',
    };

    provider = new BedrockProvider(config);
  });

  describe('initialization', () => {
    it('should initialize with explicit credentials', () => {
      expect(provider).toBeInstanceOf(BedrockProvider);
      expect(BedrockRuntimeClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1',
          credentials: {
            accessKeyId: 'test-access-key',
            secretAccessKey: 'test-secret-key',
          },
        })
      );
    });

    it('should initialize with AWS profile', () => {
      const profileConfig = {
        provider: 'bedrock',
        awsUseProfile: true,
        awsProfile: 'my-profile',
        awsRegion: 'us-west-2',
      };

      (fromIni as jest.Mock).mockReturnValue({});
      new BedrockProvider(profileConfig);

      expect(fromIni).toHaveBeenCalledWith({ profile: 'my-profile' });
    });

    it('should use environment credentials when no explicit credentials', () => {
      const envConfig = {
        provider: 'bedrock',
        awsRegion: 'eu-west-1',
      };

      (fromEnv as jest.Mock).mockReturnValue({});
      new BedrockProvider(envConfig);

      expect(fromEnv).toHaveBeenCalled();
    });

    it('should use default region when not specified', () => {
      const configWithoutRegion = {
        provider: 'bedrock',
        awsAccessKey: 'test-key',
        awsSecretKey: 'test-secret',
      };

      new BedrockProvider(configWithoutRegion);

      expect(BedrockRuntimeClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1',
        })
      );
    });
  });

  describe('chat method', () => {
    it('should send request with correct format', async () => {
      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const mockResponseBody = {
        content: [{ text: 'Hello! How can I help you?' }],
        usage: {
          input_tokens: 10,
          output_tokens: 8,
        },
      };

      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(mockResponseBody)),
      });

      const response = await provider.chat(history, systemPrompt);

      expect(response.text).toBe('Hello! How can I help you?');
      expect(response.usage).toEqual({
        inputTokens: 10,
        outputTokens: 8,
        totalTokens: 18,
      });

      expect(mockSend).toHaveBeenCalledWith(expect.any(InvokeModelCommand));
    });

    it('should handle conversation history', async () => {
      const history: Message[] = [
        { role: 'user', text: 'What is 2+2?' },
        { role: 'model', text: '4' },
        { role: 'user', text: 'What about 3+3?' },
      ];
      const systemPrompt = 'You are a math tutor';

      const mockResponseBody = {
        content: [{ text: '6' }],
        usage: {
          input_tokens: 20,
          output_tokens: 2,
        },
      };

      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(mockResponseBody)),
      });

      const response = await provider.chat(history, systemPrompt);

      expect(response.text).toBe('6');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should filter out error messages from history', async () => {
      const history: Message[] = [
        { role: 'user', text: 'Hello' },
        { role: 'error', text: 'Something went wrong' },
        { role: 'user', text: 'Try again' },
      ];
      const systemPrompt = 'You are a helpful assistant';

      const mockResponseBody = {
        content: [{ text: 'Sure!' }],
      };

      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(mockResponseBody)),
      });

      await provider.chat(history, systemPrompt);

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle images in messages', async () => {
      const history: Message[] = [
        {
          role: 'user',
          text: 'What is in this image?',
          images: [
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          ],
        },
      ];
      const systemPrompt = 'You are a helpful assistant';

      const mockResponseBody = {
        content: [{ text: 'I see a red pixel' }],
      };

      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(mockResponseBody)),
      });

      const response = await provider.chat(history, systemPrompt);

      expect(response.text).toBe('I see a red pixel');
    });

    it('should handle ValidationException error', async () => {
      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const error = new Error('Invalid model ID');
      error.name = 'ValidationException';
      mockSend.mockRejectedValue(error);

      await expect(provider.chat(history, systemPrompt)).rejects.toThrow(
        'AWS Bedrock validation error'
      );
    });

    it('should handle AccessDeniedException error', async () => {
      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const error = new Error('Access denied');
      error.name = 'AccessDeniedException';
      mockSend.mockRejectedValue(error);

      await expect(provider.chat(history, systemPrompt)).rejects.toThrow('AWS access denied');
    });

    it('should handle ThrottlingException error', async () => {
      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const error = new Error('Rate limit exceeded');
      error.name = 'ThrottlingException';
      mockSend.mockRejectedValue(error);

      await expect(provider.chat(history, systemPrompt)).rejects.toThrow(
        'AWS Bedrock rate limit exceeded'
      );
    });

    it('should handle ResourceNotFoundException error', async () => {
      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const error = new Error('Model not found');
      error.name = 'ResourceNotFoundException';
      mockSend.mockRejectedValue(error);

      await expect(provider.chat(history, systemPrompt)).rejects.toThrow('Model not found');
    });

    it('should handle credentials error', async () => {
      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const error = new Error('Missing credentials');
      error.name = 'CredentialsProviderError';
      mockSend.mockRejectedValue(error);

      await expect(provider.chat(history, systemPrompt)).rejects.toThrow(
        'AWS credentials not found'
      );
    });

    it('should throw error when no response body', async () => {
      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      mockSend.mockResolvedValue({});

      await expect(provider.chat(history, systemPrompt)).rejects.toThrow(
        'No response body from Bedrock'
      );
    });

    it('should throw error when no content in response', async () => {
      const history: Message[] = [{ role: 'user', text: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const mockResponseBody = {
        content: [],
      };

      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(mockResponseBody)),
      });

      await expect(provider.chat(history, systemPrompt)).rejects.toThrow(
        'No content in Bedrock response'
      );
    });
  });
});
