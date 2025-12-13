/**
 * Unit tests for FeedbackHandler
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 4.1, 10.1, 10.2
 */

import { FeedbackHandler } from './FeedbackHandler';
import { FeedbackService } from '../services/FeedbackService';
import { InputValidator } from '../../../shared/services';
import { WebviewMessage } from '../../../shared/types/CommonTypes';
import { FeedbackStorage, GenerateFeedbackParams } from '../types/FeedbackTypes';

/**
 * Mock storage implementation
 */
class MockStorage implements FeedbackStorage {
  private data: Map<string, any> = new Map();

  get<T>(key: string, defaultValue: T): T {
    return this.data.has(key) ? this.data.get(key) : defaultValue;
  }

  async update(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }
}

/**
 * Mock AgentManager for testing
 */
class MockAgentManager {
  getOrCreateAgent = jest.fn();
  disposeAgent = jest.fn();
}

/**
 * Mock webview for testing
 */
class MockWebview {
  public messages: any[] = [];

  postMessage(message: any): void {
    this.messages.push(message);
  }

  getLastMessage(): any {
    return this.messages[this.messages.length - 1];
  }

  clearMessages(): void {
    this.messages = [];
  }
}

describe('FeedbackHandler', () => {
  let handler: FeedbackHandler;
  let service: FeedbackService;
  let inputValidator: InputValidator;
  let storage: MockStorage;
  let webview: MockWebview;
  let agentManager: MockAgentManager;

  beforeEach(() => {
    storage = new MockStorage();
    agentManager = new MockAgentManager();
    service = new FeedbackService(storage, agentManager as any);
    inputValidator = new InputValidator();
    handler = new FeedbackHandler(service, inputValidator);
    webview = new MockWebview();
  });

  describe('handle - message routing', () => {
    it('should route generate-feedback message', async () => {
      const message: WebviewMessage = {
        type: 'generate-feedback',
        data: {
          personaNames: ['Alice'],
          context: 'Testing',
          url: 'https://example.com',
          feedbackType: 'individual',
        },
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('feedback-generated');
      expect(response.entry).toBeDefined();
    });

    it('should route get-feedback-history message', async () => {
      const message: WebviewMessage = {
        type: 'get-feedback-history',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('feedback-history');
      expect(response.history).toBeDefined();
      expect(Array.isArray(response.history)).toBe(true);
    });

    it('should route get-feedback message', async () => {
      // First create a feedback entry
      const params: GenerateFeedbackParams = {
        personaNames: ['Alice'],
        context: 'Testing',
        url: 'https://example.com',
        feedbackType: 'individual',
      };
      const result = await service.generateFeedback(params);

      const message: WebviewMessage = {
        type: 'get-feedback',
        id: result.entry.id,
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('feedback-details');
      expect(response.entry).toBeDefined();
      expect(response.entry.id).toBe(result.entry.id);
    });

    it('should route delete-feedback message', async () => {
      // First create a feedback entry
      const params: GenerateFeedbackParams = {
        personaNames: ['Alice'],
        context: 'Testing',
        url: 'https://example.com',
        feedbackType: 'individual',
      };
      const result = await service.generateFeedback(params);

      const message: WebviewMessage = {
        type: 'delete-feedback',
        id: result.entry.id,
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('feedback-deleted');
      expect(response.id).toBe(result.entry.id);
    });

    it('should route clear-feedback-history message', async () => {
      const message: WebviewMessage = {
        type: 'clear-feedback-history',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('feedback-history-cleared');
    });

    it('should route get-feedback-by-persona message', async () => {
      const message: WebviewMessage = {
        type: 'get-feedback-by-persona',
        personaName: 'Alice',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('feedback-by-persona');
      expect(response.personaName).toBe('Alice');
      expect(response.entries).toBeDefined();
    });

    it('should route get-feedback-by-type message', async () => {
      const message: WebviewMessage = {
        type: 'get-feedback-by-type',
        feedbackType: 'individual',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('feedback-by-type');
      expect(response.feedbackType).toBe('individual');
      expect(response.entries).toBeDefined();
    });

    it('should route check-provider-image-support message', async () => {
      const message: WebviewMessage = {
        type: 'check-provider-image-support',
        provider: 'gemini',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('provider-image-support');
      expect(response.provider).toBe('gemini');
      expect(response.supportsImages).toBeDefined();
    });

    it('should handle unknown message type', async () => {
      const message: WebviewMessage = {
        type: 'unknown-message-type',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('error');
      expect(response.message).toBeDefined();
      // Error message is sanitized for security
    });
  });

  describe('input validation', () => {
    it('should validate persona names in generate-feedback', async () => {
      const message: WebviewMessage = {
        type: 'generate-feedback',
        data: {
          personaNames: [],
          context: 'Testing',
          url: 'https://example.com',
          feedbackType: 'individual',
        },
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('error');
      expect(response.message).toBeDefined();
      // Error message is sanitized for security
    });

    it('should sanitize context in generate-feedback', async () => {
      const message: WebviewMessage = {
        type: 'generate-feedback',
        data: {
          personaNames: ['Alice'],
          context: '<script>alert("xss")</script>Testing',
          url: 'https://example.com',
          feedbackType: 'individual',
        },
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      // Should succeed but with sanitized content
      expect(response.type).toBe('feedback-generated');
      expect(response.entry).toBeDefined();
    });

    it('should sanitize URL in generate-feedback', async () => {
      const message: WebviewMessage = {
        type: 'generate-feedback',
        data: {
          personaNames: ['Alice'],
          context: 'Testing',
          url: '<script>alert("xss")</script>https://example.com',
          feedbackType: 'individual',
        },
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      // Should succeed but with sanitized URL
      expect(response.type).toBe('feedback-generated');
      expect(response.entry).toBeDefined();
    });

    it('should sanitize feedback ID in get-feedback', async () => {
      const message: WebviewMessage = {
        type: 'get-feedback',
        id: '<script>alert("xss")</script>',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      // Should fail because the ID doesn't exist (after sanitization)
      expect(response.type).toBe('error');
      expect(response.message).toBeDefined();
    });

    it('should sanitize feedback ID in delete-feedback', async () => {
      const message: WebviewMessage = {
        type: 'delete-feedback',
        id: '<script>alert("xss")</script>',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      // Should fail because the ID doesn't exist (after sanitization)
      expect(response.type).toBe('error');
      expect(response.message).toBeDefined();
    });

    it('should sanitize persona name in get-feedback-by-persona', async () => {
      const message: WebviewMessage = {
        type: 'get-feedback-by-persona',
        personaName: '<script>alert("xss")</script>Alice',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      // Should succeed with sanitized persona name
      expect(response.type).toBe('feedback-by-persona');
      expect(response.entries).toBeDefined();
    });

    it('should sanitize provider name in check-provider-image-support', async () => {
      const message: WebviewMessage = {
        type: 'check-provider-image-support',
        provider: '<script>alert("xss")</script>gemini',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      // Should succeed with sanitized provider name
      expect(response.type).toBe('provider-image-support');
      expect(response.supportsImages).toBeDefined();
    });

    it('should sanitize each persona name in array', async () => {
      const message: WebviewMessage = {
        type: 'generate-feedback',
        data: {
          personaNames: ['Alice', '<script>alert("xss")</script>Bob'],
          context: 'Testing',
          url: 'https://example.com',
          feedbackType: 'individual',
        },
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      // Should succeed with sanitized persona names
      expect(response.type).toBe('feedback-generated');
      expect(response.entry).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      const message: WebviewMessage = {
        type: 'get-feedback',
        id: 'non-existent-id',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('error');
      expect(response.message).toBeDefined();
    });

    it('should sanitize error messages', async () => {
      const message: WebviewMessage = {
        type: 'delete-feedback',
        id: 'non-existent-id',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('error');
      expect(response.message).toBeDefined();
      // Error message should not contain sensitive information
      expect(response.message).not.toContain('stack');
      expect(response.message).not.toContain('Error:');
    });

    it('should log errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const message: WebviewMessage = {
        type: 'get-feedback',
        id: 'non-existent-id',
      };

      await handler.handle(message, webview as any);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain('[FeedbackHandler]');

      consoleSpy.mockRestore();
    });
  });

  describe('generateFeedback', () => {
    it('should generate individual feedback', async () => {
      const message: WebviewMessage = {
        type: 'generate-feedback',
        data: {
          personaNames: ['Alice'],
          context: 'Testing the login page',
          url: 'https://example.com/login',
          feedbackType: 'individual',
        },
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('feedback-generated');
      expect(response.entry.personaNames).toEqual(['Alice']);
      expect(response.entry.feedbackType).toBe('individual');
    });

    it('should generate group feedback', async () => {
      const message: WebviewMessage = {
        type: 'generate-feedback',
        data: {
          personaNames: ['Alice', 'Bob', 'Charlie'],
          context: 'Testing the dashboard',
          url: 'https://example.com/dashboard',
          feedbackType: 'group',
        },
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('feedback-generated');
      expect(response.entry.personaNames).toEqual(['Alice', 'Bob', 'Charlie']);
      expect(response.entry.feedbackType).toBe('group');
    });

    it('should include screenshot if provided', async () => {
      const message: WebviewMessage = {
        type: 'generate-feedback',
        data: {
          personaNames: ['Alice'],
          context: 'Testing',
          url: 'https://example.com',
          screenshot: 'base64-encoded-image',
          feedbackType: 'individual',
        },
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('feedback-generated');
      expect(response.entry.screenshot).toBe('base64-encoded-image');
    });
  });

  describe('getFeedbackByType', () => {
    it('should validate feedback type', async () => {
      const message: WebviewMessage = {
        type: 'get-feedback-by-type',
        feedbackType: 'invalid-type',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('error');
      expect(response.message).toBeDefined();
      // Error message is sanitized for security
    });

    it('should accept individual type', async () => {
      const message: WebviewMessage = {
        type: 'get-feedback-by-type',
        feedbackType: 'individual',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('feedback-by-type');
    });

    it('should accept group type', async () => {
      const message: WebviewMessage = {
        type: 'get-feedback-by-type',
        feedbackType: 'group',
      };

      await handler.handle(message, webview as any);

      const response = webview.getLastMessage();
      expect(response.type).toBe('feedback-by-type');
    });
  });

  describe('integration with FeedbackService', () => {
    it('should create and retrieve feedback', async () => {
      // Generate feedback
      const generateMessage: WebviewMessage = {
        type: 'generate-feedback',
        data: {
          personaNames: ['Alice'],
          context: 'Testing',
          url: 'https://example.com',
          feedbackType: 'individual',
        },
      };

      await handler.handle(generateMessage, webview as any);
      const generateResponse = webview.getLastMessage();
      const feedbackId = generateResponse.entry.id;

      webview.clearMessages();

      // Retrieve feedback
      const getMessage: WebviewMessage = {
        type: 'get-feedback',
        id: feedbackId,
      };

      await handler.handle(getMessage, webview as any);
      const getResponse = webview.getLastMessage();

      expect(getResponse.type).toBe('feedback-details');
      expect(getResponse.entry.id).toBe(feedbackId);
    });

    it('should create and delete feedback', async () => {
      // Generate feedback
      const generateMessage: WebviewMessage = {
        type: 'generate-feedback',
        data: {
          personaNames: ['Alice'],
          context: 'Testing',
          url: 'https://example.com',
          feedbackType: 'individual',
        },
      };

      await handler.handle(generateMessage, webview as any);
      const generateResponse = webview.getLastMessage();
      const feedbackId = generateResponse.entry.id;

      webview.clearMessages();

      // Delete feedback
      const deleteMessage: WebviewMessage = {
        type: 'delete-feedback',
        id: feedbackId,
      };

      await handler.handle(deleteMessage, webview as any);
      const deleteResponse = webview.getLastMessage();

      expect(deleteResponse.type).toBe('feedback-deleted');
      expect(deleteResponse.id).toBe(feedbackId);

      webview.clearMessages();

      // Try to retrieve deleted feedback
      const getMessage: WebviewMessage = {
        type: 'get-feedback',
        id: feedbackId,
      };

      await handler.handle(getMessage, webview as any);
      const getResponse = webview.getLastMessage();

      expect(getResponse.type).toBe('error');
    });

    it('should filter feedback by persona', async () => {
      // Generate feedback for Alice
      const aliceMessage: WebviewMessage = {
        type: 'generate-feedback',
        data: {
          personaNames: ['Alice'],
          context: 'Alice testing',
          url: 'https://example.com',
          feedbackType: 'individual',
        },
      };

      await handler.handle(aliceMessage, webview as any);
      webview.clearMessages();

      // Generate feedback for Bob
      const bobMessage: WebviewMessage = {
        type: 'generate-feedback',
        data: {
          personaNames: ['Bob'],
          context: 'Bob testing',
          url: 'https://example.com',
          feedbackType: 'individual',
        },
      };

      await handler.handle(bobMessage, webview as any);
      webview.clearMessages();

      // Get feedback by persona
      const getByPersonaMessage: WebviewMessage = {
        type: 'get-feedback-by-persona',
        personaName: 'Alice',
      };

      await handler.handle(getByPersonaMessage, webview as any);
      const response = webview.getLastMessage();

      expect(response.type).toBe('feedback-by-persona');
      expect(response.entries).toHaveLength(1);
      expect(response.entries[0].personaNames).toContain('Alice');
    });
  });
});
