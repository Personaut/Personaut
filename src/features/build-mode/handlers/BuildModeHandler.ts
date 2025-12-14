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
   * Handle build-mode-related webview messages.
   * Validates: Requirements 10.1, 10.2
   */
  async handle(message: WebviewMessage, webview: any): Promise<void> {
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

    await this.buildModeService.saveStage(
      message.projectName,
      message.stage,
      message.data || {},
      message.completed || false
    );

    webview.postMessage({
      type: 'stage-file-saved',
      projectName: message.projectName,
      stage: message.stage,
      success: true,
    });
  }

  /**
   * Handle load stage file request.
   */
  private async handleLoadStageFile(message: WebviewMessage, webview: any): Promise<void> {
    if (!message.projectName || !message.stage) {
      throw new Error('Project name and stage are required');
    }

    // Security: Validate inputs to prevent path traversal
    this.validateProjectName(message.projectName);
    this.validateStageName(message.stage);

    const data = await this.buildModeService.loadStage(message.projectName, message.stage);

    webview.postMessage({
      type: 'stage-file-loaded',
      projectName: message.projectName,
      stage: message.stage,
      data,
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
        try {
          // Extract JSON from code blocks if present
          const jsonMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[1]);
          } else {
            parsedData = JSON.parse(generatedContent);
          }
        } catch {
          // Keep as string if not valid JSON
          parsedData = generatedContent;
        }
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
   */
  private async handleCaptureScreenshot(message: WebviewMessage, webview: any): Promise<void> {
    const url = message.url;

    if (!url) {
      webview.postMessage({
        type: 'screenshot-error',
        error: 'URL is required for screenshot capture',
      });
      return;
    }

    // Validate URL
    const validation = this.inputValidator.validateInput(url);
    if (!validation.valid) {
      webview.postMessage({
        type: 'screenshot-error',
        error: validation.reason || 'Invalid URL',
        url,
      });
      return;
    }

    // Send status update
    webview.postMessage({
      type: 'screenshot-status',
      status: 'capturing',
      url,
    });

    let browser = null;
    try {
      // Dynamic import puppeteer
      const puppeteer = require('puppeteer');

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();

      // Set viewport for consistent screenshots
      await page.setViewport({ width: 1280, height: 800 });

      // Navigate with timeout
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Take screenshot as base64
      const screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
      });

      const base64Data = screenshotBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Data}`;

      webview.postMessage({
        type: 'screenshot-captured',
        url,
        screenshot: dataUrl,
      });
    } catch (error: any) {
      console.error('[BuildModeHandler] Screenshot capture error:', error);
      webview.postMessage({
        type: 'screenshot-error',
        error: error.message || 'Failed to capture screenshot',
        url,
      });
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // Ignore close errors
        }
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
        backstoryLength: backstory.length,
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
      try {
        // Try to extract JSON from the response
        const jsonMatch = generatedContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          stories = JSON.parse(jsonMatch[0]);
        } else {
          // Try parsing directly
          stories = JSON.parse(generatedContent);
        }
      } catch {
        // If parsing fails, create a simple story from the text
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
      try {
        const jsonMatch = generatedContent.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          updatedStory = Array.isArray(parsed) ? parsed[0] : parsed;
        } else {
          updatedStory = {
            description: generatedContent,
            acceptanceCriteria: [],
            clarifyingQuestions: [],
          };
        }
      } catch {
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
      try {
        const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          design = JSON.parse(jsonMatch[0]);
        }
      } catch {
        design = { userFlows: [], pages: [] };
      }

      // Normalize flows
      design.userFlows = (design.userFlows || []).map((flow: any, i: number) => ({
        id: flow.id || `flow-${i + 1}-${Date.now()}`,
        name: flow.name || `User Flow ${i + 1}`,
        description: flow.description || '',
        steps: Array.isArray(flow.steps) ? flow.steps : [],
      }));

      // Normalize pages
      design.pages = (design.pages || []).map((page: any, i: number) => ({
        id: page.id || `page-${i + 1}-${Date.now()}`,
        name: page.name || `Page ${i + 1}`,
        purpose: page.purpose || '',
        uiElements: Array.isArray(page.uiElements) ? page.uiElements : [],
        userActions: Array.isArray(page.userActions) ? page.userActions : [],
      }));

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
      try {
        const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          flows = parsed.userFlows || [];
        }
      } catch {
        flows = [];
      }

      flows = flows.map((flow: any, i: number) => ({
        id: flow.id || `flow-${i + 1}-${Date.now()}`,
        name: flow.name || `User Flow ${i + 1}`,
        description: flow.description || '',
        steps: Array.isArray(flow.steps) ? flow.steps : [],
      }));

      webview.postMessage({
        type: 'flows-updated',
        projectName: message.projectName,
        userFlows: flows,
      });

      console.log('[BuildModeHandler] Flows regenerated:', {
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
}
