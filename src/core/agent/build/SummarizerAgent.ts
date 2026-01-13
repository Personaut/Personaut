/**
 * SummarizerAgent - Context compression and summarization agent
 * Handles iteration summarization, feedback consolidation, and context compression
 * Uses a smaller, faster model optimized for summarization tasks
 */

import { BaseAgent, BaseAgentConfig } from '../base/BaseAgent';
import { AGENT_CAPABILITIES } from '../base/AgentCapabilities';

/**
 * Options for SummarizerAgent
 */
export interface SummarizerAgentOptions {
    /**
     * Model to use for summarization (should be smaller/faster than primary model)
     * If not specified, will use default summarizer model from settings
     */
    model?: string;

    /**
     * Maximum output tokens for summaries
     * Default: 1500
     */
    maxOutputTokens?: number;
}

/**
 * SummarizerAgent handles context compression and summarization
 * Optimized for:
 * - Iteration summarization (max 800 tokens)
 * - Feedback consolidation (max 1500 tokens)
 * - Older iteration compression
 */
export class SummarizerAgent extends BaseAgent {
    private readonly summarizerModel?: string;
    private readonly maxOutputTokens: number;

    constructor(
        config: Omit<BaseAgentConfig, 'agentType'>,
        options?: SummarizerAgentOptions
    ) {
        super({
            ...config,
            agentType: 'summarizer',
            mode: config.mode || 'build',
        });

        this.summarizerModel = options?.model;
        this.maxOutputTokens = options?.maxOutputTokens || 1500;
    }

    /**
     * Register capabilities for summarizer agent
     */
    protected registerCapabilities(): void {
        this.capabilityRegistry.register(
            this.conversationId,
            AGENT_CAPABILITIES.SUMMARIZATION
        );
    }

    /**
     * Get system prompt for summarizer agent
     */
    public getSystemPrompt(): string {
        return `You are a summarization assistant specialized in compressing context while preserving key information.

Your responsibilities:
- Summarize iteration history concisely (max 800 tokens per iteration)
- Consolidate feedback from multiple reviewers (max 1500 tokens)
- Preserve critical details: design highlights, key feedback, ratings
- Identify and flag conflicting feedback
- Deduplicate similar feedback items
- Maintain structured output format

Guidelines:
- Be concise but comprehensive
- Preserve actionable feedback
- Highlight conflicts and disagreements
- Use bullet points for clarity
- Include quantitative data (ratings, counts)`;
    }

    /**
     * Get the model to use for summarization
     * Can be overridden to use a specific model from settings
     */
    public getModel(): string | undefined {
        return this.summarizerModel;
    }

    /**
     * Get maximum output tokens for summaries
     */
    public getMaxOutputTokens(): number {
        return this.maxOutputTokens;
    }

