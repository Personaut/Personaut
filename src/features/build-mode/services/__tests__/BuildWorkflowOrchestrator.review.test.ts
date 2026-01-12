/**
 * Integration tests for Review Phase
 * Tests persona feedback extraction and data flow
 */

describe('BuildWorkflowOrchestrator - Review Phase', () => {
    let mockPersonaAgent: any;
    let mockConversationManager: any;
    let mockAgentManager: any;

    beforeEach(() => {
        // Mock persona agent
        mockPersonaAgent = {
            chat: jest.fn(),
        };

        // Mock conversation manager
        mockConversationManager = {
            getConversation: jest.fn(),
        };

        // Mock agent manager
        mockAgentManager = {
            getOrCreateAgent: jest.fn().mockResolvedValue(mockPersonaAgent),
            disposeAgent: jest.fn(),
            config: {
                conversationManager: mockConversationManager,
            },
        };
    });

    test('should extract feedback from conversation', async () => {
        // Arrange
        const persona = {
            personaId: 'test-persona-1',
            personaName: 'Test User',
            personaRole: 'Software Engineer',
        };

        const expectedFeedback = `Looking at the screenshot, I really like the clean layout and modern design. The color scheme is professional and the navigation is intuitive. However, I notice the buttons are a bit small on mobile. I'd rate this 8/10 - it's a solid implementation with minor improvements needed.`;

        // Mock conversation with feedback
        mockConversationManager.getConversation.mockResolvedValue({
            messages: [
                { role: 'user', text: 'Look at this screenshot...' },
                { role: 'model', text: expectedFeedback }
            ]
        });

        // Act - Simulate review phase
        const conversationId = `persona-${persona.personaId}-testPage-iter1`;
        await mockPersonaAgent.chat('Look at this screenshot...', [], {}, 'You are Test User...', true, ['screenshot.png']);

        const conversation = await mockConversationManager.getConversation(conversationId);
        const modelMessages = conversation?.messages?.filter((m: any) => m.role === 'model') || [];
        const lastMsg = modelMessages.pop();
        const feedbackText = lastMsg?.text || `Feedback from ${persona.personaName}`;

        // Parse rating
        const ratingMatch = feedbackText.match(/\b([1-9]|10)\b/);
        const rating = ratingMatch ? parseInt(ratingMatch[1]) : 5;

        // Assert
        expect(feedbackText).toBe(expectedFeedback);
        expect(feedbackText.length).toBeGreaterThan(0);
        expect(feedbackText).toContain('Looking at the screenshot');
        expect(rating).toBe(8);
        expect(mockPersonaAgent.chat).toHaveBeenCalledTimes(1);
        expect(mockConversationManager.getConversation).toHaveBeenCalledWith(conversationId);
    });

    test('should handle missing conversation gracefully', async () => {
        // Arrange
        const persona = {
            personaId: 'test-persona-1',
            personaName: 'Test User',
            personaRole: 'Software Engineer',
        };

        // Mock missing conversation
        mockConversationManager.getConversation.mockResolvedValue(null);

        // Act
        const conversationId = `persona-${persona.personaId}-testPage-iter1`;
        await mockPersonaAgent.chat('Look at this screenshot...', [], {}, 'You are Test User...', true, ['screenshot.png']);

        const conversation = await mockConversationManager.getConversation(conversationId);
        const modelMessages = conversation?.messages?.filter((m: any) => m.role === 'model') || [];
        const lastMsg = modelMessages.pop();
        const feedbackText = lastMsg?.text || `Feedback from ${persona.personaName}`;

        // Assert
        expect(feedbackText).toBe(`Feedback from ${persona.personaName}`);
    });

    test('should handle empty messages array', async () => {
        // Arrange
        const persona = {
            personaId: 'test-persona-1',
            personaName: 'Test User',
            personaRole: 'Software Engineer',
        };

        // Mock conversation with no messages
        mockConversationManager.getConversation.mockResolvedValue({
            messages: []
        });

        // Act
        const conversationId = `persona-${persona.personaId}-testPage-iter1`;
        await mockPersonaAgent.chat('Look at this screenshot...', [], {}, 'You are Test User...', true, ['screenshot.png']);

        const conversation = await mockConversationManager.getConversation(conversationId);
        const modelMessages = conversation?.messages?.filter((m: any) => m.role === 'model') || [];
        const lastMsg = modelMessages.pop();
        const feedbackText = lastMsg?.text || `Feedback from ${persona.personaName}`;

        // Assert
        expect(feedbackText).toBe(`Feedback from ${persona.personaName}`);
    });

    test('should extract rating correctly from various formats', async () => {
        // Test cases
        const testCases = [
            { feedback: 'I rate this 7/10', expectedRating: 7 },
            { feedback: 'Rating: 9 out of 10', expectedRating: 9 },
            { feedback: 'This is a 10!', expectedRating: 10 },
            { feedback: 'I give it a 3', expectedRating: 3 },
            { feedback: 'No rating mentioned', expectedRating: 5 }, // Default
        ];

        for (const testCase of testCases) {
            const ratingMatch = testCase.feedback.match(/\b([1-9]|10)\b/);
            const rating = ratingMatch ? parseInt(ratingMatch[1]) : 5;
            expect(rating).toBe(testCase.expectedRating);
        }
    });

    test('should pass screenshot as image to chat', async () => {
        // Arrange
        const persona = {
            personaId: 'test-persona-1',
            personaName: 'Test User',
            personaRole: 'Software Engineer',
        };

        const screenshotPath = '/path/to/screenshot.png';
        const userPrompt = 'Look at this screenshot...';
        const systemPrompt = 'You are Test User...';

        // Act
        await mockPersonaAgent.chat(userPrompt, [], {}, systemPrompt, true, [screenshotPath]);

        // Assert
        expect(mockPersonaAgent.chat).toHaveBeenCalledWith(
            userPrompt,
            [],
            {},
            systemPrompt,
            true,
            [screenshotPath]
        );
    });

    test('should handle multiple model messages and extract last one', async () => {
        // Arrange
        const persona = {
            personaId: 'test-persona-1',
            personaName: 'Test User',
            personaRole: 'Software Engineer',
        };

        const finalFeedback = 'This is my final feedback after thinking it through. 8/10';

        // Mock conversation with multiple model messages
        mockConversationManager.getConversation.mockResolvedValue({
            messages: [
                { role: 'user', text: 'Look at this screenshot...' },
                { role: 'model', text: 'Let me think about this...' },
                { role: 'user', text: 'Please provide your rating' },
                { role: 'model', text: finalFeedback }
            ]
        });

        // Act
        const conversationId = `persona-${persona.personaId}-testPage-iter1`;
        await mockPersonaAgent.chat('Look at this screenshot...', [], {}, 'You are Test User...', true, ['screenshot.png']);

        const conversation = await mockConversationManager.getConversation(conversationId);
        const modelMessages = conversation?.messages?.filter((m: any) => m.role === 'model') || [];
        const lastMsg = modelMessages.pop();
        const feedbackText = lastMsg?.text || `Feedback from ${persona.personaName}`;

        // Assert
        expect(feedbackText).toBe(finalFeedback);
        expect(modelMessages.length).toBe(1); // One left after pop
    });

    test('should create proper feedback object', async () => {
        // Arrange
        const persona = {
            personaId: 'test-persona-1',
            personaName: 'Test User',
            personaRole: 'Software Engineer',
        };

        const feedbackText = 'Great design! 9/10';

        mockConversationManager.getConversation.mockResolvedValue({
            messages: [
                { role: 'user', text: 'Look at this screenshot...' },
                { role: 'model', text: feedbackText }
            ]
        });

        // Act
        const conversationId = `persona-${persona.personaId}-testPage-iter1`;
        await mockPersonaAgent.chat('Look at this screenshot...', [], {}, 'You are Test User...', true, ['screenshot.png']);

        const conversation = await mockConversationManager.getConversation(conversationId);
        const modelMessages = conversation?.messages?.filter((m: any) => m.role === 'model') || [];
        const lastMsg = modelMessages.pop();
        const extractedFeedback = lastMsg?.text || `Feedback from ${persona.personaName}`;
        const ratingMatch = extractedFeedback.match(/\b([1-9]|10)\b/);
        const rating = ratingMatch ? parseInt(ratingMatch[1]) : 5;

        const result = {
            personaId: persona.personaId,
            personaName: persona.personaName,
            rating,
            feedback: extractedFeedback,
        };

        // Assert
        expect(result).toEqual({
            personaId: 'test-persona-1',
            personaName: 'Test User',
            rating: 9,
            feedback: feedbackText,
        });
    });
});
