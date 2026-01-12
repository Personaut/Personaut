/**
 * BuildModeHandler handles build-mode-related webview messages.
 *
 * Responsibilities:
 * - Route build mode messages to appropriate service methods
 * - Validate input before processing
 * - Handle errors and send responses to webview
 * - Manage streaming content updates
 * - Handle persona generation from demographics
 *
 * Validates: Requirements 5.1, 10.1, 10.2, 9.1, 9.2
 */

import { IFeatureHandler, WebviewMessage } from '../../../shared/types/CommonTypes';
import { InputValidator } from '../../../shared/services/InputValidator';
import { ErrorSanitizer } from '../../../shared/services/ErrorSanitizer';
import { BuildModeService } from '../services/BuildModeService';
import { StageManager, isValidProjectName } from '../services/StageManager';
import { ContentStreamer } from '../services/ContentStreamer';
import { BuildLogManager } from '../services/BuildLogManager';
import { StageName, STAGE_ORDER } from '../types/BuildModeTypes';
import { PersonasService } from '../../personas/services/PersonasService';
import { parseJson, createReparsePrompt } from '../../../shared/utils/JsonParser';

import { WebpackErrorParser } from '../utils/WebpackErrorParser';
import { CodeRepairService } from '../services/CodeRepairService';

export class BuildModeHandler implements IFeatureHandler {
  private readonly errorSanitizer: ErrorSanitizer;

  /** Valid stage names for whitelist validation */
  private readonly VALID_STAGES = [...STAGE_ORDER, 'state', 'personas', 'features', 'stories', 'team'];

  constructor(
    private readonly buildModeService: BuildModeService,
    private readonly stageManager: StageManager,
    _contentStreamer: ContentStreamer,
    _buildLogManager: BuildLogManager,
    private readonly inputValidator: InputValidator,
    private readonly personasService?: PersonasService
  ) {
    this.errorSanitizer = new ErrorSanitizer();
  }

  /**
   * Validate project name to prevent path traversal attacks.
   * @throws Error if project name is invalid or contains path traversal characters
   */
  private validateProjectName(projectName: string): void {
    if (!projectName) {
      throw new Error('Project name is required');
    }
    if (!isValidProjectName(projectName)) {
      throw new Error('Invalid project name format');
    }
    // Additional path traversal protection
    if (projectName.includes('..') || projectName.includes('/') || projectName.includes('\\')) {
      throw new Error('Invalid project name: contains path characters');
    }
  }

  /**
   * Validate stage name against whitelist to prevent path traversal.
   * @throws Error if stage name is not in the whitelist
   */
  private validateStageName(stage: string): void {
    if (!stage) {
      throw new Error('Stage name is required');
    }
    if (!this.VALID_STAGES.includes(stage)) {
      throw new Error(`Invalid stage name: ${stage}`);
    }
  }

  /**
   * Attempt to repair broken JSON using LLM (one attempt only).
   * Called when parseJson fails to extract valid JSON.
   * @param originalText - The text that failed to parse
   * @param error - The parse error message
   * @param projectName - Project name for creating the repair agent
   * @returns Parsed data if successful, null if repair fails
   */
  private async attemptLlmJsonRepair(
    originalText: string,
    error: string,
    projectName: string
  ): Promise<any | null> {
    console.log('[BuildModeHandler] Attempting LLM JSON repair...');

    const repairPrompt = createReparsePrompt(originalText, error);

    try {
      // Use buildModeService to generate content with the repair prompt
      const repairedContent = await this.buildModeService.generateStageContent(
        projectName,
        'json-repair',
        repairPrompt
      );

      if (repairedContent) {
        const repairResult = parseJson(repairedContent);
        if (repairResult.success && repairResult.data) {
          console.log('[BuildModeHandler] LLM JSON repair successful');
          return repairResult.data;
        }
      }

      console.warn('[BuildModeHandler] LLM JSON repair failed - no valid JSON returned');
      return null;
    } catch (repairError: any) {
      console.error('[BuildModeHandler] LLM JSON repair error:', repairError.message);
      return null;
    }
  }

