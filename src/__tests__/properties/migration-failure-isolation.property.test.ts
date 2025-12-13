/**
 * Property test for migration failure isolation
 *
 * Feature: agent-interaction-fixes, Property 23: Migration Failure Isolation
 *
 * For any conversation that fails migration, the system should log the error,
 * skip that conversation, and continue loading other conversations without crashing.
 *
 * Validates: Requirements 8.3
 */

import * as fc from 'fast-check';
import { ConversationManager } from '../../features/chat/services/ConversationManager';
import { Message } from '../../shared/types/CommonTypes';
import { ConversationStorage } from '../../features/chat/types/ChatTypes';

describe('Property 23: Migration Failure Isolation', () => {
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
   * Generator for valid V1 conversation
   */
  const validConversationV1Arb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
    messages: fc.array(messageArb, { minLength: 0, maxLength: 20 }),
    lastUpdated: fc.option(fc.integer({ min: 1000000000000, max: 9999999999999 }), {
      nil: undefined,
    }),
  });

  /**
   * Generator for invalid conversations (various corruption scenarios)
   */
  const invalidConversationArb = fc.oneof(
    // Missing id
    fc.record({
      title: fc.string({ minLength: 1, maxLength: 100 }),
      timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
      messages: fc.array(messageArb, { minLength: 0, maxLength: 20 }),
    }),
    // Empty id
    fc.record({
      id: fc.constant(''),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
      messages: fc.array(messageArb, { minLength: 0, maxLength: 20 }),
    }),
    // Missing title
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 50 }),
      timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
      messages: fc.array(messageArb, { minLength: 0, maxLength: 20 }),
    }),
    // Invalid timestamp (not a number)
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 50 }),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      timestamp: fc.constant('invalid'),
      messages: fc.array(messageArb, { minLength: 0, maxLength: 20 }),
    }),
    // Missing messages array
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 50 }),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
    }),
    // Invalid messages (not an array)
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 50 }),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
      messages: fc.constant('not-an-array'),
    }),
    // Messages with invalid structure (missing role)
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 50 }),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
      messages: fc.array(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 500 }),
        }),
        { minLength: 1, maxLength: 5 }
      ),
    }),
    // Messages with invalid structure (missing text)
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 50 }),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
      messages: fc.array(
        fc.record({
          role: messageRoleArb,
        }),
        { minLength: 1, maxLength: 5 }
      ),
    }),
    // Null conversation
    fc.constant(null),
    // Undefined conversation
    fc.constant(undefined),
    // Non-object conversation
    fc.constant('not-an-object')
  );

  /**
   * Create mock storage with conversations
   */
  function createMockStorage(conversations: any[]): ConversationStorage {
    let storedData = [...conversations];

    return {
      get: jest.fn((key: string, defaultValue: any) => {
        if (key === 'conversationHistory') {
          return storedData;
        }
        return defaultValue;
      }),
      update: jest.fn(async (key: string, value: any) => {
        if (key === 'conversationHistory') {
          storedData = value;
        }
      }),
    };
  }

  /**
   * Mock console.error to capture error logs
   */
  function mockConsoleError() {
    const originalError = console.error;
    const errorLogs: any[] = [];
    console.error = jest.fn((...args: any[]) => {
      errorLogs.push(args);
    });
    return {
      restore: () => {
        console.error = originalError;
      },
      getLogs: () => errorLogs,
    };
  }

  /**
   * Test that invalid conversations are skipped without crashing
   * Validates: Requirements 8.3
   */
  it('should skip invalid conversations and continue loading valid ones', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validConversationV1Arb, { minLength: 1, maxLength: 5 }),
        fc.array(invalidConversationArb, { minLength: 1, maxLength: 5 }),
        async (validConversations, invalidConversations) => {
          // Interleave valid and invalid conversations
          const mixedConversations: any[] = [];
          let validIndex = 0;
          let invalidIndex = 0;

          while (validIndex < validConversations.length || invalidIndex < invalidConversations.length) {
            if (validIndex < validConversations.length) {
              mixedConversations.push(validConversations[validIndex++]);
            }
            if (invalidIndex < invalidConversations.length) {
              mixedConversations.push(invalidConversations[invalidIndex++]);
            }
          }

          // Create mock storage with mixed conversations
          const mockStorage = createMockStorage(mixedConversations);

          // Mock console.error to capture error logs
          const errorMock = mockConsoleError();

          try {
            // Create ConversationManager
            const conversationManager = new ConversationManager(mockStorage);

            // Load all conversations (should not crash)
            const result = await conversationManager.loadAllConversations();

            // Verify that valid conversations were loaded
            expect(result.successful.length).toBe(validConversations.length);

            // Verify that invalid conversations were reported as failed
            expect(result.failed.length).toBe(invalidConversations.length);

            // Verify that all valid conversations are present in successful results
            for (const validConv of validConversations) {
              const found = result.successful.find((c) => c.id === validConv.id);
              expect(found).toBeDefined();
              expect(found!.id).toBe(validConv.id);
              expect(found!.title).toBe(validConv.title);
              expect(found!.messages.length).toBe(validConv.messages.length);
            }

            // Verify that errors were logged
            const errorLogs = errorMock.getLogs();
            expect(errorLogs.length).toBeGreaterThan(0);

            // Verify that the sum of successful and failed equals total
            expect(result.successful.length + result.failed.length).toBe(mixedConversations.length);
          } finally {
            errorMock.restore();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that all invalid conversations are reported in failed array
   * Validates: Requirements 8.3
   */
  it('should report all invalid conversations in the failed array', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(invalidConversationArb, { minLength: 1, maxLength: 10 }),
        async (invalidConversations) => {
          // Create mock storage with only invalid conversations
          const mockStorage = createMockStorage(invalidConversations);

          // Mock console.error
          const errorMock = mockConsoleError();

          try {
            // Create ConversationManager
            const conversationManager = new ConversationManager(mockStorage);

            // Load all conversations
            const result = await conversationManager.loadAllConversations();

            // Verify no conversations were successfully loaded
            expect(result.successful.length).toBe(0);

            // Verify all conversations were reported as failed
            expect(result.failed.length).toBe(invalidConversations.length);

            // Verify each failed entry has an id and error message
            for (const failed of result.failed) {
              expect(failed.id).toBeDefined();
              expect(typeof failed.id).toBe('string');
              expect(failed.error).toBeDefined();
              expect(typeof failed.error).toBe('string');
              expect(failed.error.length).toBeGreaterThan(0);
            }

            // Verify errors were logged
            const errorLogs = errorMock.getLogs();
            expect(errorLogs.length).toBeGreaterThan(0);
          } finally {
            errorMock.restore();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that the system doesn't crash when all conversations are invalid
   * Validates: Requirements 8.3
   */
  it('should not crash when all conversations are invalid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(invalidConversationArb, { minLength: 1, maxLength: 10 }),
        async (invalidConversations) => {
          // Create mock storage with only invalid conversations
          const mockStorage = createMockStorage(invalidConversations);

          // Mock console.error
          const errorMock = mockConsoleError();

          try {
            // Create ConversationManager
            const conversationManager = new ConversationManager(mockStorage);

            // This should not throw an error
            await expect(conversationManager.loadAllConversations()).resolves.toBeDefined();

            const result = await conversationManager.loadAllConversations();

            // Verify result structure is valid
            expect(result).toBeDefined();
            expect(result.successful).toBeDefined();
            expect(result.failed).toBeDefined();
            expect(Array.isArray(result.successful)).toBe(true);
            expect(Array.isArray(result.failed)).toBe(true);
          } finally {
            errorMock.restore();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that valid conversations after invalid ones are still loaded
   * Validates: Requirements 8.3
   */
  it('should continue loading valid conversations after encountering invalid ones', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validConversationV1Arb, { minLength: 2, maxLength: 5 }),
        fc.array(invalidConversationArb, { minLength: 1, maxLength: 3 }),
        async (validConversations, invalidConversations) => {
          // Place invalid conversations at the beginning
          const conversations = [...invalidConversations, ...validConversations];

          // Create mock storage
          const mockStorage = createMockStorage(conversations);

          // Mock console.error
          const errorMock = mockConsoleError();

          try {
            // Create ConversationManager
            const conversationManager = new ConversationManager(mockStorage);

            // Load all conversations
            const result = await conversationManager.loadAllConversations();

            // Verify all valid conversations were loaded despite invalid ones at the start
            expect(result.successful.length).toBe(validConversations.length);

            // Verify all valid conversations are present
            for (const validConv of validConversations) {
              const found = result.successful.find((c) => c.id === validConv.id);
              expect(found).toBeDefined();
            }
          } finally {
            errorMock.restore();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that error messages are descriptive
   * Validates: Requirements 8.3
   */
  it('should provide descriptive error messages for failed migrations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(invalidConversationArb, { minLength: 1, maxLength: 5 }),
        async (invalidConversations) => {
          // Create mock storage
          const mockStorage = createMockStorage(invalidConversations);

          // Mock console.error
          const errorMock = mockConsoleError();

          try {
            // Create ConversationManager
            const conversationManager = new ConversationManager(mockStorage);

            // Load all conversations
            const result = await conversationManager.loadAllConversations();

            // Verify all failed entries have non-empty error messages
            for (const failed of result.failed) {
              expect(failed.error).toBeDefined();
              expect(typeof failed.error).toBe('string');
              expect(failed.error.length).toBeGreaterThan(0);
              // Error message should be descriptive (not just "Error")
              expect(failed.error).not.toBe('Error');
            }
          } finally {
            errorMock.restore();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that the system logs errors for each failed conversation
   * Validates: Requirements 8.3
   */
  it('should log errors for each failed conversation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(invalidConversationArb, { minLength: 1, maxLength: 5 }),
        async (invalidConversations) => {
          // Create mock storage
          const mockStorage = createMockStorage(invalidConversations);

          // Mock console.error
          const errorMock = mockConsoleError();

          try {
            // Create ConversationManager
            const conversationManager = new ConversationManager(mockStorage);

            // Load all conversations
            await conversationManager.loadAllConversations();

            // Verify errors were logged
            const errorLogs = errorMock.getLogs();
            expect(errorLogs.length).toBeGreaterThan(0);

            // Verify at least one log entry per failed conversation
            expect(errorLogs.length).toBeGreaterThanOrEqual(invalidConversations.length);
          } finally {
            errorMock.restore();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
