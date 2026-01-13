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
import { STAGE_ORDER } from '../types/BuildModeTypes';
import { PersonasService } from '../../personas/services/PersonasService';
import { parseJson, createReparsePrompt } from '../../../shared/utils/JsonParser';
import { BuildingWorkflowHandler } from './BuildingWorkflowHandler';
import { FileOperationsHandler } from './operations/FileOperationsHandler';
import { StateManagementHandler } from './operations/StateManagementHandler';
import { PersonaGenerationHandler } from './generation/PersonaGenerationHandler';
import { USER_STORY_PROMPT, DESIGN_PROMPT, CPTO_PROMPT } from '../../../core/prompts/BuildPrompts';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class BuildModeHandler implements IFeatureHandler {
  private readonly errorSanitizer: ErrorSanitizer;
  private readonly buildingWorkflowHandler: BuildingWorkflowHandler;
  private readonly fileOperationsHandler: FileOperationsHandler;
  private readonly stateManagementHandler: StateManagementHandler;
  private readonly personaGenerationHandler: PersonaGenerationHandler;

  /** Valid stage names for whitelist validation */
  private readonly VALID_STAGES = [...STAGE_ORDER, 'state', 'personas', 'features', 'stories', 'team', 'tasks', 'steering', 'export-task-list', 'export-steering-document', 'finalize', 'design'];

  constructor(
    private readonly buildModeService: BuildModeService,
    private readonly stageManager: StageManager,
    _contentStreamer: ContentStreamer,
    _buildLogManager: BuildLogManager,
    private readonly inputValidator: InputValidator,
    private readonly personasService?: PersonasService
  ) {
    this.errorSanitizer = new ErrorSanitizer();
    this.buildingWorkflowHandler = new BuildingWorkflowHandler(
      this.buildModeService,
      this.stageManager,
      this.errorSanitizer
    );
    this.fileOperationsHandler = new FileOperationsHandler(
      this.buildModeService,
      this.stageManager,
      this.errorSanitizer
    );
    this.stateManagementHandler = new StateManagementHandler(
      this.buildModeService,
      this.stageManager,
      this.errorSanitizer
    );
    this.personaGenerationHandler = new PersonaGenerationHandler(
      this.personasService,
      this.errorSanitizer
    );
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
          await this.fileOperationsHandler.handleSaveStageFile(message, webview);
          break;
        case 'load-stage-file':
          await this.fileOperationsHandler.handleLoadStageFile(message, webview);
          break;
        case 'generate-content-streaming':
          await this.handleGenerateContent(message, webview);
          break;
        case 'get-build-state':
          await this.stateManagementHandler.handleGetBuildState(message, webview);
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
          await this.stateManagementHandler.handleCompleteStage(message, webview);
          break;
        case 'validate-transition':
          await this.handleValidateTransition(message, webview);
          break;
        case 'get-completed-stages':
          await this.stateManagementHandler.handleGetCompletedStages(message, webview);
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
          await this.personaGenerationHandler.handleGeneratePersonasFromDemographics(message, webview);
          break;
        case 'regenerate-single-persona':
          await this.personaGenerationHandler.handleRegenerateSinglePersona(message, webview);
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
        // Building workflow handler (Task 21) - Delegated to BuildingWorkflowHandler
        case 'start-building-workflow':
          await this.buildingWorkflowHandler.handleStartBuildingWorkflow(message, webview);
          break;
        // Workflow pause/resume handlers (Task 21.11)
        case 'pause-building-workflow':
          await this.handlePauseBuildingWorkflow(message, webview);
          break;
        case 'resume-building-workflow':
          await this.buildingWorkflowHandler.handleResumeBuildingWorkflow(message, webview);
          break;
        // Initialize building stage (create folder + init framework) - Delegated to BuildingWorkflowHandler
        case 'initialize-building':
          await this.buildingWorkflowHandler.handleInitializeBuilding(message, webview);
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
          await this.stateManagementHandler.handleGetActiveBuildStatus(message, webview);
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
          await this.fileOperationsHandler.handleSaveStageFile(message, webview);
          break;
        case 'load-stage-data':
          // Alias for load-stage-file
          await this.fileOperationsHandler.handleLoadStageFile(message, webview);
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
          await this.personaGenerationHandler.handleGeneratePersonasFromDemographics(message, webview);
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
          // Start the building workflow - Delegated to BuildingWorkflowHandler
          await this.buildingWorkflowHandler.handleStartBuildingWorkflow(message, webview);
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
          // Start building iteration - Delegated to BuildingWorkflowHandler
          await this.buildingWorkflowHandler.handleStartBuildingWorkflow(message, webview);
          break;
        case 'stop-iteration':
          // Stop building iteration
          await this.handlePauseBuildingWorkflow(message, webview);
          break;
        // Design document export handlers (Finalize stage)
        case 'export-document':
          await this.handleExportDocument(message, webview);
          break;
        case 'export-all-documents':
          await this.handleExportAllDocuments(message, webview);
          break;
        case 'view-document':
          await this.handleViewDocument(message, webview);
          break;
        case 'generate-task-list':
          await this.handleGenerateTaskList(message, webview);
          break;
        case 'generate-steering-document':
          await this.handleGenerateSteeringDocument(message, webview);
          break;
        case 'retry-generation':
          // Re-execute the original message that caused the parsing error
          if (message.originalMessage) {
            console.log(`[BuildModeHandler] Retrying generation for stage: ${message.originalMessage.stage}`);
            await this.handle(message.originalMessage, webview);
          }
          break;
        case 'generate-look-and-feel':
          await this.handleGenerateLookAndFeel(message, webview);
          break;
        case 'generate-task-list':
          await this.handleGenerateTaskList(message, webview);
          break;
        case 'generate-steering-document':
          await this.handleGenerateSteeringDocument(message, webview);
          break;
        case 'export-document':
          await this.handleExportDocument(message, webview);
          break;
        case 'export-all-documents':
          await this.handleExportAllDocuments(message, webview);
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
            // Keep as string if repair also failed - notify webview of parsing error
            console.warn(`[BuildModeHandler] LLM repair failed, keeping as string for stage ${message.stage}`);
            parsedData = generatedContent;

            // Send parsing error notification to webview for retry
            webview.postMessage({
              type: 'parsing-error',
              stage: message.stage,
              projectName: message.projectName,
              error: parseResult.error || 'Failed to parse AI response as valid JSON',
              retryable: true,
              originalMessage: message,
            });
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

    // Use completed flag from message, default to true if data exists
    const isCompleted = message.completed !== undefined
      ? message.completed
      : (message.data && Object.keys(message.data).length > 0);

    await this.buildModeService.saveStage(
      message.projectName,
      message.dataType,
      message.data || {},
      isCompleted
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





  // ==================== User Story Generation Handlers (Task 23) ====================



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

    console.log('[BuildModeHandler] Generating user stories per feature:', {
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
      const allStories: any[] = [];
      const personaList = personas
        .map((p: any) => `- ${p.name}: ${p.backstory || 'No backstory'}`)
        .join('\n');

      // Generate stories for EACH feature individually
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];

        console.log(`[BuildModeHandler] Generating stories for feature ${i + 1}/${features.length}: ${feature.name}`);

        // Send progress update
        webview.postMessage({
          type: 'build-log',
          entry: {
            timestamp: Date.now(),
            type: 'info',
            stage: 'stories',
            message: `Generating stories for feature ${i + 1}/${features.length}: ${feature.name}`,
          },
        });

        const featurePrompt = `Generate 2-3 user stories for this SPECIFIC feature:

FEATURE: ${feature.name}
DESCRIPTION: ${feature.description || 'No description provided'}

AVAILABLE PERSONAS:
${personaList || 'No personas provided'}

REQUIREMENTS:
1. Generate exactly 2-3 user stories for this feature
2. Each story should use a different persona from the list above
3. Use the format: "As a [persona name], I want [specific action related to this feature], so that [benefit]"
4. Include 3-5 testable acceptance criteria per story
5. Include 2-3 clarifying questions per story

Output ONLY valid JSON array (no markdown, no code blocks):
[
  {
    "id": "story-${feature.id || `feature-${i + 1}`}-1",
    "title": "Brief descriptive title",
    "description": "As a [persona], I want...",
    "acceptanceCriteria": ["Given..., When..., Then..."],
    "clarifyingQuestions": ["What happens if...?"],
    "priority": "High",
    "featureId": "${feature.id || `feature-${i + 1}`}",
    "featureName": "${feature.name}",
    "personaId": "persona-id-from-list"
  }
]`;

        try {
          const generatedContent = await this.buildModeService.generateStageContent(
            message.projectName,
            'stories',
            `${USER_STORY_PROMPT}\n\n${featurePrompt}`
          );

          // Parse the generated stories for this feature
          const parseResult = parseJson(generatedContent);

          if (parseResult.success && parseResult.data) {
            let featureStories: any[] = [];
            if (Array.isArray(parseResult.data)) {
              featureStories = parseResult.data;
            } else if (parseResult.data.stories && Array.isArray(parseResult.data.stories)) {
              featureStories = parseResult.data.stories;
            }

            // Add feature context to each story
            featureStories = featureStories.map((story: any, idx: number) => ({
              ...story,
              id: story.id || `story-${feature.id || `f${i + 1}`}-${idx + 1}-${Date.now()}`,
              featureId: feature.id || `feature-${i + 1}`,
              featureName: feature.name,
            }));

            allStories.push(...featureStories);
            console.log(`[BuildModeHandler] Generated ${featureStories.length} stories for feature: ${feature.name}`);
          } else {
            // Try LLM repair
            console.warn(`[BuildModeHandler] Parse failed for feature ${feature.name}, attempting repair`);
            const repairedStories = await this.attemptLlmJsonRepair(
              generatedContent,
              parseResult.error || 'Unknown parse error',
              message.projectName
            );

            if (repairedStories) {
              let featureStories: any[] = Array.isArray(repairedStories)
                ? repairedStories
                : (repairedStories.stories || []);

              featureStories = featureStories.map((story: any, idx: number) => ({
                ...story,
                id: story.id || `story-${feature.id || `f${i + 1}`}-${idx + 1}-${Date.now()}`,
                featureId: feature.id || `feature-${i + 1}`,
                featureName: feature.name,
              }));

              allStories.push(...featureStories);
              console.log(`[BuildModeHandler] Repair succeeded, got ${featureStories.length} stories for: ${feature.name}`);
            } else {
              // Create fallback story for this feature
              console.warn(`[BuildModeHandler] Creating fallback story for feature: ${feature.name}`);
              allStories.push({
                id: `story-${feature.id || `f${i + 1}`}-fallback-${Date.now()}`,
                title: `Implement ${feature.name}`,
                description: `As a user, I want ${feature.name.toLowerCase()}, so that I can benefit from this feature.`,
                acceptanceCriteria: ['Feature is implemented and working', 'User can access the feature'],
                clarifyingQuestions: [{ question: 'What are the specific requirements?', answer: '' }],
                featureId: feature.id || `feature-${i + 1}`,
                featureName: feature.name,
              });
            }
          }
        } catch (featureError: any) {
          console.error(`[BuildModeHandler] Error generating stories for feature ${feature.name}:`, featureError);
          // Create fallback story for failed feature
          allStories.push({
            id: `story-${feature.id || `f${i + 1}`}-error-${Date.now()}`,
            title: `Implement ${feature.name}`,
            description: `As a user, I want ${feature.name.toLowerCase()}, so that I can benefit from this feature.`,
            acceptanceCriteria: ['Feature is implemented and working'],
            clarifyingQuestions: [],
            featureId: feature.id || `feature-${i + 1}`,
            featureName: feature.name,
          });
        }
      }

      // Ensure each story has required fields
      const stories = allStories.map((story: any, index: number) => ({
        id: story.id || `story-${index + 1}-${Date.now()}`,
        title: story.title || `User Story ${index + 1}`,
        description: story.description || '',
        requirements: Array.isArray(story.requirements) ? story.requirements : [],
        acceptanceCriteria: Array.isArray(story.acceptanceCriteria)
          ? story.acceptanceCriteria
          : [],
        clarifyingQuestions: Array.isArray(story.clarifyingQuestions)
          ? story.clarifyingQuestions.map((q: any) =>
            typeof q === 'string' ? { question: q, answer: '' } : q
          )
          : [],
        featureId: story.featureId || null,
        featureName: story.featureName || null,
        personaId: story.personaId || null,
        priority: story.priority || 'Medium',
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

      console.log('[BuildModeHandler] User stories generated:', {
        projectName: message.projectName,
        storyCount: stories.length,
        featureCount: features.length,
        avgStoriesPerFeature: (stories.length / features.length).toFixed(1),
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
        `${USER_STORY_PROMPT}\n\n${prompt}`
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
        `${DESIGN_PROMPT}\n\n${prompt}`
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
      // Mark design as complete since it was successfully generated
      await this.buildModeService.saveStage(
        message.projectName,
        'design',
        { ...design, framework },
        true
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
   * Handle generate look and feel request.
   * Interviews personas about visual preferences and generates branding/theming data.
   */
  private async handleGenerateLookAndFeel(
    message: WebviewMessage,
    webview: any
  ): Promise<void> {
    if (!message.projectName) {
      throw new Error('Project name is required');
    }

    this.validateProjectName(message.projectName);

    let personas = message.personas || [];
    const projectTitle = message.projectTitle || message.projectName;

    // If no personas provided, try to load from saved users stage
    if (personas.length === 0) {
      console.log('[BuildModeHandler] No personas in message, loading from saved users stage...');
      try {
        const savedUsersStage = await this.buildModeService.loadStage(message.projectName, 'users');
        if (savedUsersStage?.personas && Array.isArray(savedUsersStage.personas)) {
          personas = savedUsersStage.personas;
          console.log('[BuildModeHandler] Loaded', personas.length, 'personas from saved users stage');
        }
      } catch (loadErr) {
        console.warn('[BuildModeHandler] Could not load personas from users stage:', loadErr);
      }
    }

    console.log('[BuildModeHandler] Generating look and feel:', {
      projectName: message.projectName,
      personaCount: personas.length,
      personaNames: personas.map((p: any) => p.name),
    });

    webview.postMessage({
      type: 'look-and-feel-generation-started',
      projectName: message.projectName,
    });

    try {
      const personaFeedback: string[] = [];

      // Check if we have personas to interview
      if (personas.length === 0) {
        webview.postMessage({
          type: 'build-log',
          entry: {
            timestamp: Date.now(),
            type: 'warning',
            stage: 'design',
            message: 'No personas available. Please generate personas in the Users stage first, or go back and complete that step.',
          },
        });
        webview.postMessage({
          type: 'look-and-feel-generation-error',
          error: 'No personas available. Please complete the Users stage first to generate personas.',
          projectName: message.projectName,
        });
        return;
      }

      // Interview each persona about visual preferences
      for (let i = 0; i < personas.length; i++) {
        const persona = personas[i];

        webview.postMessage({
          type: 'build-log',
          entry: {
            timestamp: Date.now(),
            type: 'info',
            stage: 'design',
            message: `Interviewing ${persona.name} about visual preferences (${i + 1}/${personas.length})...`,
          },
        });

        const interviewPrompt = `You are ${persona.name}, ${persona.backstory || 'a user'}.

You're being asked about your visual preferences for a new app: "${projectTitle}"

Share your honest opinions about:
1. What colors make you feel comfortable and engaged? What colors do you avoid?
2. Do you prefer modern/minimalist designs, or more vibrant/playful ones?
3. What kind of typography do you find easiest to read?
4. What visual style would make this app feel trustworthy and professional to you?
5. Any specific aesthetic preferences based on your background?

Respond naturally as ${persona.name}, in 2-3 sentences per question.`;

        try {
          const conversationId = `look-feel-${message.projectName}-${persona.id}-${Date.now()}`;
          const agent = await this.buildModeService['agentManager'].getOrCreateAgent(conversationId, 'build');

          await agent.chat(interviewPrompt, [], {}, '', false);

          const conversation = await this.buildModeService['agentManager']['config'].conversationManager.getConversation(conversationId);
          const lastMsg = conversation?.messages.filter((m: any) => m.role === 'model').pop();

          if (lastMsg?.text) {
            personaFeedback.push(`${persona.name}: ${lastMsg.text.slice(0, 200)}...`);
          }

          await this.buildModeService['agentManager'].disposeAgent(conversationId);
        } catch (err: any) {
          console.error(`[BuildModeHandler] Error interviewing ${persona.name}:`, err);
          personaFeedback.push(`${persona.name}: (interview failed)`);
        }
      }

      // Now generate consolidated look and feel based on persona feedback
      webview.postMessage({
        type: 'build-log',
        entry: {
          timestamp: Date.now(),
          type: 'info',
          stage: 'design',
          message: 'Consolidating visual preferences into design guidelines...',
        },
      });

      const consolidationPrompt = `Based on the following user interviews about visual preferences for "${projectTitle}", generate a cohesive design language.

PERSONA FEEDBACK:
${personaFeedback.join('\n\n')}

Generate a comprehensive look and feel specification. Output ONLY valid JSON (no markdown):
{
  "primaryColor": "#hexcolor",
  "secondaryColor": "#hexcolor",
  "accentColor": "#hexcolor",
  "backgroundColor": "#hexcolor",
  "textColor": "#hexcolor",
  "fontFamily": "Font name recommendation",
  "mood": "One line description of the overall mood",
  "style": "Design style description (e.g., Modern Minimalist, Bold & Playful, etc.)",
  "audienceAppeal": "What makes this appealing to the target audience",
  "logoDescription": "Concept for the logo design",
  "visualElements": ["element1", "element2", "element3"],
  "personaFeedback": ["Key insight 1 from personas", "Key insight 2"]
}`;

      const conversationId = `look-feel-consolidate-${message.projectName}-${Date.now()}`;
      const agent = await this.buildModeService['agentManager'].getOrCreateAgent(conversationId, 'build');

      await agent.chat(consolidationPrompt, [], {}, 'You are a UX designer creating a visual identity based on user research. Return only valid JSON.', false);

      const conversation = await this.buildModeService['agentManager']['config'].conversationManager.getConversation(conversationId);
      const lastMsg = conversation?.messages.filter((m: any) => m.role === 'model').pop();

      let lookAndFeel: any = null;

      if (lastMsg?.text) {
        const parseResult = parseJson(lastMsg.text);
        if (parseResult.success && parseResult.data) {
          lookAndFeel = parseResult.data;
        } else {
          // Try repair
          const repairedData = await this.attemptLlmJsonRepair(
            lastMsg.text,
            parseResult.error || 'Unknown parse error',
            message.projectName
          );
          if (repairedData) {
            lookAndFeel = repairedData;
          }
        }
      }

      await this.buildModeService['agentManager'].disposeAgent(conversationId);

      if (!lookAndFeel) {
        // Fallback with sensible defaults
        lookAndFeel = {
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          accentColor: '#F59E0B',
          backgroundColor: '#FFFFFF',
          textColor: '#1F2937',
          fontFamily: 'Inter, system-ui, sans-serif',
          mood: 'Clean and professional',
          style: 'Modern Minimalist',
          audienceAppeal: 'Easy to use with clear visual hierarchy',
          logoDescription: 'Simple, memorable mark with the product name',
          visualElements: ['Rounded corners', 'Subtle shadows', 'Clean icons'],
          personaFeedback: personaFeedback.slice(0, 3),
        };
      }

      // Save to design stage
      const existingDesign = await this.buildModeService.loadStage(message.projectName, 'design') || {};
      await this.buildModeService.saveStage(
        message.projectName,
        'design',
        { ...existingDesign, lookAndFeel },
        false
      );

      webview.postMessage({
        type: 'look-and-feel-generated',
        projectName: message.projectName,
        lookAndFeel,
      });

      console.log('[BuildModeHandler] Look and feel generated:', {
        projectName: message.projectName,
        style: lookAndFeel.style,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Failed to generate look and feel:', error);

      webview.postMessage({
        type: 'look-and-feel-generation-error',
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

      // Save to stage file - mark as complete
      await this.buildModeService.saveStage(
        message.projectName,
        'design',
        updatedDesign,
        true
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
    console.log('[BuildModeHandler] handleGenerateScreens called with:', {
      projectName: message.projectName,
      hasStories: !!message.stories || !!message.userStories,
      framework: message.framework,
    });

    if (!message.projectName) {
      console.error('[BuildModeHandler] Generate screens failed: no project name');
      webview.postMessage({
        type: 'build-log',
        entry: {
          timestamp: Date.now(),
          type: 'error',
          stage: 'design',
          message: 'Cannot generate screens: Project name is not set. Please go back to the Idea stage and set a project name.',
        },
      });
      webview.postMessage({
        type: 'screens-generation-error',
        error: 'Project name is required. Please set a project name in the Idea stage.',
        projectName: '',
      });
      return;
    }

    this.validateProjectName(message.projectName);

    const userStories = message.stories || message.userStories || [];
    const framework = message.framework || 'react';

    console.log('[BuildModeHandler] Generating screens from user stories:', {
      projectName: message.projectName,
      storyCount: userStories.length,
      framework,
    });

    webview.postMessage({
      type: 'build-log',
      entry: {
        timestamp: Date.now(),
        type: 'info',
        stage: 'design',
        message: `Generating screens from ${userStories.length} user stories for ${framework}...`,
      },
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

      // Save to stage file - mark as complete
      await this.buildModeService.saveStage(
        message.projectName,
        'design',
        updatedDesign,
        true
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
        `${DESIGN_PROMPT}\n\n${prompt}`
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
      // Mark design as complete after successful user flows generation
      await this.buildModeService.saveStage(
        message.projectName,
        'design',
        {
          ...existingDesign,
          userFlows: flows,
        },
        true
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

      // Save with completed=true since features were successfully generated
      await this.buildModeService.saveStage(projectName, 'features', result, true);

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

      const systemPrompt = CPTO_PROMPT + `
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

  /**
   * Handle error and send sanitized message to webview
   * @private
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
   * Send a build log entry to the webview
   */
  private sendBuildLog(
    webview: any,
    message: string,
    logType: 'info' | 'success' | 'error' | 'warning' = 'info',
    stage = 'finalize'
  ): void {
    webview.postMessage({
      type: 'build-log',
      entry: {
        timestamp: Date.now(),
        type: logType,
        stage,
        message,
      },
    });
  }

  /**
   * Write a markdown export file directly to the project exports directory
   */
  private async writeMarkdownExport(projectName: string, fileName: string, content: string): Promise<string> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    // Create exports directory in the project folder
    const exportsDir = path.join(workspaceRoot, '.personaut', projectName, 'exports');
    await fs.promises.mkdir(exportsDir, { recursive: true });

    // Write the markdown file
    const filePath = path.join(exportsDir, fileName);
    await fs.promises.writeFile(filePath, content, 'utf-8');

    console.log(`[BuildModeHandler] Wrote export file: ${filePath}`);
    return filePath;
  }

  /**
   * Handle export document request (Finalize stage)
   */
  private async handleExportDocument(message: WebviewMessage, webview: any): Promise<void> {
    const { projectName, documentType } = message;
    if (!projectName || !documentType) {
      throw new Error('Project name and document type are required');
    }

    this.validateProjectName(projectName);
    this.sendBuildLog(webview, `Exporting ${documentType}...`, 'info');

    try {
      let documentData: any = null;
      let fileName = '';

      switch (documentType) {
        case 'task-list':
          documentData = await this.buildModeService.loadStage(projectName, 'tasks');
          fileName = 'task-list.md';
          break;
        case 'steering-document':
          documentData = await this.buildModeService.loadStage(projectName, 'steering');
          fileName = 'steering-document.md';
          break;
        default:
          throw new Error(`Unknown document type: ${documentType}`);
      }

      const markdownContent = this.formatDocumentAsMarkdown(documentType, documentData, projectName);
      // Write actual markdown file
      const filePath = await this.writeMarkdownExport(projectName, fileName, markdownContent);
      // Also save as structured data for reference
      await this.buildModeService.saveStage(projectName, `export-${documentType}`, { content: markdownContent, fileName, filePath, exportedAt: new Date().toISOString() }, true);

      this.sendBuildLog(webview, `✓ Exported ${fileName} to exports/`, 'success');

      webview.postMessage({
        type: 'document-exported',
        projectName,
        documentType,
        fileName,
        filePath,
        success: true,
      });
    } catch (error: any) {
      this.sendBuildLog(webview, `✗ Failed to export ${documentType}: ${this.errorSanitizer.sanitize(error).userMessage}`, 'error');

      webview.postMessage({
        type: 'document-export-failed',
        projectName,
        documentType,
        error: this.errorSanitizer.sanitize(error).userMessage,
      });
    }
  }

  /**
   * Handle export all documents request (Finalize stage)
   */
  private async handleExportAllDocuments(message: WebviewMessage, webview: any): Promise<void> {
    const { projectName } = message;
    if (!projectName) {
      throw new Error('Project name is required');
    }

    this.validateProjectName(projectName);
    this.sendBuildLog(webview, 'Exporting comprehensive project documentation...', 'info');

    const exportResults: { documentType: string; success: boolean; fileName?: string; error?: string }[] = [];

    // Export Task List (using comprehensive generation with full build data)
    try {
      const taskMarkdown = this.generateTaskListFromBuildData(message);
      const taskPath = await this.writeMarkdownExport(projectName, 'task-list.md', taskMarkdown);
      await this.buildModeService.saveStage(projectName, 'export-task-list', { content: taskMarkdown, fileName: 'task-list.md', filePath: taskPath, exportedAt: new Date().toISOString() }, true);
      exportResults.push({ documentType: 'task-list', success: true, fileName: 'task-list.md' });
      this.sendBuildLog(webview, `✓ Exported task-list.md to exports/`, 'success');
    } catch (error: any) {
      exportResults.push({ documentType: 'task-list', success: false, error: error.message });
      this.sendBuildLog(webview, `✗ Failed to export task list: ${error.message}`, 'error');
    }

    // Export Steering Document (using comprehensive generation with full build data)
    try {
      const steeringMarkdown = this.generateSteeringDocumentFromBuildData(message);
      const steeringPath = await this.writeMarkdownExport(projectName, 'steering-document.md', steeringMarkdown);
      await this.buildModeService.saveStage(projectName, 'export-steering-document', { content: steeringMarkdown, fileName: 'steering-document.md', filePath: steeringPath, exportedAt: new Date().toISOString() }, true);
      exportResults.push({ documentType: 'steering-document', success: true, fileName: 'steering-document.md' });
      this.sendBuildLog(webview, `✓ Exported steering-document.md to exports/`, 'success');
    } catch (error: any) {
      exportResults.push({ documentType: 'steering-document', success: false, error: error.message });
      this.sendBuildLog(webview, `✗ Failed to export steering document: ${error.message}`, 'error');
    }

    // Export Comprehensive Project Documentation (NEW)
    try {
      const fullDocMarkdown = this.generateComprehensiveDocumentation(message);
      const fullDocPath = await this.writeMarkdownExport(projectName, 'project-documentation.md', fullDocMarkdown);
      await this.buildModeService.saveStage(projectName, 'export-project-documentation', { content: fullDocMarkdown, fileName: 'project-documentation.md', filePath: fullDocPath, exportedAt: new Date().toISOString() }, true);
      exportResults.push({ documentType: 'project-documentation', success: true, fileName: 'project-documentation.md' });
      this.sendBuildLog(webview, `✓ Exported project-documentation.md to exports/`, 'success');
    } catch (error: any) {
      exportResults.push({ documentType: 'project-documentation', success: false, error: error.message });
      this.sendBuildLog(webview, `✗ Failed to export project documentation: ${error.message}`, 'error');
    }

    // Export Requirements Document (NEW)
    try {
      const requirementsMarkdown = this.generateRequirementsDocument(message);
      const requirementsPath = await this.writeMarkdownExport(projectName, 'requirements.md', requirementsMarkdown);
      await this.buildModeService.saveStage(projectName, 'export-requirements', { content: requirementsMarkdown, fileName: 'requirements.md', filePath: requirementsPath, exportedAt: new Date().toISOString() }, true);
      exportResults.push({ documentType: 'requirements', success: true, fileName: 'requirements.md' });
      this.sendBuildLog(webview, `✓ Exported requirements.md to exports/`, 'success');
    } catch (error: any) {
      exportResults.push({ documentType: 'requirements', success: false, error: error.message });
      this.sendBuildLog(webview, `✗ Failed to export requirements document: ${error.message}`, 'error');
    }

    const successCount = exportResults.filter(r => r.success).length;
    this.sendBuildLog(webview, `Exported ${successCount}/${exportResults.length} documents`, successCount === exportResults.length ? 'success' : 'warning');

    webview.postMessage({
      type: 'all-documents-exported',
      projectName,
      results: exportResults,
      success: exportResults.every(r => r.success),
    });
  }

  /**
   * Handle view document request (Finalize stage)
   */
  private async handleViewDocument(message: WebviewMessage, webview: any): Promise<void> {
    const { projectName, documentType } = message;
    if (!projectName || !documentType) {
      throw new Error('Project name and document type are required');
    }

    this.validateProjectName(projectName);

    try {
      let stage = '';
      switch (documentType) {
        case 'task-list':
          stage = 'tasks';
          break;
        case 'steering-document':
          stage = 'steering';
          break;
        default:
          throw new Error(`Unknown document type: ${documentType}`);
      }

      const documentData = await this.buildModeService.loadStage(projectName, stage);
      const markdownContent = this.formatDocumentAsMarkdown(documentType, documentData, projectName);

      webview.postMessage({
        type: 'document-content',
        projectName,
        documentType,
        content: markdownContent,
      });
    } catch (error: any) {
      webview.postMessage({
        type: 'document-view-failed',
        projectName,
        documentType,
        error: this.errorSanitizer.sanitize(error).userMessage,
      });
    }
  }

  /**
   * Handle generate task list request (Finalize stage)
   */
  private async handleGenerateTaskList(message: WebviewMessage, webview: any): Promise<void> {
    const { projectName } = message;
    if (!projectName) {
      throw new Error('Project name is required');
    }

    this.validateProjectName(projectName);
    this.sendBuildLog(webview, 'Generating comprehensive task list...', 'info');

    // Use new comprehensive generation with all build data
    const taskListMarkdown = this.generateTaskListFromBuildData(message);
    await this.buildModeService.saveStage(projectName, 'tasks', { content: taskListMarkdown, generatedAt: new Date().toISOString() }, true);

    this.sendBuildLog(webview, '✓ Comprehensive task list generated', 'success');

    webview.postMessage({
      type: 'task-list-generated',
      projectName,
      content: taskListMarkdown,
      success: true,
    });
  }

  /**
   * Handle generate steering document request (Finalize stage)
   */
  private async handleGenerateSteeringDocument(message: WebviewMessage, webview: any): Promise<void> {
    const { projectName } = message;
    if (!projectName) {
      throw new Error('Project name is required');
    }

    this.validateProjectName(projectName);
    this.sendBuildLog(webview, 'Generating comprehensive steering document...', 'info');

    // Use new comprehensive generation with all build data
    const steeringMarkdown = this.generateSteeringDocumentFromBuildData(message);
    await this.buildModeService.saveStage(projectName, 'steering', { content: steeringMarkdown, generatedAt: new Date().toISOString() }, true);

    this.sendBuildLog(webview, '✓ Comprehensive steering document generated', 'success');

    webview.postMessage({
      type: 'steering-document-generated',
      projectName,
      content: steeringMarkdown,
      success: true,
    });
  }

  /**
   * Format document data as markdown
   */
  private formatDocumentAsMarkdown(documentType: string, data: any, projectName: string): string {
    const timestamp = new Date().toISOString();

    switch (documentType) {
      case 'task-list': {
        const tasksData = data?.tasks || [];
        let md = `# Task List: ${projectName}\n\nGenerated: ${timestamp}\n\n## Tasks\n\n`;
        tasksData.forEach((task: any, index: number) => {
          md += `### ${index + 1}. ${task.title || task.name || 'Untitled Task'}\n\n`;
          md += `**Priority:** ${task.priority || 'P1'} | **Complexity:** ${task.complexity || 'medium'} | **Estimated Effort:** ${task.estimatedHours || this.estimateEffort(task.complexity)}h\n\n`;
          if (task.description) md += `**Description:** ${task.description}\n\n`;
          if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
            md += `**Acceptance Criteria:**\n`;
            task.acceptanceCriteria.forEach((ac: string) => md += `- [ ] ${ac}\n`);
            md += '\n';
          }
          if (task.dependencies && task.dependencies.length > 0) {
            md += `**Dependencies:** ${task.dependencies.join(', ')}\n\n`;
          }
          if (task.technicalNotes) md += `**Technical Notes:** ${task.technicalNotes}\n\n`;
          md += '---\n\n';
        });

        // Summary section
        md += `## Summary\n\n`;
        md += `| Metric | Count |\n`;
        md += `|--------|-------|\n`;
        md += `| Total Tasks | ${tasksData.length} |\n`;
        md += `| P0 (Critical) | ${tasksData.filter((t: any) => t.priority === 'P0').length} |\n`;
        md += `| P1 (High) | ${tasksData.filter((t: any) => t.priority === 'P1').length} |\n`;
        md += `| P2 (Medium) | ${tasksData.filter((t: any) => t.priority === 'P2').length} |\n`;
        md += `| P3 (Low) | ${tasksData.filter((t: any) => t.priority === 'P3').length} |\n\n`;

        return md;
      }

      case 'steering-document': {
        let md = `# Steering Document: ${projectName}\n\n`;
        md += `> Generated: ${timestamp}\n\n`;
        md += `---\n\n`;

        // Table of Contents
        md += `## Table of Contents\n\n`;
        md += `1. [Project Overview](#project-overview)\n`;
        md += `2. [Tech Stack](#tech-stack)\n`;
        md += `3. [Architecture](#architecture)\n`;
        md += `4. [Coding Standards](#coding-standards)\n`;
        md += `5. [Quality Requirements](#quality-requirements)\n`;
        md += `6. [File Structure](#file-structure)\n`;
        md += `7. [Testing Strategy](#testing-strategy)\n`;
        md += `8. [Deployment](#deployment)\n`;
        md += `9. [Constraints & Assumptions](#constraints--assumptions)\n\n`;
        md += `---\n\n`;

        // Project Overview
        md += `## Project Overview\n\n`;
        md += `${data?.overview || `${projectName} is a modern web application designed to deliver an exceptional user experience.`}\n\n`;
        if (data?.goals) {
          md += `### Goals\n\n`;
          (data.goals as string[]).forEach((goal: string) => md += `- ${goal}\n`);
          md += '\n';
        }
        if (data?.targetAudience) md += `### Target Audience\n\n${data.targetAudience}\n\n`;

        // Tech Stack
        md += `## Tech Stack\n\n`;
        md += `### Core Framework\n\n`;
        md += `- **Framework:** ${data?.framework || 'React'}\n`;
        md += `- **Language:** TypeScript (recommended)\n`;
        md += `- **Build Tool:** Vite or Create React App\n\n`;

        md += `### Styling\n\n`;
        md += `- CSS-in-JS (styled-components or emotion) OR\n`;
        md += `- CSS Modules with SCSS\n`;
        md += `- Design system tokens for consistency\n\n`;

        md += `### State Management\n\n`;
        md += `- React Context for simple state\n`;
        md += `- Zustand or Redux Toolkit for complex state\n`;
        md += `- React Query for server state\n\n`;

        md += `### Additional Libraries\n\n`;
        md += `- Testing: Vitest + React Testing Library\n`;
        md += `- Routing: React Router v6\n`;
        md += `- Forms: React Hook Form + Zod validation\n`;
        md += `- Icons: Lucide React or similar\n\n`;

        // Architecture
        md += `## Architecture\n\n`;
        md += `### Architectural Pattern\n\n`;
        md += `${data?.architecturalPatterns || 'Feature-based architecture with clear separation of concerns.'}\n\n`;

        md += `### Key Principles\n\n`;
        md += `1. **Component Composition** - Build complex UIs from simple, reusable components\n`;
        md += `2. **Single Responsibility** - Each component/module has one clear purpose\n`;
        md += `3. **Dependency Injection** - Inject dependencies for testability\n`;
        md += `4. **Immutability** - Prefer immutable data structures\n`;
        md += `5. **Declarative UI** - Describe what to render, not how\n\n`;

        // Coding Standards
        md += `## Coding Standards\n\n`;
        md += `### General Guidelines\n\n`;
        md += `${data?.codingStandards || '- Write clean, self-documenting code\n- Use meaningful variable and function names\n- Keep functions small and focused\n- Avoid deep nesting (max 3 levels)\n- Use early returns to reduce complexity'}\n\n`;

        md += `### Naming Conventions\n\n`;
        md += `| Type | Convention | Example |\n`;
        md += `|------|------------|--------|\n`;
        md += `| Components | PascalCase | \`UserProfile.tsx\` |\n`;
        md += `| Hooks | camelCase with \`use\` prefix | \`useAuth.ts\` |\n`;
        md += `| Utils | camelCase | \`formatDate.ts\` |\n`;
        md += `| Constants | SCREAMING_SNAKE_CASE | \`API_BASE_URL\` |\n`;
        md += `| Types/Interfaces | PascalCase | \`UserData\` |\n\n`;

        md += `### Component Structure\n\n`;
        md += `\`\`\`tsx\n`;
        md += `// 1. Imports (external, then internal)\n`;
        md += `// 2. Types/Interfaces\n`;
        md += `// 3. Component definition\n`;
        md += `// 4. Hooks (state, effects, custom)\n`;
        md += `// 5. Event handlers\n`;
        md += `// 6. Render logic\n`;
        md += `// 7. Export\n`;
        md += `\`\`\`\n\n`;

        // Quality Requirements
        md += `## Quality Requirements\n\n`;
        md += `### Performance\n\n`;
        md += `- First Contentful Paint (FCP) < 1.8s\n`;
        md += `- Largest Contentful Paint (LCP) < 2.5s\n`;
        md += `- Cumulative Layout Shift (CLS) < 0.1\n`;
        md += `- First Input Delay (FID) < 100ms\n\n`;

        md += `### Accessibility (WCAG 2.1 AA)\n\n`;
        md += `- All interactive elements keyboard accessible\n`;
        md += `- Sufficient color contrast (4.5:1 for text)\n`;
        md += `- ARIA labels where appropriate\n`;
        md += `- Focus indicators visible\n`;
        md += `- Screen reader compatible\n\n`;

        md += `### Browser Support\n\n`;
        md += `- Chrome (last 2 versions)\n`;
        md += `- Firefox (last 2 versions)\n`;
        md += `- Safari (last 2 versions)\n`;
        md += `- Edge (last 2 versions)\n\n`;

        md += `### Responsive Breakpoints\n\n`;
        md += `- Mobile: < 640px\n`;
        md += `- Tablet: 640px - 1024px\n`;
        md += `- Desktop: > 1024px\n\n`;

        // File Structure
        md += `## File Structure\n\n`;
        md += `\`\`\`\n`;
        md += `src/\n`;
        md += `├── components/          # Reusable UI components\n`;
        md += `│   ├── common/          # Buttons, inputs, cards\n`;
        md += `│   └── layout/          # Headers, footers, navigation\n`;
        md += `├── features/            # Feature-based modules\n`;
        md += `│   └── [feature]/\n`;
        md += `│       ├── components/  # Feature-specific components\n`;
        md += `│       ├── hooks/       # Feature-specific hooks\n`;
        md += `│       └── types.ts     # Feature types\n`;
        md += `├── hooks/               # Shared custom hooks\n`;
        md += `├── services/            # API and external services\n`;
        md += `├── utils/               # Helper functions\n`;
        md += `├── types/               # Shared TypeScript types\n`;
        md += `├── styles/              # Global styles and tokens\n`;
        md += `└── App.tsx              # Root component\n`;
        md += `\`\`\`\n\n`;

        // Testing Strategy
        md += `## Testing Strategy\n\n`;
        md += `### Unit Tests\n\n`;
        md += `- Target: 80% code coverage\n`;
        md += `- Test utility functions and business logic\n`;
        md += `- Test custom hooks with renderHook\n\n`;

        md += `### Component Tests\n\n`;
        md += `- Test component behavior, not implementation\n`;
        md += `- Use React Testing Library\n`;
        md += `- Test user interactions and accessibility\n\n`;

        md += `### Integration Tests\n\n`;
        md += `- Test feature flows end-to-end\n`;
        md += `- Mock API responses consistently\n`;
        md += `- Test error states and edge cases\n\n`;

        // Deployment
        md += `## Deployment\n\n`;
        md += `### Environments\n\n`;
        md += `| Environment | Purpose | URL Pattern |\n`;
        md += `|-------------|---------|-------------|\n`;
        md += `| Development | Local testing | localhost:3000 |\n`;
        md += `| Staging | Pre-production | staging.example.com |\n`;
        md += `| Production | Live | example.com |\n\n`;

        md += `### CI/CD Pipeline\n\n`;
        md += `1. Lint and type check\n`;
        md += `2. Run unit and integration tests\n`;
        md += `3. Build production bundle\n`;
        md += `4. Deploy to staging (on PR merge)\n`;
        md += `5. Deploy to production (on release)\n\n`;

        // Constraints
        md += `## Constraints & Assumptions\n\n`;
        md += `${data?.constraints || `- Framework: ${data?.framework || 'React'}\n- Screens to implement: ${data?.screenCount || 'TBD'}\n- User stories to fulfill: ${data?.storyCount || 'TBD'}`}\n\n`;

        md += `### Assumptions\n\n`;
        md += `- Users have modern browsers with JavaScript enabled\n`;
        md += `- Stable internet connection for API calls\n`;
        md += `- Backend APIs follow RESTful conventions\n\n`;

        return md;
      }

      default:
        return `# ${documentType}\n\nGenerated: ${timestamp}\n\n${JSON.stringify(data, null, 2)}`;
    }
  }

  /**
   * Estimate effort in hours based on complexity
   */
  private estimateEffort(complexity: string): number {
    switch (complexity) {
      case 'low': return 2;
      case 'medium': return 4;
      case 'high': return 8;
      case 'very-high': return 16;
      default: return 4;
    }
  }

  /**
   * Generate tasks from screens and user stories
   */
  private generateTasksFromData(screens: any[], userStories: any[], framework: string): any[] {
    const tasks: any[] = [];
    let taskId = 1;

    // Phase 0: Project Setup
    tasks.push({
      id: `task-${taskId++}`,
      title: `Initialize ${framework} Project`,
      description: `Set up a new ${framework} project with TypeScript, configure build tools, linting, and initial file structure.`,
      priority: 'P0',
      complexity: 'low',
      estimatedHours: 2,
      acceptanceCriteria: [
        'Project runs with npm install && npm run dev',
        'TypeScript configured with strict mode',
        'ESLint and Prettier configured',
        'Basic file structure matches architecture guidelines',
        'Git repository initialized with .gitignore',
      ],
      technicalNotes: 'Use Vite for faster development builds. Configure path aliases for cleaner imports.',
    });

    tasks.push({
      id: `task-${taskId++}`,
      title: 'Configure Design System & Styling',
      description: 'Set up CSS architecture, design tokens (colors, spacing, typography), and base styles.',
      priority: 'P0',
      complexity: 'medium',
      estimatedHours: 4,
      acceptanceCriteria: [
        'Design tokens defined in variables file',
        'Base typography styles implemented',
        'Color palette with semantic naming',
        'Responsive breakpoint utilities',
        'Dark mode support (if applicable)',
      ],
      dependencies: [`task-1`],
    });

    tasks.push({
      id: `task-${taskId++}`,
      title: 'Create Common UI Components',
      description: 'Build reusable UI primitives: Button, Input, Card, Modal, Loading spinner, etc.',
      priority: 'P0',
      complexity: 'medium',
      estimatedHours: 6,
      acceptanceCriteria: [
        'Button component with variants (primary, secondary, ghost)',
        'Input component with validation states',
        'Card component with consistent styling',
        'Modal/Dialog component with backdrop',
        'Loading and skeleton states',
        'All components are accessible',
      ],
      dependencies: [`task-2`],
    });

    tasks.push({
      id: `task-${taskId++}`,
      title: 'Set Up Routing & Navigation',
      description: 'Configure React Router, implement navigation layout, create protected route wrapper.',
      priority: 'P0',
      complexity: 'medium',
      estimatedHours: 3,
      acceptanceCriteria: [
        'Route configuration for all screens',
        'Navigation component with active state',
        'Protected routes for authenticated pages',
        '404 page implemented',
        'Route transitions (optional)',
      ],
      dependencies: [`task-3`],
    });

    // Phase 1: Screen Implementation
    screens.forEach((screen: any, index: number) => {
      const screenName = screen.name || `Screen ${index + 1}`;
      const screenDescription = screen.description || '';

      tasks.push({
        id: `task-${taskId++}`,
        title: `Implement ${screenName}`,
        description: `Build the complete UI for ${screenName}. ${screenDescription}`,
        priority: 'P1',
        complexity: screen.complexity || 'medium',
        estimatedHours: this.estimateScreenEffort(screen),
        screenId: screen.id,
        acceptanceCriteria: [
          `All UI elements from design implemented`,
          `Responsive across mobile, tablet, and desktop`,
          `Loading and error states handled`,
          `Accessibility requirements met`,
          `Connected to state management (if applicable)`,
        ],
        technicalNotes: screen.technicalNotes || `Component path: src/features/${this.kebabCase(screenName)}/`,
        dependencies: [`task-4`],
      });
    });

    // Phase 2: User Story Implementation
    userStories.forEach((story: any, index: number) => {
      tasks.push({
        id: `task-${taskId++}`,
        title: story.title || `Implement User Story ${index + 1}`,
        description: story.fullStory || story.description || '',
        priority: story.priority || 'P1',
        complexity: story.complexity || 'medium',
        estimatedHours: this.estimateStoryEffort(story.complexity),
        storyId: story.id,
        acceptanceCriteria: story.acceptanceCriteria || [
          'All acceptance criteria from user story are met',
          'Edge cases handled appropriately',
          'Error states provide helpful feedback',
        ],
        technicalNotes: story.technicalNotes,
      });
    });

    // Phase 3: Polish & Quality
    tasks.push({
      id: `task-${taskId++}`,
      title: 'Implement Error Handling & Boundaries',
      description: 'Add global error boundaries, API error handling, and user-friendly error messages.',
      priority: 'P2',
      complexity: 'medium',
      estimatedHours: 4,
      acceptanceCriteria: [
        'React Error Boundary wraps main app',
        'API errors display user-friendly messages',
        'Form validation errors are clear and actionable',
        'Network failure states handled gracefully',
      ],
    });

    tasks.push({
      id: `task-${taskId++}`,
      title: 'Write Unit & Component Tests',
      description: 'Create comprehensive test suite for components, hooks, and utility functions.',
      priority: 'P2',
      complexity: 'medium',
      estimatedHours: 8,
      acceptanceCriteria: [
        'Minimum 80% code coverage',
        'All critical user flows tested',
        'Accessibility tests included',
        'Tests run in CI pipeline',
      ],
    });

    tasks.push({
      id: `task-${taskId++}`,
      title: 'Performance Optimization',
      description: 'Optimize bundle size, implement code splitting, add lazy loading for routes.',
      priority: 'P2',
      complexity: 'medium',
      estimatedHours: 4,
      acceptanceCriteria: [
        'Route-based code splitting implemented',
        'Images optimized and lazy loaded',
        'Lighthouse performance score > 90',
        'Bundle size analyzed and unnecessary deps removed',
      ],
    });

    tasks.push({
      id: `task-${taskId++}`,
      title: 'Documentation & README',
      description: 'Write comprehensive README, inline documentation, and setup instructions.',
      priority: 'P3',
      complexity: 'low',
      estimatedHours: 3,
      acceptanceCriteria: [
        'README with project overview and setup',
        'API documentation (if applicable)',
        'Component storybook or docs (optional)',
        'Contribution guidelines',
      ],
    });

    return tasks;
  }

  /**
   * Estimate screen implementation effort
   */
  private estimateScreenEffort(screen: any): number {
    const base = 4;
    const complexityBonus = screen.complexity === 'high' ? 4 : screen.complexity === 'low' ? -2 : 0;
    const formBonus = screen.hasForm ? 2 : 0;
    const listBonus = screen.hasList ? 2 : 0;
    return Math.max(2, base + complexityBonus + formBonus + listBonus);
  }

  /**
   * Estimate user story implementation effort
   */
  private estimateStoryEffort(complexity: string): number {
    switch (complexity) {
      case 'low': return 2;
      case 'medium': return 4;
      case 'high': return 8;
      default: return 4;
    }
  }

  /**
   * Convert string to kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Generate steering document from project data
   */
  private generateSteeringDocument(projectName: string, framework: string, screens: any[], userStories: any[]): any {
    return {
      projectName,
      framework,
      overview: `${projectName} is a modern ${framework}-based web application. This steering document provides technical guidance and standards for the development team to ensure consistency, quality, and maintainability throughout the project lifecycle.`,
      goals: [
        'Deliver a polished, production-ready application',
        'Ensure code quality through testing and reviews',
        'Build an accessible and performant user experience',
        'Create maintainable, well-documented code',
      ],
      targetAudience: 'End users looking for a seamless, intuitive digital experience.',
      codingStandards: `- **TypeScript First:** Use TypeScript for all files; avoid \`any\` types
- **Functional Components:** Use functional components with hooks exclusively
- **Named Exports:** Prefer named exports over default exports
- **Small Functions:** Keep functions under 30 lines; extract logic to utils
- **Descriptive Names:** Use clear, intention-revealing names
- **JSDoc Comments:** Document complex functions and public APIs
- **No Magic Numbers:** Extract constants with meaningful names
- **Error Handling:** Always handle errors explicitly`,
      architecturalPatterns: `This project follows a **feature-based architecture** where code is organized by business domain rather than technical concern.

### Key Patterns:
- **Container/Presentation:** Separate logic (containers) from UI (components)
- **Custom Hooks:** Encapsulate reusable stateful logic
- **Service Layer:** Abstract API calls and external integrations
- **Context Providers:** Share global state without prop drilling`,
      qualityRequirements: `### Performance Targets
- Lighthouse Performance: > 90
- LCP: < 2.5 seconds
- Bundle size: < 250KB (gzipped)

### Accessibility Standards
- WCAG 2.1 AA compliance
- Full keyboard navigation
- Screen reader tested

### Code Quality
- Test coverage: > 80%
- Zero critical lint errors
- All PRs reviewed before merge`,
      constraints: `- **Framework:** ${framework}
- **Screens:** ${screens.length} screens to implement
- **User Stories:** ${userStories.length} stories to fulfill
- **Timeline:** TBD based on sprint planning`,
      screenCount: screens.length,
      storyCount: userStories.length,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate comprehensive task list from all build data
   * Creates detailed tasks for: project setup, each feature, each user story, each screen, and each user flow
   */
  private generateTaskListFromBuildData(message: any): string {
    const project = message.project || { name: message.projectName, title: message.projectName, description: '' };
    const features = message.features || [];
    const userStories = message.userStories || [];
    const screens = message.screens || [];
    const userFlows = message.userFlows || [];
    const framework = message.framework || 'react';
    const lookAndFeel = message.lookAndFeel || {};
    const personas = message.personas || [];

    let taskId = 1;
    const lines: string[] = [
      `# ${project.title || project.name} - Implementation Task List`,
      '',
      `> Generated: ${new Date().toISOString()}`,
      `> Framework: ${framework}`,
      '',
      '## Executive Summary',
      '',
      project.description || `${project.title} is a modern ${framework} application.`,
      '',
      '### Project Metrics',
      '',
      `| Metric | Count |`,
      `|--------|-------|`,
      `| Total Features | ${features.length} |`,
      `| Total User Stories | ${userStories.length} |`,
      `| Total Screens | ${screens.length} |`,
      `| Total User Flows | ${userFlows.length} |`,
      `| Target Personas | ${personas.length} |`,
      '',
      '---',
      '',
    ];

    // =============================================
    // PHASE 1: PROJECT SETUP (Multiple detailed tasks)
    // =============================================
    lines.push('## Phase 1: Project Setup & Infrastructure');
    lines.push('');
    lines.push('*Foundational tasks to set up the development environment and project structure.*');
    lines.push('');

    // Task: Initialize Project
    lines.push(`### TASK-${taskId++}: Initialize ${framework.charAt(0).toUpperCase() + framework.slice(1)} Project`);
    lines.push('**Estimated Time:** 2-4 hours');
    lines.push('');
    lines.push('**Sub-tasks:**');
    lines.push(`- [ ] Create new ${framework} project using CLI (e.g., \`npx create-${framework === 'nextjs' ? 'next-app' : framework === 'react' ? 'react-app' : 'vite'}\`)`);
    lines.push('- [ ] Configure TypeScript (tsconfig.json)');
    lines.push('- [ ] Set up project directory structure');
    lines.push('- [ ] Install core dependencies');
    lines.push('- [ ] Verify project runs locally');
    lines.push('');

    // Task: Development Environment
    lines.push(`### TASK-${taskId++}: Configure Development Environment`);
    lines.push('**Estimated Time:** 1-2 hours');
    lines.push('');
    lines.push('**Sub-tasks:**');
    lines.push('- [ ] Set up ESLint with recommended rules');
    lines.push('- [ ] Configure Prettier for code formatting');
    lines.push('- [ ] Add EditorConfig for consistent editor settings');
    lines.push('- [ ] Set up pre-commit hooks (Husky + lint-staged)');
    lines.push('- [ ] Configure VS Code workspace settings');
    lines.push('');

    // Task: Version Control
    lines.push(`### TASK-${taskId++}: Set Up Version Control`);
    lines.push('**Estimated Time:** 1 hour');
    lines.push('');
    lines.push('**Sub-tasks:**');
    lines.push('- [ ] Initialize Git repository');
    lines.push('- [ ] Create .gitignore with appropriate entries');
    lines.push('- [ ] Set up branch protection rules');
    lines.push('- [ ] Create initial commit');
    lines.push('- [ ] Push to remote repository');
    lines.push('');

    // Task: Design System Setup
    if (lookAndFeel && Object.keys(lookAndFeel).length > 0) {
      lines.push(`### TASK-${taskId++}: Implement Design System`);
      lines.push('**Estimated Time:** 3-5 hours');
      lines.push('');
      lines.push('**Design Specifications:**');
      if (lookAndFeel.primaryColor) lines.push(`- Primary Color: ${lookAndFeel.primaryColor}`);
      if (lookAndFeel.secondaryColor) lines.push(`- Secondary Color: ${lookAndFeel.secondaryColor}`);
      if (lookAndFeel.accentColor) lines.push(`- Accent Color: ${lookAndFeel.accentColor}`);
      if (lookAndFeel.fontFamily) lines.push(`- Font Family: ${lookAndFeel.fontFamily}`);
      if (lookAndFeel.style) lines.push(`- Style: ${lookAndFeel.style}`);
      lines.push('');
      lines.push('**Sub-tasks:**');
      lines.push('- [ ] Create CSS variables/theme configuration');
      lines.push('- [ ] Set up color palette');
      lines.push('- [ ] Configure typography scale');
      lines.push('- [ ] Create spacing system');
      lines.push('- [ ] Set up responsive breakpoints');
      lines.push('- [ ] Create base component styles');
      lines.push('');
    }

    // Task: Testing Infrastructure
    lines.push(`### TASK-${taskId++}: Set Up Testing Infrastructure`);
    lines.push('**Estimated Time:** 2-3 hours');
    lines.push('');
    lines.push('**Sub-tasks:**');
    lines.push('- [ ] Configure Jest or Vitest');
    lines.push('- [ ] Set up React Testing Library');
    lines.push('- [ ] Create test utilities and helpers');
    lines.push('- [ ] Configure code coverage reporting');
    lines.push('- [ ] Add example test file');
    lines.push('');

    // Task: CI/CD Pipeline
    lines.push(`### TASK-${taskId++}: Configure CI/CD Pipeline`);
    lines.push('**Estimated Time:** 2-4 hours');
    lines.push('');
    lines.push('**Sub-tasks:**');
    lines.push('- [ ] Set up GitHub Actions / CI pipeline');
    lines.push('- [ ] Configure automated testing on PR');
    lines.push('- [ ] Set up linting checks');
    lines.push('- [ ] Configure build verification');
    lines.push('- [ ] Set up deployment automation (if applicable)');
    lines.push('');

    lines.push('---');
    lines.push('');

    // =============================================
    // PHASE 2: FEATURE IMPLEMENTATION (One task per feature)
    // =============================================
    if (features.length > 0) {
      lines.push('## Phase 2: Feature Implementation');
      lines.push('');
      lines.push(`*${features.length} features to implement based on user research and requirements.*`);
      lines.push('');

      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const featureName = feature.name || feature.title || `Feature ${i + 1}`;
        const priority = feature.priority || 'P1';

        lines.push(`### TASK-${taskId++}: Implement "${featureName}"`);
        lines.push(`**Priority:** ${priority}`);
        lines.push(`**Feature ID:** ${feature.id || `F-${i + 1}`}`);
        lines.push('**Estimated Time:** 4-8 hours');
        lines.push('');

        if (feature.description) {
          lines.push('**Description:**');
          lines.push(feature.description);
          lines.push('');
        }

        lines.push('**Implementation Sub-tasks:**');
        lines.push('- [ ] Review feature requirements');
        lines.push('- [ ] Design component architecture');
        lines.push('- [ ] Implement core functionality');
        lines.push('- [ ] Add error handling');
        lines.push('- [ ] Write unit tests');
        lines.push('- [ ] Perform code review');
        lines.push('');

        if (feature.acceptanceCriteria && Array.isArray(feature.acceptanceCriteria)) {
          lines.push('**Acceptance Criteria:**');
          for (const criteria of feature.acceptanceCriteria) {
            lines.push(`- [ ] ${criteria}`);
          }
          lines.push('');
        }

        lines.push('---');
        lines.push('');
      }
    }

    // =============================================
    // PHASE 3: USER STORY IMPLEMENTATION (One task per story)
    // =============================================
    if (userStories.length > 0) {
      lines.push('## Phase 3: User Story Implementation');
      lines.push('');
      lines.push(`*${userStories.length} user stories to implement, mapped to features.*`);
      lines.push('');

      for (let i = 0; i < userStories.length; i++) {
        const story = userStories[i];
        const storyTitle = story.title || `User Story ${i + 1}`;

        lines.push(`### TASK-${taskId++}: Implement "${storyTitle}"`);
        lines.push(`**Story ID:** ${story.id || `US-${i + 1}`}`);
        lines.push(`**Related Feature:** ${story.featureName || story.featureId || 'General'}`);
        lines.push('**Estimated Time:** 2-6 hours');
        lines.push('');

        if (story.description) {
          lines.push('**User Story:**');
          lines.push(`> ${story.description}`);
          lines.push('');
        }

        lines.push('**Implementation Sub-tasks:**');
        lines.push('- [ ] Understand user story context');
        lines.push('- [ ] Identify affected components');
        lines.push('- [ ] Implement UI changes');
        lines.push('- [ ] Implement business logic');
        lines.push('- [ ] Add appropriate state management');
        lines.push('- [ ] Write tests for user story');
        lines.push('- [ ] Verify acceptance criteria');
        lines.push('');

        if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
          lines.push('**Acceptance Criteria:**');
          for (const criteria of story.acceptanceCriteria) {
            lines.push(`- [ ] ${criteria}`);
          }
          lines.push('');
        }

        lines.push('---');
        lines.push('');
      }
    }

    // =============================================
    // PHASE 4: SCREEN IMPLEMENTATION (One task per screen)
    // =============================================
    if (screens.length > 0) {
      lines.push('## Phase 4: Screen Implementation');
      lines.push('');
      lines.push(`*${screens.length} screens to build with their components.*`);
      lines.push('');

      for (let i = 0; i < screens.length; i++) {
        const screen = screens[i];
        const screenName = screen.name || `Screen ${i + 1}`;

        lines.push(`### TASK-${taskId++}: Build "${screenName}" Screen`);
        lines.push(`**Screen ID:** ${screen.id || `SCR-${i + 1}`}`);
        lines.push('**Estimated Time:** 4-8 hours');
        lines.push('');

        if (screen.description || screen.purpose) {
          lines.push('**Purpose:**');
          lines.push(screen.description || screen.purpose);
          lines.push('');
        }

        lines.push('**Screen Implementation Sub-tasks:**');
        lines.push('- [ ] Create screen component file');
        lines.push('- [ ] Implement page layout');
        lines.push('- [ ] Add responsive styling');
        lines.push('- [ ] Connect to routing');
        lines.push('');

        // List components to build
        if (screen.components && Array.isArray(screen.components) && screen.components.length > 0) {
          lines.push('**Component Implementation:**');
          for (const component of screen.components) {
            const compName = typeof component === 'string' ? component : (component.name || component);
            lines.push(`- [ ] Build \`${compName}\` component`);
          }
          lines.push('');
        }

        lines.push('**Quality Checklist:**');
        lines.push('- [ ] Matches design specifications');
        lines.push('- [ ] Responsive on mobile/tablet/desktop');
        lines.push('- [ ] Accessible (keyboard navigation, ARIA labels)');
        lines.push('- [ ] Loading states implemented');
        lines.push('- [ ] Error states implemented');
        lines.push('');

        lines.push('---');
        lines.push('');
      }
    }

    // =============================================
    // PHASE 5: USER FLOW IMPLEMENTATION (One task per flow)
    // =============================================
    if (userFlows.length > 0) {
      lines.push('## Phase 5: User Flow Implementation');
      lines.push('');
      lines.push(`*${userFlows.length} user flows to implement, connecting screens and interactions.*`);
      lines.push('');

      for (let i = 0; i < userFlows.length; i++) {
        const flow = userFlows[i];
        const flowName = flow.name || flow.title || `User Flow ${i + 1}`;

        lines.push(`### TASK-${taskId++}: Implement "${flowName}" Flow`);
        lines.push(`**Flow ID:** ${flow.id || `UF-${i + 1}`}`);
        lines.push('**Estimated Time:** 3-6 hours');
        lines.push('');

        if (flow.description) {
          lines.push('**Description:**');
          lines.push(flow.description);
          lines.push('');
        }

        // List flow steps
        if (flow.steps && Array.isArray(flow.steps) && flow.steps.length > 0) {
          lines.push('**Flow Steps to Implement:**');
          for (let j = 0; j < flow.steps.length; j++) {
            const step = flow.steps[j];
            const stepDesc = typeof step === 'string' ? step : (step.description || step.name || step);
            lines.push(`${j + 1}. [ ] ${stepDesc}`);
          }
          lines.push('');
        }

        lines.push('**Implementation Sub-tasks:**');
        lines.push('- [ ] Map screen navigation');
        lines.push('- [ ] Implement route transitions');
        lines.push('- [ ] Add form validation (if applicable)');
        lines.push('- [ ] Handle success/error states');
        lines.push('- [ ] Add loading indicators');
        lines.push('- [ ] Test complete flow end-to-end');
        lines.push('');

        lines.push('---');
        lines.push('');
      }
    }

    // =============================================
    // PHASE 6: INTEGRATION & TESTING
    // =============================================
    lines.push('## Phase 6: Integration & Testing');
    lines.push('');
    lines.push('*Final integration, testing, and quality assurance tasks.*');
    lines.push('');

    lines.push(`### TASK-${taskId++}: Integration Testing`);
    lines.push('**Estimated Time:** 4-8 hours');
    lines.push('');
    lines.push('**Sub-tasks:**');
    lines.push('- [ ] Write integration tests for all user flows');
    lines.push('- [ ] Test cross-component interactions');
    lines.push('- [ ] Verify API integrations');
    lines.push('- [ ] Test edge cases');
    lines.push('- [ ] Achieve target test coverage (>80%)');
    lines.push('');

    lines.push(`### TASK-${taskId++}: End-to-End Testing`);
    lines.push('**Estimated Time:** 4-6 hours');
    lines.push('');
    lines.push('**Sub-tasks:**');
    lines.push('- [ ] Set up E2E testing framework (Playwright/Cypress)');
    lines.push('- [ ] Write E2E tests for critical user journeys');
    lines.push('- [ ] Test on multiple browsers (Chrome, Firefox, Safari)');
    lines.push('- [ ] Test on mobile devices');
    lines.push('- [ ] Verify all user flows work end-to-end');
    lines.push('');

    lines.push(`### TASK-${taskId++}: Accessibility Audit`);
    lines.push('**Estimated Time:** 2-4 hours');
    lines.push('');
    lines.push('**Sub-tasks:**');
    lines.push('- [ ] Run Lighthouse accessibility audit');
    lines.push('- [ ] Test with screen reader');
    lines.push('- [ ] Verify keyboard navigation');
    lines.push('- [ ] Check color contrast ratios');
    lines.push('- [ ] Add missing ARIA labels');
    lines.push('- [ ] Fix any accessibility issues');
    lines.push('');

    lines.push(`### TASK-${taskId++}: Performance Optimization`);
    lines.push('**Estimated Time:** 3-6 hours');
    lines.push('');
    lines.push('**Sub-tasks:**');
    lines.push('- [ ] Run Lighthouse performance audit');
    lines.push('- [ ] Optimize bundle size');
    lines.push('- [ ] Implement code splitting');
    lines.push('- [ ] Add image optimization');
    lines.push('- [ ] Configure caching headers');
    lines.push('- [ ] Verify LCP < 2.5 seconds');
    lines.push('');

    lines.push('---');
    lines.push('');

    // =============================================
    // PHASE 7: DOCUMENTATION & DEPLOYMENT
    // =============================================
    lines.push('## Phase 7: Documentation & Deployment');
    lines.push('');

    lines.push(`### TASK-${taskId++}: Write Documentation`);
    lines.push('**Estimated Time:** 3-5 hours');
    lines.push('');
    lines.push('**Sub-tasks:**');
    lines.push('- [ ] Write comprehensive README');
    lines.push('- [ ] Document setup instructions');
    lines.push('- [ ] Document environment variables');
    lines.push('- [ ] Create API documentation (if applicable)');
    lines.push('- [ ] Add inline code comments');
    lines.push('- [ ] Document component props');
    lines.push('');

    lines.push(`### TASK-${taskId++}: Prepare for Deployment`);
    lines.push('**Estimated Time:** 2-4 hours');
    lines.push('');
    lines.push('**Sub-tasks:**');
    lines.push('- [ ] Configure production build');
    lines.push('- [ ] Set up environment variables');
    lines.push('- [ ] Configure hosting platform');
    lines.push('- [ ] Set up domain and SSL');
    lines.push('- [ ] Create deployment scripts');
    lines.push('- [ ] Perform final production testing');
    lines.push('');

    // Summary
    lines.push('---');
    lines.push('');
    lines.push('## Task Summary');
    lines.push('');
    lines.push(`| Phase | Task Count |`);
    lines.push(`|-------|------------|`);
    lines.push(`| 1. Project Setup | 5-6 tasks |`);
    lines.push(`| 2. Features | ${features.length} tasks |`);
    lines.push(`| 3. User Stories | ${userStories.length} tasks |`);
    lines.push(`| 4. Screens | ${screens.length} tasks |`);
    lines.push(`| 5. User Flows | ${userFlows.length} tasks |`);
    lines.push(`| 6. Testing | 4 tasks |`);
    lines.push(`| 7. Documentation | 2 tasks |`);
    lines.push(`| **Total** | **${taskId - 1} tasks** |`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate steering document from all build data
   */
  private generateSteeringDocumentFromBuildData(message: any): string {
    const project = message.project || { name: message.projectName, title: message.projectName, description: '' };
    const lookAndFeel = message.lookAndFeel || {};
    const framework = message.framework || 'react';
    const personas = message.personas || [];
    const features = message.features || [];

    const lines: string[] = [
      `# ${project.title || project.name} - Technical Steering Document`,
      '',
      `> Generated: ${new Date().toISOString()}`,
      '',
      '## 1. Project Overview',
      '',
      project.description || `${project.title} is a ${framework} application.`,
      '',
      '---',
      '',
      '## 2. Technology Stack',
      '',
      `- **Framework:** ${framework}`,
      `- **Language:** TypeScript`,
      `- **Styling:** ${lookAndFeel.style || 'Modern CSS'}`,
      '',
      '---',
      '',
      '## 3. Design System',
      '',
    ];

    if (lookAndFeel && Object.keys(lookAndFeel).length > 0) {
      lines.push('### Color Palette');
      lines.push('');
      if (lookAndFeel.primaryColor) lines.push(`- **Primary:** ${lookAndFeel.primaryColor}`);
      if (lookAndFeel.secondaryColor) lines.push(`- **Secondary:** ${lookAndFeel.secondaryColor}`);
      if (lookAndFeel.accentColor) lines.push(`- **Accent:** ${lookAndFeel.accentColor}`);
      if (lookAndFeel.backgroundColor) lines.push(`- **Background:** ${lookAndFeel.backgroundColor}`);
      lines.push('');
      lines.push('### Typography');
      lines.push('');
      lines.push(`- **Font Family:** ${lookAndFeel.fontFamily || 'System default'}`);
      lines.push(`- **Style:** ${lookAndFeel.style || 'Modern'}`);
      lines.push(`- **Mood:** ${lookAndFeel.mood || 'Professional'}`);
      lines.push('');
    } else {
      lines.push('Design system to be defined based on project requirements.');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## 4. Target Users');
    lines.push('');

    if (personas.length > 0) {
      for (const persona of personas) {
        lines.push(`### ${persona.name}`);
        lines.push(`**Age:** ${persona.age || 'Not specified'} | **Occupation:** ${persona.occupation || 'Not specified'}`);
        lines.push('');
        lines.push(persona.backstory || persona.description || '');
        lines.push('');
      }
    } else {
      lines.push('Target user personas to be defined.');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## 5. Core Features');
    lines.push('');

    if (features.length > 0) {
      for (const feature of features) {
        lines.push(`### ${feature.name || feature.title}`);
        lines.push(`**Priority:** ${feature.priority || 'P1'}`);
        lines.push('');
        lines.push(feature.description || '');
        lines.push('');
      }
    } else {
      lines.push('Features to be defined based on user research.');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## 6. Coding Standards');
    lines.push('');
    lines.push('- Use TypeScript for type safety');
    lines.push('- Follow component-based architecture');
    lines.push('- Write unit tests for business logic');
    lines.push('- Use semantic HTML elements');
    lines.push('- Implement responsive design');
    lines.push('- Follow accessibility guidelines (WCAG 2.1)');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate comprehensive project documentation
   */
  private generateComprehensiveDocumentation(message: any): string {
    const project = message.project || { name: message.projectName, title: message.projectName, description: '' };
    const personas = message.personas || [];
    const features = message.features || [];
    const userStories = message.userStories || [];
    const userFlows = message.userFlows || [];
    const screens = message.screens || [];
    const lookAndFeel = message.lookAndFeel || {};
    const framework = message.framework || 'react';

    const lines: string[] = [
      `# ${project.title || project.name}`,
      '',
      `> Comprehensive Project Documentation`,
      `> Generated: ${new Date().toISOString()}`,
      '',
      '---',
      '',
      '## Table of Contents',
      '',
      '1. [Project Overview](#project-overview)',
      '2. [User Personas](#user-personas)',
      '3. [Features](#features)',
      '4. [User Stories](#user-stories)',
      '5. [User Flows](#user-flows)',
      '6. [Screen Specifications](#screen-specifications)',
      '7. [Design System](#design-system)',
      '8. [Technical Stack](#technical-stack)',
      '',
      '---',
      '',
      '## Project Overview',
      '',
      project.description || `${project.title} is a modern web application built with ${framework}.`,
      '',
      '---',
      '',
      '## User Personas',
      '',
    ];

    if (personas.length > 0) {
      for (const persona of personas) {
        lines.push(`### ${persona.name}`);
        lines.push('');
        lines.push(`| Attribute | Value |`);
        lines.push(`|-----------|-------|`);
        lines.push(`| **Age** | ${persona.age || 'N/A'} |`);
        lines.push(`| **Occupation** | ${persona.occupation || 'N/A'} |`);
        lines.push(`| **Location** | ${persona.location || 'N/A'} |`);
        lines.push(`| **Tech Savviness** | ${persona.techSavviness || 'N/A'} |`);
        lines.push('');
        lines.push('**Backstory:**');
        lines.push(persona.backstory || persona.description || 'No backstory provided.');
        lines.push('');
        if (persona.goals && Array.isArray(persona.goals)) {
          lines.push('**Goals:**');
          for (const goal of persona.goals) {
            lines.push(`- ${goal}`);
          }
          lines.push('');
        }
        if (persona.painPoints && Array.isArray(persona.painPoints)) {
          lines.push('**Pain Points:**');
          for (const pain of persona.painPoints) {
            lines.push(`- ${pain}`);
          }
          lines.push('');
        }
      }
    } else {
      lines.push('No personas defined.');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Features');
    lines.push('');

    if (features.length > 0) {
      for (const feature of features) {
        lines.push(`### ${feature.name || feature.title}`);
        lines.push(`**ID:** ${feature.id || 'N/A'} | **Priority:** ${feature.priority || 'P1'}`);
        lines.push('');
        lines.push(feature.description || '');
        lines.push('');
        if (feature.acceptanceCriteria && Array.isArray(feature.acceptanceCriteria)) {
          lines.push('**Acceptance Criteria:**');
          for (const criteria of feature.acceptanceCriteria) {
            lines.push(`- ${criteria}`);
          }
          lines.push('');
        }
      }
    } else {
      lines.push('No features defined.');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## User Stories');
    lines.push('');

    if (userStories.length > 0) {
      for (const story of userStories) {
        lines.push(`### ${story.title}`);
        lines.push(`**ID:** ${story.id || 'N/A'} | **Feature:** ${story.featureName || story.featureId || 'General'}`);
        lines.push('');
        lines.push(story.description || '');
        lines.push('');
        if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
          lines.push('**Acceptance Criteria:**');
          for (const criteria of story.acceptanceCriteria) {
            lines.push(`- ${criteria}`);
          }
          lines.push('');
        }
      }
    } else {
      lines.push('No user stories defined.');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## User Flows');
    lines.push('');

    if (userFlows.length > 0) {
      for (const flow of userFlows) {
        lines.push(`### ${flow.name || flow.title || 'User Flow'}`);
        lines.push(`${flow.description || ''}`);
        lines.push('');
        if (flow.steps && Array.isArray(flow.steps)) {
          lines.push('**Steps:**');
          for (let i = 0; i < flow.steps.length; i++) {
            const step = flow.steps[i];
            lines.push(`${i + 1}. ${typeof step === 'string' ? step : step.description || step.name || step}`);
          }
          lines.push('');
        }
      }
    } else {
      lines.push('No user flows defined.');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Screen Specifications');
    lines.push('');

    if (screens.length > 0) {
      for (const screen of screens) {
        lines.push(`### ${screen.name}`);
        lines.push(`**Purpose:** ${screen.description || screen.purpose || 'N/A'}`);
        lines.push('');
        if (screen.components && Array.isArray(screen.components)) {
          lines.push('**Components:**');
          for (const component of screen.components) {
            lines.push(`- ${typeof component === 'string' ? component : component.name || component}`);
          }
          lines.push('');
        }
      }
    } else {
      lines.push('No screens defined.');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Design System');
    lines.push('');

    if (lookAndFeel && Object.keys(lookAndFeel).length > 0) {
      lines.push('### Visual Identity');
      lines.push('');
      lines.push(`- **Style:** ${lookAndFeel.style || 'Modern'}`);
      lines.push(`- **Mood:** ${lookAndFeel.mood || 'Professional'}`);
      lines.push(`- **Font Family:** ${lookAndFeel.fontFamily || 'System default'}`);
      lines.push('');
      lines.push('### Color Palette');
      lines.push('');
      lines.push('| Role | Color |');
      lines.push('|------|-------|');
      if (lookAndFeel.primaryColor) lines.push(`| Primary | ${lookAndFeel.primaryColor} |`);
      if (lookAndFeel.secondaryColor) lines.push(`| Secondary | ${lookAndFeel.secondaryColor} |`);
      if (lookAndFeel.accentColor) lines.push(`| Accent | ${lookAndFeel.accentColor} |`);
      if (lookAndFeel.backgroundColor) lines.push(`| Background | ${lookAndFeel.backgroundColor} |`);
      lines.push('');
      if (lookAndFeel.logoDescription) {
        lines.push('### Logo Description');
        lines.push('');
        lines.push(lookAndFeel.logoDescription);
        lines.push('');
      }
    } else {
      lines.push('Design system to be defined.');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Technical Stack');
    lines.push('');
    lines.push(`- **Framework:** ${framework}`);
    lines.push('- **Language:** TypeScript');
    lines.push('- **Styling:** CSS-in-JS / CSS Modules');
    lines.push('- **Testing:** Jest + React Testing Library');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate requirements document
   */
  private generateRequirementsDocument(message: any): string {
    const project = message.project || { name: message.projectName, title: message.projectName };
    const features = message.features || [];
    const userStories = message.userStories || [];
    const personas = message.personas || [];

    const lines: string[] = [
      `# ${project.title || project.name} - Requirements Document`,
      '',
      `> Generated: ${new Date().toISOString()}`,
      '',
      '---',
      '',
      '## 1. Functional Requirements',
      '',
    ];

    let reqId = 1;

    // Features as requirements
    if (features.length > 0) {
      for (const feature of features) {
        lines.push(`### FR-${reqId++}: ${feature.name || feature.title}`);
        lines.push('');
        lines.push(`**Description:** ${feature.description || 'N/A'}`);
        lines.push(`**Priority:** ${feature.priority || 'P1'}`);
        lines.push('');
        if (feature.acceptanceCriteria && Array.isArray(feature.acceptanceCriteria)) {
          lines.push('**Acceptance Criteria:**');
          for (const criteria of feature.acceptanceCriteria) {
            lines.push(`- ${criteria}`);
          }
          lines.push('');
        }
      }
    }

    // User stories as requirements
    if (userStories.length > 0) {
      lines.push('---');
      lines.push('');
      lines.push('## 2. User Story Requirements');
      lines.push('');

      for (const story of userStories) {
        lines.push(`### US-${story.id || reqId++}: ${story.title}`);
        lines.push('');
        lines.push(`**Description:** ${story.description || 'N/A'}`);
        lines.push(`**Feature:** ${story.featureName || story.featureId || 'General'}`);
        lines.push('');
        if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
          lines.push('**Acceptance Criteria:**');
          for (const criteria of story.acceptanceCriteria) {
            lines.push(`- ${criteria}`);
          }
          lines.push('');
        }
      }
    }

    lines.push('---');
    lines.push('');
    lines.push('## 3. Non-Functional Requirements');
    lines.push('');
    lines.push('### NFR-1: Performance');
    lines.push('- Page load time < 3 seconds');
    lines.push('- Time to interactive < 5 seconds');
    lines.push('');
    lines.push('### NFR-2: Accessibility');
    lines.push('- WCAG 2.1 AA compliance');
    lines.push('- Keyboard navigation support');
    lines.push('- Screen reader compatibility');
    lines.push('');
    lines.push('### NFR-3: Security');
    lines.push('- HTTPS required');
    lines.push('- XSS prevention');
    lines.push('- CSRF protection');
    lines.push('');
    lines.push('### NFR-4: Compatibility');
    lines.push('- Modern browsers (Chrome, Firefox, Safari, Edge)');
    lines.push('- Mobile responsive design');
    lines.push('');

    // User requirements
    if (personas.length > 0) {
      lines.push('---');
      lines.push('');
      lines.push('## 4. User Requirements');
      lines.push('');

      for (const persona of personas) {
        lines.push(`### ${persona.name}'s Requirements`);
        lines.push('');
        if (persona.goals && Array.isArray(persona.goals)) {
          for (const goal of persona.goals) {
            lines.push(`- ${goal}`);
          }
          lines.push('');
        }
        if (persona.painPoints && Array.isArray(persona.painPoints)) {
          lines.push('**Pain Points to Address:**');
          for (const pain of persona.painPoints) {
            lines.push(`- ${pain}`);
          }
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }
}