    /**
     * Summarize an iteration
     * @param iterationData - Full iteration data to summarize
     * @returns Concise iteration summary (max 800 tokens)
     */
    public async summarizeIteration(iterationData: {
        pageId: string;
        iteration: number;
        uxSpec: string;
        code: string;
        feedback: string;
        rating: number;
        decision: 'iterate-again' | 'move-to-next-page';
        decisionReason?: string;
    }): Promise<string> {
        const prompt = `Summarize this iteration concisely (max 800 tokens):

**Page:** ${iterationData.pageId}
**Iteration:** ${iterationData.iteration}
**Rating:** ${iterationData.rating}/10

**UX Spec Highlights:**
${iterationData.uxSpec.substring(0, 500)}...

**Feedback Summary:**
${iterationData.feedback.substring(0, 500)}...

**Decision:** ${iterationData.decision}
${iterationData.decisionReason ? `**Reason:** ${iterationData.decisionReason}` : ''}

Provide a structured summary with:
- Design Highlights (max 3 bullet points)
- Top Issue (1 sentence)
- Top Strength (1 sentence)
- Changes from Previous (1 sentence)
- Decision Reason (1 sentence)

Format as JSON:
{
  "designHighlights": ["...", "...", "..."],
  "topIssue": "...",
  "topStrength": "...",
  "changesFromPrevious": "...",
  "decisionReason": "..."
}`;

        let summary = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                summary = lastMessage.text;
            }
        };

        await this.chat(prompt, [], { maxTokens: 800, temperature: 0.3 }, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        return summary;
    }

    /**
     * Consolidate feedback from multiple reviewers
     * @param rawFeedback - Array of raw feedback from reviewers
     * @returns Consolidated feedback (max 1500 tokens)
     */
    public async consolidateFeedback(rawFeedback: Array<{
        personaId: string;
        personaName: string;
        ratings: {
            overall: number;
            usability: number;
            aesthetics: number;
            functionality: number;
            accessibility: number;
        };
        feedback: {
            likes: string[];
            dislikes: string[];
            suggestions: string[];
            concerns: string[];
        };
    }>): Promise<string> {
        const feedbackText = rawFeedback.map(f => `
**${f.personaName}** (Overall: ${f.ratings.overall}/5)
- Likes: ${f.feedback.likes.join(', ')}
- Dislikes: ${f.feedback.dislikes.join(', ')}
- Suggestions: ${f.feedback.suggestions.join(', ')}
- Concerns: ${f.feedback.concerns.join(', ')}
`).join('\n---\n');

        const prompt = `Consolidate this reviewer feedback (max 1500 tokens):

${feedbackText}

Provide a structured consolidation with:
1. **Aggregated Ratings** (average across all reviewers)
2. **Prioritized Actions** (max 5, ranked by importance and frequency)
3. **Strengths** (max 3, most mentioned positives)
4. **Conflicts** (areas where reviewers disagree by >2 stars)

Format as JSON:
{
  "ratings": {
    "overall": number,
    "usability": number,
    "aesthetics": number,
    "functionality": number,
    "accessibility": number
  },
  "prioritizedActions": [
    {
      "priority": 1-3,
      "category": "usability|aesthetics|functionality|accessibility",
      "description": "...",
      "mentionedBy": number
    }
  ],
  "strengths": ["...", "...", "..."],
  "conflicts": [
    {
      "topic": "...",
      "divergentOpinions": ["...", "..."],
      "suggestedResolution": "..."
    }
  ]
}

Rules:
- Deduplicate similar feedback
- Flag conflicts where ratings differ by >2 stars
- Prioritize by frequency and severity
- Maximum 5 action items`;

        let consolidated = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                consolidated = lastMessage.text;
            }
        };

        await this.chat(prompt, [], { maxTokens: 1500, temperature: 0.3 }, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        return consolidated;
    }

    /**
     * Summarize older iterations into a single aggregate summary
     * @param iterations - Array of iteration summaries to compress
     * @returns Aggregate summary of older iterations
     */
    public async summarizeOlderIterations(iterations: Array<{
        iteration: number;
        summary: string;
    }>): Promise<string> {
        const iterationsText = iterations.map(i => `
**Iteration ${i.iteration}:**
${i.summary}
`).join('\n---\n');

        const prompt = `Create an aggregate summary of these older iterations (max 500 tokens):

${iterationsText}

Provide a concise summary highlighting:
- Overall progression and improvements
- Recurring themes or issues
- Key design decisions made
- Final state before recent iterations

Keep it brief and focused on what's relevant for current context.`;

        let aggregate = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                aggregate = lastMessage.text;
            }
        };

        await this.chat(prompt, [], { maxTokens: 500, temperature: 0.3 }, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        return aggregate;
    }

    /**
     * Detect conflicts in reviewer feedback
     * @param feedback - Array of feedback with ratings
     * @returns Array of detected conflicts
     */
    public detectConflicts(feedback: Array<{
        personaName: string;
        ratings: {
            overall: number;
            usability: number;
            aesthetics: number;
            functionality: number;
            accessibility: number;
        };
    }>): Array<{
        aspect: string;
        ratings: Array<{ personaName: string; rating: number }>;
        spread: number;
    }> {
        const conflicts: Array<{
            aspect: string;
            ratings: Array<{ personaName: string; rating: number }>;
            spread: number;
        }> = [];

        const aspects = ['overall', 'usability', 'aesthetics', 'functionality', 'accessibility'] as const;

        for (const aspect of aspects) {
            const ratings = feedback.map(f => ({
                personaName: f.personaName,
                rating: f.ratings[aspect],
            }));

            const values = ratings.map(r => r.rating);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const spread = max - min;

            // Flag as conflict if spread > 2 stars
            if (spread > 2) {
                conflicts.push({
                    aspect,
                    ratings,
                    spread,
                });
            }
        }

        return conflicts;
    }
}
