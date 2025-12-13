"use strict";
/**
 * BuildModeService - Business logic for the build-mode feature.
 *
 * Implements:
 * - Project initialization
 * - Stage management
 * - Content generation coordination
 * - Build state management
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildModeService = void 0;
class BuildModeService {
    constructor(stageManager, buildLogManager, contentStreamer) {
        this.stageManager = stageManager;
        this.buildLogManager = buildLogManager;
        this.contentStreamer = contentStreamer;
    }
    async initializeProject(projectName, projectTitle) {
        await this.stageManager.initializeProject(projectName, projectTitle);
        await this.buildLogManager.initializeBuildLog(projectName);
    }
    async saveStage(projectName, stage, data, completed) {
        await this.stageManager.writeStageFile(projectName, stage, data, completed);
    }
    async loadStage(projectName, stage) {
        const stageFile = await this.stageManager.readStageFile(projectName, stage);
        return stageFile ? stageFile.data : null;
    }
    async getBuildState(projectName) {
        return this.stageManager.readBuildState(projectName);
    }
    async getBuildLog(projectName) {
        return this.buildLogManager.readBuildLog(projectName);
    }
    async appendLogEntry(projectName, entry) {
        await this.buildLogManager.appendLogEntry(projectName, entry);
    }
    async completeStage(projectName, stage) {
        await this.contentStreamer.completeStage(projectName, stage);
    }
    async validateTransition(from, to, projectName) {
        const completedStages = await this.stageManager.getCompletedStages(projectName);
        return this.stageManager.validateTransition(from, to, completedStages);
    }
    async getCompletedStages(projectName) {
        return this.stageManager.getCompletedStages(projectName);
    }
    async projectExists(projectName) {
        return this.stageManager.projectExistsAsync(projectName);
    }
    async getAllProjects() {
        // This would need to scan the base directory for all project folders
        // For now, return empty array as this requires filesystem scanning
        return [];
    }
    async getProjects() {
        return this.stageManager.getProjects();
    }
}
exports.BuildModeService = BuildModeService;
//# sourceMappingURL=BuildModeService.js.map