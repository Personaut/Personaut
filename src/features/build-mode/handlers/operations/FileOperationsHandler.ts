/**
 * FileOperationsHandler manages file save/load operations for Build Mode.
 * 
 * Responsibilities:
 * - Save and load stage files
 * 
 * This handler was extracted from BuildModeHandler to improve code organization.
 */

import { WebviewMessage } from '../../../../shared/types/CommonTypes';
import { BuildModeService } from '../../services/BuildModeService';
import { StageManager } from '../../services/StageManager';
import { ErrorSanitizer } from '../../../../shared/services/ErrorSanitizer';

export class FileOperationsHandler {
    constructor(
        private readonly buildModeService: BuildModeService,
        private readonly stageManager: StageManager,
        private readonly errorSanitizer: ErrorSanitizer
    ) { }

    /**
     * Validate project name to prevent path traversal attacks.
     * @throws Error if project name is invalid
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
     * Validate stage name against whitelist.
     * @throws Error if stage name is invalid
     */
    private validateStageName(stage: string): void {
        const VALID_STAGES = ['idea', 'team', 'users', 'features', 'stories', 'design', 'building', 'state', 'personas'];
        if (!VALID_STAGES.includes(stage)) {
            throw new Error(`Invalid stage name: ${stage}`);
        }
    }

    /**
     * Handle save stage file request
     */
    async handleSaveStageFile(message: WebviewMessage, webview: any): Promise<void> {
        const { projectName, stage, data, completed } = message;

        if (!projectName || !stage) {
            throw new Error('Project name and stage are required');
        }

        this.validateProjectName(projectName);
        this.validateStageName(stage);

        console.log('[FileOperationsHandler] Saving stage file:', {
            projectName,
            stage,
            dataKeys: data ? Object.keys(data) : [],
            completed: completed ?? true, // Default to true if data is provided
        });

        try {
            // Use completed flag from message, default to true if data exists
            const isCompleted = completed !== undefined ? completed : (data && Object.keys(data).length > 0);
            await this.buildModeService.saveStage(projectName, stage, data, isCompleted);

            webview.postMessage({
                type: 'stage-file-saved',
                projectName,
                stage,
                success: true,
            });

            console.log('[FileOperationsHandler] Stage file saved successfully');
        } catch (error: any) {
            console.error('[FileOperationsHandler] Failed to save stage file:', error);

            webview.postMessage({
                type: 'stage-file-save-error',
                projectName,
                stage,
                error: this.errorSanitizer.sanitize(error).userMessage,
            });
        }
    }

    /**
     * Handle load stage file request
     */
    async handleLoadStageFile(message: WebviewMessage, webview: any): Promise<void> {
        const { projectName, stage } = message;

        if (!projectName || !stage) {
            throw new Error('Project name and stage are required');
        }

        this.validateProjectName(projectName);
        this.validateStageName(stage);

        console.log('[FileOperationsHandler] Loading stage file:', { projectName, stage });

        try {
            // Load the full stage file (including completed flag) directly from StageManager
            const stageFile = await this.stageManager.readStageFile(projectName, stage);

            webview.postMessage({
                type: 'stage-file-loaded',
                projectName,
                stage,
                stageFile,  // Send full stage file with completed, timestamp, and data
            });

            console.log('[FileOperationsHandler] Stage file loaded successfully:', {
                stage,
                completed: stageFile?.completed,
                hasData: !!stageFile?.data,
            });
        } catch (error: any) {
            console.error('[FileOperationsHandler] Failed to load stage file:', error);

            webview.postMessage({
                type: 'stage-file-load-error',
                projectName,
                stage,
                error: this.errorSanitizer.sanitize(error).userMessage,
            });
        }
    }
}
