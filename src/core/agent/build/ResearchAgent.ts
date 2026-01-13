/**
 * ResearchAgent - Market and user research agent
 * Handles competitive analysis, market research, user research, and synthesis
 */

import { BaseAgent, BaseAgentConfig } from '../base/BaseAgent';
import { AGENT_CAPABILITIES } from '../base/AgentCapabilities';
import { ResearchAgentOptions, ResearchType } from '../AgentTypes';
import {
    COMPETITIVE_ANALYSIS_PROMPT,
    MARKET_RESEARCH_PROMPT,
    USER_RESEARCHER_PROMPT,
    RESEARCH_SYNTHESIS_PROMPT,
} from '../../prompts/BuildPrompts';

/**
 * ResearchAgent handles research tasks
 * Supports: competitive, market, user, synthesis
 */
export class ResearchAgent extends BaseAgent {
    private readonly researchType: ResearchType;
    private idea: string;

    constructor(
        config: Omit<BaseAgentConfig, 'agentType'>,
        options: ResearchAgentOptions
    ) {
        super({
            ...config,
            agentType: 'researcher',
            mode: config.mode || 'build',
        });

        this.researchType = options.researchType;
        this.idea = options.idea || '';
    }

    /**
     * Register capabilities for research agent
     */
    protected registerCapabilities(): void {
        this.capabilityRegistry.register(
            this.conversationId,
            AGENT_CAPABILITIES.RESEARCH
        );
    }

    /**
     * Get system prompt for research agent
     * Returns research type-specific prompt
     */
    public getSystemPrompt(): string {
        switch (this.researchType) {
            case 'competitive':
                return COMPETITIVE_ANALYSIS_PROMPT(this.idea);

            case 'market':
                return MARKET_RESEARCH_PROMPT(this.idea);

            case 'user':
                return USER_RESEARCHER_PROMPT(this.idea);

            case 'synthesis':
                return RESEARCH_SYNTHESIS_PROMPT;

            default:
                return COMPETITIVE_ANALYSIS_PROMPT(this.idea);
        }
    }

    /**
     * Get the research type
     */
    public getResearchType(): ResearchType {
        return this.researchType;
    }

    /**
     * Set the idea/product being researched
     */
    public setIdea(idea: string): void {
        this.idea = idea;
    }

    /**
     * Conduct research
     * @param topic - Research topic or question
     * @returns Research findings
     */
    public async conductResearch(topic?: string): Promise<string> {
        const researchTopic = topic || this.idea;
        const prompt = this.buildResearchPrompt(researchTopic);

        let findings = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                findings = lastMessage.text;
            }
        };

        await this.chat(prompt, [], {}, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        return findings;
    }

    /**
     * Synthesize multiple research findings
     * @param findings - Array of research findings
     * @returns Synthesized report
     */
    public async synthesizeFindings(findings: string[]): Promise<string> {
        const findingsText = findings.map((f, i) => `\n--- Finding ${i + 1} ---\n${f}`).join('\n');
        const prompt = `Synthesize the following research findings into a comprehensive report:\n${findingsText}\n\nProvide:\n- Executive Summary\n- Key Insights\n- Recommendations\n- Risks and Challenges`;

        let synthesis = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                synthesis = lastMessage.text;
            }
        };

        await this.chat(prompt, [], {}, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        return synthesis;
    }

    /**
     * Build research-specific prompt
     */
    private buildResearchPrompt(topic: string): string {
        switch (this.researchType) {
            case 'competitive':
                return `Conduct competitive analysis for: ${topic}\n\nAnalyze:\n- Direct competitors\n- Indirect competitors\n- Market leaders\n- Strengths and weaknesses\n- Differentiation opportunities`;

            case 'market':
                return `Conduct market research for: ${topic}\n\nAnalyze:\n- Market size and growth\n- Industry trends\n- Target demographics\n- Regulatory considerations\n- Market maturity`;

            case 'user':
                return `Conduct user research for: ${topic}\n\nIdentify:\n- Target user demographics\n- Pain points\n- Current solutions\n- User communities\n- Preferences and behaviors`;

            case 'synthesis':
                return `Synthesize research for: ${topic}\n\nProvide comprehensive analysis with actionable insights.`;

            default:
                return `Research: ${topic}`;
        }
    }

    /**
     * Get research best practices
     */
    public getResearchGuidelines(): string[] {
        const guidelines: Record<ResearchType, string[]> = {
            competitive: [
                'Identify both direct and indirect competitors',
                'Analyze feature sets and pricing',
                'Evaluate market positioning',
                'Assess strengths and weaknesses',
                'Find differentiation opportunities',
            ],
            market: [
                'Determine total addressable market (TAM)',
                'Analyze market trends and growth',
                'Identify target segments',
                'Assess regulatory environment',
                'Evaluate market maturity',
            ],
            user: [
                'Define target user personas',
                'Identify pain points and needs',
                'Analyze current solutions',
                'Understand user behaviors',
                'Gather qualitative insights',
            ],
            synthesis: [
                'Consolidate findings from multiple sources',
                'Identify patterns and themes',
                'Provide actionable recommendations',
                'Highlight risks and opportunities',
                'Create executive summary',
            ],
        };

        return guidelines[this.researchType] || [];
    }
}
