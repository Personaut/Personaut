"use strict";
/**
 * BuildModeHandler handles build-mode-related webview messages.
 *
 * Responsibilities:
 * - Route build mode messages to appropriate service methods
 * - Validate input before processing
 * - Handle errors and send responses to webview
 * - Manage streaming content updates
 *
 * Validates: Requirements 5.1, 10.1, 10.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildModeHandler = void 0;
const ErrorSanitizer_1 = require("../../../shared/services/ErrorSanitizer");
const StageManager_1 = require("../services/StageManager");
const BuildModeTypes_1 = require("../types/BuildModeTypes");
class BuildModeHandler {
    constructor(buildModeService, _stageManager, _contentStreamer, _buildLogManager, inputValidator) {
        this.buildModeService = buildModeService;
        this.inputValidator = inputValidator;
        /** Valid stage names for whitelist validation */
        this.VALID_STAGES = [...BuildModeTypes_1.STAGE_ORDER, 'state', 'personas', 'features', 'stories', 'team'];
        this.errorSanitizer = new ErrorSanitizer_1.ErrorSanitizer();
    }
    /**
     * Validate project name to prevent path traversal attacks.
     * @throws Error if project name is invalid or contains path traversal characters
     */
    validateProjectName(projectName) {
        if (!projectName) {
            throw new Error('Project name is required');
        }
        if (!(0, StageManager_1.isValidProjectName)(projectName)) {
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
    validateStageName(stage) {
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
    async handle(message, webview) {
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
                default:
                    console.warn(`[BuildModeHandler] Unknown message type: ${message.type}`);
            }
        }
        catch (error) {
            await this.handleError(error, webview, message.type);
        }
    }
    /**
     * Handle initialize project request.
     */
    async handleInitializeProject(message, webview) {
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
    async handleSaveStageFile(message, webview) {
        if (!message.projectName || !message.stage) {
            throw new Error('Project name and stage are required');
        }
        // Security: Validate inputs to prevent path traversal
        this.validateProjectName(message.projectName);
        this.validateStageName(message.stage);
        await this.buildModeService.saveStage(message.projectName, message.stage, message.data || {}, message.completed || false);
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
    async handleLoadStageFile(message, webview) {
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
     */
    async handleGenerateContent(message, webview) {
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
        // This would integrate with an AI provider to generate content
        // For now, just acknowledge the request
        webview.postMessage({
            type: 'content-generation-started',
            projectName: message.projectName,
            stage: message.stage,
        });
        // The actual streaming would be handled by the ContentStreamer
        // in coordination with an AI provider
    }
    /**
     * Handle get build state request.
     */
    async handleGetBuildState(message, webview) {
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
    async handleGetBuildLog(message, webview) {
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
    async handleAppendLogEntry(message, webview) {
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
    async handleCompleteStage(message, webview) {
        if (!message.projectName || !message.stage) {
            throw new Error('Project name and stage are required');
        }
        // Security: Validate inputs to prevent path traversal
        this.validateProjectName(message.projectName);
        this.validateStageName(message.stage);
        await this.buildModeService.completeStage(message.projectName, message.stage);
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
    async handleValidateTransition(message, webview) {
        if (!message.projectName || !message.from || !message.to) {
            throw new Error('Project name, from stage, and to stage are required');
        }
        // Security: Validate inputs to prevent path traversal
        this.validateProjectName(message.projectName);
        this.validateStageName(message.from);
        this.validateStageName(message.to);
        const transition = await this.buildModeService.validateTransition(message.from, message.to, message.projectName);
        webview.postMessage({
            type: 'transition-validated',
            projectName: message.projectName,
            transition,
        });
    }
    /**
     * Handle get completed stages request.
     */
    async handleGetCompletedStages(message, webview) {
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
    async handleRetryGeneration(message, webview) {
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
    async handleCheckProjectFiles(message, webview) {
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
    async handleLoadBuildData(message, webview) {
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
    async handleSaveBuildData(message, webview) {
        if (!message.projectName || !message.dataType) {
            throw new Error('Project name and data type are required');
        }
        // Security: Validate inputs to prevent path traversal
        this.validateProjectName(message.projectName);
        this.validateStageName(message.dataType);
        await this.buildModeService.saveStage(message.projectName, message.dataType, message.data || {}, false);
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
    async handleGetProjectHistory(_message, webview) {
        const projects = await this.buildModeService.getProjects();
        webview.postMessage({
            type: 'project-history',
            projects,
        });
    }
    /**
     * Handle check project name request.
     */
    async handleCheckProjectName(message, webview) {
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
    async handleCaptureScreenshot(message, webview) {
        // Screenshot capture is not implemented in the new architecture
        // This would require integration with a screenshot service
        webview.postMessage({
            type: 'screenshot-error',
            error: 'Screenshot capture is not yet implemented',
            url: message.url,
        });
    }
    /**
     * Handle errors and send sanitized error messages to webview.
     */
    async handleError(error, webview, messageType) {
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
exports.BuildModeHandler = BuildModeHandler;
//# sourceMappingURL=BuildModeHandler.js.map