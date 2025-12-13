/**
 * BuildLogManager - Manages build interaction logs for the build workflow.
 *
 * Implements build log operations:
 * - Read/write build logs with atomic operations
 * - Append log entries without overwriting
 * - Initialize empty build logs for new projects
 *
 * Validates: Requirements 5.1, 5.2, 5.3
 */

import * as fs from 'fs';
import * as path from 'path';
import { BuildLog, BuildLogEntry } from '../types/BuildModeTypes';

/**
 * Result of a write operation for build logs.
 */
export interface BuildLogWriteResult {
  success: boolean;
  filePath: string;
  errorMessage?: string;
}

export class BuildLogManager {
  private readonly baseDir: string;

  constructor(baseDir: string = '.personaut') {
    this.baseDir = baseDir;
  }

  getBuildLogPath(projectName: string): string {
    return path.join(this.baseDir, projectName, 'build-log.json');
  }

  getProjectDir(projectName: string): string {
    return path.join(this.baseDir, projectName);
  }

  async readBuildLog(projectName: string): Promise<BuildLog | null> {
    const filePath = this.getBuildLogPath(projectName);
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content) as BuildLog;

      if (
        typeof parsed.projectName !== 'string' ||
        !Array.isArray(parsed.entries) ||
        typeof parsed.createdAt !== 'number' ||
        typeof parsed.lastUpdated !== 'number'
      ) {
        console.warn(`[BuildLogManager] Invalid build log format for ${projectName}`);
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn(`[BuildLogManager] Failed to read build log for ${projectName}:`, error);
      return null;
    }
  }

  async writeBuildLog(projectName: string, log: BuildLog): Promise<BuildLogWriteResult> {
    const filePath = this.getBuildLogPath(projectName);
    const projectDir = this.getProjectDir(projectName);
    const content = JSON.stringify(log, null, 2);

    const tempPath = `${filePath}.tmp.${Date.now()}`;

    try {
      await fs.promises.mkdir(projectDir, { recursive: true });
      await fs.promises.writeFile(tempPath, content, 'utf-8');
      await fs.promises.rename(tempPath, filePath);

      return {
        success: true,
        filePath,
      };
    } catch (error: any) {
      console.error(`[BuildLogManager] Write error for ${filePath}:`, {
        error: error.message,
        code: error.code,
        projectName,
        timestamp: new Date().toISOString(),
      });

      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
        }
      } catch (cleanupError: any) {
        console.warn(
          `[BuildLogManager] Failed to cleanup temp file ${tempPath}:`,
          cleanupError.message
        );
      }

      return {
        success: false,
        filePath,
        errorMessage: `Failed to write build log: ${error.message}`,
      };
    }
  }

  async appendLogEntry(projectName: string, entry: BuildLogEntry): Promise<BuildLogWriteResult> {
    let log = await this.readBuildLog(projectName);

    if (!log) {
      log = {
        projectName,
        entries: [],
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      };
    }

    log.entries.push(entry);
    log.lastUpdated = Date.now();

    return this.writeBuildLog(projectName, log);
  }

  async initializeBuildLog(projectName: string): Promise<BuildLogWriteResult> {
    const log: BuildLog = {
      projectName,
      entries: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };
    return this.writeBuildLog(projectName, log);
  }

  buildLogExists(projectName: string): boolean {
    const filePath = this.getBuildLogPath(projectName);
    return fs.existsSync(filePath);
  }

  async getEntryCount(projectName: string): Promise<number> {
    const log = await this.readBuildLog(projectName);
    return log ? log.entries.length : 0;
  }

  async clearBuildLog(projectName: string): Promise<BuildLogWriteResult> {
    const log = await this.readBuildLog(projectName);

    if (!log) {
      return this.initializeBuildLog(projectName);
    }

    log.entries = [];
    log.lastUpdated = Date.now();

    return this.writeBuildLog(projectName, log);
  }
}
