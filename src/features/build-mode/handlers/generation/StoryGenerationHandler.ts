/**
 * StoryGenerationHandler manages user story generation for Build Mode.
 * 
 * Responsibilities:
 * - Generate user stories from features and personas
 * - Regenerate individual stories
 * - Parse and validate story JSON
 * 
 * This handler was extracted from BuildModeHandler to improve code organization.
 * It leverages centralized prompts from core/prompts/BuildPrompts.
 */

import { WebviewMessage } from '../../../../shared/types/CommonTypes';
import { BuildModeService } from '../../services/BuildModeService';
import { ErrorSanitizer } from '../../../../shared/services/ErrorSanitizer';
import { USER_STORY_PROMPT } from '../../../../core/prompts/BuildPrompts';
import { parseJson } from '../../../../shared/utils/JsonParser';

export class StoryGenerationHandler {
    constructor(
        private readonly buildModeService: BuildModeService,
        private readonly errorSanitizer: ErrorSanitizer
    ) { }

    /**
     * Validate project name to prevent path traversal attacks.
     */
    private validateProjectName(projectName: string): void {
        if (!projectName || typeof projectName !== 'string') {
            throw new Error('Invalid project name');
        }

        if (projectName.includes('..') || projectName.includes('/') || projectName.includes('\\')) {
            throw new Error('Project name contains invalid characters');
        }

        if (projectName.startsWith('.') || projectName.includes('~')) {
            throw new Error('Project name contains invalid characters');
        }
    }

    /**
     * Attempt to repair malformed JSON using LLM
     */
    private async attemptLlmJsonRepair(
        malformedJson: string,
        parseError: string,
        projectName: string
    ): Promise<any | null> {
        try {
            console.log('[StoryGenerationHandler] Attempting LLM JSON repair');

            const repairPrompt = `The following JSON is malformed and caused this error: ${parseError}

Please fix the JSON and return ONLY valid JSON, nothing else:

${malformedJson}`;

            const repairedContent = await this.buildModeService.generateStageContent(
                projectName,
                'stories',
                repairPrompt
            );

            const repairResult = parseJson(repairedContent);
            if (repairResult.success) {
                console.log('[StoryGenerationHandler] LLM repair successful');
                return repairResult.data;
            }

            console.warn('[StoryGenerationHandler] LLM repair failed');
            return null;
        } catch (error) {
            console.error('[StoryGenerationHandler] LLM repair error:', error);
            return null;
        }
    }

    /**
     * Handle generate user stories request.
     * Validates: Requirements 13.1, 13.2, 13.3
     */
    async handleGenerateUserStories(
        message: WebviewMessage,
        webview: any
    ): Promise<void> {
        if (!message.projectName) {
            throw new Error('Project name is required');
        }

        this.validateProjectName(message.projectName);

        const features = message.features || [];
        const personas = message.personas || [];

        console.log('[StoryGenerationHandler] Generating user stories:', {
            projectName: message.projectName,
            featureCount: features.length,
            personaCount: personas.length,
        });

        // Notify start
        webview.postMessage({
            type: 'user-stories-generation-started',
            projectName: message.projectName,
        });

        try {
            // Build the prompt with feature and persona context
            const featureList = features
                .map((f: any) => `- ${f.name}: ${f.description || 'No description'}`)
                .join('\n');
            const personaList = personas
                .map((p: any) => `- ${p.name}: ${p.backstory || 'No backstory'}`)
                .join('\n');

            const prompt = `Generate user stories for the following features and personas:\n\nFEATURES:\n${featureList || 'No features provided'}\n\nPERSONAS:\n${personaList || 'No personas provided'}\n\nGenerate one user story per feature, considering the perspectives of all personas.`;

            // Use BuildModeService to generate content with centralized prompt
            const generatedContent = await this.buildModeService.generateStageContent(
                message.projectName,
                'stories',
                `${USER_STORY_PROMPT}\n\n${prompt}`
            );

            // Parse the generated stories
            let stories: any[] = [];
            console.log('[StoryGenerationHandler] Parsing stories, content length:', generatedContent?.length);
            const parseResult = parseJson(generatedContent);
            console.log('[StoryGenerationHandler] Parse result:', {
                success: parseResult.success,
                error: parseResult.error,
                dataType: typeof parseResult.data,
                isArray: Array.isArray(parseResult.data),
                hasStories: parseResult.data?.stories ? 'yes' : 'no',
                storiesCount: parseResult.data?.stories?.length ?? (Array.isArray(parseResult.data) ? parseResult.data.length : 0),
            });

            if (parseResult.success && parseResult.data) {
                // Handle both array and object with stories property
                if (Array.isArray(parseResult.data)) {
                    stories = parseResult.data;
                } else if (parseResult.data.stories && Array.isArray(parseResult.data.stories)) {
                    stories = parseResult.data.stories;
                }
                console.log('[StoryGenerationHandler] Parsed stories count:', stories.length);
                if (parseResult.wasRepaired) {
                    console.log('[StoryGenerationHandler] JSON was repaired for stories generation');
                }
            } else {
                // Try LLM repair (one attempt)
                console.warn(`[StoryGenerationHandler] Initial stories parse failed: ${parseResult.error}`);
                const repairedStories = await this.attemptLlmJsonRepair(
                    generatedContent,
                    parseResult.error || 'Unknown parse error',
                    message.projectName
                );
                if (repairedStories) {
                    if (Array.isArray(repairedStories)) {
                        stories = repairedStories;
                    } else if (repairedStories.stories && Array.isArray(repairedStories.stories)) {
                        stories = repairedStories.stories;
                    }
                    console.log('[StoryGenerationHandler] LLM repair succeeded for stories');
                } else {
                    // FAILOVER 3: Try regex extraction as last resort
                    console.log('[StoryGenerationHandler] Attempting regex extraction as last resort...');
                    try {
                        const { extractStoriesWithRegex } = await import('../../../../shared/utils/RegexExtractor');
                        const extractedStories = extractStoriesWithRegex(generatedContent);
                        if (extractedStories.length > 0) {
                            stories = extractedStories;
                            console.log(`[StoryGenerationHandler] Regex extraction found ${stories.length} stories`);
                        } else {
                            // Final fallback: create a simple story from the text
                            console.warn('[StoryGenerationHandler] Regex extraction found nothing, creating fallback story');
                            stories = [
                                {
                                    id: `story-${Date.now()}`,
                                    title: 'Generated Story',
                                    description: generatedContent,
                                    acceptanceCriteria: [],
                                    clarifyingQuestions: [],
                                },
                            ];
                        }
                    } catch (regexError) {
                        console.error('[StoryGenerationHandler] Regex extraction failed:', regexError);
                        // Final fallback: create a simple story from the text
                        stories = [
                            {
                                id: `story-${Date.now()}`,
                                title: 'Generated Story',
                                description: generatedContent,
                                acceptanceCriteria: [],
                                clarifyingQuestions: [],
                            },
                        ];
                    }
                }
            }

            // Ensure each story has required fields
            stories = stories.map((story: any, index: number) => ({
                id: story.id || `story-${index + 1}-${Date.now()}`,
                title: story.title || `User Story ${index + 1}`,
                description: story.description || '',
                requirements: Array.isArray(story.requirements) ? story.requirements : [],
                acceptanceCriteria: Array.isArray(story.acceptanceCriteria)
                    ? story.acceptanceCriteria
                    : [],
                // Normalize clarifyingQuestions to {question, answer} format
                clarifyingQuestions: Array.isArray(story.clarifyingQuestions)
                    ? story.clarifyingQuestions.map((q: any) =>
                        typeof q === 'string' ? { question: q, answer: '' } : q
                    )
                    : [],
                featureId: story.featureId || null,
                personaId: story.personaId || null,
                answers: story.answers || {},
                expanded: false,
            }));

            // Save to stage file with completed=true since stories were successfully generated
            await this.buildModeService.saveStage(
                message.projectName,
                'stories',
                { stories },
                true
            );

            // Send success response
            webview.postMessage({
                type: 'user-stories-generated',
                projectName: message.projectName,
                stories,
            });

            console.log('[StoryGenerationHandler] Stories generated successfully:', {
                projectName: message.projectName,
                count: stories.length,
            });
        } catch (error: any) {
            console.error('[StoryGenerationHandler] Failed to generate stories:', error);

            webview.postMessage({
                type: 'user-stories-generation-error',
                projectName: message.projectName,
                error: this.errorSanitizer.sanitize(error).userMessage,
            });
        }
    }