  /**
   * Handle build-mode-related webview messages.
   * Validates: Requirements 10.1, 10.2
   */
  async handle(message: WebviewMessage, webview: any): Promise<void> {
    console.log('[BuildModeHandler] Received message:', message.type);
    try {
      switch (message.type) {
        case 'initialize-project':
          await this.handleInitializeProject(message, webview);
          break;
        case 'save-stage-file':
          await this.handleSaveStageFile(message, webview);
          break;
        case 'load-stage-file':
          await this.handleLoadStageFile(message, webview);
          break;
        case 'generate-content-streaming':
          await this.handleGenerateContent(message, webview);
          break;
        case 'get-build-state':
          await this.handleGetBuildState(message, webview);
          break;
        case 'get-build-log':
        case 'load-build-log':
          await this.handleGetBuildLog(message, webview);
          break;
        case 'append-log-entry':
        case 'append-build-log':
          await this.handleAppendLogEntry(message, webview);
          break;
        case 'complete-stage':
          await this.handleCompleteStage(message, webview);
          break;
        case 'validate-transition':
          await this.handleValidateTransition(message, webview);
          break;
        case 'get-completed-stages':
          await this.handleGetCompletedStages(message, webview);
          break;
        case 'retry-generation':
          await this.handleRetryGeneration(message, webview);
          break;
        case 'check-project-files':
          await this.handleCheckProjectFiles(message, webview);
          break;
        case 'load-build-data':
          await this.handleLoadBuildData(message, webview);
          break;
        case 'save-build-data':
          await this.handleSaveBuildData(message, webview);
          break;
        case 'get-project-history':
          await this.handleGetProjectHistory(message, webview);
          break;
        case 'check-project-name':
          await this.handleCheckProjectName(message, webview);
          break;
        case 'capture-screenshot':
          await this.handleCaptureScreenshot(message, webview);
          break;
        case 'clear-build-context':
          await this.handleClearBuildContext(message, webview);
          break;
        // Iteration data handlers (Task 7)
        case 'save-iteration-feedback':
          await this.handleSaveIterationFeedback(message, webview);
          break;
        case 'save-consolidated-feedback':
          await this.handleSaveConsolidatedFeedback(message, webview);
          break;
        case 'save-screenshot':
          await this.handleSaveScreenshot(message, webview);
          break;
        case 'load-iteration-data':
          await this.handleLoadIterationData(message, webview);
          break;
        case 'save-ux-specs':
          await this.handleSaveUxSpecs(message, webview);
          break;
        case 'save-file-content':
          await this.handleSaveFileContent(message, webview);
          break;
        // Persona generation handlers (Task 12)
        case 'generate-personas-from-demographics':
          await this.handleGeneratePersonasFromDemographics(message, webview);
          break;
        case 'regenerate-single-persona':
          await this.handleRegenerateSinglePersona(message, webview);
          break;
        // User story generation handlers (Task 23)
        case 'generate-user-stories':
          await this.handleGenerateUserStories(message, webview);
          break;
        case 'regenerate-single-story':
          await this.handleRegenerateSingleStory(message, webview);
          break;
        // Design generation handlers (Task 25)
        case 'generate-design':
          await this.handleGenerateDesign(message, webview);
          break;
        case 'regenerate-flows':
          await this.handleRegenerateFlows(message, webview);
          break;
        case 'generate-features-from-interviews':
          await this.handleGenerateFeaturesFromInterviews(message, webview);
          break;
        // Research workflow handler (Task 18)
        case 'start-research-workflow':
          await this.handleStartResearchWorkflow(message, webview);
          break;
        // Feature regeneration handler (Task 14.4)
        case 'regenerate-single-feature':
          await this.handleRegenerateSingleFeature(message, webview);
          break;
        // Building workflow handler (Task 21)
        case 'start-building-workflow':
          await this.handleStartBuildingWorkflow(message, webview);
          break;
        // Workflow pause/resume handlers (Task 21.11)
        case 'pause-building-workflow':
          await this.handlePauseBuildingWorkflow(message, webview);
          break;
        case 'resume-building-workflow':
          await this.handleResumeBuildingWorkflow(message, webview);
          break;
        // Initialize building stage (create folder + init framework)
        case 'initialize-building':
          await this.handleInitializeBuilding(message, webview);
          break;
        // Survey response saving (for individual interview responses)
        case 'save-survey-response':
          await this.handleSaveSurveyResponse(message, webview);
          break;
        // Save page iteration data (UX specs, developer output, feedback, screenshot)
        case 'save-page-iteration':
          await this.handleSavePageIteration(message, webview);
          break;
        // Get active build status (for webview restoration)
        case 'get-active-build-status':
          await this.handleGetActiveBuildStatus(message, webview);
          break;
        // Load all iterations for a page
        case 'load-page-iterations':
          await this.handleLoadPageIterations(message, webview);
          break;
        // Cancel multi-agent operations
        case 'cancel-operation':
          await this.handleCancelOperation(message, webview);
          break;
        // New webview architecture message types (aliases to existing handlers)
        case 'save-stage-data':
          // Alias for save-stage-file with stage and data from message
          message.stage = message.stage || message.dataType;
          await this.handleSaveStageFile(message, webview);
          break;
        case 'load-stage-data':
          // Alias for load-stage-file
          await this.handleLoadStageFile(message, webview);
          break;
        case 'set-project-name':
          // Handle project name setting (just create/initialize if needed)
          if (message.name) {
            message.projectName = message.name;
            await this.handleInitializeProject(message, webview);
          }
          break;
        case 'generate-personas':
          // Generate personas from demographics
          await this.handleGeneratePersonasFromDemographics(message, webview);
          break;
        case 'generate-features':
          // Generate features based on personas
          await this.handleGenerateFeaturesFromInterviews(message, webview);
          break;
        case 'generate-stories':
          // Generate user stories
          await this.handleGenerateUserStories(message, webview);
          break;
        case 'generate-user-flows':
          // Generate user flows only
          await this.handleGenerateUserFlows(message, webview);
          break;
        case 'generate-screens':
          // Generate screens only
          await this.handleGenerateScreens(message, webview);
          break;
        case 'start-build':
          // Start the building workflow
          await this.handleStartBuildingWorkflow(message, webview);
          break;
        case 'stop-build':
          // Pause the building workflow
          await this.handlePauseBuildingWorkflow(message, webview);
          break;
        case 'create-project':
        case 'select-project':
          // Initialize/select a project
          if (message.name) {
            message.projectName = message.name;
            message.projectTitle = message.title || message.name;
          }
          await this.handleInitializeProject(message, webview);
          break;
        case 'load-project':
          // Load an existing project 
          if (message.name) {
            message.projectName = message.name;
          }
          await this.handleGetBuildState(message, webview);
          break;
        case 'delete-project':
          // Delete a project - acknowledge for now (deletion not implemented)
          console.warn(`[BuildModeHandler] Delete project not fully implemented: ${message.name}`);
          webview.postMessage({
            type: 'project-deleted',
            projectName: message.name,
            success: true,
          });
          break;
        case 'start-iteration':
          // Start building iteration
          await this.handleStartBuildingWorkflow(message, webview);
          break;
        case 'stop-iteration':
          // Stop building iteration
          await this.handlePauseBuildingWorkflow(message, webview);
          break;
        default:
          console.warn(`[BuildModeHandler] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      await this.handleError(error, webview, message.type);
    }
  }

  /**
   * Handle initialize project request.
   */
  private async handleInitializeProject(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName) {
      throw new Error('Project name is required');
    }

    // Validate project name
    const validation = this.inputValidator.validateInput(message.projectName);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid project name');
    }

    await this.buildModeService.initializeProject(message.projectName, message.projectTitle);

    webview.postMessage({
      type: 'project-initialized',
      projectName: message.projectName,
      projectTitle: message.projectTitle || message.projectName,
      success: true,
    });
  }

  /**
   * Handle save stage file request.
   */
  private async handleSaveStageFile(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName || !message.stage) {
      throw new Error('Project name and stage are required');
    }

    // Security: Validate inputs to prevent path traversal
    this.validateProjectName(message.projectName);
    this.validateStageName(message.stage);

    let dataToSave = message.data || {};

    // For design stage, merge with existing data to prevent losing pages/userFlows
    if (message.stage === 'design') {
      const existingData = (await this.buildModeService.loadStage(message.projectName, 'design') || {}) as any;
      const newData = dataToSave as any;

      // Only use new pages/userFlows if they are non-empty arrays
      const pagesAreValid = Array.isArray(newData.pages) && newData.pages.length > 0;
      const flowsAreValid = Array.isArray(newData.userFlows) && newData.userFlows.length > 0;

      dataToSave = {
        ...existingData,
        ...newData,
        // Preserve existing pages if new ones are empty
        pages: pagesAreValid ? newData.pages : (existingData.pages || []),
        // Preserve existing flows if new ones are empty
        userFlows: flowsAreValid ? newData.userFlows : (existingData.userFlows || []),
        // Preserve framework
        framework: newData.framework || existingData.framework,
      };

      console.log(`[BuildModeHandler] Design save merge - pages: ${dataToSave.pages?.length}, flows: ${dataToSave.userFlows?.length}`);
    }

    // Initialize screen status fields for building stage
    if (message.stage === 'building' && dataToSave && (dataToSave as any).screens) {
      const screens = (dataToSave as any).screens;
      if (Array.isArray(screens)) {
        (dataToSave as any).screens = screens.map((screen: any) => ({
          ...screen,
          buildStatus: screen.buildStatus || 'pending',
          buildStartTime: screen.buildStartTime || undefined,
          buildEndTime: screen.buildEndTime || undefined,
          buildError: screen.buildError || undefined,
        }));
      }
    }

    await this.buildModeService.saveStage(
      message.projectName,
      message.stage,
      dataToSave,
      message.completed || false
    );

    webview.postMessage({
      type: 'stage-file-saved',
      projectName: message.projectName,
      stage: message.stage,
      completed: message.completed || false,
      success: true,
    });
  }

  /**
   * Handle load stage file request.
   * Returns the full StageFile object (with data, completed, timestamp fields)
   * so the webview can access both content and metadata.
   */
  private async handleLoadStageFile(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName || !message.stage) {
      throw new Error('Project name and stage are required');
    }

    // Security: Validate inputs to prevent path traversal
    this.validateProjectName(message.projectName);
    this.validateStageName(message.stage);

    // Use stageManager.readStageFile directly to get the full StageFile object
    // (not buildModeService.loadStage which only returns the inner data)
    // The webview expects: data.data for content, data.completed for status
    const stageFile = await this.stageManager.readStageFile(message.projectName, message.stage);

    webview.postMessage({
      type: 'stage-file-loaded',
      projectName: message.projectName,
      stage: message.stage,
      data: stageFile, // Full StageFile object with { data, completed, timestamp, stage, version }
    });
  }

  /**
   * Handle generate content streaming request.
   * Uses BuildModeService.generateStageContent to invoke AI agent.
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4
   */
  private async handleGenerateContent(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName || !message.stage || !message.prompt) {
      throw new Error('Project name, stage, and prompt are required');
    }

    // Security: Validate inputs to prevent path traversal
    this.validateProjectName(message.projectName);
    this.validateStageName(message.stage);

    // Validate prompt
    const validation = this.inputValidator.validateInput(message.prompt);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid prompt');
    }

    // Notify webview that generation has started
    webview.postMessage({
      type: 'stream-update',
      stage: message.stage,
      updateType: 'generation-started',
      data: { projectName: message.projectName, stage: message.stage },
      complete: false,
    });

    try {
      // Track generation progress
      let lastProgressUpdate = Date.now();

      // Generate content using BuildModeService
      const generatedContent = await this.buildModeService.generateStageContent(
        message.projectName,
        message.stage,
        message.prompt,
        (chunk: string) => {
          // Send progress updates at most every 100ms to avoid flooding
          const now = Date.now();
          if (now - lastProgressUpdate >= 100) {
            lastProgressUpdate = now;
            webview.postMessage({
              type: 'stream-update',
              stage: message.stage,
              updateType: 'content',
              data: { content: chunk },
              complete: false,
            });
          }
        }
      );

      // Try to parse as JSON if the stage expects structured data
      let parsedData = generatedContent;
      if (message.stage !== 'idea') {
        const parseResult = parseJson(generatedContent);
        if (parseResult.success && parseResult.data) {
          parsedData = parseResult.data;
          if (parseResult.wasRepaired) {
            console.log(`[BuildModeHandler] JSON was repaired for stage ${message.stage}`);
          }
        } else {
          // Initial parse failed - try LLM repair (one attempt)
          console.warn(`[BuildModeHandler] Initial parse failed for stage ${message.stage}: ${parseResult.error}`);
          const repairedData = await this.attemptLlmJsonRepair(
            generatedContent,
            parseResult.error || 'Unknown parse error',
            message.projectName
          );
          if (repairedData) {
            parsedData = repairedData;
            console.log(`[BuildModeHandler] LLM repair succeeded for stage ${message.stage}`);
          } else {
            // Keep as string if repair also failed
            console.warn(`[BuildModeHandler] LLM repair failed, keeping as string for stage ${message.stage}`);
            parsedData = generatedContent;
          }
        }
      }

      // Special handling for design stage - merge with existing data
      if (message.stage === 'design' && typeof parsedData === 'object' && parsedData !== null) {
        // Cast to any for dynamic property access
        const designData = parsedData as any;

        // Load existing design data to merge with
        const existingData = (await this.buildModeService.loadStage(message.projectName, 'design') || {}) as any;

        // Normalize screens to pages key
        if (designData.screens && !designData.pages) {
          designData.pages = designData.screens.map((s: any, i: number) => ({
            id: s.id || `page-${i + 1}-${Date.now()}`,
            name: s.name || `Page ${i + 1}`,
            purpose: s.purpose || s.description || '',
            uiElements: Array.isArray(s.uiElements) ? s.uiElements : [],
            userActions: Array.isArray(s.userActions) ? s.userActions : [],
          }));
          delete designData.screens;
        }

        // Normalize flows key to userFlows (AI might return 'flows' instead of 'userFlows')
        if (designData.flows && !designData.userFlows) {
          designData.userFlows = designData.flows.map((f: any, i: number) => ({
            id: f.id || `flow-${i + 1}-${Date.now()}`,
            name: f.name || `User Flow ${i + 1}`,
            description: f.description || '',
            steps: Array.isArray(f.steps) ? f.steps : [],
          }));
          delete designData.flows;
        }

        // Merge: new data takes precedence, but preserve unmodified fields
        parsedData = {
          ...existingData,
          ...designData,
          // If new data has pages, use them; otherwise keep existing
          pages: designData.pages || existingData.pages || [],
          // If new data has userFlows, use them; otherwise keep existing
          userFlows: designData.userFlows || existingData.userFlows || [],
          // Preserve framework
          framework: designData.framework || existingData.framework,
        };

        console.log(`[BuildModeHandler] Design stage merge - pages: ${(parsedData as any).pages?.length}, flows: ${(parsedData as any).userFlows?.length}`);
      }

      // Save the generated content to the stage file
      await this.buildModeService.saveStage(
        message.projectName,
        message.stage,
        parsedData,
        false  // Not completed yet - user may want to edit
      );

      // Notify webview of successful completion
      webview.postMessage({
        type: 'stream-update',
        stage: message.stage,
        updateType: 'content',
        data: parsedData,
        complete: true,
      });

      console.log(`[BuildModeHandler] Content generation completed for stage ${message.stage}`);
    } catch (error: any) {
      // Log the error
      console.error(`[BuildModeHandler] Content generation failed:`, error);

      // Notify webview of error
      webview.postMessage({
        type: 'stream-update',
        stage: message.stage,
        updateType: 'error',
        data: null,
        complete: true,
        error: this.errorSanitizer.sanitize(error).userMessage,
      });

      // Also save partial content with error marker if available
      try {
        await this.buildModeService.saveStage(
          message.projectName,
          message.stage,
          {
            error: true,
            errorMessage: this.errorSanitizer.sanitize(error).userMessage,
            timestamp: Date.now(),
          },
          false
        );
      } catch (saveError) {
        console.error(`[BuildModeHandler] Failed to save error state:`, saveError);
      }
    }
  }

  /**
   * Handle get build state request.
   */
  private async handleGetBuildState(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName) {
      throw new Error('Project name is required');
    }

    // Security: Validate project name to prevent path traversal
    this.validateProjectName(message.projectName);

    const buildState = await this.buildModeService.getBuildState(message.projectName);

    // If project doesn't exist (files deleted), notify webview to clear stale state
    if (!buildState) {
      webview.postMessage({
        type: 'project-not-found',
        projectName: message.projectName,
      });
      return;
    }

    webview.postMessage({
      type: 'build-state',
      projectName: message.projectName,
      buildState,
    });
  }

  /**
   * Get active build status for webview restoration
   */
  private async handleGetActiveBuildStatus(_message: WebviewMessage, webview: any): Promise<void> {
    const activeBuild = this.buildModeService.getActiveBuildState();

    if (activeBuild) {
      webview.postMessage({
        type: 'active-build-status',
        status: activeBuild,
      });
    } else {
      // No active build
      webview.postMessage({
        type: 'active-build-status',
        status: null,
      });
    }
  }

  /**
   * Handle get build log request.
   */
  private async handleGetBuildLog(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName) {
      throw new Error('Project name is required');
    }

    // Security: Validate project name to prevent path traversal
    this.validateProjectName(message.projectName);

    const buildLog = await this.buildModeService.getBuildLog(message.projectName);

    webview.postMessage({
      type: 'build-log',
      projectName: message.projectName,
      buildLog,
    });
  }

  /**
   * Handle append log entry request.
   */
  private async handleAppendLogEntry(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName || !message.entry) {
      throw new Error('Project name and log entry are required');
    }

    // Security: Validate project name to prevent path traversal
    this.validateProjectName(message.projectName);

    await this.buildModeService.appendLogEntry(message.projectName, message.entry);

    webview.postMessage({
      type: 'log-entry-appended',
      projectName: message.projectName,
      success: true,
    });
  }

  /**
   * Handle complete stage request.
   */
  private async handleCompleteStage(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName || !message.stage) {
      throw new Error('Project name and stage are required');
    }

    // Security: Validate inputs to prevent path traversal
    this.validateProjectName(message.projectName);
    this.validateStageName(message.stage);

    await this.buildModeService.completeStage(message.projectName, message.stage as StageName);

    webview.postMessage({
      type: 'stage-completed',
      projectName: message.projectName,
      stage: message.stage,
      success: true,
    });
  }

  /**
   * Handle validate transition request.
   */
  private async handleValidateTransition(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName || !message.from || !message.to) {
      throw new Error('Project name, from stage, and to stage are required');
    }

    // Security: Validate inputs to prevent path traversal
    this.validateProjectName(message.projectName);
    this.validateStageName(message.from);
    this.validateStageName(message.to);

    const transition = await this.buildModeService.validateTransition(
      message.from,
      message.to,
      message.projectName
    );

    webview.postMessage({
      type: 'transition-validated',
      projectName: message.projectName,
      transition,
    });
  }

  /**
   * Handle get completed stages request.
   */
  private async handleGetCompletedStages(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName) {
      throw new Error('Project name is required');
    }

    // Security: Validate project name to prevent path traversal
    this.validateProjectName(message.projectName);

    const completedStages = await this.buildModeService.getCompletedStages(message.projectName);

    webview.postMessage({
      type: 'completed-stages',
      projectName: message.projectName,
      completedStages,
    });
  }

  /**
   * Handle retry generation request.
   */
  private async handleRetryGeneration(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName || !message.stage) {
      throw new Error('Project name and stage are required');
    }

    // Security: Validate inputs to prevent path traversal
    this.validateProjectName(message.projectName);
    this.validateStageName(message.stage);

    // Acknowledge retry request - actual implementation would re-trigger AI generation
    webview.postMessage({
      type: 'retry-generation-started',
      projectName: message.projectName,
      stage: message.stage,
    });
  }

  /**
   * Handle check project files request.
   */
  private async handleCheckProjectFiles(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName) {
      throw new Error('Project name is required');
    }

    // Security: Validate project name to prevent path traversal
    this.validateProjectName(message.projectName);

    const completedStages = await this.buildModeService.getCompletedStages(message.projectName);

    webview.postMessage({
      type: 'project-files-checked',
      projectName: message.projectName,
      completedStages,
    });
  }

  /**
   * Handle load build data request.
   */
  private async handleLoadBuildData(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName || !message.dataType) {
      throw new Error('Project name and data type are required');
    }

    // Security: Validate inputs to prevent path traversal
    this.validateProjectName(message.projectName);
    this.validateStageName(message.dataType);

    const data = await this.buildModeService.loadStage(message.projectName, message.dataType);

    webview.postMessage({
      type: 'build-data-loaded',
      projectName: message.projectName,
      dataType: message.dataType,
      data,
    });
  }

  /**
   * Handle save build data request.
   */
  private async handleSaveBuildData(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName || !message.dataType) {
      throw new Error('Project name and data type are required');
    }

    // Security: Validate inputs to prevent path traversal
    this.validateProjectName(message.projectName);
    this.validateStageName(message.dataType);

    await this.buildModeService.saveStage(
      message.projectName,
      message.dataType,
      message.data || {},
      false
    );

    webview.postMessage({
      type: 'build-data-saved',
      projectName: message.projectName,
      dataType: message.dataType,
      success: true,
    });
  }

  /**
   * Handle get project history request.
   */
  private async handleGetProjectHistory(_message: WebviewMessage, webview: any): Promise<void> {
    const projects = await this.buildModeService.getProjects();

    webview.postMessage({
      type: 'project-history',
      projects,
    });
  }

  /**
   * Handle check project name request.
   */
  private async handleCheckProjectName(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectTitle) {
      throw new Error('Project title is required');
    }

    // Validate project title input
    const validation = this.inputValidator.validateInput(message.projectTitle, { maxLength: 100 });
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid project title');
    }

    // Sanitize project name from title (secure sanitization)
    const sanitizedName = message.projectTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    // Check if project already exists
    const exists = await this.buildModeService.projectExists(sanitizedName);

    webview.postMessage({
      type: 'project-name-checked',
      projectTitle: message.projectTitle,
      sanitizedName,
      exists,
      valid: sanitizedName.length > 0 && sanitizedName.length <= 50,
    });
  }

  /**
   * Handle capture screenshot request.
   * Starts dev server, waits for it, captures screenshot, then kills server.
   */
  private async handleCaptureScreenshot(message: WebviewMessage, webview: any): Promise<void> {
    const url = message.url || 'http://localhost:5173';
    const projectPath = message.projectPath;

    console.log('[BuildModeHandler] Screenshot capture requested:', { url, projectPath });

    webview.postMessage({
      type: 'screenshot-status',
      status: 'starting',
      message: 'Starting dev server...',
    });

    let devServerProcess: any = null;
    let browser: any = null;

    try {
      const { spawn } = await import('child_process');
      const http = await import('http');
      const fs = await import('fs');
      const path = await import('path');

      // Get the project folder path
      const workspacePath = await this.stageManager.getWorkspacePath();
      const codeFolderName = message.codeFolderName; // Actual code folder name
      const projectName = message.projectName; // Project identifier

      // Project folder is workspace/codeFolderName (or projectPath if absolute)
      let serverCwd = '';

      if (projectPath) {
        // Use explicit project path if provided
        serverCwd = projectPath;
      } else if (codeFolderName) {
        // Use the code folder name (from Design stage)
        serverCwd = path.join(workspacePath, codeFolderName);
      } else if (projectName) {
        // Fallback to project name
        serverCwd = path.join(workspacePath, projectName);
      }

      // NEVER fall back to workspace root - that could be the extension directory!
      if (!serverCwd) {
        throw new Error('Screenshot capture requires a project path, codeFolderName, or projectName. Please ensure the project has been created before capturing screenshots.');
      }

      console.log('[BuildModeHandler] Resolved serverCwd:', { codeFolderName, projectName, projectPath, serverCwd });

      // Verify the path exists and is NOT the extension directory
      if (!fs.existsSync(serverCwd)) {
        throw new Error(`Project folder not found: ${serverCwd}. Has the project been generated yet?`);
      }

      // Safety check: don't run dev server in the extension directory
      const packageJsonPath = path.join(serverCwd, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.name === 'personaut-extension' || packageJson.name === 'personaut') {
          throw new Error('Cannot capture screenshot from the extension directory. Please ensure the correct project folder is selected.');
        }
      }

      console.log('[BuildModeHandler] Starting dev server in:', serverCwd);

      // Check if node_modules exists, if not run npm install first
      const nodeModulesPath = path.join(serverCwd, 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        console.log('[BuildModeHandler] node_modules not found, running npm install...');
        webview.postMessage({
          type: 'screenshot-status',
          status: 'installing',
          message: 'Installing dependencies (npm install)...',
        });

        // Run npm install synchronously
        const { execSync } = await import('child_process');
        try {
          execSync('npm install', {
            cwd: serverCwd,
            stdio: 'pipe',
            env: { ...process.env },
            timeout: 120000, // 2 minute timeout
          });
          console.log('[BuildModeHandler] npm install completed');
        } catch (installError: any) {
          console.error('[BuildModeHandler] npm install failed:', installError.message);
          throw new Error(`npm install failed: ${installError.message}`);
        }
      }

      // Read package.json to find the dev script
      let devCommand = ''; // Will be set if found
      let devPort = 5173; // Vite default
      try {
        const packageJsonPath = path.join(serverCwd, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const scripts = packageJson.scripts || {};

        // Determine the right command and port
        if (scripts.dev) {
          devCommand = 'npm run dev';
          // Check if it's Next.js (port 3000)
          if (scripts.dev.includes('next')) {
            devPort = 3000;
          }
        } else if (scripts.start) {
          devCommand = 'npm run start';
          devPort = 3000;
        } else if (scripts.serve) {
          devCommand = 'npm run serve';
        } else if (scripts.preview) {
          devCommand = 'npm run preview';
          devPort = 4173; // Vite preview port
        }

        if (!devCommand) {
          const availableScripts = Object.keys(scripts).join(', ') || 'none';
          throw new Error(`No dev server script found in package.json. Available scripts: ${availableScripts}. Expected one of: dev, start, serve, or preview.`);
        }

        console.log('[BuildModeHandler] Found dev command:', devCommand, 'expected port:', devPort);
      } catch (e: any) {
        if (e.message.includes('No dev server script found')) {
          throw e; // Re-throw our custom error
        }
        console.log('[BuildModeHandler] Could not read package.json:', e.message);
        // Default to npm run dev but warn
        devCommand = 'npm run dev';
        console.log('[BuildModeHandler] Using default command:', devCommand);
      }

      // Start dev server with detached process - run full command through shell
      console.log('[BuildModeHandler] Running command:', devCommand, 'in', serverCwd);
      devServerProcess = spawn(devCommand, [], {
        cwd: serverCwd,
        shell: true,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env }, // Inherit full environment including PATH
      });

      // Track if process exited early
      let processExited = false;
      let exitError = '';

      devServerProcess.on('error', (err: Error) => {
        console.error('[DevServer] Process error:', err.message);
        processExited = true;
        exitError = err.message;
      });

      // Capture stderr for error reporting
      let stderrOutput = '';

      // Log dev server output
      devServerProcess.stdout?.on('data', (data: Buffer) => {
        console.log('[DevServer]', data.toString().trim());
      });
      devServerProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        console.log('[DevServer stderr]', output);
        stderrOutput += output + '\n';
      });

      devServerProcess.on('exit', (code: number | null) => {
        if (code !== null && code !== 0) {
          console.error('[DevServer] Process exited with code:', code);
          processExited = true;
          // Include stderr in error message for better debugging
          const errorDetails = stderrOutput ? `\nOutput: ${stderrOutput.slice(0, 500)}` : '';
          exitError = `Process exited with code ${code}${errorDetails}`;
        }
      });

      webview.postMessage({
        type: 'screenshot-status',
        status: 'waiting',
        message: 'Waiting for dev server to be ready...',
      });

      // Use port from URL or fallback to detected port
      const serverUrl = new URL(url);
      const port = parseInt(serverUrl.port, 10) || devPort;
      console.log('[BuildModeHandler] Checking server at:', serverUrl.hostname, 'port:', port);

      // Poll until server is ready (max 30 seconds)
      let serverReady = false;
      const startTime = Date.now();
      const timeout = 30000;

      while (Date.now() - startTime < timeout && !serverReady && !processExited) {
        await new Promise(r => setTimeout(r, 1000));
        serverReady = await new Promise<boolean>((resolve) => {
          const req = http.get({
            hostname: serverUrl.hostname,
            port: port,
            path: '/',
            timeout: 2000,
          }, () => resolve(true));
          req.on('error', () => resolve(false));
          req.on('timeout', () => { req.destroy(); resolve(false); });
        });
      }

      if (processExited) {
        throw new Error(`Dev server process failed: ${exitError}`);
      }

      if (!serverReady) {
        throw new Error(`Dev server not responding at ${url} after 30 seconds. Check that 'npm run dev' works in your project.`);
      }

      console.log('[BuildModeHandler] Dev server ready, capturing screenshot...');

      webview.postMessage({
        type: 'screenshot-status',
        status: 'capturing',
        message: 'Capturing screenshot...',
      });

      // Capture screenshot with Puppeteer
      const puppeteer = require('puppeteer');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const screenshotBuffer = await page.screenshot({ type: 'png', fullPage: false });
      const base64Data = screenshotBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Data}`;

      console.log('[BuildModeHandler] Screenshot captured successfully');

      webview.postMessage({
        type: 'screenshot-captured',
        url,
        screenshot: dataUrl,
        projectName: message.projectName,
        screenName: message.screenName,
        iterationNumber: message.iterationNumber,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Screenshot capture error:', error);
      webview.postMessage({
        type: 'screenshot-error',
        error: error.message || 'Failed to capture screenshot',
        url,
      });
    } finally {
      // Always cleanup: kill dev server and close browser
      if (browser) {
        try {
          await browser.close();
          console.log('[BuildModeHandler] Browser closed');
        } catch { /* ignore */ }
      }
      if (devServerProcess) {
        try {
          // Kill the process tree (on macOS/Linux)
          process.kill(-devServerProcess.pid);
        } catch {
          try {
            devServerProcess.kill('SIGTERM');
          } catch { /* ignore */ }
        }
        console.log('[BuildModeHandler] Dev server killed');
      }
    }
  }

  /**
   * Handle clear build context request.
   */
  private async handleClearBuildContext(_message: WebviewMessage, webview: any): Promise<void> {
    // Currently no persistent backend state to clear for the session
    // But we acknowledge the request
    webview.postMessage({
      type: 'build-context-cleared',
    });
  }

  // ==================== Iteration Data Handlers (Task 7) ====================

  /**
   * Validate iteration number.
   * @throws Error if iteration number is invalid
   */
  private validateIterationNumber(iterationNumber: number | undefined): void {
    if (iterationNumber === undefined || iterationNumber === null) {
      throw new Error('Iteration number is required');
    }
    if (!Number.isInteger(iterationNumber) || iterationNumber < 1) {
      throw new Error('Iteration number must be a positive integer');
    }
  }

  /**
   * Handle save iteration feedback request.
   * Validates: Requirements 5.2
   */
  private async handleSaveIterationFeedback(message: WebviewMessage, webview: any): Promise<void> {
    this.validateProjectName(message.projectName);
    this.validateIterationNumber(message.iterationNumber);

    if (!message.feedback || !Array.isArray(message.feedback)) {
      throw new Error('Feedback array is required');
    }

    await this.stageManager.saveIterationFeedback(
      message.projectName,
      message.iterationNumber,
      message.feedback
    );

    webview.postMessage({
      type: 'feedback-saved',
      projectName: message.projectName,
      iterationNumber: message.iterationNumber,
    });
  }

  /**
   * Handle save consolidated feedback request.
   * Validates: Requirements 5.3
   */
  private async handleSaveConsolidatedFeedback(
    message: WebviewMessage,
    webview: any
  ): Promise<void> {
    this.validateProjectName(message.projectName);
    this.validateIterationNumber(message.iterationNumber);

    if (typeof message.markdown !== 'string') {
      throw new Error('Markdown content is required');
    }

    await this.stageManager.saveConsolidatedFeedback(
      message.projectName,
      message.iterationNumber,
      message.markdown
    );

    webview.postMessage({
      type: 'consolidated-feedback-saved',
      projectName: message.projectName,
      iterationNumber: message.iterationNumber,
    });
  }

  /**
   * Handle save screenshot request.
   * Validates: Requirements 5.4
   */
  private async handleSaveScreenshot(message: WebviewMessage, webview: any): Promise<void> {
    this.validateProjectName(message.projectName);
    this.validateIterationNumber(message.iterationNumber);

    if (!message.pageName || typeof message.pageName !== 'string') {
      throw new Error('Page name is required');
    }

    if (!message.data) {
      throw new Error('Screenshot data is required');
    }

    // Convert base64 string to Buffer if needed
    const buffer = Buffer.isBuffer(message.data)
      ? message.data
      : Buffer.from(message.data, 'base64');

    const screenshotPath = await this.stageManager.saveScreenshot(
      message.projectName,
      message.iterationNumber,
      message.pageName,
      buffer
    );

    webview.postMessage({
      type: 'screenshot-saved',
      projectName: message.projectName,
      iterationNumber: message.iterationNumber,
      pageName: message.pageName,
      path: screenshotPath,
    });
  }

  /**
   * Handle load iteration data request.
   * Validates: Requirements 5.5
   */
  private async handleLoadIterationData(message: WebviewMessage, webview: any): Promise<void> {
    this.validateProjectName(message.projectName);
    this.validateIterationNumber(message.iterationNumber);

    const iterationData = await this.stageManager.loadIterationData(
      message.projectName,
      message.iterationNumber
    );

    webview.postMessage({
      type: 'iteration-data-loaded',
      projectName: message.projectName,
      iterationNumber: message.iterationNumber,
      data: iterationData,
    });
  }

  /**
   * Handle save UX specs request.
   * Saves UX design specifications to iteration directory.
   */
  private async handleSaveUxSpecs(message: WebviewMessage, webview: any): Promise<void> {
    this.validateProjectName(message.projectName);
    this.validateIterationNumber(message.iterationNumber);

    if (!message.pageName || typeof message.pageName !== 'string') {
      throw new Error('Page name is required');
    }

    if (!message.specs) {
      throw new Error('UX specs are required');
    }

    // Save UX specs to the iteration directory
    const specsPath = await this.stageManager.saveUxSpecs(
      message.projectName,
      message.iterationNumber,
      message.pageName,
      message.specs
    );

    webview.postMessage({
      type: 'ux-specs-saved',
      projectName: message.projectName,
      iterationNumber: message.iterationNumber,
      pageName: message.pageName,
      path: specsPath,
    });
  }

  /**
   * Handle save file content request.
   * Saves arbitrary file content to the specified path within workspace.
   */
  private async handleSaveFileContent(message: WebviewMessage, webview: any): Promise<void> {
    const { path: filePath, content } = message;

    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path is required');
    }

    if (content === undefined || content === null) {
      throw new Error('File content is required');
    }

    // Security: Only allow saving within .personaut directory
    if (!filePath.startsWith('.personaut/')) {
      throw new Error('Can only save files within .personaut directory');
    }

    // Security: Prevent path traversal
    if (filePath.includes('..')) {
      throw new Error('Path traversal is not allowed');
    }

    try {
      const fs = await import('fs');
      const path = await import('path');
      const vscode = await import('vscode');

      // Get workspace root
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder is open');
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const fullPath = path.join(workspaceRoot, filePath);

      // Ensure directory exists
      const dirPath = path.dirname(fullPath);
      if (!fs.existsSync(dirPath)) {
        await fs.promises.mkdir(dirPath, { recursive: true });
      }

      // Write file
      await fs.promises.writeFile(fullPath, content, 'utf-8');

      console.log(`[BuildModeHandler] Saved file: ${filePath}`);

      webview.postMessage({
        type: 'file-content-saved',
        path: filePath,
        success: true,
      });
    } catch (error: any) {
      console.error(`[BuildModeHandler] Failed to save file ${filePath}:`, error);
      webview.postMessage({
        type: 'file-content-save-error',
        path: filePath,
        error: error.message || 'Failed to save file',
      });
    }
  }

  /**
   * Handle initialize building stage request.
   * Creates the building folder and initializes framework if needed.
   */
  private async handleInitializeBuilding(message: WebviewMessage, webview: any): Promise<void> {
    const { projectName, framework, screens, codeFolderName } = message;

    if (!projectName) {
      throw new Error('Project name is required');
    }

    this.validateProjectName(projectName);

    console.log('[BuildModeHandler] Initializing building stage:', {
      projectName,
      framework: framework || 'react',
      screenCount: screens?.length || 0,
      codeFolderName: codeFolderName || '(workspace root)',
    });

    try {
      // Step 1: Create build folder with page subfolders
      webview.postMessage({
        type: 'building-init-progress',
        step: 'folder',
        status: 'running',
        message: 'Creating build folder and page directories...',
      });

      // Extract page names from screens
      const pageNames = (screens || []).map((s: any) => s.name || `Page ${screens.indexOf(s) + 1}`);
      const buildFolderPath = await this.stageManager.createBuildFolder(projectName, pageNames);

      webview.postMessage({
        type: 'building-init-progress',
        step: 'folder',
        status: 'complete',
        message: `Build folder created with ${pageNames.length} page directories`,
        path: buildFolderPath,
      });

      // Step 2: Determine project path (workspace root or subdirectory)
      const workspacePath = await this.stageManager.getWorkspacePath();
      const fs = await import('fs');
      const path = await import('path');

      // If codeFolderName is provided, create that subdirectory
      let projectPath = workspacePath;
      if (codeFolderName && codeFolderName.trim()) {
        projectPath = path.join(workspacePath, codeFolderName.trim());

        // Create the project subdirectory if it doesn't exist
        if (!fs.existsSync(projectPath)) {
          await fs.promises.mkdir(projectPath, { recursive: true });
          webview.postMessage({
            type: 'building-init-progress',
            step: 'folder',
            status: 'complete',
            message: `Created code folder: ${codeFolderName}/`,
          });
        }
      }

      // Step 3: Check if framework is already initialized in the project path
      webview.postMessage({
        type: 'building-init-progress',
        step: 'framework-check',
        status: 'running',
        message: 'Checking framework initialization...',
      });

      const packageJsonPath = path.join(projectPath, 'package.json');
      const frameworkInitialized = fs.existsSync(packageJsonPath);

      if (frameworkInitialized) {
        // Framework already set up
        webview.postMessage({
          type: 'building-init-progress',
          step: 'framework-check',
          status: 'complete',
          message: 'Framework already initialized',
          frameworkReady: true,
        });
      } else {
        // No package.json - initialize framework
        webview.postMessage({
          type: 'building-init-progress',
          step: 'framework-init',
          status: 'running',
          message: `Initializing ${framework || 'React'} project with Vite...`,
        });

        // Get framework init command - run in project subdirectory if specified
        const initCommand = this.getFrameworkInitCommand(framework || 'react', projectPath);

        if (initCommand) {
          // Execute framework initialization
          const { exec } = await import('child_process');
          const util = await import('util');
          const execPromise = util.promisify(exec);

          try {
            webview.postMessage({
              type: 'building-init-progress',
              step: 'framework-init',
              status: 'running',
              message: `Running: ${initCommand.command}`,
            });

            await execPromise(initCommand.command, {
              cwd: initCommand.cwd,
              timeout: 180000, // 3 minute timeout (some inits are slow)
            });

            webview.postMessage({
              type: 'building-init-progress',
              step: 'framework-init',
              status: 'complete',
              message: `${framework || 'React'} project initialized successfully`,
              frameworkReady: true,
            });
            // Dev server will be started just-in-time during screenshot capture
          } catch (initError: any) {
            console.error('[BuildModeHandler] Framework init failed:', initError.message?.split('\\n')[0] || initError);
            webview.postMessage({
              type: 'building-init-progress',
              step: 'framework-init',
              status: 'skipped', // Use skipped instead of error to not block
              message: `Auto-init skipped. Please set up your ${framework || 'React'} project manually.`,
              frameworkReady: false,
            });
          }
        } else {
          webview.postMessage({
            type: 'building-init-progress',
            step: 'framework-init',
            status: 'skipped',
            message: 'No auto-initialization for this framework. Please set up manually.',
            frameworkReady: false,
          });
        }
      }

      // Dev server will be started just-in-time during screenshot capture (no long-running process)

      // Step 4: Initialize page tracking
      const pageStates = (screens || []).map((screen: any, idx: number) => ({
        id: screen.id || `page-${idx + 1}`,
        name: screen.name || `Page ${idx + 1}`,
        status: idx === 0 ? 'pending' : 'locked', // First page is pending, rest are locked
        currentIteration: 0,
        maxIterations: 5,
        history: [],
      }));

      webview.postMessage({
        type: 'building-initialized',
        projectName,
        buildFolderPath,
        codeFolderName: codeFolderName || null,
        pages: pageStates,
        framework: framework || 'react',
      });

      console.log('[BuildModeHandler] Building stage initialized successfully');

    } catch (error: any) {
      console.error('[BuildModeHandler] Failed to initialize building stage:', error);
      webview.postMessage({
        type: 'building-init-error',
        error: error.message || 'Failed to initialize building stage',
      });
    }
  }

  /**
   * Get the framework initialization command based on selected framework.
   * Uses modern Vite-based tooling for React/Vue.
   */
  private getFrameworkInitCommand(framework: string, workspacePath: string): { command: string; cwd: string } | null {
    // Use Vite for modern React/Vue projects
    const commands: Record<string, string | null> = {
      'react': 'npm create vite@latest . -- --template react-ts',
      'nextjs': 'npx -y create-next-app@latest . --typescript --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm',
      'vue': 'npm create vite@latest . -- --template vue-ts',
      'flutter': 'flutter create .',
      'html': null, // No init needed for plain HTML
    };

    const command = commands[framework.toLowerCase()];
    if (!command) {
      return null;
    }

    return { command, cwd: workspacePath };
  }

  // ==================== Persona Generation Handlers (Task 12) ====================

  /**
   * Generate random value within demographic range.
   */
  private generateRandomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Pick random item from array.
   */
  private pickRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate persona attributes from demographics.
   */
  private generatePersonaAttributes(
    demographics: {
      ageMin?: number;
      ageMax?: number;
      occupations?: string[];
      description?: string;
    },
    index: number
  ): { name: string; attributes: Record<string, string> } {
    // Generate random age within range
    const ageMin = demographics.ageMin || 18;
    const ageMax = demographics.ageMax || 65;
    const age = this.generateRandomInRange(ageMin, ageMax);

    // Pick occupation
    const occupations = demographics.occupations || ['Professional', 'Student', 'Entrepreneur'];
    const occupation = this.pickRandom(occupations);

    // Generate name
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Blake', 'Cameron'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const name = `${this.pickRandom(firstNames)} ${this.pickRandom(lastNames)}`;

    // Build attributes
    const attributes: Record<string, string> = {
      age: String(age),
      occupation,
    };

    // Add description context if provided
    if (demographics.description) {
      attributes.context = demographics.description;
    }

    // Add persona number for variation
    attributes.personaIndex = String(index + 1);

    return { name, attributes };
  }

  /**
   * Handle generate personas from demographics request.
   * Validates: Requirements 9.1, 9.2
   */
  private async handleGeneratePersonasFromDemographics(
    message: WebviewMessage,
    webview: any
  ): Promise<void> {
    if (!this.personasService) {
      throw new Error('PersonasService is not available');
    }

    const demographics = message.demographics || {};
    const count = message.count || 5;

    console.log('[BuildModeHandler] Generating personas from demographics:', {
      demographics,
      count,
    });

    // Notify start
    webview.postMessage({
      type: 'personas-generation-started',
      count,
    });

    const generatedPersonas: any[] = [];

    try {
      for (let i = 0; i < count; i++) {
        // Generate persona attributes
        const { name, attributes } = this.generatePersonaAttributes(demographics, i);

        // Create persona using PersonasService
        const persona = await this.personasService.createPersona({ name, attributes });

        // Send progress update
        webview.postMessage({
          type: 'persona-created',
          index: i,
          persona,
        });

        // Generate backstory for persona
        try {
          const backstory = await this.personasService.generateBackstory(persona.id);

          // Update local persona with backstory
          const updatedPersona = { ...persona, backstory };
          generatedPersonas.push(updatedPersona);

          // Send backstory update
          webview.postMessage({
            type: 'persona-backstory-generated',
            index: i,
            persona: updatedPersona,
          });
        } catch (backstoryError: any) {
          console.error(`[BuildModeHandler] Failed to generate backstory for persona ${i}:`, backstoryError);
          // Still add persona without backstory
          generatedPersonas.push({ ...persona, backstory: '' });

          webview.postMessage({
            type: 'persona-backstory-error',
            index: i,
            persona,
            error: this.errorSanitizer.sanitize(backstoryError).userMessage,
          });
        }
      }

      // Send completion
      webview.postMessage({
        type: 'personas-generated',
        personas: generatedPersonas,
        count: generatedPersonas.length,
      });

      console.log('[BuildModeHandler] Personas generated successfully:', {
        count: generatedPersonas.length,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Failed to generate personas:', error);

      webview.postMessage({
        type: 'personas-generation-error',
        error: this.errorSanitizer.sanitize(error).userMessage,
        partialPersonas: generatedPersonas,
      });
    }
  }

  /**
   * Handle regenerate single persona request.
   * Validates: Requirements 9.5
   */
  private async handleRegenerateSinglePersona(
    message: WebviewMessage,
    webview: any
  ): Promise<void> {
    if (!this.personasService) {
      throw new Error('PersonasService is not available');
    }

    if (!message.personaId) {
      throw new Error('Persona ID is required');
    }

    console.log('[BuildModeHandler] Regenerating persona:', {
      personaId: message.personaId,
    });

    try {
      // Generate new backstory
      const backstory = await this.personasService.generateBackstory(message.personaId);

      // Get updated persona
      const updatedPersona = await this.personasService.getPersonaById(message.personaId);

      webview.postMessage({
        type: 'persona-updated',
        personaId: message.personaId,
        persona: updatedPersona,
        backstory,
      });

      console.log('[BuildModeHandler] Persona regenerated successfully:', {
        personaId: message.personaId,
        backstoryLength: backstory?.length || 0,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Failed to regenerate persona:', error);

      webview.postMessage({
        type: 'persona-regeneration-error',
        personaId: message.personaId,
        error: this.errorSanitizer.sanitize(error).userMessage,
      });
    }
  }

  // ==================== User Story Generation Handlers (Task 23) ====================

  /**
   * System prompt for user story generation.
   */
  private readonly USER_STORY_PROMPT = `You are a UX expert generating user stories. 
For each feature, create a comprehensive user story in the format:
"As a [persona], I want [feature], so that [benefit]"

Each story should include:
- A clear, descriptive title
- The user story description in the standard format
- 3-5 acceptance criteria (testable conditions)
- 2-3 clarifying questions to refine requirements

Output as JSON array with structure:
[{
  "id": "story-1",
  "title": "Story Title",
  "description": "As a user, I want to...",
  "acceptanceCriteria": ["Given..., When..., Then..."],
  "clarifyingQuestions": ["What happens if...?"],
  "featureId": "feature-id",
  "personaId": "persona-id"
}]`;

  /**
   * Handle generate user stories request.
   * Validates: Requirements 13.1, 13.2, 13.3
   */
  private async handleGenerateUserStories(
    message: WebviewMessage,
    webview: any
  ): Promise<void> {
    if (!message.projectName) {
      throw new Error('Project name is required');
    }

    this.validateProjectName(message.projectName);

    const features = message.features || [];
    const personas = message.personas || [];

    console.log('[BuildModeHandler] Generating user stories:', {
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

      const prompt = `Generate user stories for the following features and personas:

FEATURES:
${featureList || 'No features provided'}

PERSONAS:
${personaList || 'No personas provided'}

Generate one user story per feature, considering the perspectives of all personas.`;

      // Use BuildModeService to generate content
      const generatedContent = await this.buildModeService.generateStageContent(
        message.projectName,
        'stories',
        `${this.USER_STORY_PROMPT}\n\n${prompt}`
      );

      // Parse the generated stories
      let stories: any[] = [];
      console.log('[BuildModeHandler] Parsing stories, content length:', generatedContent?.length);
      const parseResult = parseJson(generatedContent);
      console.log('[BuildModeHandler] Parse result:', {
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
        console.log('[BuildModeHandler] Parsed stories count:', stories.length);
        if (parseResult.wasRepaired) {
          console.log(`[BuildModeHandler] JSON was repaired for stories generation`);
        }
      } else {
        // Try LLM repair (one attempt)
        console.warn(`[BuildModeHandler] Initial stories parse failed: ${parseResult.error}`);
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
          console.log(`[BuildModeHandler] LLM repair succeeded for stories`);
        } else {
          // Fallback: create a simple story from the text
          console.warn(`[BuildModeHandler] LLM repair failed, creating fallback story`);
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

      // Save to stage file
      await this.buildModeService.saveStage(
        message.projectName,
        'stories',
        { stories },
        false
      );

      // Send success response
      webview.postMessage({
        type: 'user-stories-generated',
        projectName: message.projectName,
        stories,
      });

      console.log('[BuildModeHandler] User stories generated:', {
        projectName: message.projectName,
        storyCount: stories.length,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Failed to generate user stories:', error);

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
  private async handleRegenerateSingleStory(
    message: WebviewMessage,
    webview: any
  ): Promise<void> {
    if (!message.projectName || !message.storyId) {
      throw new Error('Project name and story ID are required');
    }

    this.validateProjectName(message.projectName);

    console.log('[BuildModeHandler] Regenerating story:', {
      projectName: message.projectName,
      storyId: message.storyId,
    });

    try {
      // Get the context for regeneration
      const feature = message.feature || { name: 'Unknown Feature' };
      const personas = message.personas || [];

      const prompt = `Regenerate this user story with improved clarity and detail:

FEATURE: ${feature.name} - ${feature.description || 'No description'}

PERSONAS:
${personas.map((p: any) => `- ${p.name}`).join('\n') || 'No personas'}

Generate a single improved user story with acceptance criteria and clarifying questions.`;

      const generatedContent = await this.buildModeService.generateStageContent(
        message.projectName,
        'stories',
        `${this.USER_STORY_PROMPT}\n\n${prompt}`
      );

      // Parse the regenerated story
      let updatedStory: any;
      const storyParseResult = parseJson(generatedContent);
      if (storyParseResult.success && storyParseResult.data) {
        const parsed = storyParseResult.data;
        updatedStory = Array.isArray(parsed) ? parsed[0] : parsed;
        if (storyParseResult.wasRepaired) {
          console.log('[BuildModeHandler] JSON was repaired for story regeneration');
        }
      } else {
        console.warn(`[BuildModeHandler] Could not parse story JSON: ${storyParseResult.error}`);
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

      console.log('[BuildModeHandler] Story regenerated:', {
        projectName: message.projectName,
        storyId: message.storyId,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Failed to regenerate story:', error);

      webview.postMessage({
        type: 'story-regeneration-error',
        projectName: message.projectName,
        storyId: message.storyId,
        error: this.errorSanitizer.sanitize(error).userMessage,
      });
    }
  }

  // ==================== Design Generation Handlers (Task 25) ====================

  /**
   * System prompt for design generation.
   */
  private readonly DESIGN_PROMPT = `You are a UX expert generating design specifications.
Based on the user stories and selected framework, generate:
1. User flows showing page navigation paths
2. Key screens/pages with detailed specifications

Output as JSON with structure:
{
  "userFlows": [{
    "id": "flow-1",
    "name": "Flow Name",
    "description": "What this flow achieves",
    "steps": ["Page A", "Page B", "Page C"]
  }],
  "pages": [{
    "id": "page-1",
    "name": "Page Name",
    "purpose": "What the user achieves here",
    "uiElements": ["element1", "element2"],
    "userActions": ["action1", "action2"]
  }]
}`;

  /**
   * Handle generate design request.
   * Validates: Requirements 14.1
   */
  private async handleGenerateDesign(
    message: WebviewMessage,
    webview: any
  ): Promise<void> {
    if (!message.projectName) {
      throw new Error('Project name is required');
    }

    this.validateProjectName(message.projectName);

    const userStories = message.userStories || [];
    const framework = message.framework || 'React';

    console.log('[BuildModeHandler] Generating design:', {
      projectName: message.projectName,
      storyCount: userStories.length,
      framework,
    });

    webview.postMessage({
      type: 'design-generation-started',
      projectName: message.projectName,
    });

    try {
      const storiesList = userStories
        .map((s: any) => `- ${s.title}: ${s.description}`)
        .join('\n');

      const prompt = `Generate design for ${framework} application:

USER STORIES:
${storiesList || 'Standard application workflows'}

FRAMEWORK: ${framework}

Generate user flows and page specifications optimized for ${framework}.`;

      const generatedContent = await this.buildModeService.generateStageContent(
        message.projectName,
        'design',
        `${this.DESIGN_PROMPT}\n\n${prompt}`
      );

      let design: any = { userFlows: [], pages: [] };
      const designParseResult = parseJson(generatedContent);
      if (designParseResult.success && designParseResult.data) {
        design = designParseResult.data;
        if (designParseResult.wasRepaired) {
          console.log(`[BuildModeHandler] JSON was repaired for design generation`);
        }
      } else {
        // Try LLM repair (one attempt)
        console.warn(`[BuildModeHandler] Initial design parse failed: ${designParseResult.error}`);
        const repairedDesign = await this.attemptLlmJsonRepair(
          generatedContent,
          designParseResult.error || 'Unknown parse error',
          message.projectName
        );
        if (repairedDesign) {
          design = repairedDesign;
          console.log(`[BuildModeHandler] LLM repair succeeded for design`);
        } else {
          console.warn(`[BuildModeHandler] LLM repair failed for design, using empty structure`);
          design = { userFlows: [], pages: [] };
        }
      }

      // Normalize flows - handle both 'userFlows' and 'flows' key names from AI responses
      const rawFlows = design.userFlows || design.flows || [];
      design.userFlows = rawFlows.map((flow: any, i: number) => ({
        id: flow.id || `flow-${i + 1}-${Date.now()}`,
        name: flow.name || `User Flow ${i + 1}`,
        description: flow.description || '',
        steps: Array.isArray(flow.steps) ? flow.steps : [],
      }));
      // Remove the 'flows' key if it existed to ensure consistent storage
      delete design.flows;

      // Normalize pages - handle 'pages' or 'screens' key names from AI responses
      const rawPages = design.pages || design.screens || [];
      design.pages = rawPages.map((page: any, i: number) => ({
        id: page.id || `page-${i + 1}-${Date.now()}`,
        name: page.name || `Page ${i + 1}`,
        purpose: page.purpose || page.description || '',
        uiElements: Array.isArray(page.uiElements) ? page.uiElements : (Array.isArray(page.elements) ? page.elements : []),
        userActions: Array.isArray(page.userActions) ? page.userActions : (Array.isArray(page.actions) ? page.actions : []),
      }));
      // Remove the 'screens' key if it existed to ensure consistent storage
      delete design.screens;

      // Save to stage file
      await this.buildModeService.saveStage(
        message.projectName,
        'design',
        { ...design, framework },
        false
      );

      webview.postMessage({
        type: 'design-generated',
        projectName: message.projectName,
        userFlows: design.userFlows,
        pages: design.pages,
        framework,
      });

      console.log('[BuildModeHandler] Design generated:', {
        projectName: message.projectName,
        flowCount: design.userFlows.length,
        pageCount: design.pages.length,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Failed to generate design:', error);

      webview.postMessage({
        type: 'design-generation-error',
        projectName: message.projectName,
        error: this.errorSanitizer.sanitize(error).userMessage,
      });
    }
  }

  /**
   * Handle generate user flows request (flows only, not screens).
   * Validates: Requirements 14.5
   */
  private async handleGenerateUserFlows(
    message: WebviewMessage,
    webview: any
  ): Promise<void> {
    if (!message.projectName) {
      throw new Error('Project name is required');
    }

    this.validateProjectName(message.projectName);

    const screens = message.screens || message.pages || [];

    console.log('[BuildModeHandler] Generating user flows from screens:', {
      projectName: message.projectName,
      screenCount: screens.length,
    });

    webview.postMessage({
      type: 'user-flows-generation-started',
      projectName: message.projectName,
    });

    try {
      // Build detailed screen descriptions
      // Handle both formats: old (uiElements/userActions) and new (components/description)
      const screensList = screens
        .map((s: any) => {
          const description = s.description || s.purpose || 'No description';
          const components = Array.isArray(s.components)
            ? s.components.join(', ')
            : (Array.isArray(s.uiElements) && Array.isArray(s.userActions)
              ? [...s.uiElements, ...s.userActions].join(', ')
              : 'N/A');

          return `- ${s.name}
  Purpose: ${description}
  Available Components/Actions: ${components}`;
        })
        .join('\n\n');

      const prompt = `Generate user flows based on the following screens and their capabilities:

AVAILABLE SCREENS:
${screensList || 'Standard application screens'}

INSTRUCTIONS:
- Create user flows that show how users navigate between these specific screens
- Each flow should reference the actual screen names listed above
- Include the specific user actions available on each screen in the flow steps
- Each flow should describe a complete user journey from start to finish
- The steps should show the sequence: Screen → Action → Next Screen

Return ONLY the userFlows array.`;

      console.log('[BuildModeHandler] About to call generateStageContent for user flows');
      const generatedContent = await this.buildModeService.generateStageContent(
        message.projectName,
        'design',
        `You are generating user flows for an application based on defined screens.

The user has already defined the screens with their UI elements and available actions.
Your job is to create flows that show how users navigate between these screens.

Return a JSON object with a "userFlows" array.

Each flow should have:
- id: unique identifier
- name: flow name
- description: what this flow accomplishes
- steps: array of step descriptions (each step should reference specific screens and actions)

${prompt}`
      );
      console.log('[BuildModeHandler] generateStageContent returned, content length:', generatedContent.length);

      let flows: any[] = [];
      const parseResult = parseJson(generatedContent);
      if (parseResult.success && parseResult.data) {
        const data = parseResult.data;
        flows = data.userFlows || data.flows || [];
        if (parseResult.wasRepaired) {
          console.log('[BuildModeHandler] JSON was repaired for user flows generation');
        }
      } else {
        // Try LLM repair (one attempt)
        console.warn(`[BuildModeHandler] Initial user flows parse failed: ${parseResult.error}`);
        const repairedFlows = await this.attemptLlmJsonRepair(
          generatedContent,
          parseResult.error || 'Unknown parse error',
          message.projectName
        );
        if (repairedFlows) {
          flows = repairedFlows.userFlows || repairedFlows.flows || [];
          console.log(`[BuildModeHandler] LLM repair succeeded for user flows`);
        } else {
          console.warn(`[BuildModeHandler] LLM repair failed for user flows, using empty array`);
          flows = [];
        }
      }

      // Normalize flows
      const normalizedFlows = flows.map((flow: any, i: number) => ({
        id: flow.id || `flow-${i + 1}-${Date.now()}`,
        name: flow.name || `User Flow ${i + 1}`,
        description: flow.description || '',
        steps: Array.isArray(flow.steps) ? flow.steps : [],
      }));

      // Load existing design data and merge (preserve existing pages)
      const existingData = await this.buildModeService.loadStage(message.projectName, 'design');
      const updatedDesign = {
        pages: existingData?.pages || [],
        ...(existingData || {}),
        userFlows: normalizedFlows,
      };

      // Save to stage file
      await this.buildModeService.saveStage(
        message.projectName,
        'design',
        updatedDesign,
        false
      );

      webview.postMessage({
        type: 'user-flows-generated',
        projectName: message.projectName,
        userFlows: normalizedFlows,
      });

      console.log('[BuildModeHandler] User flows generated:', {
        projectName: message.projectName,
        flowCount: normalizedFlows.length,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Failed to generate user flows:', error);

      webview.postMessage({
        type: 'user-flows-generation-error',
        projectName: message.projectName,
        error: this.errorSanitizer.sanitize(error).userMessage,
      });
    }
  }

  /**
   * Handle generate screens request (screens only, not flows).
   * Validates: Requirements 14.6
   */
  private async handleGenerateScreens(
    message: WebviewMessage,
    webview: any
  ): Promise<void> {
    if (!message.projectName) {
      throw new Error('Project name is required');
    }


    this.validateProjectName(message.projectName);

    const userStories = message.stories || message.userStories || [];
    const framework = message.framework || 'React';

    console.log('[BuildModeHandler] Generating screens from user stories:', {
      projectName: message.projectName,
      storyCount: userStories.length,
      framework,
    });

    webview.postMessage({
      type: 'screens-generation-started',
      projectName: message.projectName,
    });

    try {
      const storiesList = userStories
        .map((s: any) => `- ${s.title}: ${s.description || 'No description'}`)
        .join('\n');

      const prompt = `Generate page/screen specifications for ${framework} application:

USER STORIES:
${storiesList || 'Standard application features'}

FRAMEWORK: ${framework}

Generate detailed page specifications showing what screens are needed and what users can do on each screen.
Each screen should have UI elements and user actions defined.
Return ONLY the pages array.`;

      console.log('[BuildModeHandler] About to call generateStageContent for screens');
      const generatedContent = await this.buildModeService.generateStageContent(
        message.projectName,
        'design',
        `You are generating page/screen specifications for a ${framework} application. Return a JSON object with a "pages" array.

Each page should have:
- id: unique identifier
- name: page name
- purpose: what this page does
- uiElements: array of UI components/elements
- userActions: array of possible user actions

${prompt}`
      );
      console.log('[BuildModeHandler] generateStageContent returned for screens, content length:', generatedContent.length);

      let pages: any[] = [];
      const parseResult = parseJson(generatedContent);
      if (parseResult.success && parseResult.data) {
        const data = parseResult.data;
        pages = data.pages || data.screens || [];
      } else {
        console.warn(`[BuildModeHandler] Screens parse failed: ${parseResult.error}`);
      }

      // Normalize pages to match Screen interface
      const normalizedPages = pages.map((page: any, i: number) => {
        const uiElements = Array.isArray(page.uiElements) ? page.uiElements : (Array.isArray(page.elements) ? page.elements : []);
        const userActions = Array.isArray(page.userActions) ? page.userActions : (Array.isArray(page.actions) ? page.actions : []);

        return {
          id: page.id || `page-${i + 1}-${Date.now()}`,
          name: page.name || `Page ${i + 1}`,
          description: page.purpose || page.description || '',
          components: [...uiElements, ...userActions], // Combine UI elements and actions into components
          screenshot: page.screenshot,
          uxSpec: page.uxSpec,
        };
      });

      // Load existing design data and merge (preserve existing flows)
      const existingData = await this.buildModeService.loadStage(message.projectName, 'design');
      const updatedDesign = {
        userFlows: existingData?.userFlows || [],
        ...(existingData || {}),
        pages: normalizedPages,
        framework,
      };

      // Save to stage file
      await this.buildModeService.saveStage(
        message.projectName,
        'design',
        updatedDesign,
        false
      );

      webview.postMessage({
        type: 'screens-generated',
        projectName: message.projectName,
        screens: normalizedPages,
        framework,
      });

      console.log('[BuildModeHandler] Screens generated:', {
        projectName: message.projectName,
        pageCount: normalizedPages.length,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Failed to generate screens:', error);

      webview.postMessage({
        type: 'screens-generation-error',
        projectName: message.projectName,
        error: this.errorSanitizer.sanitize(error).userMessage,
      });
    }
  }

  /**
   * Handle regenerate flows request.
   * Validates: Requirements 14.7
   */
  private async handleRegenerateFlows(
    message: WebviewMessage,
    webview: any
  ): Promise<void> {
    if (!message.projectName) {
      throw new Error('Project name is required');
    }

    this.validateProjectName(message.projectName);

    console.log('[BuildModeHandler] Regenerating flows:', {
      projectName: message.projectName,
    });

    try {
      const userStories = message.userStories || [];
      const storiesList = userStories
        .map((s: any) => `- ${s.title}: ${s.description}`)
        .join('\n');

      const prompt = `Regenerate user flows with improved navigation paths:

USER STORIES:
${storiesList || 'Standard application workflows'}

Generate 3-5 clear user flows showing how users navigate through the application.`;

      const generatedContent = await this.buildModeService.generateStageContent(
        message.projectName,
        'design',
        `${this.DESIGN_PROMPT}\n\n${prompt}`
      );

      let flows: any[] = [];
      const parseResult = parseJson(generatedContent);
      if (parseResult.success && parseResult.data) {
        // Handle both 'userFlows' and 'flows' key names from AI responses
        flows = parseResult.data.userFlows || parseResult.data.flows || [];
        if (parseResult.wasRepaired) {
          console.log(`[BuildModeHandler] JSON was repaired for flows regeneration`);
        }
      } else {
        // Try LLM repair (one attempt)
        console.warn(`[BuildModeHandler] Initial flows parse failed: ${parseResult.error}`);
        const repairedFlows = await this.attemptLlmJsonRepair(
          generatedContent,
          parseResult.error || 'Unknown parse error',
          message.projectName
        );
        if (repairedFlows) {
          flows = repairedFlows.userFlows || repairedFlows.flows || [];
          console.log(`[BuildModeHandler] LLM repair succeeded for flows`);
        } else {
          console.warn(`[BuildModeHandler] LLM repair failed for flows, using empty array`);
          flows = [];
        }
      }

      flows = flows.map((flow: any, i: number) => ({
        id: flow.id || `flow-${i + 1}-${Date.now()}`,
        name: flow.name || `User Flow ${i + 1}`,
        description: flow.description || '',
        steps: Array.isArray(flow.steps) ? flow.steps : [],
      }));

      // Save flows to file - merge with existing design data
      const existingDesign = (await this.buildModeService.loadStage(message.projectName, 'design') || {}) as any;
      await this.buildModeService.saveStage(
        message.projectName,
        'design',
        {
          ...existingDesign,
          userFlows: flows,
        },
        existingDesign.completed || false
      );

      webview.postMessage({
        type: 'flows-updated',
        projectName: message.projectName,
        userFlows: flows,
      });

      console.log('[BuildModeHandler] Flows regenerated and saved:', {
        projectName: message.projectName,
        flowCount: flows.length,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Failed to regenerate flows:', error);

      webview.postMessage({
        type: 'flows-regeneration-error',
        projectName: message.projectName,
        error: this.errorSanitizer.sanitize(error).userMessage,
      });
    }
  }

  /**
   * Handle feature generation from interviews (Task 14)
   */
  private async handleGenerateFeaturesFromInterviews(message: WebviewMessage, webview: any): Promise<void> {
    const { projectName, idea, personas } = message;

    if (!projectName || !idea || !personas || !personas.length) {
      throw new Error('Missing required data for feature generation');
    }

    webview.postMessage({
      type: 'stream-update',
      stage: 'features',
      updateType: 'generation-started',
      data: { projectName, stage: 'features' },
      complete: false,
    });

    try {
      console.log(`[BuildModeHandler] Starting interview workflow with ${personas.length} personas`);
      const result = await this.buildModeService.generateFeaturesFromInterviews(
        projectName,
        idea,
        personas,
        (progressParams: string) => {
          try {
            const p = JSON.parse(progressParams);

            // Send to BUILD OUTPUT panel
            webview.postMessage({
              type: 'build-log',
              projectName,
              entry: {
                timestamp: Date.now(),
                type: 'info',
                message: p.step,
              },
            });

            webview.postMessage({
              type: 'survey-progress-update',
              step: p.step,
              response: p.response, // Forward individual interview response if present
            });

            // If there's an individual response, also log it
            if (p.response) {
              console.log(`[BuildModeHandler] Interview response from ${p.response.personaName}:`,
                p.response.error ? `Error: ${p.response.error}` : 'Success');
            }
          } catch {
            // ignore format errors
          }
        }
      );

      // Save
      await this.buildModeService.saveStage(projectName, 'features', result, false);

      webview.postMessage({
        type: 'features-generated',
        features: result.features, // ✅ Send in 'features' field to match frontend
        surveyComplete: true,
      });

    } catch (error: any) {
      console.error('Feature generation failed', error);
      webview.postMessage({
        type: 'generation-error',
        error: error.message,
      });
    }
  }

  /**
   * Handle start research workflow request (Task 18)
   * Validates: Requirements 11.1, 11.2
   */
  private async handleStartResearchWorkflow(message: WebviewMessage, webview: any): Promise<void> {
    const { projectName, ideaDescription } = message;

    if (!projectName || !ideaDescription) {
      throw new Error('Project name and idea description are required');
    }

    this.validateProjectName(projectName);

    console.log('[BuildModeHandler] Starting research workflow:', {
      projectName,
      ideaDescriptionLength: ideaDescription.length,
    });

    // Notify start
    webview.postMessage({
      type: 'research-workflow-started',
      projectName,
    });

    try {
      const result = await this.buildModeService.executeResearchWorkflow(
        projectName,
        ideaDescription,
        (progressUpdate) => {
          webview.postMessage({
            type: 'research-progress-update',
            ...progressUpdate,
          });
        }
      );

      if (result.success) {
        webview.postMessage({
          type: 'research-workflow-complete',
          projectName,
          report: result.synthesizedReport,
          competitiveAnalysis: result.competitiveAnalysis,
          marketResearch: result.marketResearch,
          userResearch: result.userResearch,
        });
      } else {
        webview.postMessage({
          type: 'research-workflow-error',
          projectName,
          error: result.error || 'Research workflow failed',
        });
      }
    } catch (error: any) {
      console.error('[BuildModeHandler] Research workflow failed:', error);
      webview.postMessage({
        type: 'research-workflow-error',
        projectName,
        error: this.errorSanitizer.sanitize(error).userMessage,
      });
    }
  }

  /**
   * Handle regenerate single feature request (Task 14.4)
   * Validates: Requirements 10.6
   */
  private async handleRegenerateSingleFeature(message: WebviewMessage, webview: any): Promise<void> {
    const { projectName, featureId, surveyData, originalFeature } = message;

    if (!projectName || !featureId) {
      throw new Error('Project name and feature ID are required');
    }

    this.validateProjectName(projectName);

    console.log('[BuildModeHandler] Regenerating feature:', {
      projectName,
      featureId,
    });

    try {
      // Use the consolidator agent to regenerate this specific feature
      const conversationId = `regenerate-feature-${projectName}-${featureId}-${Date.now()}`;
      const agent = await this.buildModeService['agentManager'].getOrCreateAgent(conversationId, 'build');

      const systemPrompt = `You are a CPTO (Chief Product & Technology Officer). 
Your task is to regenerate a single feature description based on user survey data.
Focus on improving clarity, priority assessment, and actionable description.`;

      const prompt = `Regenerate this feature with improved clarity and detail:

ORIGINAL FEATURE:
- Name: ${originalFeature?.name || 'Unknown'}
- Description: ${originalFeature?.description || 'No description'}
- Score: ${originalFeature?.score || 'N/A'}
- Priority: ${originalFeature?.priority || 'N/A'}

${surveyData ? `SURVEY DATA:\n${JSON.stringify(surveyData, null, 2)}` : ''}

Generate an improved feature with:
- Clear, concise name
- Detailed description explaining the value
- Updated priority (High/Medium/Low)
- Score (1-10)
- Frequency of request

Output as JSON:
{
  "id": "${featureId}",
  "name": "Feature Name",
  "description": "Detailed description",
  "score": 8,
  "frequency": "High",
  "priority": "High",
  "reasoning": "Why this priority"
}`;

      await agent.chat(prompt, [], {}, systemPrompt, false);

      // Get the response
      const conversation = await this.buildModeService['agentManager']['config'].conversationManager.getConversation(conversationId);
      const lastMsg = conversation?.messages.filter((m: any) => m.role === 'model').pop();

      let updatedFeature = originalFeature;
      if (lastMsg?.text) {
        const featureParseResult = parseJson(lastMsg.text);
        if (featureParseResult.success && featureParseResult.data) {
          updatedFeature = featureParseResult.data;
          updatedFeature.id = featureId; // Preserve original ID
          if (featureParseResult.wasRepaired) {
            console.log('[BuildModeHandler] JSON was repaired for feature regeneration');
          }
        } else {
          // Try LLM repair (one attempt)
          console.warn('[BuildModeHandler] Initial feature parse failed:', featureParseResult.error);
          const repairedFeature = await this.attemptLlmJsonRepair(
            lastMsg.text,
            featureParseResult.error || 'Unknown parse error',
            projectName
          );
          if (repairedFeature) {
            updatedFeature = repairedFeature;
            updatedFeature.id = featureId; // Preserve original ID
            console.log('[BuildModeHandler] LLM repair succeeded for feature regeneration');
          } else {
            console.warn('[BuildModeHandler] LLM repair failed, keeping original feature');
          }
        }
      }

      await this.buildModeService['agentManager'].disposeAgent(conversationId);

      webview.postMessage({
        type: 'feature-updated',
        projectName,
        featureId,
        feature: updatedFeature,
      });

      console.log('[BuildModeHandler] Feature regenerated:', {
        projectName,
        featureId,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Feature regeneration failed:', error);
      webview.postMessage({
        type: 'feature-regeneration-error',
        projectName,
        featureId,
        error: this.errorSanitizer.sanitize(error).userMessage,
      });
    }
  }

  /**
   * Handle start building workflow request (Task 21)
   * Validates: Requirements 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
   */
  private async handleStartBuildingWorkflow(message: WebviewMessage, webview: any): Promise<void> {
    console.log('[BuildModeHandler] handleStartBuildingWorkflow called with message:', {
      type: message.type,
      projectName: message.projectName,
      hasScreens: !!message.screens,
      hasUserStory: !!message.userStory,
      framework: message.framework,
    });

    const { projectName, userStory, screens, iterationNumber, framework, personas, previousFeedback } = message;

    // Accept either userStory (old flow) or screens (new flow)
    if (!projectName || (!userStory && (!screens || screens.length === 0))) {
      throw new Error('Project name and either user story or screens are required');
    }

    this.validateProjectName(projectName);

    const iteration = iterationNumber || 1;

    console.log('[BuildModeHandler] Starting building workflow:', {
      projectName,
      iteration,
      framework: framework || 'React',
      hasScreens: !!screens,
      hasUserStory: !!userStory,
      screenCount: screens?.length || 0,
    });

    // If screens are provided (new flow), implement screen-based workflow
    if (screens && screens.length > 0 && !userStory) {
      console.log('[BuildModeHandler] Screen-based build workflow requested');

      // Notify start
      webview.postMessage({
        type: 'building-workflow-started',
        projectName,
        iterationNumber: iteration,
      });

      try {
        // Initialize active build state for webview restoration
        this.buildModeService.setActiveBuildState({
          projectName,
          status: 'in-progress',
          currentStep: 0,
          totalSteps: screens.length + 2,
          currentAgent: 'project-init',
          logs: [],
          startTime: Date.now(),
          // Initialize screen-level tracking
          screens: screens.map((screen: { name: string }) => ({
            screenName: screen.name,
            status: 'pending' as const,
          })),
          completedScreens: [],
          isCancelled: false, // Initialize cancellation state
        });

        const totalSteps = screens.length + 2; // Project init + screens + completion
        let currentStep = 0;

        // Set up cancellation handler
        const cancelHandler = () => {
          this.buildModeService.cancelActiveBuild();
          console.log('[BuildModeHandler] Build cancelled by user');
        };

        // Store cancel handler for stop-build message
        (this.buildModeService as any)['cancelBuild'] = cancelHandler;

        // Step 1: Initialize project structure
        currentStep++;
        webview.postMessage({
          type: 'building-progress-update',
          step: currentStep,
          totalSteps,
          agentId: 'project-init',
          status: 'running',
          message: `Initializing ${framework || 'React'} project structure...`,
        });

        // Update active build state
        this.buildModeService.updateActiveBuildProgress(currentStep, totalSteps, 'project-init');

        webview.postMessage({
          type: 'build-log',
          projectName,
          entry: {
            timestamp: Date.now(),
            type: 'info',
            message: `📁 Creating project: ${projectName}`,
          },
        });

        // Create project directory structure in testing folder
        const fs = await import('fs/promises');
        const path = await import('path');

        // Use /Users/anthony/testing/{projectName} for the actual project
        const testingDir = '/Users/anthony/testing';
        const projectPath = path.join(testingDir, projectName);

        console.log('[BuildModeHandler] Creating project at:', projectPath);

        // Create basic directory structure
        const srcPath = path.join(projectPath, 'src');
        const pagesPath = path.join(srcPath, 'pages');
        const componentsPath = path.join(srcPath, 'components');

        await fs.mkdir(srcPath, { recursive: true });
        await fs.mkdir(pagesPath, { recursive: true });
        await fs.mkdir(componentsPath, { recursive: true });

        webview.postMessage({
          type: 'building-progress-update',
          step: currentStep,
          totalSteps,
          agentId: 'project-init',
          status: 'complete',
          message: 'Project structure created',
        });

        // Step 1.5a: Generate package.json
        currentStep++;
        webview.postMessage({
          type: 'building-progress-update',
          step: currentStep,
          totalSteps: totalSteps + 3, // Add 3 more steps for Phase 1
          agentId: 'package-json',
          status: 'in-progress',
          message: 'Generating package.json...',
        });

        const { PackageJsonGenerator } = await import('../services/PackageJsonGenerator');
        const packageGenerator = new PackageJsonGenerator();
        const packageJson = packageGenerator.generate({
          projectName,
          framework: framework || 'react',
          description: `${projectName} - Generated by Personaut Build Mode`,
        });

        await fs.writeFile(
          path.join(projectPath, 'package.json'),
          packageGenerator.stringify(packageJson),
          'utf-8'
        );

        webview.postMessage({
          type: 'build-log',
          projectName,
          entry: {
            timestamp: Date.now(),
            type: 'success',
            message: `✅ package.json created for ${framework}`,
          },
        });

        // Step 1.5b: Install dependencies
        currentStep++;
        webview.postMessage({
          type: 'building-progress-update',
          step: currentStep,
          totalSteps: totalSteps + 3,
          agentId: 'npm-install',
          status: 'in-progress',
          message: 'Installing dependencies...',
        });

        const { DependencyInstaller } = await import('../services/DependencyInstaller');
        const installer = new DependencyInstaller();

        const installResult = await installer.install({
          projectPath,
          onProgress: (message) => {
            webview.postMessage({
              type: 'build-log',
              projectName,
              entry: {
                timestamp: Date.now(),
                type: 'info',
                message: `📦 ${message}`,
              },
            });
          },
          onError: (error) => {
            webview.postMessage({
              type: 'build-log',
              projectName,
              entry: {
                timestamp: Date.now(),
                type: 'error',
                message: `❌ ${error}`,
              },
            });
          },
        });

        if (!installResult.success) {
          throw new Error(`Dependency installation failed: ${installResult.error}`);
        }

        // Check if cancelled after dependency installation
        if (this.buildModeService.isBuildCancelled()) {
          console.log('[BuildModeHandler] Build cancelled after dependency installation');
          return;
        }

        webview.postMessage({
          type: 'build-log',
          projectName,
          entry: {
            timestamp: Date.now(),
            type: 'success',
            message: `✅ Dependencies installed in ${(installResult.duration / 1000).toFixed(1)}s`,
          },
        });

        // Step 1.5c: Create React boilerplate
        currentStep++;
        webview.postMessage({
          type: 'building-progress-update',
          step: currentStep,
          totalSteps: totalSteps + 5, // +5 for boilerplate, dev server, screenshots
          agentId: 'boilerplate',
          status: 'in-progress',
          message: 'Creating React app boilerplate...',
        });

        const { ReactBoilerplateGenerator } = await import('../services/ReactBoilerplateGenerator');
        const boilerplateGen = new ReactBoilerplateGenerator();

        await boilerplateGen.generate({
          projectPath,
          projectName,
          screens: screens.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })),
        });

        webview.postMessage({
          type: 'build-log',
          projectName,
          entry: {
            timestamp: Date.now(),
            type: 'success',
            message: '✅ React app boilerplate created (index.html, App.tsx, routing)',
          },
        });

        // Check if cancelled after boilerplate creation
        const cancelledState = this.buildModeService.isBuildCancelled();
        console.log('[BuildModeHandler] After boilerplate - isCancelled:', cancelledState);
        if (cancelledState) {
          console.log('[BuildModeHandler] Build cancelled after boilerplate creation');
          webview.postMessage({
            type: 'build-log',
            projectName,
            entry: {
              timestamp: Date.now(),
              type: 'warning',
              message: '⚠️ Build was cancelled',
            },
          });
          return;
        }

        // Wait a moment for file system to sync before starting dev server
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 1.5d: Start dev server
        currentStep++;
        webview.postMessage({
          type: 'building-progress-update',
          step: currentStep,
          totalSteps: totalSteps + 5,
          agentId: 'dev-server',
          status: 'in-progress',
          message: 'Starting development server...',
        });

        const { DevServerManager } = await import('../services/DevServerManager');
        const devServer = new DevServerManager();

        const serverResult = await devServer.start({
          projectPath,
          framework: framework || 'react',
          port: 3000,
          timeout: 120000, // 2 minutes for React to compile
          onLog: (message) => {
            webview.postMessage({
              type: 'build-log',
              projectName,
              entry: {
                timestamp: Date.now(),
                type: 'info',
                message: `🚀 ${message}`,
              },
            });
          },
          onReady: () => {
            webview.postMessage({
              type: 'build-log',
              projectName,
              entry: {
                timestamp: Date.now(),
                type: 'success',
                message: `✅ Dev server ready at http://localhost:3000`,
              },
            });
          },
        });

        // Check if cancelled after dev server start
        if (this.buildModeService.isBuildCancelled()) {
          console.log('[BuildModeHandler] Build cancelled after dev server start');
          if (serverResult.success) {
            await devServer.stop();
          }
          return;
        }

        if (!serverResult.success) {
          webview.postMessage({
            type: 'build-log',
            projectName,
            entry: {
              timestamp: Date.now(),
              type: 'warning',
              message: `⚠️ Dev server failed: ${serverResult.error}. Continuing without screenshots.`,
            },
          });
        } else {
          // Store server for cleanup
          (this.buildModeService as any)['activeDevServer'] = devServer;


          // Step 2: Generate code for each screen (one at a time)
          for (let i = 0; i < screens.length; i++) {
            // Check if cancelled
            if (this.buildModeService.isBuildCancelled()) {
              console.log('[BuildModeHandler] Build cancelled, stopping screen generation');
              break;
            }

            const screen = screens[i];
            currentStep++;

            // Update screen status to in-progress
            this.buildModeService.updateScreenStatus(screen.name, 'in-progress');

            webview.postMessage({
              type: 'building-progress-update',
              step: currentStep,
              totalSteps,
              agentId: `screen-${screen.id}`,
              status: 'running',
              message: `Generating code for ${screen.name}...`,
            });

            webview.postMessage({
              type: 'build-log',
              projectName,
              entry: {
                timestamp: Date.now(),
                type: 'info',
                message: `🎨 Generating ${screen.name}`,
              },
            });

            // Generate code using AI
            const codeGenConversationId = `build-screen-${projectName}-${screen.id}-${Date.now()}`;

            try {
              const codeAgent = await this.buildModeService['agentManager'].getOrCreateAgent(
                codeGenConversationId,
                'build'
              );

              const codePrompt = `Generate a ${framework || 'React'} component for this screen:

Screen Name: ${screen.name}
Description: ${screen.description || 'No description'}
Components: ${(screen.components || []).join(', ')}

Requirements:
1. Create a functional component
2. Include all specified UI components
3. Add basic styling (inline or CSS-in-JS)
4. Include proper TypeScript types
5. Add comments explaining key sections
6. Make it responsive and accessible

Return ONLY the code, no explanations.`;

              await codeAgent.chat(codePrompt, [], {},
                `You are a senior ${framework || 'React'} developer. Generate clean, production-ready code.`,
                false
              );

              // Check if cancelled after AI call
              if (this.buildModeService.isBuildCancelled()) {
                await this.buildModeService['agentManager'].disposeAgent(codeGenConversationId);
                break;
              }

              const codeConversation = await this.buildModeService['agentManager']['config']
                .conversationManager.getConversation(codeGenConversationId);
              const codeMsg = codeConversation?.messages.filter((m: any) => m.role === 'model').pop();
              let generatedCode = codeMsg?.text || '';

              // Extract code from markdown code blocks if present
              const codeBlockMatch = generatedCode.match(/```(?:tsx?|jsx?|typescript|javascript)?\n([\s\S]*?)\n```/);
              if (codeBlockMatch) {
                generatedCode = codeBlockMatch[1];
              }

              // Save the generated code
              // Use screen.name to generate filename (matches what addScreenToApp will import)
              const fileName = screen.name
                .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-') + '.tsx';
              const filePath = path.join(pagesPath, fileName);
              await fs.writeFile(filePath, generatedCode, 'utf-8');

              // Update App.tsx to add this screen
              const { ReactBoilerplateGenerator } = await import('../services/ReactBoilerplateGenerator');
              const boilerplateGen = new ReactBoilerplateGenerator();
              await boilerplateGen.addScreenToApp(
                projectPath,
                screen.name,
                i === 0 // isFirstScreen
              );

              webview.postMessage({
                type: 'build-log',
                projectName,
                entry: {
                  timestamp: Date.now(),
                  type: 'info',
                  message: `✅ Updated App.tsx with ${screen.name}`,
                },
              });

              // Check for compilation errors and attempt repair
              const maxRepairAttempts = 3;
              let repairAttempt = 0;
              let finalCode = generatedCode;
              let hasErrors = true;

              while (hasErrors && repairAttempt < maxRepairAttempts) {
                // Wait for webpack to compile
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Get compilation output from dev server
                const compilationOutput = devServer?.getCompilationOutput() || '';

                // Check for errors
                const errors = WebpackErrorParser.parseErrors(compilationOutput);

                if (errors.length > 0 && repairAttempt < maxRepairAttempts) {
                  repairAttempt++;

                  webview.postMessage({
                    type: 'build-log',
                    projectName,
                    entry: {
                      timestamp: Date.now(),
                      type: 'warning',
                      message: `🔧 Compilation errors detected in ${screen.name}, attempting repair (${repairAttempt}/${maxRepairAttempts})...`,
                    },
                  });

                  // Attempt repair
                  const { CodeRepairService } = await import('../services/CodeRepairService');
                  const repairService = new CodeRepairService(this.buildModeService['agentManager']);

                  const repairResult = await repairService.repairCode(
                    finalCode,
                    errors,
                    fileName,
                    1 // Single attempt per loop iteration
                  );

                  if (repairResult.success && repairResult.repairedCode) {
                    finalCode = repairResult.repairedCode;

                    // Save repaired code
                    await fs.writeFile(filePath, finalCode, 'utf-8');

                    webview.postMessage({
                      type: 'build-log',
                      projectName,
                      entry: {
                        timestamp: Date.now(),
                        type: 'success',
                        message: `✅ Code repaired for ${screen.name} (attempt ${repairAttempt})`,
                      },
                    });

                    // Clear compilation output for next check
                    devServer?.clearCompilationOutput();
                  } else {
                    webview.postMessage({
                      type: 'build-log',
                      projectName,
                      entry: {
                        timestamp: Date.now(),
                        type: 'error',
                        message: `❌ Failed to repair ${screen.name}: ${repairResult.error}`,
                      },
                    });
                    break;
                  }
                } else {
                  hasErrors = false;
                }
              }

              if (repairAttempt > 0 && !hasErrors) {
                webview.postMessage({
                  type: 'build-log',
                  projectName,
                  entry: {
                    timestamp: Date.now(),
                    type: 'success',
                    message: `🎉 ${screen.name} successfully repaired after ${repairAttempt} attempt(s)`,
                  },
                });
              }


              // Verify compilation by checking dev server logs
              webview.postMessage({
                type: 'build-log',
                projectName,
                entry: {
                  timestamp: Date.now(),
                  type: 'info',
                  message: `🔍 Verifying {screen.name} compiles...`,
                },
              });

              // Wait a moment for webpack to detect the new file and compile
              await new Promise(resolve => setTimeout(resolve, 3000));

              // Check if dev server is still running (compilation successful)
              // If there were compilation errors, they would appear in dev server logs
              // For now, we'll assume success if we got this far
              // TODO: Parse dev server output for compilation errors

              await this.buildModeService['agentManager'].disposeAgent(codeGenConversationId);

              webview.postMessage({
                type: 'building-progress-update',
                step: currentStep,
                totalSteps,
                agentId: `screen-${screen.id}`,
                status: 'complete',
                message: `${screen.name} generated`,
                output: `Created ${fileName}`,
              });

              webview.postMessage({
                type: 'build-log',
                projectName,
                entry: {
                  timestamp: Date.now(),
                  type: 'success',
                  message: `✅ ${screen.name} → ${fileName}`,
                },
              });

              // Update screen status to complete
              this.buildModeService.updateScreenStatus(screen.name, 'complete');

            } catch (error: any) {
              await this.buildModeService['agentManager'].disposeAgent(codeGenConversationId);

              webview.postMessage({
                type: 'build-log',
                projectName,
                entry: {
                  timestamp: Date.now(),
                  type: 'error',
                  message: `❌ Failed to generate ${screen.name}: ${error.message}`,
                },
              });

              // Update screen status to failed
              this.buildModeService.updateScreenStatus(screen.name, 'failed', error.message);

              // Continue with other screens even if one fails
              console.error(`[BuildModeHandler] Failed to generate screen ${screen.name}:`, error);
            }

            // Wait for webpack to finish compiling all screens
            webview.postMessage({
              type: 'build-log',
              projectName,
              entry: {
                timestamp: Date.now(),
                type: 'info',
                message: '⏳ Waiting for webpack to finish compiling...',
              },
            });
            await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds

            // Step 1.5e: Capture screenshots
            currentStep++;
            webview.postMessage({
              type: 'building-progress-update',
              step: currentStep,
              totalSteps: totalSteps + 5,
              agentId: 'screenshots',
              status: 'in-progress',
              message: 'Capturing screenshots...',
            });

            // Stop the old dev server to clear any cached state
            const oldDevServer = (this.buildModeService as any)['activeDevServer'];
            if (oldDevServer) {
              await oldDevServer.stop();
              delete (this.buildModeService as any)['activeDevServer'];

              webview.postMessage({
                type: 'build-log',
                projectName,
                entry: {
                  timestamp: Date.now(),
                  type: 'info',
                  message: '🔄 Restarting dev server for fresh screenshots...',
                },
              });

              // Wait a moment for port to be released
              await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Start fresh dev server
            const { DevServerManager } = await import('../services/DevServerManager');
            const freshDevServer = new DevServerManager();

            const freshServerResult = await freshDevServer.start({
              projectPath,
              framework: framework || 'react',
              port: 3000,
              timeout: 120000,
              onLog: (message) => {
                webview.postMessage({
                  type: 'build-log',
                  projectName,
                  entry: {
                    timestamp: Date.now(),
                    type: 'info',
                    message: `🚀 ${message}`,
                  },
                });
              },
              onReady: () => {
                webview.postMessage({
                  type: 'build-log',
                  projectName,
                  entry: {
                    timestamp: Date.now(),
                    type: 'success',
                    message: `✅ Fresh dev server ready at http://localhost:3000`,
                  },
                });
              },
            });

            if (!freshServerResult.success) {
              webview.postMessage({
                type: 'build-log',
                projectName,
                entry: {
                  timestamp: Date.now(),
                  type: 'error',
                  message: `❌ Dev server failed to start: ${freshServerResult.error}. Skipping screenshots.`,
                },
              });

              // Continue without screenshots
              webview.postMessage({
                type: 'building-workflow-complete',
                projectName,
                iteration: 1,
              });
              return;
            }

            // Check for compilation errors before capturing screenshots
            const compilationOutput = freshDevServer?.getCompilationOutput() || '';
            if (compilationOutput.includes('Failed to compile') || compilationOutput.includes('ERROR in')) {
              webview.postMessage({
                type: 'build-log',
                projectName,
                entry: {
                  timestamp: Date.now(),
                  type: 'error',
                  message: `❌ Webpack compilation errors detected. Skipping screenshots. Please check the dev server output.`,
                },
              });

              await freshDevServer.stop();

              webview.postMessage({
                type: 'building-workflow-complete',
                projectName,
                iteration: 1,
              });
              return;
            }

            // Store fresh server for cleanup
            (this.buildModeService as any)['activeDevServer'] = freshDevServer;

            const { ScreenshotService } = await import('../services/ScreenshotService');
            const screenshotService = new ScreenshotService();

            try {
              await screenshotService.initialize();

              // Capture screenshot for each screen
              for (let i = 0; i < screens.length; i++) {
                const screen = screens[i];

                webview.postMessage({
                  type: 'build-log',
                  projectName,
                  entry: {
                    timestamp: Date.now(),
                    type: 'info',
                    message: `📸 Capturing screenshot: ${screen.name}`,
                  },
                });

                // Determine route for this screen
                const route = i === 0 ? '/' : `/${screen.name.toLowerCase().replace(/\s+/g, '-')}`;
                const url = `http://localhost:3000${route}`;

                // Capture screenshot
                const screenshotResult = await screenshotService.capture({
                  url,
                  viewport: { width: 1280, height: 720 },
                  waitForTimeout: 3000, // Wait for React to render
                });

                if (screenshotResult.success && screenshotResult.data) {
                  // Save to .personaut/{project}/iterations/{n}/{screen-name}.png
                  const screenshotPath = await this.stageManager.saveScreenshot(
                    projectName,
                    iteration,
                    screen.name,
                    screenshotResult.data
                  );

                  webview.postMessage({
                    type: 'build-log',
                    projectName,
                    entry: {
                      timestamp: Date.now(),
                      type: 'success',
                      message: `✅ Screenshot saved: ${path.basename(screenshotPath)}`,
                    },
                  });

                  // Also save to project screenshots folder for easy access
                  const projectScreenshotDir = path.join(projectPath, 'screenshots');
                  await fs.mkdir(projectScreenshotDir, { recursive: true });
                  await fs.writeFile(
                    path.join(projectScreenshotDir, `${screen.name.toLowerCase().replace(/\s+/g, '-')}.png`),
                    screenshotResult.data
                  );
                } else {
                  webview.postMessage({
                    type: 'build-log',
                    projectName,
                    entry: {
                      timestamp: Date.now(),
                      type: 'warning',
                      message: `⚠️ Screenshot failed for ${screen.name}: ${screenshotResult.error}`,
                    },
                  });
                }
              }

              await screenshotService.close();

              webview.postMessage({
                type: 'building-progress-update',
                step: currentStep,
                totalSteps: totalSteps + 5,
                agentId: 'screenshots',
                status: 'complete',
                message: 'Screenshots captured',
              });
            } catch (error: any) {
              console.error('[BuildModeHandler] Screenshot capture failed:', error);
              webview.postMessage({
                type: 'build-log',
                projectName,
                entry: {
                  timestamp: Date.now(),
                  type: 'warning',
                  message: `⚠️ Screenshot capture failed: ${error.message}`,
                },
              });
            }
          }
        }

        // Step 3: Completion
        currentStep++;
        webview.postMessage({
          type: 'building-progress-update',
          step: currentStep,
          totalSteps,
          agentId: 'completion',
          status: 'complete',
          message: 'Build workflow complete',
        });

        webview.postMessage({
          type: 'build-log',
          projectName,
          entry: {
            timestamp: Date.now(),
            type: 'success',
            message: `🎉 Generated ${screens.length} screens in ${projectPath}`,
          },
        });

        // Save iteration data
        await this.stageManager.writeStageFile(
          projectName,
          'building',
          {
            iteration,
            screens,
            framework,
            projectPath,
            timestamp: Date.now(),
          },
          false
        );

        // Clean up cancel handler
        delete (this.buildModeService as any)['cancelBuild'];

        // Clean up dev server
        const activeDevServer = (this.buildModeService as any)['activeDevServer'];
        if (activeDevServer) {
          activeDevServer.stop();
          delete (this.buildModeService as any)['activeDevServer'];
          webview.postMessage({
            type: 'build-log',
            projectName,
            entry: {
              timestamp: Date.now(),
              type: 'info',
              message: '🛑 Dev server stopped',
            },
          });
        }

        if (this.buildModeService.isBuildCancelled()) {
          webview.postMessage({
            type: 'building-workflow-cancelled',
            projectName,
            iterationNumber: iteration,
          });
        } else {
          // Mark build as complete
          this.buildModeService.completeActiveBuild('complete');

          webview.postMessage({
            type: 'building-workflow-complete',
            projectName,
            iterationNumber: iteration,
            projectPath,
          });

          // Clear active build state after a short delay (allow UI to process)
          setTimeout(() => {
            this.buildModeService.clearActiveBuildState();
          }, 1000);
        }

      } catch (error: any) {
        console.error('[BuildModeHandler] Screen-based build workflow failed:', error);

        // Mark build as failed
        this.buildModeService.completeActiveBuild('failed');

        webview.postMessage({
          type: 'build-log',
          projectName,
          entry: {
            timestamp: Date.now(),
            type: 'error',
            message: `❌ Build failed: ${error.message}`,
          },
        });

        webview.postMessage({
          type: 'building-workflow-error',
          projectName,
          error: this.errorSanitizer.sanitize(error).userMessage,
        });

        // Clear active build state after error
        setTimeout(() => {
          this.buildModeService.clearActiveBuildState();
        }, 1000);
      }

      return;
    }


    // Notify start
    webview.postMessage({
      type: 'building-workflow-started',
      projectName,
      iterationNumber: iteration,
    });

    try {
      const totalSteps = 3 + (personas?.length || 0); // UX + Dev + Feedback per persona
      let currentStep = 0;

      // Step 1: UX Agent - Generate design requirements
      currentStep++;
      webview.postMessage({
        type: 'building-progress-update',
        step: currentStep,
        totalSteps,
        agentId: 'ux-agent',
        status: 'running',
        message: 'UX Designer is creating design requirements...',
      });

      const uxConversationId = `building-ux-${projectName}-${iteration}-${Date.now()}`;
      let designRequirements = '';

      try {
        const uxAgent = await this.buildModeService['agentManager'].getOrCreateAgent(uxConversationId, 'build');

        const uxSystemPrompt = `You are a senior UX Designer. Your task is to create design requirements for a feature implementation.
${previousFeedback ? `\nPrevious iteration feedback to address:\n${previousFeedback}` : ''}

Focus on:
1. UI components and layout
2. User interactions and flows
3. Accessibility requirements
4. Visual design guidelines
5. Error states and edge cases`;

        const uxPrompt = `Create design requirements for this user story:

${userStory.title || userStory}
${userStory.description ? `\nDescription: ${userStory.description}` : ''}
${userStory.acceptanceCriteria ? `\nAcceptance Criteria:\n${userStory.acceptanceCriteria.map((c: string) => `- ${c}`).join('\n')}` : ''}

Framework: ${framework || 'React'}

Provide detailed design requirements including:
1. Component structure
2. Layout specifications
3. User interaction details
4. Responsive behavior
5. Accessibility considerations`;

        await uxAgent.chat(uxPrompt, [], {}, uxSystemPrompt, false);

        const uxConversation = await this.buildModeService['agentManager']['config'].conversationManager.getConversation(uxConversationId);
        const uxLastMsg = uxConversation?.messages.filter((m: any) => m.role === 'model').pop();
        designRequirements = uxLastMsg?.text || '';

        await this.buildModeService['agentManager'].disposeAgent(uxConversationId);

        webview.postMessage({
          type: 'building-progress-update',
          step: currentStep,
          totalSteps,
          agentId: 'ux-agent',
          status: 'complete',
          message: 'Design requirements created',
          output: designRequirements,
        });
      } catch (error: any) {
        await this.buildModeService['agentManager'].disposeAgent(uxConversationId);
        throw new Error(`UX design failed: ${error.message}`);
      }

      // Step 2: Developer Agent - Implement the feature
      currentStep++;
      webview.postMessage({
        type: 'building-progress-update',
        step: currentStep,
        totalSteps,
        agentId: 'developer-agent',
        status: 'running',
        message: 'Developer is implementing the feature...',
      });

      const devConversationId = `building-dev-${projectName}-${iteration}-${Date.now()}`;
      let implementationSummary = '';

      try {
        const devAgent = await this.buildModeService['agentManager'].getOrCreateAgent(devConversationId, 'build');

        const devSystemPrompt = `You are a senior full-stack developer using ${framework || 'React'}.
Your task is to implement a feature based on design requirements.

Provide:
1. File structure and component organization
2. Key code snippets (in code blocks)
3. Implementation notes
4. Testing considerations`;

        const devPrompt = `Implement the following feature based on these design requirements:

USER STORY:
${userStory.title || userStory}

DESIGN REQUIREMENTS:
${designRequirements}

Provide a detailed implementation plan with code examples.`;

        await devAgent.chat(devPrompt, [], {}, devSystemPrompt, false);

        const devConversation = await this.buildModeService['agentManager']['config'].conversationManager.getConversation(devConversationId);
        const devLastMsg = devConversation?.messages.filter((m: any) => m.role === 'model').pop();
        implementationSummary = devLastMsg?.text || '';

        await this.buildModeService['agentManager'].disposeAgent(devConversationId);

        webview.postMessage({
          type: 'building-progress-update',
          step: currentStep,
          totalSteps,
          agentId: 'developer-agent',
          status: 'complete',
          message: 'Implementation complete',
          output: implementationSummary,
        });
      } catch (error: any) {
        await this.buildModeService['agentManager'].disposeAgent(devConversationId);
        throw new Error(`Development failed: ${error.message}`);
      }

      // Step 3: User Feedback Agents - Get feedback from personas
      const feedbackResults: any[] = [];

      if (personas && personas.length > 0) {
        const feedbackPromises = personas.map(async (persona: any) => {
          currentStep++;
          webview.postMessage({
            type: 'building-progress-update',
            step: currentStep,
            totalSteps,
            agentId: `feedback-${persona.id}`,
            status: 'running',
            message: `${persona.name} is reviewing the implementation...`,
          });

          const feedbackConversationId = `building-feedback-${projectName}-${persona.id}-${iteration}-${Date.now()}`;

          try {
            const feedbackAgent = await this.buildModeService['agentManager'].getOrCreateAgent(feedbackConversationId, 'build');

            const feedbackSystemPrompt = `You are ${persona.name}. ${persona.backstory || ''}
You are reviewing a new feature implementation as a potential user.

Provide honest feedback from your perspective:
1. Overall rating (1-10)
2. What works well
3. What needs improvement
4. Specific suggestions
5. Would you use this? Why or why not?`;

            const feedbackPrompt = `Review this implementation:

USER STORY: ${userStory.title || userStory}

DESIGN REQUIREMENTS:
${designRequirements.substring(0, 1000)}...

IMPLEMENTATION:
${implementationSummary.substring(0, 1000)}...

Provide your feedback as JSON:
{
  "rating": 8,
  "positives": ["What works well"],
  "improvements": ["What needs work"],
  "suggestions": ["Specific suggestions"],
  "wouldUse": true,
  "reason": "Why or why not"
}`;

            await feedbackAgent.chat(feedbackPrompt, [], {}, feedbackSystemPrompt, false);

            const feedbackConversation = await this.buildModeService['agentManager']['config'].conversationManager.getConversation(feedbackConversationId);
            const feedbackLastMsg = feedbackConversation?.messages.filter((m: any) => m.role === 'model').pop();

            let feedback: any = { personaId: persona.id, personaName: persona.name, rating: 7 };
            if (feedbackLastMsg?.text) {
              try {
                const jsonMatch = feedbackLastMsg.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
                  feedbackLastMsg.text.match(/\{[\s\S]*\}/);
                const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : feedbackLastMsg.text;
                feedback = { ...feedback, ...JSON.parse(jsonStr) };
              } catch (e) {
                feedback = { ...feedback, raw: feedbackLastMsg.text };
              }
            }

            await this.buildModeService['agentManager'].disposeAgent(feedbackConversationId);

            webview.postMessage({
              type: 'building-progress-update',
              step: currentStep,
              totalSteps,
              agentId: `feedback-${persona.id}`,
              status: 'complete',
              message: `${persona.name} completed review (Rating: ${feedback.rating}/10)`,
            });

            return feedback;
          } catch (error: any) {
            await this.buildModeService['agentManager'].disposeAgent(feedbackConversationId);
            return {
              personaId: persona.id,
              personaName: persona.name,
              error: error.message,
              rating: 0,
            };
          }
        });

        feedbackResults.push(...await Promise.all(feedbackPromises));
      }

      // Calculate aggregated feedback
      const validFeedback = feedbackResults.filter((f) => f.rating > 0);
      const averageRating = validFeedback.length > 0
        ? validFeedback.reduce((sum, f) => sum + f.rating, 0) / validFeedback.length
        : 0;

      const aggregatedFeedback = {
        averageRating: Math.round(averageRating * 10) / 10,
        totalResponses: feedbackResults.length,
        positives: feedbackResults.flatMap((f) => f.positives || []).slice(0, 5),
        improvements: feedbackResults.flatMap((f) => f.improvements || []).slice(0, 5),
        suggestions: feedbackResults.flatMap((f) => f.suggestions || []).slice(0, 5),
      };

      // Save iteration data
      await this.stageManager.saveIterationFeedback(projectName, iteration, feedbackResults);

      // Send completion
      webview.postMessage({
        type: 'building-workflow-complete',
        projectName,
        iterationNumber: iteration,
        designRequirements,
        implementationSummary,
        feedback: feedbackResults,
        aggregatedFeedback,
      });

      console.log('[BuildModeHandler] Building workflow completed:', {
        projectName,
        iteration,
        averageRating: aggregatedFeedback.averageRating,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Building workflow failed:', error);
      webview.postMessage({
        type: 'building-workflow-error',
        projectName,
        iterationNumber: iteration,
        error: this.errorSanitizer.sanitize(error).userMessage,
      });
    }
  }

  /**
   * Handle errors and send sanitized error messages to webview.
   */
  private async handleError(
    error: unknown,
    webview: any,
    messageType: string
  ): Promise<void> {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const sanitizedError = this.errorSanitizer.sanitize(errorObj);

    console.error(`[BuildModeHandler] Error handling ${messageType}:`, error);

    webview.postMessage({
      type: 'error',
      message: sanitizedError.userMessage,
      context: 'build-mode',
    });
  }

  /**
   * Handle pause building workflow request (Task 21.11)
   */
  private async handlePauseBuildingWorkflow(
    message: WebviewMessage,
    webview: any
  ): Promise<void> {
    const { projectName, iterationNumber } = message;
    if (!projectName) {
      throw new Error('Project name is required to pause workflow');
    }

    // Send immediate feedback that stop was requested
    webview.postMessage({
      type: 'build-stopping',
      projectName,
    });

    console.log(`[BuildModeHandler] Stopping building workflow for: ${projectName}`);

    // Trigger cancellation if there's an active build
    if ((this.buildModeService as any)['cancelBuild']) {
      (this.buildModeService as any)['cancelBuild']();
    }

    const pausedAt = Date.now();

    // Save paused state as consolidated feedback (as a marker)
    await this.stageManager.saveConsolidatedFeedback(
      projectName,
      iterationNumber || 1,
      `# Workflow Paused\n\nPaused at: ${new Date(pausedAt).toISOString()}\n\nThis workflow was paused by the user and can be resumed.`
    );

    webview.postMessage({
      type: 'building-workflow-paused',
      projectName,
      pausedAt,
    });

    console.log(`[BuildModeHandler] Building workflow paused for: ${projectName}`);
  }

  /**
   * Handle resume building workflow request (Task 21.11)
   */
  private async handleResumeBuildingWorkflow(
    message: WebviewMessage,
    webview: any
  ): Promise<void> {
    const { projectName, iterationNumber, userStory, framework: _framework, personas: _personas } = message;
    if (!projectName) {
      throw new Error('Project name is required to resume workflow');
    }

    console.log(`[BuildModeHandler] Resuming building workflow for: ${projectName}`);

    // Load the saved workflow state
    const iterationData = await this.stageManager.loadIterationData(
      projectName,
      iterationNumber || 1
    );

    // Check if we have paused state (consolidatedFeedback contains "Workflow Paused")
    const isPaused = iterationData?.consolidatedFeedback?.includes('# Workflow Paused');

    if (!isPaused) {
      webview.postMessage({
        type: 'building-workflow-error',
        error: 'No paused workflow found to resume',
        projectName,
      });
      return;
    }

    webview.postMessage({
      type: 'building-workflow-resumed',
      projectName,
      iterationNumber: iterationNumber || 1,
    });

    // Restart the workflow if we have the user story
    if (userStory) {
      await this.handleStartBuildingWorkflow(
        { ...message, type: 'start-building-workflow' },
        webview
      );
    }

    console.log(`[BuildModeHandler] Building workflow resumed for: ${projectName}`);
  }

  /**
   * Handle save survey response request
   * Saves individual interview responses to the project's survey directory
   */
  private async handleSaveSurveyResponse(
    message: WebviewMessage,
    _webview: any
  ): Promise<void> {
    const { projectName, response } = message;
    if (!projectName || !response) {
      console.warn('[BuildModeHandler] Missing project name or response for save-survey-response');
      return;
    }

    try {
      this.validateProjectName(projectName);

      // Save to survey directory as individual file
      const surveyData = {
        surveys: [response],
      };

      // Append to existing survey data
      const existingData = await this.stageManager.readStageFile(projectName, 'surveys') as any || { surveys: [] };
      if (Array.isArray(existingData.surveys)) {
        existingData.surveys.push(response);
        await this.stageManager.writeStageFile(projectName, 'surveys', existingData, true);
      } else {
        await this.stageManager.writeStageFile(projectName, 'surveys', surveyData, true);
      }

      console.log(
        `[BuildModeHandler] Saved survey response from ${response.personaName || 'unknown'} for project ${projectName}`
      );
    } catch (error: any) {
      console.error('[BuildModeHandler] Failed to save survey response:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Handle cancel operation request
   * Aborts multi-agent operations and disposes running agents
   */
  private async handleCancelOperation(
    message: WebviewMessage,
    webview: any
  ): Promise<void> {
    const { projectName, operationType } = message;

    console.log(`[BuildModeHandler] Cancelling operation: ${operationType} for project: ${projectName}`);

    // Notify webview that operation is cancelled
    webview.postMessage({
      type: 'operation-cancelled',
      projectName,
      operationType,
    });

    webview.postMessage({
      type: 'build-log',
      projectName,
      entry: {
        timestamp: Date.now(),
        type: 'warning',
        message: `${operationType} cancelled by user`,
      },
    });

    console.log(`[BuildModeHandler] Operation ${operationType} cancelled`);
  }

  /**
   * Handle saving page iteration data.
   */
  private async handleSavePageIteration(message: WebviewMessage, webview: any): Promise<void> {
    const { projectName, pageName, iterationNumber, data } = message;

    if (!projectName || !pageName || iterationNumber === undefined) {
      throw new Error('Project name, page name, and iteration number are required');
    }

    this.validateProjectName(projectName);

    console.log('[BuildModeHandler] Saving page iteration:', {
      projectName,
      pageName,
      iterationNumber,
    });

    try {
      const iterDir = await this.stageManager.savePageIterationData(
        projectName,
        pageName,
        iterationNumber,
        data || {}
      );

      webview.postMessage({
        type: 'page-iteration-saved',
        projectName,
        pageName,
        iterationNumber,
        path: iterDir,
      });

      console.log('[BuildModeHandler] Page iteration saved:', {
        projectName,
        pageName,
        iterationNumber,
        path: iterDir,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Failed to save page iteration:', error);
      webview.postMessage({
        type: 'page-iteration-error',
        projectName,
        pageName,
        iterationNumber,
        error: error.message,
      });
    }
  }

  /**
   * Handle loading all iterations for a page.
   */
  private async handleLoadPageIterations(message: WebviewMessage, webview: any): Promise<void> {
    const { projectName, pageName } = message;

    if (!projectName || !pageName) {
      throw new Error('Project name and page name are required');
    }

    this.validateProjectName(projectName);

    console.log('[BuildModeHandler] Loading page iterations:', {
      projectName,
      pageName,
    });

    try {
      const iterations = await this.stageManager.loadPageIterations(projectName, pageName);

      webview.postMessage({
        type: 'page-iterations-loaded',
        projectName,
        pageName,
        iterations,
      });

      console.log('[BuildModeHandler] Page iterations loaded:', {
        projectName,
        pageName,
        count: iterations.length,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Failed to load page iterations:', error);
      webview.postMessage({
        type: 'page-iterations-error',
        projectName,
        pageName,
        error: error.message,
      });
    }
  }
}
