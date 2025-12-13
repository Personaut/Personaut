/**
 * Property test for schema migration success
 *
 * Feature: agent-interaction-fixes, Property 22: Schema Migration Success
 *
 * For any conversation stored in V1 schema format, loading should automatically
 * migrate it to V2 schema with all data preserved.
 *
 * Validates: Requirements 8.2
 */

import * as fc from 'fast-check';
import { ConversationManager } from '../../features/chat/services/ConversationManager';
import { Message } from '../../shared/types/CommonTypes';
import { ConversationStorage } from '../../features/chat/types/ChatTypes';

describe('Property 22: Schema Migration Success', () => {
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
   * Generator for V1 conversation (without version field)
   */
  const conversationV1Arb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
    messages: fc.array(messageArb, { minLength: 0, maxLength: 20 }),
    lastUpdated: fc.option(fc.integer({ min: 1000000000000, max: 9999999999999 }), {
      nil: undefined,
    }),
  });

  /**
   * Generator for array of V1 conversations with unique IDs
   */
  const uniqueConversationsArb = fc
    .array(conversationV1Arb, { minLength: 1, maxLength: 10 })
    .map((conversations) => {
      // Ensure unique IDs by appending index
      return conversations.map((conv, index) => ({
        ...conv,
        id: `${conv.id}_${index}`,
      }));
    });

  /**
   * Create mock storage with V1 conversations
   */
  function createMockStorage(v1Conversations: any[]): ConversationStorage {
    let storedData = [...v1Conversations];

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
   * Test that V1 conversations are migrated to V2 with all data preserved
   * Validates: Requirements 8.2
   */
  it('should migrate V1 conversations to V2 with all data preserved', async () => {
    await fc.assert(
      fc.asyncProperty(
        uniqueConversationsArb,
        async (v1Conversations) => {
          // Create mock storage with V1 conversations
          const mockStorage = createMockStorage(v1Conversations);

          // Create ConversationManager
          const conversationManager = new ConversationManager(mockStorage);

          // Load all conversations (should trigger migration)
          const result = await conversationManager.loadAllConversations();

          // Verify all conversations were successfully migrated
          expect(result.successful.length).toBe(v1Conversations.length);
          expect(result.failed.length).toBe(0);

          // Verify each conversation's data is preserved
          for (let i = 0; i < v1Conversations.length; i++) {
            const original = v1Conversations[i];
            const migrated = result.successful.find((c) => c.id === original.id);

            expect(migrated).toBeDefined();
            expect(migrated!.id).toBe(original.id);
            expect(migrated!.title).toBe(original.title);
            expect(migrated!.timestamp).toBe(original.timestamp);
            expect(migrated!.messages.length).toBe(original.messages.length);

            // Verify lastUpdated is set (either from original or defaults to timestamp)
            expect(migrated!.lastUpdated).toBeDefined();
            if (original.lastUpdated !== undefined) {
              expect(migrated!.lastUpdated).toBe(original.lastUpdated);
            } else {
              expect(migrated!.lastUpdated).toBe(original.timestamp);
            }

            // Verify all messages are preserved
            for (let j = 0; j < original.messages.length; j++) {
              expect(migrated!.messages[j].role).toBe(original.messages[j].role);
              expect(migrated!.messages[j].text).toBe(original.messages[j].text);
            }
          }

          // Verify migrated conversations are saved back to storage
          expect(mockStorage.update).toHaveBeenCalledWith(
            'conversationHistory',
            expect.any(Array)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that V2 conversations (already migrated) are not modified
   * Validates: Requirements 8.2
   */
  it('should not modify conversations that are already V2 schema', async () => {
    await fc.assert(
      fc.asyncProperty(
        uniqueConversationsArb,
        async (v1Conversations) => {
          // Create V2 conversations by adding version field
          const v2Conversations = v1Conversations.map((v1) => ({
            version: 2,
            id: v1.id,
            title: v1.title,
            timestamp: v1.timestamp,
            messages: v1.messages,
            lastUpdated: v1.lastUpdated || v1.timestamp,
            metadata: {
              agentMode: undefined,
              participatingAgents: undefined,
              tags: undefined,
              archived: false,
            },
          }));

          // Create mock storage with V2 conversations
          const mockStorage = createMockStorage(v2Conversations);

          // Create ConversationManager
          const conversationManager = new ConversationManager(mockStorage);

          // Load all conversations
          const result = await conversationManager.loadAllConversations();

          // Verify all conversations were loaded successfully
          expect(result.successful.length).toBe(v2Conversations.length);
          expect(result.failed.length).toBe(0);

          // Verify data is unchanged
          for (let i = 0; i < v2Conversations.length; i++) {
            const original = v2Conversations[i];
            const loaded = result.successful.find((c) => c.id === original.id);

            expect(loaded).toBeDefined();
            expect(loaded!.id).toBe(original.id);
            expect(loaded!.title).toBe(original.title);
            expect(loaded!.timestamp).toBe(original.timestamp);
            expect(loaded!.lastUpdated).toBe(original.lastUpdated);
            expect(loaded!.messages.length).toBe(original.messages.length);

            // Verify all messages are unchanged
            for (let j = 0; j < original.messages.length; j++) {
              expect(loaded!.messages[j].role).toBe(original.messages[j].role);
              expect(loaded!.messages[j].text).toBe(original.messages[j].text);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that mixed V1 and V2 conversations are handled correctly
   * Validates: Requirements 8.2
   */
  it('should handle mixed V1 and V2 conversations correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        uniqueConversationsArb,
        async (conversations) => {
          // Split conversations into V1 and V2
          const midpoint = Math.floor(conversations.length / 2);
          const v1Conversations = conversations.slice(0, midpoint);
          const v2Conversations = conversations.slice(midpoint).map((v1) => ({
            version: 2,
            id: v1.id,
            title: v1.title,
            timestamp: v1.timestamp,
            messages: v1.messages,
            lastUpdated: v1.lastUpdated || v1.timestamp,
            metadata: {
              agentMode: undefined,
              participatingAgents: undefined,
              tags: undefined,
              archived: false,
            },
          }));

          // Combine V1 and V2 conversations
          const mixedConversations = [...v1Conversations, ...v2Conversations];

          // Create mock storage with mixed conversations
          const mockStorage = createMockStorage(mixedConversations);

          // Create ConversationManager
          const conversationManager = new ConversationManager(mockStorage);

          // Load all conversations
          const result = await conversationManager.loadAllConversations();

          // Verify all conversations were loaded successfully
          expect(result.successful.length).toBe(mixedConversations.length);
          expect(result.failed.length).toBe(0);

          // Verify V1 conversations were migrated
          for (const v1Conv of v1Conversations) {
            const loaded = result.successful.find((c) => c.id === v1Conv.id);
            expect(loaded).toBeDefined();
            expect(loaded!.id).toBe(v1Conv.id);
            expect(loaded!.title).toBe(v1Conv.title);
            expect(loaded!.messages.length).toBe(v1Conv.messages.length);
          }

          // Verify V2 conversations were loaded unchanged
          for (const v2Conv of v2Conversations) {
            const loaded = result.successful.find((c) => c.id === v2Conv.id);
            expect(loaded).toBeDefined();
            expect(loaded!.id).toBe(v2Conv.id);
            expect(loaded!.title).toBe(v2Conv.title);
            expect(loaded!.messages.length).toBe(v2Conv.messages.length);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that empty conversation arrays are handled correctly
   * Validates: Requirements 8.2
   */
  it('should handle empty conversation arrays correctly', async () => {
    // Create mock storage with no conversations
    const mockStorage = createMockStorage([]);

    // Create ConversationManager
    const conversationManager = new ConversationManager(mockStorage);

    // Load all conversations
    const result = await conversationManager.loadAllConversations();

    // Verify result is empty
    expect(result.successful.length).toBe(0);
    expect(result.failed.length).toBe(0);
  });

  /**
   * Test that migration preserves message order
   * Validates: Requirements 8.2
   */
  it('should preserve message order during migration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          messages: fc.array(messageArb, { minLength: 5, maxLength: 20 }),
          lastUpdated: fc.option(fc.integer({ min: 1000000000000, max: 9999999999999 }), {
            nil: undefined,
          }),
        }),
        async (v1Conversation) => {
          // Create mock storage with single V1 conversation
          const mockStorage = createMockStorage([v1Conversation]);

          // Create ConversationManager
          const conversationManager = new ConversationManager(mockStorage);

          // Load all conversations
          const result = await conversationManager.loadAllConversations();

          // Verify conversation was migrated
          expect(result.successful.length).toBe(1);
          expect(result.failed.length).toBe(0);

          const migrated = result.successful[0];

          // Verify message order is preserved
          expect(migrated.messages.length).toBe(v1Conversation.messages.length);
          for (let i = 0; i < v1Conversation.messages.length; i++) {
            expect(migrated.messages[i].role).toBe(v1Conversation.messages[i].role);
            expect(migrated.messages[i].text).toBe(v1Conversation.messages[i].text);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
