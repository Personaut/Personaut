/**
 * StateManagementHandler manages build state and project metadata.
 * 
 * Responsibilities:
 * - Get and manage build state
 * - Handle stage completion and transitions
 * - Load and save build data
 * - Manage project history
 * - Check project names and validate transitions
 * 
 * This handler was extracted from BuildModeHandler to improve code organization.
 */

import { WebviewMessage } from '../../../../shared/types/CommonTypes';
import { BuildModeService } from '../../services/BuildModeService';
import { StageManager } from '../../services/StageManager';
import { ErrorSanitizer } from '../../../../shared/services/ErrorSanitizer';
import { StageName } from '../../types/BuildModeTypes';

export class StateManagementHandler {
    private readonly VALID_STAGES = ['idea', 'team', 'users', 'features', 'stories', 'design', 'building', 'state', 'personas'];

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
        if (!this.VALID_STAGES.includes(stage)) {
            throw new Error(`Invalid stage name: ${stage}`);
        }
    }

    /**
     * Handle get build state request
     */
    async handleGetBuildState(message: WebviewMessage, webview: any): Promise<void> {
        if (!message.projectName) {
            throw new Error('Project name is required');
        }

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
    async handleGetActiveBuildStatus(_message: WebviewMessage, webview: any): Promise<void> {
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
     * Handle complete stage request
     */
    async handleCompleteStage(message: WebviewMessage, webview: any): Promise<void> {
        if (!message.projectName || !message.stage) {
            throw new Error('Project name and stage are required');
        }

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
     * Handle validate transition request
     */
    async handleValidateTransition(message: WebviewMessage, webview: any): Promise<void> {
        if (!message.projectName || !message.fromStage || !message.toStage) {
            throw new Error('Project name, from stage, and to stage are required');
        }

        this.validateProjectName(message.projectName);
        this.validateStageName(message.fromStage);
        this.validateStageName(message.toStage);

        const isValid = await this.buildModeService.validateTransition(
            message.projectName,
            message.fromStage as StageName,
            message.toStage as StageName
        );

        webview.postMessage({
            type: 'transition-validated',
            projectName: message.projectName,
            fromStage: message.fromStage,
            toStage: message.toStage,
            isValid,
        });
    }

    /**
     * Handle get completed stages request
     */
    async handleGetCompletedStages(message: WebviewMessage, webview: any): Promise<void> {
        if (!message.projectName) {
            throw new Error('Project name is required');
        }

        this.validateProjectName(message.projectName);

        const completedStages = await this.buildModeService.getCompletedStages(message.projectName);

        webview.postMessage({
            type: 'completed-stages',
            projectName: message.projectName,
            completedStages,
        });
    }

    /**
   * Handle load build data request
   */
    async handleLoadBuildData(message: WebviewMessage, webview: any): Promise<void> {
        if (!message.projectName || !message.dataType) {
            throw new Error('Project name and data type are required');
        }

        this.validateProjectName(message.projectName);
        this.validateStageName(message.dataType);

        console.log('[StateManagementHandler] Loading build data:', {
            projectName: message.projectName,
            dataType: message.dataType
        });

        try {
            const data = await this.buildModeService.loadStage(message.projectName, message.dataType);

            webview.postMessage({
                type: 'build-data-loaded',
                projectName: message.projectName,
                dataType: message.dataType,
                data,
            });

            console.log('[StateManagementHandler] Build data loaded successfully');
        } catch (error: any) {
            console.error('[StateManagementHandler] Failed to load build data:', error);

            webview.postMessage({
                type: 'build-data-load-error',
                projectName: message.projectName,
                dataType: message.dataType,
                error: this.errorSanitizer.sanitize(error).userMessage,
            });
        }
    }

    /**
     * Handle save build data request
     */
    async handleSaveBuildData(message: WebviewMessage, webview: any): Promise<void> {
        if (!message.projectName || !message.dataType) {
            throw new Error('Project name and data type are required');
        }

        this.validateProjectName(message.projectName);
        this.validateStageName(message.dataType);

        console.log('[StateManagementHandler] Saving build data:', {
            projectName: message.projectName,
            dataType: message.dataType,
            dataKeys: message.data ? Object.keys(message.data) : [],
        });

        try {
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

            console.log('[StateManagementHandler] Build data saved successfully');
        } catch (error: any) {
            console.error('[StateManagementHandler] Failed to save build data:', error);

            webview.postMessage({
                type: 'build-data-save-error',
                projectName: message.projectName,
                dataType: message.dataType,
                error: this.errorSanitizer.sanitize(error).userMessage,
            });
        }
    }

    /**
   * Handle get project history request
   */
    async handleGetProjectHistory(_message: WebviewMessage, webview: any): Promise<void> {
        console.log('[StateManagementHandler] Getting project history');

        try {
            const projects = await this.buildModeService.getAllProjects();

            webview.postMessage({
                type: 'project-history',
                projects,
            });

            console.log('[StateManagementHandler] Project history retrieved:', { count: projects.length });
        } catch (error: any) {
            console.error('[StateManagementHandler] Failed to get project history:', error);

            webview.postMessage({
                type: 'project-history-error',
                error: this.errorSanitizer.sanitize(error).userMessage,
            });
        }
    }

    /**
     * Handle check project name request
     */
    async handleCheckProjectName(message: WebviewMessage, webview: any): Promise<void> {
        if (!message.projectName) {
            throw new Error('Project name is required');
        }

        this.validateProjectName(message.projectName);

        console.log('[StateManagementHandler] Checking project name:', { projectName: message.projectName });

        try {
            const exists = await this.buildModeService.projectExists(message.projectName);

            webview.postMessage({
                type: 'project-name-checked',
                projectName: message.projectName,
                exists,
            });

            console.log('[StateManagementHandler] Project name checked:', {
                projectName: message.projectName,
                exists,
            });
        } catch (error: any) {
            console.error('[StateManagementHandler] Failed to check project name:', error);

            webview.postMessage({
                type: 'project-name-check-error',
                projectName: message.projectName,
                error: this.errorSanitizer.sanitize(error).userMessage,
            });
        }
    }

    /**
     * Handle load iteration data request
     */
    async handleLoadIterationData(message: WebviewMessage, webview: any): Promise<void> {
        if (!message.projectName || message.iterationNumber === undefined) {
            throw new Error('Project name and iteration number are required');
        }

        this.validateProjectName(message.projectName);

        console.log('[StateManagementHandler] Loading iteration data:', {
            projectName: message.projectName,
            iterationNumber: message.iterationNumber,
        });

        try {
            const iterationData = await this.stageManager.loadIterationData(
                message.projectName,
                message.iterationNumber
            );

            webview.postMessage({
                type: 'iteration-data-loaded',
                projectName: message.projectName,
                iterationNumber: message.iterationNumber,
                iterationData,
            });

            console.log('[StateManagementHandler] Iteration data loaded successfully');
        } catch (error: any) {
            console.error('[StateManagementHandler] Failed to load iteration data:', error);

            webview.postMessage({
                type: 'iteration-data-load-error',
                projectName: message.projectName,
                iterationNumber: message.iterationNumber,
                error: this.errorSanitizer.sanitize(error).userMessage,
            });
        }
    }
}
