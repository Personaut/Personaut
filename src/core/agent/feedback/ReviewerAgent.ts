/**
 * ReviewerAgent - Persona-based feedback agent
 * Handles screenshot review and feedback collection from persona perspective
 */

import { BaseAgent, BaseAgentConfig } from '../base/BaseAgent';
import { AGENT_CAPABILITIES } from '../base/AgentCapabilities';
import { ReviewerAgentOptions, RatingSystem } from '../AgentTypes';
import { PERSONA_FEEDBACK_PROMPT } from '../../prompts/FeedbackPrompts';

/**
 * Feedback entry structure
 */
export interface FeedbackEntry {
    personaName: string;
    rating: number;
    feedback: string;
    timestamp: number;
    screenshotPath?: string;
}

/**
 * Feedback summary structure
 */
export interface FeedbackSummary {
    averageRating: number;
    totalResponses: number;
    keyThemes: string[];
    positives: string[];
    negatives: string[];
    recommendations: string[];
}

/**
 * ReviewerAgent handles persona-based feedback collection
 * Reviews screenshots and provides ratings from persona perspective
 */
export class ReviewerAgent extends BaseAgent {
    private readonly personaName: string;
    private readonly ratingSystem: RatingSystem;

    constructor(
        config: Omit<BaseAgentConfig, 'agentType'>,
        options: ReviewerAgentOptions
    ) {
        super({
            ...config,
            agentType: 'reviewer',
            mode: config.mode || 'feedback',
        });

        this.personaName = options.personaName;
        this.ratingSystem = options.ratingSystem || 'stars';
    }

    /**
     * Register capabilities for reviewer agent
     */
    protected registerCapabilities(): void {
        this.capabilityRegistry.registerMultiple(this.conversationId, [
            AGENT_CAPABILITIES.FEEDBACK_COLLECTION,
            AGENT_CAPABILITIES.FEEDBACK_SYNTHESIS,
        ]);
    }

    /**
     * Get system prompt for reviewer agent
     * Returns persona-specific feedback prompt
     */
    public getSystemPrompt(): string {
        const ratingScale = this.getRatingScale();
        return PERSONA_FEEDBACK_PROMPT(this.personaName, ratingScale);
    }

    /**
     * Get rating scale based on rating system
     */
    private getRatingScale(): string {
        switch (this.ratingSystem) {
            case 'stars':
                return '1-5 stars';
            case '1-10':
                return '1-10 scale';
            case '1-100':
                return '1-100 scale';
            default:
                return '1-5 stars';
        }
    }

    /**
     * Get maximum rating value
     */
    private getMaxRating(): number {
        switch (this.ratingSystem) {
            case 'stars':
                return 5;
            case '1-10':
                return 10;
            case '1-100':
                return 100;
            default:
                return 5;
        }
    }

    /**
     * Review a screenshot
     * @param screenshotBase64 - Base64 encoded screenshot
     * @param context - Additional context about the screen
     * @returns Feedback entry
     */
    public async reviewScreenshot(
        screenshotBase64: string,
        context?: string
    ): Promise<FeedbackEntry> {
        const contextText = context ? `\n\nContext: ${context}` : '';
        const prompt = `Review this screenshot as ${this.personaName}.${contextText}\n\nProvide:\n1. Rating (${this.getRatingScale()})\n2. Detailed feedback\n3. What works well\n4. What could be improved`;

        let feedbackText = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                feedbackText = lastMessage.text;
            }
        };

        // Send screenshot as image
        await this.chat(prompt, [], {}, undefined, false, [screenshotBase64]);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        // Parse rating from feedback
        const rating = this.parseRating(feedbackText);

        return {
            personaName: this.personaName,
            rating,
            feedback: feedbackText,
            timestamp: Date.now(),
        };
    }

    /**
     * Parse rating from feedback text
     */
    private parseRating(feedbackText: string): number {
        const maxRating = this.getMaxRating();

        // Try to find rating in various formats
        const patterns = [
            /rating[:\s]+(\d+(?:\.\d+)?)/i,
            /(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*\d+/i,
            /(\d+(?:\.\d+)?)\s*stars?/i,
            /score[:\s]+(\d+(?:\.\d+)?)/i,
        ];

        for (const pattern of patterns) {
            const match = feedbackText.match(pattern);
            if (match) {
                const value = parseFloat(match[1]);
                // Normalize to max rating
                if (value <= maxRating) {
                    return value;
                }
            }
        }

        // Default to middle rating if not found
        return maxRating / 2;
    }

    /**
     * Synthesize multiple feedback entries
     * @param entries - Array of feedback entries
     * @returns Feedback summary
     */
    public async synthesizeFeedback(entries: FeedbackEntry[]): Promise<FeedbackSummary> {
        const feedbackTexts = entries.map((e) =>
            `\n--- ${e.personaName} (Rating: ${e.rating}) ---\n${e.feedback}`
        ).join('\n');

        const prompt = `Synthesize the following feedback:\n${feedbackTexts}\n\nProvide:\n- Average rating\n- Key themes\n- Common positives\n- Common negatives\n- Actionable recommendations`;

        let synthesisText = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                synthesisText = lastMessage.text;
            }
        };

        await this.chat(prompt, [], {}, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        // Calculate actual average
        const averageRating = entries.reduce((sum, e) => sum + e.rating, 0) / entries.length;

        // Parse synthesis (simplified - in production, use structured output)
        return {
            averageRating,
            totalResponses: entries.length,
            keyThemes: this.extractListItems(synthesisText, 'themes'),
            positives: this.extractListItems(synthesisText, 'positives'),
            negatives: this.extractListItems(synthesisText, 'negatives'),
            recommendations: this.extractListItems(synthesisText, 'recommendations'),
        };
    }

    /**
     * Extract list items from synthesis text
     */
    private extractListItems(text: string, section: string): string[] {
        const items: string[] = [];
        const lines = text.split('\n');
        let inSection = false;

        for (const line of lines) {
            if (line.toLowerCase().includes(section)) {
                inSection = true;
                continue;
            }

            if (inSection) {
                // Stop at next section
                if (line.match(/^#+\s/) || line.match(/^[A-Z][a-z]+:/)) {
                    break;
                }

                // Extract list items
                const match = line.match(/^[-*•]\s*(.+)$/);
                if (match) {
                    items.push(match[1].trim());
                }
            }
        }

        return items;
    }

    /**
     * Get persona name
     */
    public getPersonaName(): string {
        return this.personaName;
    }

    /**
     * Get rating system
     */
    public getRatingSystem(): RatingSystem {
        return this.ratingSystem;
    }

    /**
     * Get feedback best practices
     */
    public getFeedbackGuidelines(): string[] {
        return [
            'Be specific and actionable',
            'Balance positive and constructive feedback',
            'Consider persona perspective and needs',
            'Focus on user experience impact',
            'Provide concrete examples',
            'Suggest improvements, not just problems',
            'Consider accessibility and usability',
            'Think about edge cases and error states',
        ];
    }
}