    /**
     * Handle regenerate single story request.
     * Validates: Requirements 13.5
     */
    async handleRegenerateSingleStory(
        message: WebviewMessage,
        webview: any
    ): Promise<void> {
        if (!message.projectName || !message.storyId) {
            throw new Error('Project name and story ID are required');
        }

        this.validateProjectName(message.projectName);

        console.log('[StoryGenerationHandler] Regenerating story:', {
            projectName: message.projectName,
            storyId: message.storyId,
        });

        try {
            // Get the context for regeneration
            const feature = message.feature || { name: 'Unknown Feature' };
            const personas = message.personas || [];

            const prompt = `Regenerate this user story with improved clarity and detail:\n\nFEATURE: ${feature.name} - ${feature.description || 'No description'}\n\nPERSONAS:\n${personas.map((p: any) => `- ${p.name}`).join('\n') || 'No personas'}\n\nGenerate a single improved user story with acceptance criteria and clarifying questions.`;

            const generatedContent = await this.buildModeService.generateStageContent(
                message.projectName,
                'stories',
                `${USER_STORY_PROMPT}\n\n${prompt}`
            );

            // Parse the regenerated story
            let updatedStory: any;
            const storyParseResult = parseJson(generatedContent);
            if (storyParseResult.success && storyParseResult.data) {
                const parsed = storyParseResult.data;
                updatedStory = Array.isArray(parsed) ? parsed[0] : parsed;
                if (storyParseResult.wasRepaired) {
                    console.log('[StoryGenerationHandler] JSON was repaired for story regeneration');
                }
            } else {
                console.warn(`[StoryGenerationHandler] Could not parse story JSON: ${storyParseResult.error}`);
                updatedStory = {
                    description: generatedContent,
                    acceptanceCriteria: [],
                    clarifyingQuestions: [],
                };
            }

            // Preserve the original ID
            updatedStory.id = message.storyId;

            webview.postMessage({
                type: 'story-updated',
                projectName: message.projectName,
                storyId: message.storyId,
                story: updatedStory,
            });

            console.log('[StoryGenerationHandler] Story regenerated:', {
                projectName: message.projectName,
                storyId: message.storyId,
            });
        } catch (error: any) {
            console.error('[StoryGenerationHandler] Failed to regenerate story:', error);

            webview.postMessage({
                type: 'story-regeneration-error',
                projectName: message.projectName,
                storyId: message.storyId,
                error: this.errorSanitizer.sanitize(error).userMessage,
            });
        }
    }
}
