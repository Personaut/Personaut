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

export interface ScreenBuildStatus {
  screenName: string;
  status: 'pending' | 'in-progress' | 'complete' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: string;
}

export interface ActiveBuildState {
  projectName: string;
  status: 'in-progress' | 'complete' | 'failed';
  currentStep: number;
  totalSteps: number;
  currentAgent: string;
  logs: BuildLogEntry[];
  startTime: number;
  // Screen-level tracking
  screens: ScreenBuildStatus[];
  currentScreen?: string;
  completedScreens: string[];
  isCancelled?: boolean; // Persist cancellation state
}

export class BuildModeService {
  private activeBuild: ActiveBuildState | null = null;

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

  /**
   * Get the current active build state (for webview restoration)
   * Now reads from building.json instead of in-memory state
   */
  async getActiveBuildState(projectName?: string): Promise<ActiveBuildState | null> {
    // If no projectName provided, fall back to in-memory state
    if (!projectName) {
      return this.activeBuild;
    }

    // Read from building.json for the specified project
    try {
      const buildingStage = await this.stageManager.readStageFile(projectName, 'building');

      if (buildingStage?.data && buildingStage.data.status === 'in-progress') {
        // Convert building.json data to ActiveBuildState format
        return {
          projectName,
          status: buildingStage.data.status,
          currentStep: buildingStage.data.currentStep || 0,
          totalSteps: buildingStage.data.totalSteps || 0,
          currentAgent: buildingStage.data.currentAgent || 'unknown',
          logs: [], // Logs are stored separately in build-logs.json
          startTime: buildingStage.data.startTime || Date.now(),
          screens: (buildingStage.data.screens || []).map((s: any) => ({
            screenName: s.name || s.id,
            status: buildingStage.data.completedScreens?.includes(s.name || s.id) ? 'complete' : 'pending',
          })),
          currentScreen: buildingStage.data.currentScreen,
          completedScreens: buildingStage.data.completedScreens || [],
          isCancelled: buildingStage.data.isCancelled || false,
        };
      }
    } catch (error) {
      console.error('[BuildModeService] Error reading active build state:', error);
    }

    return null;
  }

  /**
   * Set active build state
   */
  setActiveBuildState(state: ActiveBuildState | null): void {
    this.activeBuild = state;
  }

  /**
   * Update active build progress
   */
  updateActiveBuildProgress(step: number, totalSteps: number, agent: string): void {
    if (this.activeBuild) {
      this.activeBuild.currentStep = step;
      this.activeBuild.totalSteps = totalSteps;
      this.activeBuild.currentAgent = agent;
    }
  }

  /**
   * Add log entry to active build
   */
  addActiveBuildLog(entry: BuildLogEntry): void {
    if (this.activeBuild) {
      this.activeBuild.logs.push(entry);
      // Keep only last 100 logs to avoid memory issues
      if (this.activeBuild.logs.length > 100) {
        this.activeBuild.logs = this.activeBuild.logs.slice(-100);
      }
    }
  }

  /**
   * Complete active build
   */
  completeActiveBuild(status: 'complete' | 'failed'): void {
    if (this.activeBuild) {
      this.activeBuild.status = status;
    }
  }

  /**
   * Update screen status
   */
  updateScreenStatus(screenName: string, status: ScreenBuildStatus['status'], error?: string): void {
    if (this.activeBuild) {
      const screen = this.activeBuild.screens.find(s => s.screenName === screenName);
      if (screen) {
        screen.status = status;
        if (status === 'in-progress') {
          screen.startTime = Date.now();
          this.activeBuild.currentScreen = screenName;
        } else if (status === 'complete') {
          screen.endTime = Date.now();
          if (!this.activeBuild.completedScreens.includes(screenName)) {
            this.activeBuild.completedScreens.push(screenName);
          }
        } else if (status === 'failed' && error) {
          screen.error = error;
          screen.endTime = Date.now();
        }

        // Persist to disk
        this.stageManager.updateBuildingScreenStatus(
          this.activeBuild.projectName,
          screenName, // Use screenName as ID
          status,
          screen.startTime,
          screen.endTime,
          error
        ).catch(err => {
          console.error('[BuildModeService] Failed to persist screen status:', err);
        });
      }
    }
  }

  /**
   * Clear active build state
   */
  clearActiveBuildState(): void {
    this.activeBuild = null;
  }

  /**
   * Check if build is cancelled
   */
  isBuildCancelled(): boolean {
    return this.activeBuild?.isCancelled === true;
  }

