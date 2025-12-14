/**
 * BuildModeService - Business logic for the build-mode feature.
 *
 * Implements:
 * - Project initialization
 * - Stage management
 * - Content generation coordination
 * - Build state management
 * - AI-powered content generation via AgentManager
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, Build Mode Integration
 */

import { StageManager } from './StageManager';
import { BuildLogManager } from './BuildLogManager';
import { ContentStreamer } from './ContentStreamer';
import { AgentManager } from '../../../core/agent/AgentManager';
import {
  BuildProject,
  BuildState,
  BuildLog,
  BuildLogEntry,
  StageTransition,
  StageName,
} from '../types/BuildModeTypes';
import { Persona } from '../../personas/types/PersonasTypes';

export class BuildModeService {
  constructor(
    private readonly stageManager: StageManager,
    private readonly buildLogManager: BuildLogManager,
    private readonly contentStreamer: ContentStreamer,
    private readonly agentManager: AgentManager
  ) { }

  async initializeProject(projectName: string, projectTitle?: string): Promise<void> {
    await this.stageManager.initializeProject(projectName, projectTitle);
    await this.buildLogManager.initializeBuildLog(projectName);
  }

  async saveStage(
    projectName: string,
    stage: string,
    data: any,
    completed: boolean
  ): Promise<void> {
    await this.stageManager.writeStageFile(projectName, stage, data, completed);
  }

  async loadStage(projectName: string, stage: string): Promise<any | null> {
    const stageFile = await this.stageManager.readStageFile(projectName, stage);
    return stageFile ? stageFile.data : null;
  }

  async getBuildState(projectName: string): Promise<BuildState | null> {
    return this.stageManager.readBuildState(projectName);
  }

  async getBuildLog(projectName: string): Promise<BuildLog | null> {
    return this.buildLogManager.readBuildLog(projectName);
  }

  async appendLogEntry(projectName: string, entry: BuildLogEntry): Promise<void> {
    await this.buildLogManager.appendLogEntry(projectName, entry);
  }

  async completeStage(projectName: string, stage: StageName): Promise<void> {
    await this.contentStreamer.completeStage(projectName, stage);
  }

  async validateTransition(
    from: string,
    to: string,
    projectName: string
  ): Promise<StageTransition> {
    const completedStages = await this.stageManager.getCompletedStages(projectName);
    return this.stageManager.validateTransition(from, to, completedStages);
  }

  async getCompletedStages(projectName: string): Promise<string[]> {
    return this.stageManager.getCompletedStages(projectName);
  }

  async projectExists(projectName: string): Promise<boolean> {
    return this.stageManager.projectExistsAsync(projectName);
  }

  async getAllProjects(): Promise<BuildProject[]> {
    // This would need to scan the base directory for all project folders
    // For now, return empty array as this requires filesystem scanning
    return [];
  }

  async getProjects(): Promise<string[]> {
    return this.stageManager.getProjects();
  }

