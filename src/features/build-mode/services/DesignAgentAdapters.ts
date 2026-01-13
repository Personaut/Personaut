/**
 * DesignAgentAdapters - Adapters for existing agents in the Design workflow
 *
 * These adapters wrap existing agents (ResearchAgent, DesignerAgent) to provide
 * Design workflow-specific functionality:
 * - Users Stage: Interview personas to gather feature requirements
 * - Features Stage: Generate features from persona interview insights
 * - Stories Stage: Create user stories from features
 * - Design Stage: Generate pages and flows from stories
 *
 * **Part of Build-to-Design Transformation**
 * Validates: Requirements 5.2, 5.3, 6.2-6.4, 7.2-7.4, 8.2-8.3
 */

import * as vscode from 'vscode';
import { ResearchAgent } from '../../../core/agent/build/ResearchAgent';
import { DesignerAgent } from '../../../core/agent/build/DesignerAgent';
import { BaseAgentConfig } from '../../../core/agent/base/BaseAgent';
import {
    DesignPersona,
    DEFAULT_DESIGN_PERSONAS,
    PERSONA_INTERVIEW_SYSTEM_PROMPT,
    PERSONA_INTERVIEW_QUESTIONS,
    FEATURE_GENERATION_PROMPT,
    STORY_GENERATION_PROMPT,
    PAGE_GENERATION_PROMPT,
    FLOW_GENERATION_PROMPT,
} from '../../../core/prompts/DesignPrompts';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result from a persona interview
 */
export interface PersonaInterviewResult {
    personaId: string;
    personaName: string;
    responses: {
        question: string;
        answer: string;
    }[];
    extractedFeatures: string[];
    extractedPainPoints: string[];
}

/**
 * Result from the Users stage
 */
export interface UsersStageResult {
    personas: DesignPersona[];
    interviews: PersonaInterviewResult[];
    synthesizedInsights: string;
}

/**
 * Result from the Features stage
 */
export interface FeaturesStageResult {
    features: Array<{
        id: string;
        name: string;
        description: string;
        suggestedBy: string[];
        priority: 'P0' | 'P1' | 'P2';
        complexity: 'low' | 'medium' | 'high';
        category: string;
        isUserModified: boolean;
    }>;
}

/**
 * Result from the Stories stage
 */
export interface StoriesStageResult {
    stories: Array<{
        id: string;
        featureId: string;
        title: string;
        fullStory: string;
        acceptanceCriteria: string[];
        personaId: string;
        priority: 'P0' | 'P1' | 'P2';
        isUserModified: boolean;
    }>;
}

/**
 * Progress callback for stage execution
 */
export type StageProgressCallback = (update: {
    stage: string;
    step: string;
    message: string;
    progress: number; // 0-100
}) => void;

// ============================================================================
// USERS STAGE ADAPTER
// ============================================================================

/**
 * UsersStageAdapter - Conducts persona interviews to gather requirements
 *
 * The adapter:
 * 1. Takes default or custom personas
 * 2. For each persona, creates an agent that embodies that persona
 * 3. Asks the persona interview questions
 * 4. Extracts feature requirements from responses
 * 5. Synthesizes all insights
 */
export class UsersStageAdapter {
    private webview: vscode.Webview;
    private baseConfig: Omit<BaseAgentConfig, 'agentType' | 'onDidUpdateMessages'>;

    constructor(webview: vscode.Webview, baseConfig: Omit<BaseAgentConfig, 'agentType' | 'onDidUpdateMessages'>) {
        this.webview = webview;
        this.baseConfig = baseConfig;
    }