  /**
   * Cancel active build
   */
  cancelActiveBuild(): void {
    if (this.activeBuild) {
      this.activeBuild.isCancelled = true;
    }
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
      const conversation =
        await this.agentManager['config'].conversationManager.getConversation(conversationId);

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
      console.log(`[BuildModeService] ${stepMsg}`);
      onProgress?.(JSON.stringify({ step: stepMsg, complete: false }));

      const conversationId = `interview-${projectName}-${persona.id}-${Date.now()}`;
      try {
        console.log(`[BuildModeService] Creating agent for interview: ${conversationId}`);
        const agent = await this.agentManager.getOrCreateAgent(conversationId, 'build');
        console.log(`[BuildModeService] Agent created, starting chat with ${persona.name}`);

        // System prompt simulates the persona speaking naturally
        const systemPrompt = `You are ${persona.name}. 
Occupation: ${persona.attributes.occupation || 'User'}.
Backstory: ${persona.backstory || 'No backstory'}.
Traits: ${JSON.stringify(persona.attributes)}.

You are being interviewed about a new product idea. Respond as a REAL USER would:
- Speak naturally and personally ("I would love...", "For me, the most important thing is...")
- Share your genuine reactions, concerns, and excitement
- Mention specific scenarios from your daily life where this would help
- Be honest about what would make or break this for you
- ${persona.attributes.occupation?.toLowerCase().includes('engineer') || persona.attributes.occupation?.toLowerCase().includes('developer') ? 'You can use technical terms since you are technical.' : 'Avoid technical jargon - speak like a regular user.'}

Do NOT return JSON. Speak conversationally as yourself.
Product Idea: "${idea}"`;

        const userPrompt = `I'd love to hear your thoughts on this product idea. As someone with your background:

1. What's your immediate reaction to this idea?
2. Tell me about 4-5 specific features you'd want to see. For each one, explain WHY it matters to YOU personally.
3. On a scale of 1-10, how excited are you about this? Why?
4. What concerns or hesitations do you have?
5. What would make this a "must-have" for you vs. something you'd skip?

Please be specific about those features - I want to hear about at least 4 things you'd want the product to do. Share your honest thoughts as yourself, ${persona.name}.`;

        console.log(`[BuildModeService] Sending chat request to ${persona.name}...`);
        await agent.chat(userPrompt, [], {}, systemPrompt, false);
        console.log(`[BuildModeService] Chat completed for ${persona.name}`);

        // Retrieve response
        const conversation =
          await this.agentManager['config'].conversationManager.getConversation(conversationId);
        const lastMsg = conversation?.messages.filter((m: any) => m.role === 'model').pop();

        if (lastMsg && lastMsg.text) {
          // Save the raw interview text - no JSON parsing
          // This preserves the authentic voice of each persona
          const response = {
            personaId: persona.id,
            personaName: persona.name,
            personaOccupation: persona.attributes.occupation || 'User',
            timestamp: Date.now(),
            interviewText: lastMsg.text, // Raw natural language response
          };
          surveyResponses.push(response);

          // Progress update with individual response
          onProgress?.(
            JSON.stringify({
              step: `${persona.name} completed interview`,
              complete: false,
              response,
            })
          );
        } else {
          // No response received - log error but continue
          console.error(`No response received from ${persona.name}`);
          const response = {
            personaId: persona.id,
            personaName: persona.name,
            timestamp: Date.now(),
            error: 'No response received',
          };
          surveyResponses.push(response);

          onProgress?.(
            JSON.stringify({
              step: `${persona.name} - no response received`,
              complete: false,
              response,
            })
          );
        }
      } catch (error: any) {
        console.error(`Error interviewing ${persona.name}:`, error.message || error);
        // Still push an error response so we know the interview failed
        surveyResponses.push({
          personaId: persona.id,
          personaName: persona.name,
          timestamp: Date.now(),
          error: error.message || 'Interview failed',
        });

        onProgress?.(
          JSON.stringify({
            step: `${persona.name} interview failed: ${error.message || 'Unknown error'}`,
            complete: false,
          })
        );
      } finally {
        await this.agentManager.disposeAgent(conversationId);
      }
    }

    // 2. Consolidate - Extract structured data from raw interviews
    onProgress?.(JSON.stringify({ step: 'Consolidating feedback...', complete: false }));
    const consolidatorId = `consolidate-${projectName}-${Date.now()}`;

    // Format interviews for the consolidator
    const formattedInterviews = surveyResponses.map((r: any) => {
      if (r.error) {
        return `**${r.personaName}** (${r.personaOccupation || 'User'}): [Interview failed - ${r.error}]`;
      }
      return `**${r.personaName}** (${r.personaOccupation || 'User'}):\n${r.interviewText || r.raw || 'No response'}`;
    }).join('\n\n---\n\n');