  /**
   * Generate stage content using AI agent
   * Creates a build-mode agent with project context, streams content generation,
   * and disposes the agent after completion
   * 
   * @param projectName - Name of the build project
   * @param stage - Current stage name
   * @param prompt - User prompt for content generation
   * @param onProgress - Optional callback for streaming progress updates
   * @returns Generated content as a string
   * 
   * Validates: Build Mode Integration
   */
  async generateStageContent(
    projectName: string,
    stage: string,
    prompt: string,
    onProgress?: (chunk: string) => void
  ): Promise<string> {
    // Create a unique conversation ID for this build-mode agent
    const conversationId = `build-${projectName}-${stage}-${Date.now()}`;

    console.log('[BuildModeService] Generating stage content:', {
      projectName,
      stage,
      conversationId,
      timestamp: Date.now(),
    });

    let agent;
    let generatedContent = '';

    try {
      // Create build-mode agent with project context
      agent = await this.agentManager.getOrCreateAgent(conversationId, 'build');

      // Build system prompt with project context
      const systemPrompt = `You are an AI assistant helping with the "${stage}" stage of the "${projectName}" project. 
Provide helpful, structured content based on the user's request. Focus on practical, actionable information.`;

      // Send message to agent
      // The agent will handle the conversation and call onDidUpdateMessages callback
      // which will save the conversation via ConversationManager
      await agent.chat(
        prompt,
        [], // No context files for build mode
        {}, // Default settings
        systemPrompt,
        false // Not a persona chat
      );

      // Retrieve the generated content from the saved conversation
      const conversation = await this.agentManager['config'].conversationManager.getConversation(conversationId);

      if (conversation && conversation.messages.length > 0) {
        // Get the last model response
        const modelMessages = conversation.messages.filter((msg: any) => msg.role === 'model');
        if (modelMessages.length > 0) {
          const lastModelMessage = modelMessages[modelMessages.length - 1];
          generatedContent = lastModelMessage.text || '';
        }
      }

      // If we have a progress callback and content, call it with the full content
      if (onProgress && generatedContent) {
        onProgress(generatedContent);
      }

      console.log('[BuildModeService] Stage content generated successfully:', {
        projectName,
        stage,
        conversationId,
        contentLength: generatedContent.length,
      });

      return generatedContent;
    } catch (error: any) {
      console.error('[BuildModeService] Failed to generate stage content:', {
        projectName,
        stage,
        conversationId,
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to generate content for stage "${stage}": ${error.message}`);
    } finally {
      // Always dispose the agent after content generation completes
      if (agent) {
        try {
          await this.agentManager.disposeAgent(conversationId);
          console.log('[BuildModeService] Build-mode agent disposed:', {
            projectName,
            stage,
            conversationId,
          });
        } catch (disposeError: any) {
          console.error('[BuildModeService] Error disposing build-mode agent:', {
            conversationId,
            error: disposeError.message,
          });
        }
      }
    }
  }

  /**
   * Generate features by simulating interviews with personas
   * Validates: Requirements 10.1, 10.2, 10.3, 10.4
   */
  async generateFeaturesFromInterviews(
    projectName: string,
    idea: string,
    personas: Persona[],
    onProgress?: (chunk: string) => void
  ): Promise<any> {
    console.log('[BuildModeService] Starting feature generation from interviews:', {
      projectName,
      personaCount: personas.length,
    });

    const surveyResponses: any[] = [];
    const totalSteps = personas.length + 1; // +1 for consolidation
    let currentStep = 0;

    // 1. Interview each persona
    for (const persona of personas) {
      currentStep++;
      const stepMsg = `Interviewing ${persona.name} (${currentStep}/${totalSteps})...`;
      onProgress?.(JSON.stringify({ step: stepMsg, complete: false }));

      const conversationId = `interview-${projectName}-${persona.id}-${Date.now()}`;
      try {
        const agent = await this.agentManager.getOrCreateAgent(conversationId, 'build');

        // System prompt simulates the persona
        const systemPrompt = `You are ${persona.name}. 
Occupation: ${persona.attributes.occupation || 'User'}.
Backstory: ${persona.backstory || 'No backstory'}.
Traits: ${JSON.stringify(persona.attributes)}.

Your goal is to evaluate a product idea and provide feature requests based on YOUR specific needs and perspective.
Do not act as an AI assistant. Act as the user.
Product Idea: "${idea}"`;

        const userPrompt = `Based on your needs, list 3-5 specific features you would want in this product.
Also rate the product idea 0-10.
Return ONLY JSON:
{
  "features": [ { "name": "Feature Name", "reason": "Why I need this" } ],
  "score": 8,
  "feedback": "General thoughts on the product value"
}`;

        await agent.chat(userPrompt, [], {}, systemPrompt, false);

        // Retrieve response
        const conversation = await this.agentManager['config'].conversationManager.getConversation(conversationId);
        const lastMsg = conversation?.messages.filter((m: any) => m.role === 'model').pop();

        if (lastMsg && lastMsg.text) {
          // Parse JSON
          const jsonMatch = lastMsg.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          const jsonStr = jsonMatch ? jsonMatch[1] : lastMsg.text;
          try {
            const result = JSON.parse(jsonStr);
            surveyResponses.push({
              personaId: persona.id,
              personaName: persona.name,
              ...result
            });
          } catch (e: any) {
            console.error('Failed to parse interview response', e);
            // Fallback
            surveyResponses.push({
              personaId: persona.id,
              personaName: persona.name,
              error: 'Failed to parse',
              raw: lastMsg.text
            });
          }
        }

      } catch (error) {
        console.error(`Error interviewing ${persona.name}`, error);
      } finally {
        await this.agentManager.disposeAgent(conversationId);
      }
    }

    // 2. Consolidate
    onProgress?.(JSON.stringify({ step: 'Consolidating feedback...', complete: false }));
    const consolidatorId = `consolidate-${projectName}-${Date.now()}`;

    try {
      const agent = await this.agentManager.getOrCreateAgent(consolidatorId, 'build');
      const systemPrompt = `You are a CPTO (Chief Product & Technology Officer). Consolidate user feedback into a feature roadmap.`;

      const prompt = `Product Idea: ${idea}
        
        Survey Results from ${surveyResponses.length} users:
        ${JSON.stringify(surveyResponses, null, 2)}
        
        Task:
        1. Identify the top 5-7 high-impact features requested by the users.
        2. For each feature, explain WHY based on the user feedback (cite the users).
        3. Assign a priority (High/Medium/Low) and development effort.
        4. Include the raw survey responses metadata for each feature if applicable.
        
        Output JSON format:
        {
          "features": [
            {
              "name": "Feature Name",
              "description": "Description including user citations",
              "score": 9,
              "frequency": "High",
              "priority": "High",
              "reasoning": "Why this is important...",
              "surveyResponses": [ { "personaId": "...", "score": 8, "feedback": "..." } ] 
            }
          ],
          "surveyComplete": true
        }`;

      await agent.chat(prompt, [], {}, systemPrompt, false);

      const conversation = await this.agentManager['config'].conversationManager.getConversation(consolidatorId);
      const lastMsg = conversation?.messages.filter((m: any) => m.role === 'model').pop();

      let finalResult = { features: [], surveyComplete: true };
      if (lastMsg && lastMsg.text) {
        const jsonMatch = lastMsg.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : lastMsg.text;
        try {
          finalResult = JSON.parse(jsonStr);
        } catch (e) {
          console.error('Failed to parse consolidation', e);
          // Throwing might be better to trigger retry/error state
          throw new Error('Failed to parse consolidated features');
        }
      }

      // Ensure structure matches expectation
      return finalResult;

    } finally {
      await this.agentManager.disposeAgent(consolidatorId);
    }
  }
}
