"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StageManager = void 0;
exports.validateBuildState = validateBuildState;
exports.sanitizeProjectName = sanitizeProjectName;
exports.isValidProjectName = isValidProjectName;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const BuildModeTypes_1 = require("../types/BuildModeTypes");
/**
 * Validate that a BuildState object contains all required fields with correct types.
 *
 * @param state - The BuildState object to validate
 * @returns BuildStateValidationResult with validation status and any errors/warnings
 */
function validateBuildState(state) {
    const errors = [];
    const warnings = [];
    if (state === null || typeof state !== 'object') {
        errors.push('BuildState must be a non-null object');
        return { valid: false, errors, warnings };
    }
    const obj = state;
    if (typeof obj.projectName !== 'string') {
        errors.push('projectName must be a string');
    }
    else if (obj.projectName.length === 0) {
        errors.push('projectName cannot be empty');
    }
    if (obj.projectTitle !== undefined && typeof obj.projectTitle !== 'string') {
        errors.push('projectTitle must be a string when provided');
    }
    if (typeof obj.createdAt !== 'number') {
        errors.push('createdAt must be a number (timestamp)');
    }
    else if (obj.createdAt < 0) {
        warnings.push('createdAt should be a positive timestamp');
    }
    if (typeof obj.lastUpdated !== 'number') {
        errors.push('lastUpdated must be a number (timestamp)');
    }
    else if (obj.lastUpdated < 0) {
        warnings.push('lastUpdated should be a positive timestamp');
    }
    if (obj.stages === null || typeof obj.stages !== 'object') {
        errors.push('stages must be a non-null object');
    }
    else {
        const stages = obj.stages;
        for (const [stageName, stageInfo] of Object.entries(stages)) {
            if (stageInfo === null || typeof stageInfo !== 'object') {
                errors.push(`stages.${stageName} must be a non-null object`);
                continue;
            }
            const info = stageInfo;
            if (typeof info.completed !== 'boolean') {
                errors.push(`stages.${stageName}.completed must be a boolean`);
            }
            if (typeof info.path !== 'string') {
                errors.push(`stages.${stageName}.path must be a string`);
            }
            else if (info.path.length === 0) {
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
function sanitizeProjectName(title) {
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
function isValidProjectName(name) {
    if (!name || name.length === 0 || name.length > 50) {
        return false;
    }
    return /^[a-z0-9][a-z0-9-_]*[a-z0-9]$|^[a-z0-9]$/.test(name);
}
class StageManager {
    constructor(baseDir = '.personaut', writeNotificationCallback) {
        this.baseDir = baseDir;
        this.writeNotificationCallback = writeNotificationCallback;
    }
    setWriteNotificationCallback(callback) {
        this.writeNotificationCallback = callback;
    }
    getStageFilePath(projectName, stage) {
        return path.join(this.baseDir, projectName, `${stage}.stage.json`);
    }
    getBuildStatePath(projectName) {
        return path.join(this.baseDir, projectName, 'build-state.json');
    }
    getProjectDir(projectName) {
        return path.join(this.baseDir, projectName);
    }
    projectExists(projectName) {
        const projectDir = this.getProjectDir(projectName);
        return fs.existsSync(projectDir);
    }
    async projectExistsAsync(projectName) {
        const projectDir = this.getProjectDir(projectName);
        try {
            await fs.promises.access(projectDir);
            return true;
        }
        catch {
            return false;
        }
    }
    async readBuildState(projectName) {
        const filePath = this.getBuildStatePath(projectName);
        try {
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const state = JSON.parse(content);
            if (!state.projectTitle) {
                state.projectTitle = state.projectName;
            }
            if (!state.stages || typeof state.stages !== 'object') {
                state.stages = {};
            }
            return state;
        }
        catch (error) {
            console.warn(`[StageManager] Failed to read build state for ${projectName}:`, error);
            return null;
        }
    }
    async writeBuildState(projectName, state) {
        const filePath = this.getBuildStatePath(projectName);
        const projectDir = this.getProjectDir(projectName);
        const stateToWrite = {
            ...state,
            projectTitle: state.projectTitle || state.projectName,
        };
        const content = JSON.stringify(stateToWrite, null, 2);
        const tempPath = `${filePath}.tmp.${Date.now()}`;
        try {
            await fs.promises.mkdir(projectDir, { recursive: true });
            await fs.promises.writeFile(tempPath, content, 'utf-8');
            await fs.promises.rename(tempPath, filePath);
        }
        catch (error) {
            console.error(`[StageManager] Failed to write build state for ${projectName}:`, error);
            try {
                if (fs.existsSync(tempPath)) {
                    await fs.promises.unlink(tempPath);
                }
            }
            catch (cleanupError) {
                console.warn(`[StageManager] Failed to cleanup temp file ${tempPath}:`, cleanupError.message);
            }
            throw error;
        }
    }
    async updateBuildState(projectName, stage, completed, error) {
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
            path: `${stage}.stage.json`,
            updatedAt: Date.now(),
            error,
        };
        await this.writeBuildState(projectName, state);
    }
    async syncBuildState(projectName) {
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
                path: `${stage}.stage.json`,
                updatedAt: file.timestamp,
                error: file.error,
            };
        }
        state.lastUpdated = Date.now();
        await this.writeBuildState(projectName, state);
        return state;
    }
    async readStageFile(projectName, stage) {
        let filePath;
        const state = await this.readBuildState(projectName);
        if (state && state.stages[stage] && state.stages[stage].path) {
            filePath = path.join(this.getProjectDir(projectName), state.stages[stage].path);
        }
        else {
            filePath = this.getStageFilePath(projectName, stage);
        }
        try {
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(content);
            if (typeof parsed.stage !== 'string' ||
                typeof parsed.completed !== 'boolean' ||
                typeof parsed.timestamp !== 'number') {
                throw new Error('Invalid stage file format: missing required fields');
            }
            return parsed;
        }
        catch (error) {
            if (error instanceof SyntaxError ||
                error instanceof TypeError ||
                error.message.includes('Invalid stage file format')) {
                await this.handleCorruptedFile(filePath, error.message);
            }
            console.error(`Error reading stage file ${filePath}:`, error.message);
            return null;
        }
    }
    async writeStageFile(projectName, stage, data, completed) {
        const filePath = this.getStageFilePath(projectName, stage);
        const projectDir = this.getProjectDir(projectName);
        const stageFile = {
            stage,
            completed,
            timestamp: Date.now(),
            data,
            version: BuildModeTypes_1.STAGE_FILE_VERSION,
        };
        const content = JSON.stringify(stageFile, null, 2);
        const tempPath = `${filePath}.tmp.${Date.now()}`;
        try {
            await fs.promises.mkdir(projectDir, { recursive: true });
            await fs.promises.writeFile(tempPath, content, 'utf-8');
            await fs.promises.rename(tempPath, filePath);
            await this.updateBuildState(projectName, stage, completed);
            const result = {
                success: true,
                filePath,
                isAlternateLocation: false,
            };
            return result;
        }
        catch (error) {
            console.error(`[StageManager] Write error for ${filePath}:`, {
                error: error.message,
                code: error.code,
                projectName,
                stage,
                timestamp: new Date().toISOString(),
            });
            try {
                if (fs.existsSync(tempPath)) {
                    await fs.promises.unlink(tempPath);
                }
            }
            catch (cleanupError) {
                console.warn(`[StageManager] Failed to cleanup temp file ${tempPath}:`, cleanupError.message);
            }
            const alternatePath = path.join(os.tmpdir(), `personaut-${projectName}-${stage}.stage.json`);
            try {
                await fs.promises.writeFile(alternatePath, content, 'utf-8');
                console.warn(`[StageManager] Stage file written to alternate location: ${alternatePath}`, {
                    originalPath: filePath,
                    originalError: error.message,
                    timestamp: new Date().toISOString(),
                });
                const result = {
                    success: true,
                    filePath: alternatePath,
                    isAlternateLocation: true,
                    errorMessage: `Original location failed: ${error.message}. File saved to alternate location.`,
                };
                if (this.writeNotificationCallback) {
                    this.writeNotificationCallback(result);
                }
                return result;
            }
            catch (altError) {
                console.error(`[StageManager] Failed to write to alternate location ${alternatePath}:`, {
                    alternateError: altError.message,
                    alternateCode: altError.code,
                    originalError: error.message,
                    originalCode: error.code,
                    projectName,
                    stage,
                    timestamp: new Date().toISOString(),
                });
                const result = {
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
    async writeStageFileWithError(projectName, stage, data, errorMessage) {
        const filePath = this.getStageFilePath(projectName, stage);
        const projectDir = this.getProjectDir(projectName);
        const stageFile = {
            stage,
            completed: false,
            timestamp: Date.now(),
            data,
            version: BuildModeTypes_1.STAGE_FILE_VERSION,
            error: errorMessage,
        };
        const content = JSON.stringify(stageFile, null, 2);
        const tempPath = `${filePath}.tmp.${Date.now()}`;
        try {
            await fs.promises.mkdir(projectDir, { recursive: true });
            await fs.promises.writeFile(tempPath, content, 'utf-8');
            await fs.promises.rename(tempPath, filePath);
            await this.updateBuildState(projectName, stage, false, errorMessage);
            const result = {
                success: true,
                filePath,
                isAlternateLocation: false,
            };
            return result;
        }
        catch (error) {
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
            }
            catch (cleanupError) {
                console.warn(`[StageManager] Failed to cleanup temp file ${tempPath}:`, cleanupError.message);
            }
            const alternatePath = path.join(os.tmpdir(), `personaut-${projectName}-${stage}.stage.json`);
            try {
                await fs.promises.writeFile(alternatePath, content, 'utf-8');
                console.warn(`[StageManager] Stage file with error written to alternate location: ${alternatePath}`, {
                    originalPath: filePath,
                    originalError: error.message,
                    stageError: errorMessage,
                    timestamp: new Date().toISOString(),
                });
                const result = {
                    success: true,
                    filePath: alternatePath,
                    isAlternateLocation: true,
                    errorMessage: `Original location failed: ${error.message}. File saved to alternate location.`,
                };
                if (this.writeNotificationCallback) {
                    this.writeNotificationCallback(result);
                }
                return result;
            }
            catch (altError) {
                console.error(`[StageManager] Failed to write error state to alternate location ${alternatePath}:`, {
                    alternateError: altError.message,
                    alternateCode: altError.code,
                    originalError: error.message,
                    originalCode: error.code,
                    projectName,
                    stage,
                    stageError: errorMessage,
                    timestamp: new Date().toISOString(),
                });
                const result = {
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
    async getStageError(projectName, stage) {
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
    async clearStageError(projectName, stage) {
        const stageFile = await this.readStageFile(projectName, stage);
        if (stageFile) {
            await this.writeStageFile(projectName, stage, stageFile.data, stageFile.completed);
        }
    }
    async isStageComplete(projectName, stage) {
        const state = await this.readBuildState(projectName);
        if (state && state.stages[stage]) {
            return state.stages[stage].completed;
        }
        const stageFile = await this.readStageFile(projectName, stage);
        return stageFile !== null && stageFile.completed === true;
    }
    async getCompletedStages(projectName) {
        let state = await this.readBuildState(projectName);
        if (!state) {
            state = await this.syncBuildState(projectName);
        }
        if (state) {
            return Object.entries(state.stages)
                .filter(([_, info]) => info.completed)
                .map(([stage, _]) => stage);
        }
        const completedStages = [];
        for (const stage of BuildModeTypes_1.STAGE_ORDER) {
            const isComplete = await this.isStageComplete(projectName, stage);
            if (isComplete) {
                completedStages.push(stage);
            }
        }
        return completedStages;
    }
    validateTransition(from, to, completedStages) {
        const toIndex = BuildModeTypes_1.STAGE_ORDER.indexOf(to);
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
        const previousStage = BuildModeTypes_1.STAGE_ORDER[toIndex - 1];
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
    async initializeProject(projectName, projectTitle) {
        const projectDir = this.getProjectDir(projectName);
        await fs.promises.mkdir(projectDir, { recursive: true });
        const initialState = {
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
    async handleCorruptedFile(filePath, errorMessage) {
        const corruptedPath = `${filePath}.corrupted.${Date.now()}`;
        try {
            if (fs.existsSync(filePath)) {
                await fs.promises.rename(filePath, corruptedPath);
                console.error(`Corrupted stage file renamed to: ${corruptedPath}. Error: ${errorMessage}`);
            }
        }
        catch (renameError) {
            console.error(`Failed to rename corrupted file: ${renameError.message}`);
        }
    }
    stageFileExists(projectName, stage) {
        const filePath = this.getStageFilePath(projectName, stage);
        return fs.existsSync(filePath);
    }
    async getAllStageFiles(projectName) {
        const stageFiles = new Map();
        for (const stage of BuildModeTypes_1.STAGE_ORDER) {
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
    async getProjects() {
        try {
            if (!fs.existsSync(this.baseDir)) {
                return [];
            }
            const entries = await fs.promises.readdir(this.baseDir, { withFileTypes: true });
            const projects = [];
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
        }
        catch (error) {
            console.error('[StageManager] Error getting projects:', error);
            return [];
        }
    }
}
exports.StageManager = StageManager;
//# sourceMappingURL=StageManager.js.map