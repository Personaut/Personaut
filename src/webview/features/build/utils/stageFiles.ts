/**
 * Stage File Utilities
 *
 * Utilities for managing stage file persistence.
 *
 * **Validates: Requirements 35.1, 35.3, 35.4, 38.1, 38.2**
 */

import { BuildStage, BUILD_STAGES, StageFileData } from '../types';

/**
 * Stage file names
 */
export const STAGE_FILE_NAMES: Record<BuildStage, string> = {
    idea: 'idea.json',
    team: 'team.json',
    users: 'users.json',
    features: 'features.json',
    stories: 'stories.json',
    design: 'design.json',
    build: 'build.json',
};

/**
 * Get the file name for a stage
 */
export function getStageFileName(stage: BuildStage): string {
    return STAGE_FILE_NAMES[stage];
}

/**
 * Parse stage file data safely
 */
export function parseStageData<T>(
    rawData: string | undefined | null,
    defaultValue: T
): T {
    if (!rawData) {
        return defaultValue;
    }

    try {
        const parsed = JSON.parse(rawData);
        return parsed as T;
    } catch (error) {
        console.error('[Stage File] Failed to parse stage data:', error);
        return defaultValue;
    }
}

/**
 * Serialize stage data for saving
 */
export function serializeStageData(data: unknown): string {
    try {
        return JSON.stringify(data, null, 2);
    } catch (error) {
        console.error('[Stage File] Failed to serialize stage data:', error);
        return '{}';
    }
}

/**
 * Create a stage file data wrapper
 */
export function createStageFileData(stage: BuildStage, data: unknown): StageFileData {
    return {
        stage,
        timestamp: Date.now(),
        data,
    };
}

/**
 * Validate stage file data
 */
export function validateStageFileData(data: unknown): data is StageFileData {
    if (!data || typeof data !== 'object') {
        return false;
    }

    const obj = data as Record<string, unknown>;

    return (
        typeof obj.stage === 'string' &&
        BUILD_STAGES.includes(obj.stage as BuildStage) &&
        typeof obj.timestamp === 'number' &&
        obj.data !== undefined
    );
}

/**
 * Derive the current stage from completed stages
 */
export function deriveCurrentStage(
    completedStages: BuildStage[],
    _stageData: Record<BuildStage, unknown>
): BuildStage {
    // Find the first incomplete stage
    for (const stage of BUILD_STAGES) {
        if (!completedStages.includes(stage)) {
            return stage;
        }
    }

    // All stages complete, return last stage
    return 'build';
}

/**
 * Check if all prerequisite stages are complete
 */
export function arePrerequisitesComplete(
    stage: BuildStage,
    completedStages: BuildStage[]
): boolean {
    const stageIndex = BUILD_STAGES.indexOf(stage);

    for (let i = 0; i < stageIndex; i++) {
        if (!completedStages.includes(BUILD_STAGES[i])) {
            return false;
        }
    }

    return true;
}

/**
 * Get the next stage after the given stage
 */
export function getNextStage(stage: BuildStage): BuildStage | null {
    const currentIndex = BUILD_STAGES.indexOf(stage);
    if (currentIndex < BUILD_STAGES.length - 1) {
        return BUILD_STAGES[currentIndex + 1];
    }
    return null;
}

/**
 * Get the previous stage before the given stage
 */
export function getPreviousStage(stage: BuildStage): BuildStage | null {
    const currentIndex = BUILD_STAGES.indexOf(stage);
    if (currentIndex > 0) {
        return BUILD_STAGES[currentIndex - 1];
    }
    return null;
}

/**
 * Calculate completion percentage
 */
export function calculateProgress(completedStages: BuildStage[]): number {
    return Math.round((completedStages.length / BUILD_STAGES.length) * 100);
}

/**
 * Get stage index (0-based)
 */
export function getStageIndex(stage: BuildStage): number {
    return BUILD_STAGES.indexOf(stage);
}

/**
 * Format stage timestamp
 */
export function formatStageTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