    /**
     * Run the Users stage - interview personas and synthesize insights
     *
     * @param projectDescription - Description of the project
     * @param personas - Custom personas or use defaults
     * @param onProgress - Progress callback
     * @returns Users stage results with personas and insights
     */
    async execute(
        projectDescription: string,
        personas: DesignPersona[] = DEFAULT_DESIGN_PERSONAS,
        onProgress?: StageProgressCallback
    ): Promise<UsersStageResult> {
        const interviews: PersonaInterviewResult[] = [];

        // Interview each persona
        for (let i = 0; i < personas.length; i++) {
            const persona = personas[i];
            const progress = Math.round(((i + 1) / personas.length) * 80);

            onProgress?.({
                stage: 'users',
                step: 'interviewing',
                message: `Interviewing ${persona.name}...`,
                progress,
            });

            const interview = await this.interviewPersona(persona, projectDescription);
            interviews.push(interview);
        }

        // Synthesize all insights
        onProgress?.({
            stage: 'users',
            step: 'synthesizing',
            message: 'Synthesizing persona insights...',
            progress: 90,
        });

        const synthesizedInsights = await this.synthesizeInterviews(interviews);

        onProgress?.({
            stage: 'users',
            step: 'complete',
            message: 'Users stage complete',
            progress: 100,
        });

        return {
            personas,
            interviews,
            synthesizedInsights,
        };
    }

    /**
     * Interview a single persona
     */
    private async interviewPersona(
        persona: DesignPersona,
        projectDescription: string
    ): Promise<PersonaInterviewResult> {
        const responses: { question: string; answer: string }[] = [];

        // Get questions for this persona type
        const questions = [
            ...PERSONA_INTERVIEW_QUESTIONS.common,
            ...(PERSONA_INTERVIEW_QUESTIONS[persona.archetype as keyof typeof PERSONA_INTERVIEW_QUESTIONS] || []),
        ];

        // Create a research agent configured as this persona
        const agent = new ResearchAgent(
            {
                ...this.baseConfig,
                webview: this.webview,
                mode: 'build',
                onDidUpdateMessages: () => { },
            },
            {
                researchType: 'user',
                idea: projectDescription,
            }
        );

        // Override the system prompt to embody the persona
        const personaSystemPrompt = PERSONA_INTERVIEW_SYSTEM_PROMPT(persona, projectDescription);
        (agent as any).getSystemPrompt = () => personaSystemPrompt;

        // Ask each question
        for (const question of questions) {
            const answer = await agent.conductResearch(question);
            responses.push({ question, answer });
        }

        // Extract features and pain points from responses
        const allResponseText = responses.map(r => `Q: ${r.question}\nA: ${r.answer}`).join('\n\n');
        const extractedFeatures = this.extractFeaturesFromResponses(allResponseText);
        const extractedPainPoints = this.extractPainPointsFromResponses(allResponseText);

        agent.dispose();

        return {
            personaId: persona.id,
            personaName: persona.name,
            responses,
            extractedFeatures,
            extractedPainPoints,
        };
    }

    /**
     * Extract feature requests from interview responses
     */
    private extractFeaturesFromResponses(responseText: string): string[] {
        // Simple extraction - look for feature-related keywords
        const features: string[] = [];
        const featurePatterns = [
            /I (?:would )?want(?: to)? (.+?)(?:\.|,|so that)/gi,
            /I need (.+?)(?:\.|,)/gi,
            /(?:would be great|important) to have (.+?)(?:\.|,)/gi,
            /API (?:access|integration) for (.+?)(?:\.|,)/gi,
        ];

        for (const pattern of featurePatterns) {
            let match;
            while ((match = pattern.exec(responseText)) !== null) {
                const feature = match[1].trim();
                if (feature.length > 5 && feature.length < 100) {
                    features.push(feature);
                }
            }
        }

        return [...new Set(features)]; // Deduplicate
    }

    /**
     * Extract pain points from interview responses
     */
    private extractPainPointsFromResponses(responseText: string): string[] {
        const painPoints: string[] = [];
        const painPatterns = [
            /frustrat(?:es|ing|ed)(?: me)? (?:is |when )?(.+?)(?:\.|,)/gi,
            /(?:hate|dislike|annoying|problem)(?: when | with | is )(.+?)(?:\.|,)/gi,
            /currently (?:have to|struggling with) (.+?)(?:\.|,)/gi,
        ];

        for (const pattern of painPatterns) {
            let match;
            while ((match = pattern.exec(responseText)) !== null) {
                const painPoint = match[1].trim();
                if (painPoint.length > 5 && painPoint.length < 100) {
                    painPoints.push(painPoint);
                }
            }
        }

        return [...new Set(painPoints)];
    }

