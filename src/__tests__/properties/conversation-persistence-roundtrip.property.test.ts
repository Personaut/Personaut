/**
 * Property test for conversation persistence round-trip
 *
 * Feature: agent-interaction-fixes, Property 3: Conversation Persistence Round-Trip
 *
 * For any conversation with any set of messages, saving the conversation and then loading it
 * should result in a conversation with identical message content, roles, and order.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 3.3
 */

import * as fc from 'fast-check';
import { ConversationManager } from '../../features/chat/services/ConversationManager';
import { Message } from '../../shared/types/CommonTypes';

describe('Property 3: Conversation Persistence Round-Trip', () => {
  /**
   * Create mock storage
   */
  function createMockStorage() {
    let storage: Record<string, any> = {};

    return {
      get: jest.fn((key: string, defaultValue: any) => {
        return storage[key] !== undefined ? storage[key] : defaultValue;
      }),
      update: jest.fn(async (key: string, value: any) => {
        storage[key] = value;
      }),
      clear: () => {
        storage = {};
      },
    } as any;
  }

  /**
   * Generator for message roles
   */
  const messageRoleArb = fc.constantFrom('user', 'model', 'error');

  /**
   * Generator for message text
   */
  const messageTextArb = fc.string({ minLength: 1, maxLength: 500 });

  /**
   * Generator for messages
   */
  const messageArb = fc.record({
    role: messageRoleArb,
    text: messageTextArb,
  }) as fc.Arbitrary<Message>;

  /**
   * Generator for conversation IDs
   */
  const conversationIdArb = fc.string({ minLength: 1, maxLength: 50 });

  /**
   * Generator for message arrays
   */
  const messagesArb = fc.array(messageArb, { minLength: 1, maxLength: 20 });

  /**
   * Test that saving and loading a conversation preserves all message data
   * Validates: Requirements 2.1, 2.2, 2.3, 3.3
   */
  it('should preserve message content, roles, and order through save/load cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        messagesArb,
        async (conversationId, messages) => {
          // Create mock storage and ConversationManager
          const mockStorage = createMockStorage();
          const conversationManager = new ConversationManager(mockStorage);

          // Save conversation
          const savedConversation = await conversationManager.saveConversation(
            conversationId,
            messages
          );

          // Verify save was successful
          expect(savedConversation).toBeDefined();
          expect(savedConversation.id).toBe(conversationId);
          expect(savedConversation.messages.length).toBe(messages.length);

          // Load conversation
          const loadedConversation = conversationManager.getConversation(conversationId);

          // Verify conversation was loaded
          expect(loadedConversation).toBeDefined();
          expect(loadedConversation).not.toBeNull();

          if (!loadedConversation) {
            throw new Error('Conversation should be loaded');
          }

          // Verify conversation ID is preserved
          expect(loadedConversation.id).toBe(conversationId);

          // Verify message count is preserved
          expect(loadedConversation.messages.length).toBe(messages.length);

          // Verify each message is preserved (content, role, and order)
          for (let i = 0; i < messages.length; i++) {
            expect(loadedConversation.messages[i].role).toBe(messages[i].role);
            expect(loadedConversation.messages[i].text).toBe(messages[i].text);
          }

          // Verify using the built-in integrity check
          expect(
            conversationManager.verifyStateIntegrity(savedConversation, loadedConversation)
          ).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that multiple save/load cycles preserve data
   * Validates: Requirements 2.1, 2.2, 2.3
   */
  it('should preserve data through multiple save/load cycles', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        fc.array(messagesArb, { minLength: 2, maxLength: 5 }),
        async (conversationId, messageBatches) => {
          // Create mock storage and ConversationManager
          const mockStorage = createMockStorage();
          const conversationManager = new ConversationManager(mockStorage);

          let accumulatedMessages: Message[] = [];

          // Perform multiple save/load cycles
          for (const messageBatch of messageBatches) {
            // Add new messages to accumulated messages
            accumulatedMessages = [...accumulatedMessages, ...messageBatch];

            // Save conversation with accumulated messages
            await conversationManager.saveConversation(conversationId, accumulatedMessages);

            // Load conversation
            const loadedConversation = conversationManager.getConversation(conversationId);

            // Verify conversation was loaded
            expect(loadedConversation).toBeDefined();
            expect(loadedConversation).not.toBeNull();

            if (!loadedConversation) {
              throw new Error('Conversation should be loaded');
            }

            // Verify message count matches accumulated messages
            expect(loadedConversation.messages.length).toBe(accumulatedMessages.length);

            // Verify all messages are preserved
            for (let i = 0; i < accumulatedMessages.length; i++) {
              expect(loadedConversation.messages[i].role).toBe(accumulatedMessages[i].role);
              expect(loadedConversation.messages[i].text).toBe(accumulatedMessages[i].text);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that empty message arrays are handled correctly
   * Validates: Requirements 2.1, 2.2
   */
  it('should handle empty message arrays correctly', async () => {
    await fc.assert(
      fc.asyncProperty(conversationIdArb, async (conversationId) => {
        // Create mock storage and ConversationManager
        const mockStorage = createMockStorage();
        const conversationManager = new ConversationManager(mockStorage);

        // Save conversation with empty messages
        const savedConversation = await conversationManager.saveConversation(conversationId, []);

        // Verify save was successful
        expect(savedConversation).toBeDefined();
        expect(savedConversation.id).toBe(conversationId);
        expect(savedConversation.messages.length).toBe(0);

        // Load conversation
        const loadedConversation = conversationManager.getConversation(conversationId);

        // Verify conversation was loaded
        expect(loadedConversation).toBeDefined();
        expect(loadedConversation).not.toBeNull();

        if (!loadedConversation) {
          throw new Error('Conversation should be loaded');
        }

        // Verify empty messages are preserved
        expect(loadedConversation.messages.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that special characters in messages are preserved
   * Validates: Requirements 2.2, 2.3
   */
  it('should preserve special characters in message text', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        fc.array(
          fc.record({
            role: messageRoleArb,
            text: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (conversationId, messages) => {
          // Create mock storage and ConversationManager
          const mockStorage = createMockStorage();
          const conversationManager = new ConversationManager(mockStorage);

          // Save conversation
          await conversationManager.saveConversation(conversationId, messages as Message[]);

          // Load conversation
          const loadedConversation = conversationManager.getConversation(conversationId);

          // Verify conversation was loaded
          expect(loadedConversation).toBeDefined();
          expect(loadedConversation).not.toBeNull();

          if (!loadedConversation) {
            throw new Error('Conversation should be loaded');
          }

          // Verify each message text is exactly preserved (including special characters)
          for (let i = 0; i < messages.length; i++) {
            expect(loadedConversation.messages[i].text).toBe(messages[i].text);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that conversation metadata is preserved
   * Validates: Requirements 2.1, 2.2, 3.3
   */
  it('should preserve conversation metadata (title, timestamp)', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        messagesArb,
        async (conversationId, messages) => {
          // Create mock storage and ConversationManager
          const mockStorage = createMockStorage();
          const conversationManager = new ConversationManager(mockStorage);

          // Save conversation
          const savedConversation = await conversationManager.saveConversation(
            conversationId,
            messages
          );

          // Load conversation
          const loadedConversation = conversationManager.getConversation(conversationId);

          // Verify conversation was loaded
          expect(loadedConversation).toBeDefined();
          expect(loadedConversation).not.toBeNull();

          if (!loadedConversation) {
            throw new Error('Conversation should be loaded');
          }

          // Verify metadata is preserved
          expect(loadedConversation.title).toBe(savedConversation.title);
          expect(loadedConversation.timestamp).toBe(savedConversation.timestamp);
          expect(loadedConversation.lastUpdated).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
