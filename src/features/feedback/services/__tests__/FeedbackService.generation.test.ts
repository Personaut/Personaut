/**
 * Unit tests for FeedbackService - Feedback Generation
 */

import { FeedbackService } from '../FeedbackService';
import { GenerateFeedbackParams, RatingSystem } from '../../types/FeedbackTypes';
import { AgentManager } from '../../../../core/agent/AgentManager';

// Mock dependencies
jest.mock('../../../../core/agent/AgentManager');

describe('FeedbackService - Feedback Generation', () => {
    let service: FeedbackService;
    let mockStorage: any;
    let mockAgentManager: jest.Mocked<AgentManager>;
    let mockAgent: any;

    beforeEach(() => {
        // Mock storage
        mockStorage = {
            get: jest.fn(),
            update: jest.fn(),
        };

        // Mock conversation manager
        const mockConversationManager = {
            getConversation: jest.fn().mockResolvedValue({
                messages: [
                    {
                        role: 'model',
                        text: 'This looks great! I really like the clean design. Rating: 85/100',
                    },
                ],
            }),
        };

        // Mock agent
        mockAgent = {
            chat: jest.fn(),
            messageHistory: [],
        };

        // Mock agent manager with proper config structure
        mockAgentManager = {
            getOrCreateAgent: jest.fn().mockResolvedValue(mockAgent),
            disposeAgent: jest.fn().mockResolvedValue(undefined),
            // Use Object.defineProperty to make config accessible
        } as any;

        // Define config as a property that can be accessed
        Object.defineProperty(mockAgentManager, 'config', {
            value: {
                conversationManager: mockConversationManager,
            },
            writable: true,
            configurable: true,
        });

        service = new FeedbackService(mockStorage, mockAgentManager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateFeedbackWithAI', () => {
        const validParams: GenerateFeedbackParams = {
            personaNames: ['Alice'],
            context: 'Homepage design',
            url: 'https://example.com',
            screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            feedbackType: 'individual',
        };

        describe('Parameter Validation', () => {
            it('should require at least one persona', async () => {
                const params = { ...validParams, personaNames: [] };

                const result = await service.generateFeedbackWithAI(params);

                expect(result.success).toBe(false);
                expect(result.error).toContain('At least one persona is required');
            });

            it('should require screenshot', async () => {
                const params = { ...validParams, screenshot: undefined };

                const result = await service.generateFeedbackWithAI(params);

                expect(result.success).toBe(false);
                expect(result.error).toContain('Screenshot is required');
            });

            it('should accept valid parameters', async () => {
                const result = await service.generateFeedbackWithAI(validParams);

                expect(result.success).toBe(true);
                expect(result.entries).toBeDefined();
                expect(result.entries!.length).toBe(1);
            });
        });

        describe('Sequential Persona Processing', () => {
            it('should process each persona separately', async () => {
                const params = {
                    ...validParams,
                    personaNames: ['Alice', 'Bob', 'Charlie'],
                };

                await service.generateFeedbackWithAI(params);

                // Should create one agent per persona
                expect(mockAgentManager.getOrCreateAgent).toHaveBeenCalledTimes(3);
                expect(mockAgentManager.disposeAgent).toHaveBeenCalledTimes(3);
            });

            it('should create unique conversation ID per persona', async () => {
                const params = {
                    ...validParams,
                    personaNames: ['Alice', 'Bob'],
                };

                await service.generateFeedbackWithAI(params);

                const calls = mockAgentManager.getOrCreateAgent.mock.calls;
                const conversationIds = calls.map((call) => call[0]);

                // Should have different IDs
                expect(conversationIds[0]).not.toBe(conversationIds[1]);
                expect(conversationIds[0]).toContain('Alice');
                expect(conversationIds[1]).toContain('Bob');
            });

            it('should continue processing if one persona fails', async () => {
                const params = {
                    ...validParams,
                    personaNames: ['Alice', 'Bob', 'Charlie'],
                };

                // Make Bob fail
                mockAgentManager.getOrCreateAgent
                    .mockResolvedValueOnce(mockAgent) // Alice succeeds
                    .mockRejectedValueOnce(new Error('Bob failed')) // Bob fails
                    .mockResolvedValueOnce(mockAgent); // Charlie succeeds

                const result = await service.generateFeedbackWithAI(params);

                expect(result.success).toBe(true);
                expect(result.entries!.length).toBe(2); // Alice and Charlie
                expect(result.entries!.map((e) => e.personaName)).toEqual(['Alice', 'Charlie']);
            });

            it('should fail if all personas fail', async () => {
                const params = {
                    ...validParams,
                    personaNames: ['Alice', 'Bob'],
                };

                mockAgentManager.getOrCreateAgent.mockRejectedValue(new Error('All failed'));

                const result = await service.generateFeedbackWithAI(params);

                expect(result.success).toBe(false);
                expect(result.error).toContain('No feedback was generated');
            });
        });

        describe('Prompt Generation', () => {
            it('should use simplified system prompt', async () => {
                await service.generateFeedbackWithAI(validParams);

                const chatCall = mockAgent.chat.mock.calls[0];
                const systemPrompt = chatCall[3];

                expect(systemPrompt).toContain('You are Alice');
                expect(systemPrompt).toContain('screenshot');
                expect(systemPrompt).toContain('honest');
                expect(systemPrompt).not.toContain('detailed'); // Not the old verbose prompt
            });

            it('should use simple user prompt', async () => {
                await service.generateFeedbackWithAI(validParams);

                const chatCall = mockAgent.chat.mock.calls[0];
                const userPrompt = chatCall[0];

                expect(userPrompt).toBe('Look at this screenshot and share your thoughts.');
            });

            it('should include rating scale in prompt', async () => {
                await service.generateFeedbackWithAI(validParams, undefined, 'stars');

                const chatCall = mockAgent.chat.mock.calls[0];
                const systemPrompt = chatCall[3];

                expect(systemPrompt).toContain('5 stars');
            });

            it('should adapt rating scale based on system', async () => {
                await service.generateFeedbackWithAI(validParams, undefined, '1-100');

                const chatCall = mockAgent.chat.mock.calls[0];
                const systemPrompt = chatCall[3];

                expect(systemPrompt).toContain('100');
            });
        });

        describe('Screenshot Handling', () => {
            it('should add screenshot to message history', async () => {
                await service.generateFeedbackWithAI(validParams);

                // Check that screenshot was added to agent's message history
                expect(mockAgent.messageHistory.length).toBeGreaterThan(0);
                const messageWithImage = mockAgent.messageHistory.find((m: any) => m.images);
                expect(messageWithImage).toBeDefined();
                expect(messageWithImage.images[0]).toBe(validParams.screenshot);
            });

            it('should handle missing screenshot gracefully', async () => {
                const params = { ...validParams, screenshot: '' };

                const result = await service.generateFeedbackWithAI(params);

                expect(result.success).toBe(false);
            });
        });

        describe('Rating Parsing', () => {
            it('should parse rating from 1-100 scale', async () => {
                mockAgentManager.config.conversationManager.getConversation.mockResolvedValue({
                    messages: [{ role: 'model', text: 'Great design! Rating: 85/100' }],
                });

                const result = await service.generateFeedbackWithAI(validParams, undefined, '1-100');

                expect(result.entries![0].rating).toBe(85);
            });

            it('should parse rating from 1-10 scale', async () => {
                mockAgentManager.config.conversationManager.getConversation.mockResolvedValue({
                    messages: [{ role: 'model', text: 'Pretty good. 7/10' }],
                });

                const result = await service.generateFeedbackWithAI(validParams, undefined, '1-10');

                expect(result.entries![0].rating).toBe(7);
            });

            it('should parse rating from stars', async () => {
                mockAgentManager.config.conversationManager.getConversation.mockResolvedValue({
                    messages: [{ role: 'model', text: 'Excellent! 4 stars' }],
                });

                const result = await service.generateFeedbackWithAI(validParams, undefined, 'stars');

                expect(result.entries![0].rating).toBe(4);
            });

            it('should convert 100 scale to stars when needed', async () => {
                mockAgentManager.config.conversationManager.getConversation.mockResolvedValue({
                    messages: [{ role: 'model', text: 'Rating: 80/100' }],
                });

                const result = await service.generateFeedbackWithAI(validParams, undefined, 'stars');

                // 80/100 = 0.8 * 5 = 4 stars
                expect(result.entries![0].rating).toBe(4);
            });

            it('should default to middle rating if not found', async () => {
                mockAgentManager.config.conversationManager.getConversation.mockResolvedValue({
                    messages: [{ role: 'model', text: 'This is feedback without a rating' }],
                });

                const result = await service.generateFeedbackWithAI(validParams, undefined, 'stars');

                expect(result.entries![0].rating).toBe(3); // Middle of 1-5
            });

            it('should clamp ratings to valid range', async () => {
                mockAgentManager.config.conversationManager.getConversation.mockResolvedValue({
                    messages: [{ role: 'model', text: 'Rating: 150/100' }],
                });

                const result = await service.generateFeedbackWithAI(validParams, undefined, '1-100');

                expect(result.entries![0].rating).toBe(100); // Clamped to max
            });
        });

        describe('Entry Format', () => {
            it('should create entry with correct format', async () => {
                const result = await service.generateFeedbackWithAI(validParams);

                const entry = result.entries![0];
                expect(entry).toHaveProperty('id');
                expect(entry).toHaveProperty('personaId');
                expect(entry).toHaveProperty('personaName');
                expect(entry).toHaveProperty('rating');
                expect(entry).toHaveProperty('comment');
                expect(entry).toHaveProperty('screenshotUrl');
                expect(entry).toHaveProperty('timestamp');
                expect(entry).toHaveProperty('ratingSystem');
            });

            it('should set persona name correctly', async () => {
                const result = await service.generateFeedbackWithAI(validParams);

                expect(result.entries![0].personaName).toBe('Alice');
            });

            it('should include screenshot URL', async () => {
                const result = await service.generateFeedbackWithAI(validParams);

                expect(result.entries![0].screenshotUrl).toBe(validParams.screenshot);
            });

            it('should include rating system', async () => {
                const result = await service.generateFeedbackWithAI(validParams, undefined, '1-100');

                expect(result.entries![0].ratingSystem).toBe('1-100');
            });

            it('should include feedback text as comment', async () => {
                const result = await service.generateFeedbackWithAI(validParams);

                expect(result.entries![0].comment).toContain('This looks great');
            });
        });

        describe('Progress Callback', () => {
            it('should call progress callback for each persona', async () => {
                const onProgress = jest.fn();
                const params = {
                    ...validParams,
                    personaNames: ['Alice', 'Bob'],
                };

                await service.generateFeedbackWithAI(params, onProgress);

                expect(onProgress).toHaveBeenCalledTimes(2);
                expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('Alice:'));
                expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('Bob:'));
            });

            it('should include preview of feedback in progress', async () => {
                const onProgress = jest.fn();

                await service.generateFeedbackWithAI(validParams, onProgress);

                const call = onProgress.mock.calls[0][0];
                expect(call).toContain('Alice:');
                expect(call).toContain('This looks great');
            });
        });

        describe('Resource Cleanup', () => {
            it('should dispose agent after each persona', async () => {
                const params = {
                    ...validParams,
                    personaNames: ['Alice', 'Bob'],
                };

                await service.generateFeedbackWithAI(params);

                expect(mockAgentManager.disposeAgent).toHaveBeenCalledTimes(2);
            });

            it('should dispose agent even if error occurs', async () => {
                mockAgent.chat.mockRejectedValue(new Error('Chat failed'));

                await service.generateFeedbackWithAI(validParams);

                expect(mockAgentManager.disposeAgent).toHaveBeenCalled();
            });
        });

        describe('Backward Compatibility', () => {
            it('should include first entry as entry property', async () => {
                const result = await service.generateFeedbackWithAI(validParams);

                expect(result.entry).toBeDefined();
                expect(result.entry).toEqual(result.entries![0]);
            });

            it('should work with multiple entries', async () => {
                const params = {
                    ...validParams,
                    personaNames: ['Alice', 'Bob'],
                };

                const result = await service.generateFeedbackWithAI(params);

                expect(result.entries!.length).toBe(2);
                expect(result.entry).toEqual(result.entries![0]); // First entry
            });
        });
    });

    describe('Helper Methods', () => {
        describe('getRatingScale', () => {
            it('should return correct scale for 1-100', () => {
                const scale = (service as any).getRatingScale('1-100');
                expect(scale).toBe('100');
            });

            it('should return correct scale for 1-10', () => {
                const scale = (service as any).getRatingScale('1-10');
                expect(scale).toBe('10');
            });

            it('should return correct scale for stars', () => {
                const scale = (service as any).getRatingScale('stars');
                expect(scale).toBe('5 stars');
            });
        });

        describe('parseRating', () => {
            it('should parse X/100 format', () => {
                const rating = (service as any).parseRating('Rating: 75/100', '1-100');
                expect(rating).toBe(75);
            });

            it('should parse X out of 100 format', () => {
                const rating = (service as any).parseRating('I give it 82 out of 100', '1-100');
                expect(rating).toBe(82);
            });

            it('should parse X/10 format', () => {
                const rating = (service as any).parseRating('8/10', '1-10');
                expect(rating).toBe(8);
            });

            it('should parse X stars format', () => {
                const rating = (service as any).parseRating('4 stars', 'stars');
                expect(rating).toBe(4);
            });

            it('should parse X star format (singular)', () => {
                const rating = (service as any).parseRating('1 star', 'stars');
                expect(rating).toBe(1);
            });

            it('should be case insensitive', () => {
                const rating = (service as any).parseRating('RATING: 90/100', '1-100');
                expect(rating).toBe(90);
            });

            it('should handle whitespace variations', () => {
                const rating1 = (service as any).parseRating('75 / 100', '1-100');
                const rating2 = (service as any).parseRating('75/100', '1-100');
                expect(rating1).toBe(75);
                expect(rating2).toBe(75);
            });

            it('should clamp to minimum', () => {
                const rating = (service as any).parseRating('0/100', '1-100');
                expect(rating).toBe(1);
            });

            it('should clamp to maximum', () => {
                const rating = (service as any).parseRating('150/100', '1-100');
                expect(rating).toBe(100);
            });

            it('should default to middle for 1-100', () => {
                const rating = (service as any).parseRating('No rating here', '1-100');
                expect(rating).toBe(50);
            });

            it('should default to middle for 1-10', () => {
                const rating = (service as any).parseRating('No rating here', '1-10');
                expect(rating).toBe(5);
            });

            it('should default to middle for stars', () => {
                const rating = (service as any).parseRating('No rating here', 'stars');
                expect(rating).toBe(3);
            });
        });
    });
});