    /**
     * Synthesize insights from all persona interviews
     */
    private async synthesizeInterviews(interviews: PersonaInterviewResult[]): Promise<string> {
        // Format interview data for synthesis
        const interviewSummary = interviews.map(interview => `
## ${interview.personaName}

### Responses
${interview.responses.map(r => `Q: ${r.question}\nA: ${r.answer}`).join('\n\n')}

### Extracted Features
${interview.extractedFeatures.map(f => `- ${f}`).join('\n')}

### Extracted Pain Points
${interview.extractedPainPoints.map(p => `- ${p}`).join('\n')}
        `).join('\n---\n');

        // Use ResearchAgent in synthesis mode to consolidate
        const synthesizer = new ResearchAgent(
            {
                ...this.baseConfig,
                webview: this.webview,
                mode: 'build',
                onDidUpdateMessages: () => { },
            },
            {
                researchType: 'synthesis',
                idea: 'Persona Interview Synthesis',
            }
        );

        const synthesis = await synthesizer.synthesizeFindings([interviewSummary]);
        synthesizer.dispose();

        return synthesis;
    }
}

// ============================================================================
// FEATURES STAGE ADAPTER
// ============================================================================

/**
 * FeaturesStageAdapter - Generates features from persona insights
 */
export class FeaturesStageAdapter {
    private webview: vscode.Webview;
    private baseConfig: Omit<BaseAgentConfig, 'agentType' | 'onDidUpdateMessages'>;

    constructor(webview: vscode.Webview, baseConfig: Omit<BaseAgentConfig, 'agentType' | 'onDidUpdateMessages'>) {
        this.webview = webview;
        this.baseConfig = baseConfig;
    }

    /**
     * Generate features from Users stage results
     */
    async execute(
        projectDescription: string,
        usersResult: UsersStageResult,
        onProgress?: StageProgressCallback
    ): Promise<FeaturesStageResult> {
        onProgress?.({
            stage: 'features',
            step: 'generating',
            message: 'Generating features from persona insights...',
            progress: 30,
        });

        const personasJson = JSON.stringify(usersResult.personas, null, 2);
        const prompt = FEATURE_GENERATION_PROMPT(projectDescription, personasJson);

        // Use DesignerAgent for feature generation
        const agent = new DesignerAgent({
            ...this.baseConfig,
            webview: this.webview,
            mode: 'build',
            onDidUpdateMessages: () => { },
        });

        const response = await agent.generateUserFlows(prompt);
        agent.dispose();

        onProgress?.({
            stage: 'features',
            step: 'parsing',
            message: 'Processing feature list...',
            progress: 80,
        });

        // Parse the response
        const features = this.parseFeaturesFromResponse(response);

        onProgress?.({
            stage: 'features',
            step: 'complete',
            message: 'Features stage complete',
            progress: 100,
        });

        return { features };
    }

    private parseFeaturesFromResponse(response: string): FeaturesStageResult['features'] {
        try {
            // Look for JSON in the response
            const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1]);
                return parsed.features || [];
            }

            // Try parsing the entire response as JSON
            const parsed = JSON.parse(response);
            return parsed.features || [];
        } catch {
            // Return empty array if parsing fails
            return [];
        }
    }
}

// ============================================================================
// STORIES STAGE ADAPTER
// ============================================================================

/**
 * StoriesStageAdapter - Generates user stories from features
 */
export class StoriesStageAdapter {
    private webview: vscode.Webview;
    private baseConfig: Omit<BaseAgentConfig, 'agentType' | 'onDidUpdateMessages'>;

    constructor(webview: vscode.Webview, baseConfig: Omit<BaseAgentConfig, 'agentType' | 'onDidUpdateMessages'>) {
        this.webview = webview;
        this.baseConfig = baseConfig;
    }