    try {
      const agent = await this.agentManager.getOrCreateAgent(consolidatorId, 'build');
      const systemPrompt = `You are a user research analyst. Your job is to read through user interview transcripts and extract key feature requests and insights.`;

      const prompt = `Product Idea: ${idea}
        
USER INTERVIEW TRANSCRIPTS:
${formattedInterviews}

YOUR TASK:
1. Read each user's interview carefully - each user requested 4-5 features
2. Extract ALL features mentioned by each user (expect ~4-5 per user)
3. Group similar features together (same concept, different wording)
4. Rank by how many users mentioned similar features
5. Keep individual variations in the quotes

IMPORTANT: With ${surveyResponses.length} users requesting ~4-5 features each, you should identify approximately ${surveyResponses.length * 4}-${surveyResponses.length * 5} total feature requests, then group similar ones.

For each consolidated feature:
- Quote what EACH user who mentioned it actually said (use their exact words)
- Note all users who mentioned this or similar features
- Higher priority if multiple users want it

Output JSON format:
{
  "features": [
    {
      "name": "Feature Name",
      "description": "What this feature does",
      "score": 9,
      "frequency": "High",
      "priority": "High",
      "mentionedBy": ["Emily", "Alex"],
      "reasoning": "Emily said 'I would love to...' and Alex mentioned 'For me, this is critical because...'",
      "surveyResponses": [
        { "personaId": "1", "personaName": "Emily", "feedback": "Direct quote from their interview..." },
        { "personaId": "2", "personaName": "Alex", "feedback": "Direct quote..." }
      ]
    }
  ],
  "rawInterviews": ${JSON.stringify(surveyResponses)},
  "surveyComplete": true
}`;

      await agent.chat(prompt, [], {}, systemPrompt, false);

      const conversation =
        await this.agentManager['config'].conversationManager.getConversation(consolidatorId);
      const lastMsg = conversation?.messages.filter((m: any) => m.role === 'model').pop();

      let finalResult: any = { features: [], rawInterviews: surveyResponses, surveyComplete: true };
      if (lastMsg && lastMsg.text) {
        // Use robust JSON parsing
        const { parseJson } = await import('../../../shared/utils/JsonParser');
        const parseResult = parseJson(lastMsg.text);
        if (parseResult.success && parseResult.data) {
          finalResult = parseResult.data;
          // Ensure raw interviews are preserved
          finalResult.rawInterviews = surveyResponses;
          if (parseResult.wasRepaired) {
            console.log('[BuildModeService] JSON was repaired for consolidation');
          }
        } else {
          console.error('Failed to parse consolidation:', parseResult.error);
          // Return with raw interviews even if consolidation failed
          finalResult = {
            features: [],
            rawInterviews: surveyResponses,
            surveyComplete: false,
            error: parseResult.error,
          };
        }
      }

      // Ensure structure matches expectation
      return finalResult;
    } finally {
      await this.agentManager.disposeAgent(consolidatorId);
    }
  }

  /**
   * Execute research workflow for idea validation
   * Uses WorkflowOrchestrator with createResearchWorkflow factory
   * Validates: Requirements 11.1, 11.2, 11.4, 11.5
   */
  async executeResearchWorkflow(
    projectName: string,
    ideaDescription: string,
    onProgress?: (update: {
      step: number;
      totalSteps: number;
      agentId: string;
      status: string;
      message: string;
    }) => void
  ): Promise<{
    competitiveAnalysis: string;
    marketResearch: string;
    userResearch: string;
    synthesizedReport: string;
    success: boolean;
    error?: string;
  }> {
    console.log('[BuildModeService] Starting research workflow:', {
      projectName,
      ideaDescriptionLength: ideaDescription.length,
    });

    const result = {
      competitiveAnalysis: '',
      marketResearch: '',
      userResearch: '',
      synthesizedReport: '',
      success: false,
      error: undefined as string | undefined,
    };

    // Create agents for each research role
    const researchAgents = [
      {
        id: 'competitive-analyst',
        role: 'Competitive Analyst',
        systemPrompt: `You are a competitive analysis researcher. Research and analyze products similar to: "${ideaDescription}"

Identify:
1. Direct competitors (same solution)
2. Indirect competitors (alternative solutions)
3. Market leaders in this space

For each competitor, document:
- Product name and brief description
- Key features and differentiators
- Target market and pricing model
- Strengths and weaknesses

Provide a comprehensive competitive landscape analysis.`,
      },
      {
        id: 'market-researcher',
        role: 'Market Researcher',
        systemPrompt: `You are a market research analyst. Research the market opportunity for: "${ideaDescription}"

Analyze:
1. Market size and growth projections
2. Industry trends and drivers
3. Target demographics and segments
4. Regulatory considerations
5. Market maturity and barriers to entry

Provide data-driven insights with estimated market figures where possible.`,
      },
      {
        id: 'user-researcher',
        role: 'User Researcher',
        systemPrompt: `You are a user researcher. Research potential users for: "${ideaDescription}"

Identify:
1. Target user demographics and psychographics
2. Common pain points and unmet needs
3. Current solutions users are using and their frustrations
4. User communities, forums, and gathering places
5. User preferences, behaviors, and buying patterns

Provide actionable insights about who would use this product and why.`,
      },
    ];

    const totalSteps = 4; // 3 research + 1 synthesis
    let currentStep = 0;

    try {
      // Execute research agents in parallel
      const researchPromises = researchAgents.map(async (agentDef) => {
        currentStep++;
        onProgress?.({
          step: currentStep,
          totalSteps,
          agentId: agentDef.id,
          status: 'running',
          message: `${agentDef.role} analyzing...`,
        });

        const conversationId = `research-${projectName}-${agentDef.id}-${Date.now()}`;

        try {
          const agent = await this.agentManager.getOrCreateAgent(conversationId, 'build');

          await agent.chat(
            `Conduct your research and analysis. Be thorough and provide actionable insights.`,
            [],
            {},
            agentDef.systemPrompt,
            false
          );

          // Get the response
          const conversation =
            await this.agentManager['config'].conversationManager.getConversation(conversationId);
          const lastMsg = conversation?.messages.filter((m: any) => m.role === 'model').pop();

          onProgress?.({
            step: currentStep,
            totalSteps,
            agentId: agentDef.id,
            status: 'complete',
            message: `${agentDef.role} complete`,
          });

          return {
            agentId: agentDef.id,
            content: lastMsg?.text || '',
            success: true,
          };
        } catch (error: any) {
          console.error(`[BuildModeService] Research agent ${agentDef.id} failed:`, error);
          return {
            agentId: agentDef.id,
            content: '',
            success: false,
            error: error.message,
          };
        } finally {
          await this.agentManager.disposeAgent(conversationId);
        }
      });

      const researchResults = await Promise.all(researchPromises);

      // Extract results
      for (const res of researchResults) {
        if (res.agentId === 'competitive-analyst') {
          result.competitiveAnalysis = res.content;
        } else if (res.agentId === 'market-researcher') {
          result.marketResearch = res.content;
        } else if (res.agentId === 'user-researcher') {
          result.userResearch = res.content;
        }
      }

      // Synthesis step
      onProgress?.({
        step: totalSteps,
        totalSteps,
        agentId: 'synthesizer',
        status: 'running',
        message: 'Synthesizing research findings...',
      });

      const synthesisId = `synthesis-${projectName}-${Date.now()}`;
      try {
        const synthesisAgent = await this.agentManager.getOrCreateAgent(synthesisId, 'build');

        const synthesisPrompt = `You are a research synthesis expert. Consolidate the following research findings into a comprehensive report.

PRODUCT IDEA: ${ideaDescription}

COMPETITIVE ANALYSIS:
${result.competitiveAnalysis || 'Not available'}

MARKET RESEARCH:
${result.marketResearch || 'Not available'}

USER RESEARCH:
${result.userResearch || 'Not available'}

Create a structured report with these sections:
1. Executive Summary (key takeaways)
2. Competitive Landscape (top 3-5 competitors with analysis)
3. Market Opportunity (size, growth, trends)
4. Target Users (profiles, needs, behaviors)
5. Key Recommendations (what to build, how to differentiate)
6. Risks and Challenges (barriers, threats)

Be specific and actionable in your recommendations.`;

        await synthesisAgent.chat(
          synthesisPrompt,
          [],
          {},
          'You are a senior product strategist synthesizing research into an actionable report.',
          false
        );

        const conversation =
          await this.agentManager['config'].conversationManager.getConversation(synthesisId);
        const lastMsg = conversation?.messages.filter((m: any) => m.role === 'model').pop();

        result.synthesizedReport = lastMsg?.text || '';
        result.success = true;

        onProgress?.({
          step: totalSteps,
          totalSteps,
          agentId: 'synthesizer',
          status: 'complete',
          message: 'Research complete',
        });
      } finally {
        await this.agentManager.disposeAgent(synthesisId);
      }

      // Save research results
      await this.stageManager.writeStageFile(
        projectName,
        'research',
        {
          ideaDescription,
          competitiveAnalysis: result.competitiveAnalysis,
          marketResearch: result.marketResearch,
          userResearch: result.userResearch,
          synthesizedReport: result.synthesizedReport,
          timestamp: Date.now(),
        },
        true
      );

      console.log('[BuildModeService] Research workflow completed:', {
        projectName,
        success: result.success,
      });

      return result;
    } catch (error: any) {
      console.error('[BuildModeService] Research workflow failed:', error);
      result.error = error.message;
      return result;
    }
  }
}
