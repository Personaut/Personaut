/**
 * Property test for save retry with backoff
 *
 * Feature: agent-interaction-fixes, Property 28: Save Retry with Backoff
 *
 * For any save operation that fails, the system should retry up to 3 times
 * with exponential backoff before reporting final failure.
 *
 * Validates: Requirements 11.2
 */

import * as fc from 'fast-check';
import { ConversationManager } from '../../features/chat/services/ConversationManager';
import { Message } from '../../shared/types/CommonTypes';
import { ConversationStorage } from '../../features/chat/types/ChatTypes';

describe('Property 28: Save Retry with Backoff', () => {
  /**
   * Generator for message role
   */
  const messageRoleArb = fc.constantFrom('user', 'model');

  /**
   * Generator for a single message
   */
  const messageArb = fc.record({
    role: messageRoleArb,
    text: fc.string({ minLength: 1, maxLength: 500 }),
  }) as fc.Arbitrary<Message>;

  /**
   * Generator for conversation ID
   */
  const conversationIdArb = fc.string({ minLength: 1, maxLength: 50 });

  /**
   * Generator for messages array
   */
  const messagesArb = fc.array(messageArb, { minLength: 1, maxLength: 20 });

  /**
   * Create mock storage that fails a specified number of times before succeeding
   */
  function createFailingMockStorage(failCount: number): {
    storage: ConversationStorage;
    attemptCount: number;
    delays: number[];
  } {
    let attemptCount = 0;
    const delays: number[] = [];
    let lastCallTime = Date.now();

    return {
      storage: {
        get: jest.fn((key: string, defaultValue: any) => {
          if (key === 'conversationHistory') {
            return [];
          }
          return defaultValue;
        }),
        update: jest.fn(async (_key: string, _value: any) => {
          attemptCount++;
          
          // Record delay between attempts
          const now = Date.now();
          if (attemptCount > 1) {
            delays.push(now - lastCallTime);
          }
          lastCallTime = now;

          // Fail for the first failCount attempts
          if (attemptCount <= failCount) {
            throw new Error(`Storage failure ${attemptCount}`);
          }

          // Succeed on subsequent attempts
          return;
        }),
      },
      get attemptCount() {
        return attemptCount;
      },
      delays,
    };
  }

  /**
   * Test that save operation retries up to 3 times on failure
   * Validates: Requirements 11.2
   */
  it('should retry save operation up to 3 times on failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        messagesArb,
        fc.integer({ min: 1, max: 2 }), // Fail 1-2 times, then succeed
        async (conversationId, messages, failCount) => {
          // Create mock storage that fails failCount times
          const mock = createFailingMockStorage(failCount);
          const conversationManager = new ConversationManager(mock.storage);

          // Save conversation (should succeed after retries)
          const result = await conversationManager.saveConversation(conversationId, messages);

          // Verify the save eventually succeeded
          expect(result).toBeDefined();
          expect(result.id).toBe(conversationId);
          expect(result.messages.length).toBe(messages.length);

          // Verify retry attempts (failCount failures + 1 success)
          expect(mock.attemptCount).toBe(failCount + 1);
        }
      ),
      { numRuns: 10 } // Reduced runs due to timing delays
    );
  }, 60000); // 60 second timeout

  /**
   * Test that save operation uses exponential backoff between retries
   * Validates: Requirements 11.2
   */
  it('should use exponential backoff between retry attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        messagesArb,
        async (conversationId, messages) => {
          // Create mock storage that fails twice before succeeding
          const mock = createFailingMockStorage(2);
          const conversationManager = new ConversationManager(mock.storage);

          // Save conversation (should succeed after 2 retries)
          await conversationManager.saveConversation(conversationId, messages);

          // Verify we had 3 attempts total (2 failures + 1 success)
          expect(mock.attemptCount).toBe(3);

          // Verify we have 2 delays recorded (between attempts 1-2 and 2-3)
          expect(mock.delays.length).toBe(2);

          // Verify exponential backoff pattern (with tolerance for timing variance)
          // First delay should be ~1000ms (1s)
          // Second delay should be ~2000ms (2s)
          const firstDelay = mock.delays[0];
          const secondDelay = mock.delays[1];

          // Allow 20% tolerance for timing variance
          expect(firstDelay).toBeGreaterThanOrEqual(800); // 1000ms - 20%
          expect(firstDelay).toBeLessThanOrEqual(1200); // 1000ms + 20%

          expect(secondDelay).toBeGreaterThanOrEqual(1600); // 2000ms - 20%
          expect(secondDelay).toBeLessThanOrEqual(2400); // 2000ms + 20%

          // Verify second delay is approximately 2x the first delay
          const ratio = secondDelay / firstDelay;
          expect(ratio).toBeGreaterThanOrEqual(1.5);
          expect(ratio).toBeLessThanOrEqual(2.5);
        }
      ),
      { numRuns: 5 } // Very few runs due to timing-sensitive nature
    );
  }, 60000); // 60 second timeout

  /**
   * Test that save operation throws error after 3 failed attempts
   * Validates: Requirements 11.2
   */
  it('should throw error after 3 failed retry attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        messagesArb,
        async (conversationId, messages) => {
          // Create mock storage that always fails
          const mock = createFailingMockStorage(10); // Fail more than 3 times
          const conversationManager = new ConversationManager(mock.storage);

          // Save conversation should throw after 3 attempts
          await expect(
            conversationManager.saveConversation(conversationId, messages)
          ).rejects.toThrow();

          // Verify exactly 3 attempts were made
          expect(mock.attemptCount).toBe(3);
        }
      ),
      { numRuns: 10 } // Reduced runs due to timing delays
    );
  }, 60000); // 60 second timeout

  /**
   * Test that successful save on first attempt doesn't retry
   * Validates: Requirements 11.2
   */
  it('should not retry if save succeeds on first attempt', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        messagesArb,
        async (conversationId, messages) => {
          // Create mock storage that succeeds immediately
          const mock = createFailingMockStorage(0); // No failures
          const conversationManager = new ConversationManager(mock.storage);

          // Save conversation
          const result = await conversationManager.saveConversation(conversationId, messages);

          // Verify the save succeeded
          expect(result).toBeDefined();
          expect(result.id).toBe(conversationId);

          // Verify only 1 attempt was made (no retries)
          expect(mock.attemptCount).toBe(1);

          // Verify no delays were recorded (no retries)
          expect(mock.delays.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that retry preserves conversation data integrity
   * Validates: Requirements 11.2
   */
  it('should preserve conversation data integrity across retries', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        messagesArb,
        fc.integer({ min: 1, max: 2 }),
        async (conversationId, messages, failCount) => {
          // Create mock storage that fails failCount times
          const mock = createFailingMockStorage(failCount);
          const conversationManager = new ConversationManager(mock.storage);

          // Save conversation
          const result = await conversationManager.saveConversation(conversationId, messages);

          // Verify all message data is preserved
          expect(result.messages.length).toBe(messages.length);
          for (let i = 0; i < messages.length; i++) {
            expect(result.messages[i].role).toBe(messages[i].role);
            expect(result.messages[i].text).toBe(messages[i].text);
          }

          // Verify conversation metadata is correct
          expect(result.id).toBe(conversationId);
          expect(result.title).toBeDefined();
          expect(result.timestamp).toBeDefined();
          expect(result.lastUpdated).toBeDefined();
        }
      ),
      { numRuns: 10 } // Reduced runs due to timing delays
    );
  }, 60000); // 60 second timeout

  /**
   * Test that retry logic works with empty message arrays
   * Validates: Requirements 11.2
   */
  it('should handle retry logic with empty message arrays', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        fc.integer({ min: 1, max: 2 }),
        async (conversationId, failCount) => {
          // Create mock storage that fails failCount times
          const mock = createFailingMockStorage(failCount);
          const conversationManager = new ConversationManager(mock.storage);

          // Save conversation with empty messages
          const result = await conversationManager.saveConversation(conversationId, []);

          // Verify the save succeeded
          expect(result).toBeDefined();
          expect(result.id).toBe(conversationId);
          expect(result.messages.length).toBe(0);

          // Verify retry attempts
          expect(mock.attemptCount).toBe(failCount + 1);
        }
      ),
      { numRuns: 10 } // Reduced runs due to timing delays
    );
  }, 60000); // 60 second timeout

  /**
   * Test that retry logic works with maximum message count
   * Validates: Requirements 11.2
   */
  it('should handle retry logic with large message arrays', async () => {
    await fc.assert(
      fc.asyncProperty(
        conversationIdArb,
        fc.array(messageArb, { minLength: 50, maxLength: 100 }),
        fc.integer({ min: 1, max: 2 }),
        async (conversationId, messages, failCount) => {
          // Create mock storage that fails failCount times
          const mock = createFailingMockStorage(failCount);
          const conversationManager = new ConversationManager(mock.storage);

          // Save conversation with many messages
          const result = await conversationManager.saveConversation(conversationId, messages);

          // Verify the save succeeded
          expect(result).toBeDefined();
          expect(result.id).toBe(conversationId);
          expect(result.messages.length).toBe(messages.length);

          // Verify retry attempts
          expect(mock.attemptCount).toBe(failCount + 1);
        }
      ),
      { numRuns: 5 } // Very few runs due to larger data size and timing delays
    );
  }, 60000); // 60 second timeout
});