    /**
     * Generate stories from features
     */
    async execute(
        featuresResult: FeaturesStageResult,
        personas: DesignPersona[],
        onProgress?: StageProgressCallback
    ): Promise<StoriesStageResult> {
        const allStories: StoriesStageResult['stories'] = [];
        const personasJson = JSON.stringify(personas, null, 2);

        // Generate stories for each feature
        for (let i = 0; i < featuresResult.features.length; i++) {
            const feature = featuresResult.features[i];
            const progress = Math.round(((i + 1) / featuresResult.features.length) * 90);

            onProgress?.({
                stage: 'stories',
                step: 'generating',
                message: `Generating stories for: ${feature.name}`,
                progress,
            });

            const featureJson = JSON.stringify(feature, null, 2);
            const prompt = STORY_GENERATION_PROMPT(featureJson, personasJson);

            const agent = new DesignerAgent({
                ...this.baseConfig,
                webview: this.webview,
                mode: 'build',
                onDidUpdateMessages: () => { },
            });

            const response = await agent.generateUserFlows(prompt);
            agent.dispose();

            const stories = this.parseStoriesFromResponse(response);
            allStories.push(...stories);
        }

        onProgress?.({
            stage: 'stories',
            step: 'complete',
            message: 'Stories stage complete',
            progress: 100,
        });

        return { stories: allStories };
    }

    private parseStoriesFromResponse(response: string): StoriesStageResult['stories'] {
        try {
            const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1]);
                return parsed.stories || [];
            }
            const parsed = JSON.parse(response);
            return parsed.stories || [];
        } catch {
            return [];
        }
    }
}

// ============================================================================
// DESIGN STAGE ADAPTER
// ============================================================================

/**
 * DesignStageAdapter - Generates pages and flows from stories
 */
export class DesignStageAdapter {
    private webview: vscode.Webview;
    private baseConfig: Omit<BaseAgentConfig, 'agentType' | 'onDidUpdateMessages'>;

    constructor(webview: vscode.Webview, baseConfig: Omit<BaseAgentConfig, 'agentType' | 'onDidUpdateMessages'>) {
        this.webview = webview;
        this.baseConfig = baseConfig;
    }

    /**
     * Generate pages and flows from stories
     */
    async execute(
        storiesResult: StoriesStageResult,
        onProgress?: StageProgressCallback
    ): Promise<{ pages: any[]; flows: any[] }> {
        const storiesJson = JSON.stringify(storiesResult.stories, null, 2);

        onProgress?.({
            stage: 'design',
            step: 'pages',
            message: 'Generating page designs...',
            progress: 30,
        });

        // Generate pages
        const agent = new DesignerAgent({
            ...this.baseConfig,
            webview: this.webview,
            mode: 'build',
            onDidUpdateMessages: () => { },
        });

        const pagesResponse = await agent.generateUserFlows(PAGE_GENERATION_PROMPT(storiesJson));
        const pages = this.parseFromResponse(pagesResponse, 'pages');

        onProgress?.({
            stage: 'design',
            step: 'flows',
            message: 'Generating user flows...',
            progress: 70,
        });

        // Generate flows
        const pagesJson = JSON.stringify(pages, null, 2);
        const flowsResponse = await agent.generateUserFlows(FLOW_GENERATION_PROMPT(pagesJson, storiesJson));
        const flows = this.parseFromResponse(flowsResponse, 'flows');

        agent.dispose();

        onProgress?.({
            stage: 'design',
            step: 'complete',
            message: 'Design stage complete',
            progress: 100,
        });

        return { pages, flows };
    }

    private parseFromResponse(response: string, key: string): any[] {
        try {
            const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1]);
                return parsed[key] || [];
            }
            const parsed = JSON.parse(response);
            return parsed[key] || [];
        } catch {
            return [];
        }
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    DesignPersona,
    DEFAULT_DESIGN_PERSONAS,
    PERSONA_INTERVIEW_SYSTEM_PROMPT,
    PERSONA_INTERVIEW_QUESTIONS,
};
