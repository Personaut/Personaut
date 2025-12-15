/**
 * StageManager - Manages file-based stage persistence for the build workflow.
 *
 * Implements stage file operations:
 * - Read/write stage files with atomic operations
 * - Track stage completion status
 * - Validate stage transitions
 * - Initialize project directory structure
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  StageFile,
  StageTransition,
  WriteResult,
  BuildState,
  STAGE_ORDER,
  StageName,
  STAGE_FILE_VERSION,
} from '../types/BuildModeTypes';

/**
 * Callback type for notifying about write operations.
 */
export type WriteNotificationCallback = (result: WriteResult) => void;

/**
 * Result of validating a BuildState structure.
 */
export interface BuildStateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that a BuildState object contains all required fields with correct types.
 *
 * @param state - The BuildState object to validate
 * @returns BuildStateValidationResult with validation status and any errors/warnings
 */
export function validateBuildState(state: unknown): BuildStateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (state === null || typeof state !== 'object') {
    errors.push('BuildState must be a non-null object');
    return { valid: false, errors, warnings };
  }

  const obj = state as Record<string, unknown>;

  if (typeof obj.projectName !== 'string') {
    errors.push('projectName must be a string');
  } else if (obj.projectName.length === 0) {
    errors.push('projectName cannot be empty');
  }

  if (obj.projectTitle !== undefined && typeof obj.projectTitle !== 'string') {
    errors.push('projectTitle must be a string when provided');
  }

  if (typeof obj.createdAt !== 'number') {
    errors.push('createdAt must be a number (timestamp)');
  } else if (obj.createdAt < 0) {
    warnings.push('createdAt should be a positive timestamp');
  }

  if (typeof obj.lastUpdated !== 'number') {
    errors.push('lastUpdated must be a number (timestamp)');
  } else if (obj.lastUpdated < 0) {
    warnings.push('lastUpdated should be a positive timestamp');
  }

  if (obj.stages === null || typeof obj.stages !== 'object') {
    errors.push('stages must be a non-null object');
  } else {
    const stages = obj.stages as Record<string, unknown>;

    for (const [stageName, stageInfo] of Object.entries(stages)) {
      if (stageInfo === null || typeof stageInfo !== 'object') {
        errors.push(`stages.${stageName} must be a non-null object`);
        continue;
      }

      const info = stageInfo as Record<string, unknown>;

      if (typeof info.completed !== 'boolean') {
        errors.push(`stages.${stageName}.completed must be a boolean`);
      }

      if (typeof info.path !== 'string') {
        errors.push(`stages.${stageName}.path must be a string`);
      } else if (info.path.length === 0) {
        errors.push(`stages.${stageName}.path cannot be empty`);
      }

      if (typeof info.updatedAt !== 'number') {
        errors.push(`stages.${stageName}.updatedAt must be a number (timestamp)`);
      }

      if (info.error !== undefined && typeof info.error !== 'string') {
        errors.push(`stages.${stageName}.error must be a string when provided`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize a project title to create a valid directory name.
 *
 * @param title - The project title to sanitize
 * @returns A valid directory name
 */
export function sanitizeProjectName(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Validate a project name.
 *
 * @param name - The project name to validate
 * @returns true if the name is valid
 */
export function isValidProjectName(name: string): boolean {
  if (!name || name.length === 0 || name.length > 50) {
    return false;
  }
  return /^[a-z0-9][a-z0-9-_]*[a-z0-9]$|^[a-z0-9]$/.test(name);
}

export class StageManager {
  private readonly baseDir: string;
  private writeNotificationCallback?: WriteNotificationCallback;

  constructor(
    baseDir: string = '.personaut',
    writeNotificationCallback?: WriteNotificationCallback
  ) {
    this.baseDir = baseDir;
    this.writeNotificationCallback = writeNotificationCallback;
  }

  setWriteNotificationCallback(callback: WriteNotificationCallback): void {
    this.writeNotificationCallback = callback;
  }

  /**
   * Get the path to the planning directory for a project.
   * Returns: .personaut/{projectName}/planning
   * Validates: Requirements 4.1
   */
  getPlanningDir(projectName: string): string {
    return path.join(this.baseDir, projectName, 'planning');
  }

  /**
   * Get the path to a stage file using the new planning/ subdirectory structure.
   * Returns: .personaut/{projectName}/planning/{stage}.json
   * Validates: Requirements 4.3, Property 7
   */
  getStageFilePath(projectName: string, stage: string): string {
    return path.join(this.getPlanningDir(projectName), `${stage}.json`);
  }

  /**
   * Get the old (legacy) path to a stage file for backward compatibility.
   * Used for migration from old file structure.
   */
  private getOldStageFilePath(projectName: string, stage: string): string {
    if (stage === 'idea') {
      return path.join(this.baseDir, projectName, `${projectName}.json`);
    }
    return path.join(this.baseDir, projectName, `${stage}.stage.json`);
  }

  /**
   * Get the path to the iterations directory for a project.
   * Returns: .personaut/{projectName}/iterations/{iterationNumber}
   * Validates: Requirements 5.1, Property 8
   */
  getIterationDir(projectName: string, iterationNumber: number): string {
    return path.join(this.baseDir, projectName, 'iterations', String(iterationNumber));
  }

  /**
   * Get the path to a feedback file for an iteration.
   * Returns: .personaut/{projectName}/iterations/{iterationNumber}/feedback.json
   * Validates: Requirements 5.2
   */
  getFeedbackPath(projectName: string, iterationNumber: number): string {
    return path.join(this.getIterationDir(projectName, iterationNumber), 'feedback.json');
  }

  /**
   * Get the path to consolidated feedback for an iteration.
   * Returns: .personaut/{projectName}/iterations/{iterationNumber}/consolidated-feedback.md
   * Validates: Requirements 5.3
   */
  getConsolidatedFeedbackPath(projectName: string, iterationNumber: number): string {
    return path.join(this.getIterationDir(projectName, iterationNumber), 'consolidated-feedback.md');
  }

  /**
   * Get the path to a screenshot file for an iteration.
   * Returns: .personaut/{projectName}/iterations/{iterationNumber}/{pageName}.png
   * Validates: Requirements 5.4
   */
  getScreenshotPath(projectName: string, iterationNumber: number, pageName: string): string {
    // Sanitize pageName to be filesystem-safe
    const safeName = pageName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    return path.join(this.getIterationDir(projectName, iterationNumber), `${safeName}.png`);
  }

  getBuildStatePath(projectName: string): string {
    return path.join(this.baseDir, projectName, 'build-state.json');
  }

  getProjectDir(projectName: string): string {
    return path.join(this.baseDir, projectName);
  }

  /**
   * Get the path to the building directory for a project.
   * Returns: .personaut/{projectName}/building
   */
  getBuildingDir(projectName: string): string {
    return path.join(this.baseDir, projectName, 'building');
  }

  /**
   * Create the building folder for a project.
   * This folder stores build artifacts, generated code, and page iteration data.
   * Returns the absolute path to the created folder.
   * @param projectName - The project name
   * @param pageNames - Optional array of page names to create subfolders for
   */
  async createBuildFolder(projectName: string, pageNames?: string[]): Promise<string> {
    const buildingDir = this.getBuildingDir(projectName);
    const absolutePath = path.resolve(buildingDir);

    await fs.promises.mkdir(absolutePath, { recursive: true });

    // Create pages directory
    const pagesDir = path.join(absolutePath, 'pages');
    await fs.promises.mkdir(pagesDir, { recursive: true });

    // Create subfolders for each page if provided
    if (pageNames && pageNames.length > 0) {
      for (const pageName of pageNames) {
        // Sanitize page name for folder (lowercase, replace spaces with dashes)
        const sanitizedName = pageName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        const pageDir = path.join(pagesDir, sanitizedName);
        await fs.promises.mkdir(pageDir, { recursive: true });

        // Create iteration subdirectory
        await fs.promises.mkdir(path.join(pageDir, 'iterations'), { recursive: true });

        console.log(`[StageManager] Created page folder: ${pageDir}`);
      }
    }

    console.log(`[StageManager] Created building folder at: ${absolutePath}`);
    return absolutePath;
  }

  /**
   * Get the path to a specific page's iteration folder.
   * Returns: .personaut/{projectName}/building/pages/{pageName}/iterations/{iterationNumber}
   */
  getPageIterationDir(projectName: string, pageName: string, iterationNumber: number): string {
    const sanitizedName = pageName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return path.join(
      this.getBuildingDir(projectName),
      'pages',
      sanitizedName,
      'iterations',
      String(iterationNumber)
    );
  }

  /**
   * Save iteration data for a specific page.
   * Creates files for: ux-specs.md, developer-output.md, user-feedback.json, consolidated-feedback.md, screenshot.png
   */
  async savePageIterationData(
    projectName: string,
    pageName: string,
    iterationNumber: number,
    data: {
      uxSpecs?: string;
      developerOutput?: string;
      userFeedback?: any[];
      consolidatedFeedback?: string;
      screenshotPath?: string;
      averageRating?: number;
      approved?: boolean;
    }
  ): Promise<string> {
    const iterDir = this.getPageIterationDir(projectName, pageName, iterationNumber);
    await fs.promises.mkdir(iterDir, { recursive: true });

    // Save UX specs
    if (data.uxSpecs) {
      await fs.promises.writeFile(
        path.join(iterDir, 'ux-specs.md'),
        data.uxSpecs,
        'utf-8'
      );
    }

    // Save developer output
    if (data.developerOutput) {
      await fs.promises.writeFile(
        path.join(iterDir, 'developer-output.md'),
        data.developerOutput,
        'utf-8'
      );
    }

    // Save user feedback (JSON)
    if (data.userFeedback) {
      await fs.promises.writeFile(
        path.join(iterDir, 'user-feedback.json'),
        JSON.stringify(data.userFeedback, null, 2),
        'utf-8'
      );
    }

    // Save consolidated feedback
    if (data.consolidatedFeedback) {
      await fs.promises.writeFile(
        path.join(iterDir, 'consolidated-feedback.md'),
        data.consolidatedFeedback,
        'utf-8'
      );
    }

    // Copy screenshot if provided
    if (data.screenshotPath && fs.existsSync(data.screenshotPath)) {
      const destPath = path.join(iterDir, 'screenshot.png');
      await fs.promises.copyFile(data.screenshotPath, destPath);
    }

    // Save iteration metadata
    const metadata = {
      pageName,
      iterationNumber,
      timestamp: Date.now(),
      averageRating: data.averageRating,
      approved: data.approved ?? false,
    };
    await fs.promises.writeFile(
      path.join(iterDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    console.log(`[StageManager] Saved iteration ${iterationNumber} data for page: ${pageName}`);
    return iterDir;
  }

  /**
   * Load all iteration data for a specific page.
   */
  async loadPageIterations(
    projectName: string,
    pageName: string
  ): Promise<Array<{
    iterationNumber: number;
    uxSpecs?: string;
    developerOutput?: string;
    userFeedback?: any[];
    consolidatedFeedback?: string;
    screenshotPath?: string;
    averageRating?: number;
    approved?: boolean;
    timestamp?: number;
  }>> {
    const sanitizedName = pageName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const iterationsDir = path.join(
      this.getBuildingDir(projectName),
      'pages',
      sanitizedName,
      'iterations'
    );

    const iterations: any[] = [];

    try {
      if (!fs.existsSync(iterationsDir)) {
        return iterations;
      }

      const dirs = await fs.promises.readdir(iterationsDir);
      for (const dir of dirs) {
        const iterNum = parseInt(dir, 10);
        if (isNaN(iterNum)) continue;

        const iterDir = path.join(iterationsDir, dir);
        const stat = await fs.promises.stat(iterDir);
        if (!stat.isDirectory()) continue;

        const iteration: any = { iterationNumber: iterNum };

        // Load UX specs
        const uxPath = path.join(iterDir, 'ux-specs.md');
        if (fs.existsSync(uxPath)) {
          iteration.uxSpecs = await fs.promises.readFile(uxPath, 'utf-8');
        }

        // Load developer output
        const devPath = path.join(iterDir, 'developer-output.md');
        if (fs.existsSync(devPath)) {
          iteration.developerOutput = await fs.promises.readFile(devPath, 'utf-8');
        }

        // Load user feedback
        const feedbackPath = path.join(iterDir, 'user-feedback.json');
        if (fs.existsSync(feedbackPath)) {
          const content = await fs.promises.readFile(feedbackPath, 'utf-8');
          iteration.userFeedback = JSON.parse(content);
        }

        // Load consolidated feedback
        const consolidatedPath = path.join(iterDir, 'consolidated-feedback.md');
        if (fs.existsSync(consolidatedPath)) {
          iteration.consolidatedFeedback = await fs.promises.readFile(consolidatedPath, 'utf-8');
        }

        // Check for screenshot
        const screenshotPath = path.join(iterDir, 'screenshot.png');
        if (fs.existsSync(screenshotPath)) {
          iteration.screenshotPath = screenshotPath;
        }

        // Load metadata
        const metadataPath = path.join(iterDir, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf-8'));
          iteration.averageRating = metadata.averageRating;
          iteration.approved = metadata.approved;
          iteration.timestamp = metadata.timestamp;
        }

        iterations.push(iteration);
      }

      // Sort by iteration number
      iterations.sort((a, b) => a.iterationNumber - b.iterationNumber);
      return iterations;
    } catch (error) {
      console.error(`[StageManager] Error loading iterations for ${pageName}:`, error);
      return [];
    }
  }

  /**
   * Get the current workspace path (VS Code workspace root).
   */
  async getWorkspacePath(): Promise<string> {
    // Try to use VS Code workspace folder if available
    // Otherwise, use current working directory
    const vscode = await import('vscode');
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (workspaceFolders && workspaceFolders.length > 0) {
      return workspaceFolders[0].uri.fsPath;
    }

    // Fallback to process.cwd()
    return process.cwd();
  }

  projectExists(projectName: string): boolean {
    const projectDir = this.getProjectDir(projectName);
    return fs.existsSync(projectDir);
  }

  async projectExistsAsync(projectName: string): Promise<boolean> {
    const projectDir = this.getProjectDir(projectName);
    try {
      await fs.promises.access(projectDir);
      return true;
    } catch {
      return false;
    }
  }

  async readBuildState(projectName: string): Promise<BuildState | null> {
    const filePath = this.getBuildStatePath(projectName);
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const state = JSON.parse(content) as BuildState;

      if (!state.projectTitle) {
        state.projectTitle = state.projectName;
      }

      if (!state.stages || typeof state.stages !== 'object') {
        state.stages = {};
      }

      return state;
    } catch (error) {
      console.warn(`[StageManager] Failed to read build state for ${projectName}:`, error);
      return null;
    }
  }

  async writeBuildState(projectName: string, state: BuildState): Promise<void> {
    const filePath = this.getBuildStatePath(projectName);
    const projectDir = this.getProjectDir(projectName);

    const stateToWrite: BuildState = {
      ...state,
      projectTitle: state.projectTitle || state.projectName,
    };

    const content = JSON.stringify(stateToWrite, null, 2);
    const tempPath = `${filePath}.tmp.${Date.now()}`;

    try {
      await fs.promises.mkdir(projectDir, { recursive: true });
      await fs.promises.writeFile(tempPath, content, 'utf-8');
      await fs.promises.rename(tempPath, filePath);
    } catch (error) {
      console.error(`[StageManager] Failed to write build state for ${projectName}:`, error);

      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
        }
      } catch (cleanupError: any) {
        console.warn(
          `[StageManager] Failed to cleanup temp file ${tempPath}:`,
          cleanupError.message
        );
      }

      throw error;
    }
  }

  private async updateBuildState(
    projectName: string,
    stage: string,
    completed: boolean,
    error?: string
  ): Promise<void> {
    let state = await this.readBuildState(projectName);

    if (!state) {
      state = {
        projectName,
        projectTitle: projectName,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        stages: {},
      };
    }

    if (!state.stages || typeof state.stages !== 'object') {
      state.stages = {};
    }

    state.lastUpdated = Date.now();
    state.stages[stage] = {
      completed,
      path: `planning/${stage}.json`,
      updatedAt: Date.now(),
      error,
    };

    await this.writeBuildState(projectName, state);
  }

  async syncBuildState(projectName: string): Promise<BuildState> {
    let state = await this.readBuildState(projectName);
    if (!state) {
      state = {
        projectName,
        projectTitle: projectName,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        stages: {},
      };
    }

    if (!state.stages || typeof state.stages !== 'object') {
      state.stages = {};
    }

    const files = await this.getAllStageFiles(projectName);
    for (const [stage, file] of files) {
      state.stages[stage] = {
        completed: file.completed,
        path: `planning/${stage}.json`,
        updatedAt: file.timestamp,
        error: file.error,
      };
    }
    state.lastUpdated = Date.now();

    await this.writeBuildState(projectName, state);
    return state;
  }

  async readStageFile(projectName: string, stage: string): Promise<StageFile | null> {
    let filePath: string;

    const state = await this.readBuildState(projectName);
    if (state && state.stages[stage] && state.stages[stage].path) {
      filePath = path.join(this.getProjectDir(projectName), state.stages[stage].path);
    } else {
      // Try new location first (planning/{stage}.json)
      filePath = this.getStageFilePath(projectName, stage);
    }

    console.log(`[StageManager] Reading stage file for ${stage}: ${filePath}`);

    try {
      // Check new location first
      if (!fs.existsSync(filePath)) {
        // Fall back to old location for backward compatibility (Requirements 7.5)
        const oldFilePath = this.getOldStageFilePath(projectName, stage);
        if (fs.existsSync(oldFilePath)) {
          console.log(`[StageManager] Reading from legacy location: ${oldFilePath}`);
          filePath = oldFilePath;
        } else {
          console.log(`[StageManager] Stage file not found: ${filePath}`);
          return null;
        }
      }

      const content = await fs.promises.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content) as StageFile;
      console.log(`[StageManager] Parsed stage file ${stage}:`, { stage: parsed.stage, dataType: typeof parsed.data, hasData: !!parsed.data });

      if (
        typeof parsed.stage !== 'string' ||
        typeof parsed.completed !== 'boolean' ||
        typeof parsed.timestamp !== 'number'
      ) {
        throw new Error('Invalid stage file format: missing required fields');
      }

      return parsed;
    } catch (error: any) {
      if (
        error instanceof SyntaxError ||
        error instanceof TypeError ||
        error.message.includes('Invalid stage file format')
      ) {
        await this.handleCorruptedFile(filePath, error.message);
      }
      console.error(`Error reading stage file ${filePath}:`, error.message);
      return null;
    }
  }

  async writeStageFile(
    projectName: string,
    stage: string,
    data: any,
    completed: boolean
  ): Promise<WriteResult> {
    const filePath = this.getStageFilePath(projectName, stage);
    const planningDir = this.getPlanningDir(projectName);

    const stageFile: StageFile = {
      stage,
      completed,
      timestamp: Date.now(),
      data,
      version: STAGE_FILE_VERSION,
    };

    const content = JSON.stringify(stageFile, null, 2);
    const tempPath = `${filePath}.tmp.${Date.now()}`;

    try {
      await fs.promises.mkdir(planningDir, { recursive: true });
      await fs.promises.writeFile(tempPath, content, 'utf-8');
      await fs.promises.rename(tempPath, filePath);

      await this.updateBuildState(projectName, stage, completed);

      const result: WriteResult = {
        success: true,
        filePath,
        isAlternateLocation: false,
      };

      return result;
    } catch (error: any) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      const errorCode = error?.code || 'UNKNOWN';
      console.error(`[StageManager] Write error for ${filePath}: ${errorMessage} (${errorCode})`);
      console.error(`[StageManager] Write error details:`, {
        projectName,
        stage,
        timestamp: new Date().toISOString(),
      });

      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
        }
      } catch (cleanupError: any) {
        console.warn(
          `[StageManager] Failed to cleanup temp file ${tempPath}:`,
          cleanupError.message
        );
      }

      const alternatePath = path.join(os.tmpdir(), `personaut-${projectName}-${stage}.stage.json`);
      try {
        await fs.promises.writeFile(alternatePath, content, 'utf-8');

        console.warn(`[StageManager] Stage file written to alternate location: ${alternatePath}`, {
          originalPath: filePath,
          originalError: error.message,
          timestamp: new Date().toISOString(),
        });

        const result: WriteResult = {
          success: true,
          filePath: alternatePath,
          isAlternateLocation: true,
          errorMessage: `Original location failed: ${error.message}. File saved to alternate location.`,
        };

        if (this.writeNotificationCallback) {
          this.writeNotificationCallback(result);
        }

        return result;
      } catch (altError: any) {
        console.error(`[StageManager] Failed to write to alternate location ${alternatePath}:`, {
          alternateError: altError.message,
          alternateCode: altError.code,
          originalError: error.message,
          originalCode: error.code,
          projectName,
          stage,
          timestamp: new Date().toISOString(),
        });

        const result: WriteResult = {
          success: false,
          filePath,
          isAlternateLocation: false,
          errorMessage: `Failed to write stage file: ${error.message}. Alternate location also failed: ${altError.message}`,
        };

        if (this.writeNotificationCallback) {
          this.writeNotificationCallback(result);
        }

        throw new Error(result.errorMessage);
      }
    }
  }

  async writeStageFileWithError(
    projectName: string,
    stage: string,
    data: any,
    errorMessage: string
  ): Promise<WriteResult> {
    const filePath = this.getStageFilePath(projectName, stage);
    const projectDir = this.getProjectDir(projectName);

    const stageFile: StageFile = {
      stage,
      completed: false,
      timestamp: Date.now(),
      data,
      version: STAGE_FILE_VERSION,
      error: errorMessage,
    };

    const content = JSON.stringify(stageFile, null, 2);
    const tempPath = `${filePath}.tmp.${Date.now()}`;

    try {
      await fs.promises.mkdir(projectDir, { recursive: true });
      await fs.promises.writeFile(tempPath, content, 'utf-8');
      await fs.promises.rename(tempPath, filePath);

      await this.updateBuildState(projectName, stage, false, errorMessage);

      const result: WriteResult = {
        success: true,
        filePath,
        isAlternateLocation: false,
      };

      return result;
    } catch (error: any) {
      console.error(`[StageManager] Write error (with error state) for ${filePath}:`, {
        error: error.message,
        code: error.code,
        projectName,
        stage,
        stageError: errorMessage,
        timestamp: new Date().toISOString(),
      });

      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
        }
      } catch (cleanupError: any) {
        console.warn(
          `[StageManager] Failed to cleanup temp file ${tempPath}:`,
          cleanupError.message
        );
      }

      const alternatePath = path.join(os.tmpdir(), `personaut-${projectName}-${stage}.stage.json`);
      try {
        await fs.promises.writeFile(alternatePath, content, 'utf-8');

        console.warn(
          `[StageManager] Stage file with error written to alternate location: ${alternatePath}`,
          {
            originalPath: filePath,
            originalError: error.message,
            stageError: errorMessage,
            timestamp: new Date().toISOString(),
          }
        );

        const result: WriteResult = {
          success: true,
          filePath: alternatePath,
          isAlternateLocation: true,
          errorMessage: `Original location failed: ${error.message}. File saved to alternate location.`,
        };

        if (this.writeNotificationCallback) {
          this.writeNotificationCallback(result);
        }

        return result;
      } catch (altError: any) {
        console.error(
          `[StageManager] Failed to write error state to alternate location ${alternatePath}:`,
          {
            alternateError: altError.message,
            alternateCode: altError.code,
            originalError: error.message,
            originalCode: error.code,
            projectName,
            stage,
            stageError: errorMessage,
            timestamp: new Date().toISOString(),
          }
        );

        const result: WriteResult = {
          success: false,
          filePath,
          isAlternateLocation: false,
          errorMessage: `Failed to write stage file with error: ${error.message}. Alternate location also failed: ${altError.message}`,
        };

        if (this.writeNotificationCallback) {
          this.writeNotificationCallback(result);
        }

        throw new Error(result.errorMessage);
      }
    }
  }

  async getStageError(projectName: string, stage: string): Promise<string | null> {
    const state = await this.readBuildState(projectName);
    if (state && state.stages[stage]) {
      return state.stages[stage].error || null;
    }
    const stageFile = await this.readStageFile(projectName, stage);
    if (!stageFile) {
      return null;
    }
    return stageFile.error ?? null;
  }

  async clearStageError(projectName: string, stage: string): Promise<void> {
    const stageFile = await this.readStageFile(projectName, stage);
    if (stageFile) {
      await this.writeStageFile(projectName, stage, stageFile.data, stageFile.completed);
    }
  }

  async isStageComplete(projectName: string, stage: string): Promise<boolean> {
    const state = await this.readBuildState(projectName);
    if (state && state.stages[stage]) {
      return state.stages[stage].completed;
    }

    const stageFile = await this.readStageFile(projectName, stage);
    return stageFile !== null && stageFile.completed === true;
  }

  async getCompletedStages(projectName: string): Promise<string[]> {
    let state = await this.readBuildState(projectName);

    if (!state) {
      state = await this.syncBuildState(projectName);
    }

    if (state) {
      return Object.entries(state.stages)
        .filter(([_, info]) => info.completed)
        .map(([stage, _]) => stage);
    }

    const completedStages: string[] = [];
    for (const stage of STAGE_ORDER) {
      const isComplete = await this.isStageComplete(projectName, stage);
      if (isComplete) {
        completedStages.push(stage);
      }
    }
    return completedStages;
  }

  validateTransition(from: string, to: string, completedStages: string[]): StageTransition {
    const toIndex = STAGE_ORDER.indexOf(to as StageName);

    if (toIndex === -1) {
      return {
        from,
        to,
        valid: false,
        reason: `Invalid stage: ${to}`,
      };
    }

    if (toIndex === 0) {
      return {
        from,
        to,
        valid: true,
      };
    }

    const previousStage = STAGE_ORDER[toIndex - 1];
    if (!completedStages.includes(previousStage)) {
      return {
        from,
        to,
        valid: false,
        reason: `Cannot transition to ${to}: previous stage '${previousStage}' is not complete`,
      };
    }

    return {
      from,
      to,
      valid: true,
    };
  }

  async initializeProject(projectName: string, projectTitle?: string): Promise<void> {
    const projectDir = this.getProjectDir(projectName);
    const planningDir = this.getPlanningDir(projectName);

    // Create project directory and planning subdirectory (Requirements 4.1)
    await fs.promises.mkdir(projectDir, { recursive: true });
    await fs.promises.mkdir(planningDir, { recursive: true });

    const initialState: BuildState = {
      projectName,
      projectTitle: projectTitle || projectName,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      stages: {},
    };
    await this.writeBuildState(projectName, initialState);

    const ideaFilePath = this.getStageFilePath(projectName, 'idea');
    if (!fs.existsSync(ideaFilePath)) {
      await this.writeStageFile(projectName, 'idea', {}, false);
    }
  }

  private async handleCorruptedFile(filePath: string, errorMessage: string): Promise<void> {
    const corruptedPath = `${filePath}.corrupted.${Date.now()}`;
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.rename(filePath, corruptedPath);
        console.error(`Corrupted stage file renamed to: ${corruptedPath}. Error: ${errorMessage}`);
      }
    } catch (renameError: any) {
      console.error(`Failed to rename corrupted file: ${renameError.message}`);
    }
  }

  stageFileExists(projectName: string, stage: string): boolean {
    const filePath = this.getStageFilePath(projectName, stage);
    return fs.existsSync(filePath);
  }

  async getAllStageFiles(projectName: string): Promise<Map<string, StageFile>> {
    const stageFiles = new Map<string, StageFile>();

    for (const stage of STAGE_ORDER) {
      const stageFile = await this.readStageFile(projectName, stage);
      if (stageFile) {
        stageFiles.set(stage, stageFile);
      }
    }

    return stageFiles;
  }

  /**
   * Get all project names in the base directory.
   */
  async getProjects(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.baseDir)) {
        return [];
      }

      const entries = await fs.promises.readdir(this.baseDir, { withFileTypes: true });
      const projects: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Check if it has a build-state.json file to confirm it's a project
          const buildStatePath = path.join(this.baseDir, entry.name, 'build-state.json');
          if (fs.existsSync(buildStatePath)) {
            projects.push(entry.name);
          }
        }
      }

      return projects;
    } catch (error) {
      console.error('[StageManager] Error getting projects:', error);
      return [];
    }
  }

  // ==================== Migration Methods (Task 4) ====================

  /**
   * Detect if a project uses the old file structure.
   * Checks for `{projectName}.json` or `{stage}.stage.json` in project root.
   * Validates: Requirements 7.1
   */
  detectOldStructure(projectName: string): boolean {
    const projectDir = this.getProjectDir(projectName);
    if (!fs.existsSync(projectDir)) {
      return false;
    }

    // Check for old-style idea file
    const oldIdeaPath = path.join(projectDir, `${projectName}.json`);
    if (fs.existsSync(oldIdeaPath)) {
      return true;
    }

    // Check for old-style stage files
    for (const stage of STAGE_ORDER) {
      if (stage === 'idea') continue; // Already checked above
      const oldStagePath = path.join(projectDir, `${stage}.stage.json`);
      if (fs.existsSync(oldStagePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create a timestamped backup of existing stage files.
   * Validates: Requirements 7.2
   */
  async createMigrationBackup(projectName: string): Promise<string> {
    const projectDir = this.getProjectDir(projectName);
    const timestamp = Date.now();
    const backupDir = path.join(projectDir, `.backup-${timestamp}`);

    await fs.promises.mkdir(backupDir, { recursive: true });

    // Copy old-style idea file
    const oldIdeaPath = path.join(projectDir, `${projectName}.json`);
    if (fs.existsSync(oldIdeaPath)) {
      await fs.promises.copyFile(oldIdeaPath, path.join(backupDir, `${projectName}.json`));
    }

    // Copy old-style stage files
    for (const stage of STAGE_ORDER) {
      if (stage === 'idea') continue;
      const oldStagePath = path.join(projectDir, `${stage}.stage.json`);
      if (fs.existsSync(oldStagePath)) {
        await fs.promises.copyFile(oldStagePath, path.join(backupDir, `${stage}.stage.json`));
      }
    }

    console.log(`[StageManager] Created migration backup at: ${backupDir}`);
    return backupDir;
  }

  /**
   * Migrate project files to new structure.
   * Validates: Requirements 7.1, 7.4
   */
  async migrateProjectStructure(projectName: string): Promise<void> {
    const projectDir = this.getProjectDir(projectName);
    const planningDir = this.getPlanningDir(projectName);

    // Create planning directory
    await fs.promises.mkdir(planningDir, { recursive: true });

    // Migrate old-style idea file
    const oldIdeaPath = path.join(projectDir, `${projectName}.json`);
    const newIdeaPath = this.getStageFilePath(projectName, 'idea');
    if (fs.existsSync(oldIdeaPath)) {
      await fs.promises.copyFile(oldIdeaPath, newIdeaPath);
      await fs.promises.unlink(oldIdeaPath);
      console.log(`[StageManager] Migrated: ${oldIdeaPath} -> ${newIdeaPath}`);
    }

    // Migrate old-style stage files
    for (const stage of STAGE_ORDER) {
      if (stage === 'idea') continue;
      const oldStagePath = path.join(projectDir, `${stage}.stage.json`);
      const newStagePath = this.getStageFilePath(projectName, stage);
      if (fs.existsSync(oldStagePath)) {
        await fs.promises.copyFile(oldStagePath, newStagePath);
        await fs.promises.unlink(oldStagePath);
        console.log(`[StageManager] Migrated: ${oldStagePath} -> ${newStagePath}`);
      }
    }

    // Update build-state.json paths
    const state = await this.readBuildState(projectName);
    if (state && state.stages) {
      for (const stage of Object.keys(state.stages)) {
        state.stages[stage].path = `planning/${stage}.json`;
      }
      await this.writeBuildState(projectName, state);
    }

    console.log(`[StageManager] Migration completed for project: ${projectName}`);
  }

  /**
   * Restore files from backup directory on migration failure.
   * Validates: Requirements 7.3
   */
  async restoreFromBackup(projectName: string, backupDir: string): Promise<void> {
    const projectDir = this.getProjectDir(projectName);

    try {
      const backupFiles = await fs.promises.readdir(backupDir);

      for (const file of backupFiles) {
        const backupPath = path.join(backupDir, file);
        const restorePath = path.join(projectDir, file);
        await fs.promises.copyFile(backupPath, restorePath);
        console.log(`[StageManager] Restored: ${backupPath} -> ${restorePath}`);
      }

      console.log(`[StageManager] Restore from backup completed for project: ${projectName}`);
    } catch (error) {
      console.error(`[StageManager] Failed to restore from backup: ${error}`);
      throw error;
    }
  }

  /**
   * Orchestrator method: detect, backup, migrate, handle errors with rollback.
   * Called during project load if old structure detected.
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4
   */
  async migrateIfNeeded(projectName: string): Promise<boolean> {
    if (!this.detectOldStructure(projectName)) {
      return false; // No migration needed
    }

    console.log(`[StageManager] Old file structure detected for project: ${projectName}. Starting migration...`);

    let backupDir: string | null = null;

    try {
      // Create backup
      backupDir = await this.createMigrationBackup(projectName);

      // Perform migration
      await this.migrateProjectStructure(projectName);

      return true;
    } catch (error) {
      console.error(`[StageManager] Migration failed for project ${projectName}:`, error);

      // Attempt rollback if backup was created
      if (backupDir) {
        try {
          await this.restoreFromBackup(projectName, backupDir);
          console.log(`[StageManager] Rollback successful for project: ${projectName}`);
        } catch (restoreError) {
          console.error(`[StageManager] Rollback failed:`, restoreError);
        }
      }

      throw error;
    }
  }

  // ==================== Iteration Data Methods (Task 6) ====================

  /**
   * Save feedback for an iteration.
   * Validates: Requirements 5.2
   */
  async saveIterationFeedback(
    projectName: string,
    iterationNumber: number,
    feedback: any[]
  ): Promise<void> {
    const iterationDir = this.getIterationDir(projectName, iterationNumber);
    const feedbackPath = this.getFeedbackPath(projectName, iterationNumber);

    // Create iteration directory if not exists
    await fs.promises.mkdir(iterationDir, { recursive: true });

    const content = JSON.stringify(feedback, null, 2);
    await fs.promises.writeFile(feedbackPath, content, 'utf-8');

    console.log(`[StageManager] Saved feedback for iteration ${iterationNumber}: ${feedbackPath}`);
  }

  /**
   * Save consolidated feedback for an iteration.
   * Validates: Requirements 5.3
   */
  async saveConsolidatedFeedback(
    projectName: string,
    iterationNumber: number,
    markdown: string
  ): Promise<void> {
    const iterationDir = this.getIterationDir(projectName, iterationNumber);
    const consolidatedPath = this.getConsolidatedFeedbackPath(projectName, iterationNumber);

    // Create iteration directory if not exists
    await fs.promises.mkdir(iterationDir, { recursive: true });

    await fs.promises.writeFile(consolidatedPath, markdown, 'utf-8');

    console.log(`[StageManager] Saved consolidated feedback for iteration ${iterationNumber}: ${consolidatedPath}`);
  }

  /**
   * Save a screenshot for an iteration.
   * Validates: Requirements 5.4
   */
  async saveScreenshot(
    projectName: string,
    iterationNumber: number,
    pageName: string,
    data: Buffer
  ): Promise<string> {
    const iterationDir = this.getIterationDir(projectName, iterationNumber);
    const screenshotPath = this.getScreenshotPath(projectName, iterationNumber, pageName);

    // Create iteration directory if not exists
    await fs.promises.mkdir(iterationDir, { recursive: true });

    await fs.promises.writeFile(screenshotPath, data);

    console.log(`[StageManager] Saved screenshot for iteration ${iterationNumber}: ${screenshotPath}`);
    return screenshotPath;
  }

  /**
   * Load iteration data including feedback, consolidated feedback, and screenshots.
   * Validates: Requirements 5.5
   */
  async loadIterationData(
    projectName: string,
    iterationNumber: number
  ): Promise<{
    feedback: any[] | null;
    consolidatedFeedback: string | null;
    screenshots: string[];
  } | null> {
    const iterationDir = this.getIterationDir(projectName, iterationNumber);

    if (!fs.existsSync(iterationDir)) {
      return null;
    }

    let feedback: any[] | null = null;
    let consolidatedFeedback: string | null = null;
    const screenshots: string[] = [];

    // Read feedback.json
    const feedbackPath = this.getFeedbackPath(projectName, iterationNumber);
    if (fs.existsSync(feedbackPath)) {
      try {
        const content = await fs.promises.readFile(feedbackPath, 'utf-8');
        feedback = JSON.parse(content);
      } catch (error) {
        console.error(`[StageManager] Error reading feedback: ${error}`);
      }
    }

    // Read consolidated-feedback.md
    const consolidatedPath = this.getConsolidatedFeedbackPath(projectName, iterationNumber);
    if (fs.existsSync(consolidatedPath)) {
      try {
        consolidatedFeedback = await fs.promises.readFile(consolidatedPath, 'utf-8');
      } catch (error) {
        console.error(`[StageManager] Error reading consolidated feedback: ${error}`);
      }
    }

    // List screenshots
    try {
      const files = await fs.promises.readdir(iterationDir);
      for (const file of files) {
        if (file.endsWith('.png')) {
          screenshots.push(path.join(iterationDir, file));
        }
      }
    } catch (error) {
      console.error(`[StageManager] Error listing screenshots: ${error}`);
    }

    return {
      feedback,
      consolidatedFeedback,
      screenshots,
    };
  }

  /**
   * Save UX specifications for an iteration page.
   * Saves to: .personaut/{project}/iterations/{page}/{iteration}/ux-specs.md
   */
  async saveUxSpecs(
    projectName: string,
    iterationNumber: number,
    pageName: string,
    specs: string
  ): Promise<string> {
    // Sanitize page name for directory
    const pageDir = pageName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    const iterationDir = path.join(
      this.baseDir,
      projectName,
      'iterations',
      pageDir,
      String(iterationNumber)
    );
    const specsPath = path.join(iterationDir, 'ux-specs.md');

    // Create directory if not exists
    await fs.promises.mkdir(iterationDir, { recursive: true });

    await fs.promises.writeFile(specsPath, specs, 'utf-8');

    console.log(`[StageManager] Saved UX specs for ${pageName} iteration ${iterationNumber}: ${specsPath}`);
    return specsPath;
  }
}
