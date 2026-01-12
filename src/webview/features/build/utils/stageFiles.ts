/**
 * Stage File Utilities
 *
 * Utilities for managing stage file persistence.
 *
 * **Validates: Requirements 35.1, 35.3, 35.4, 38.1, 38.2**
 */

import { DesignStage, DESIGN_STAGES, StageFileData } from '../types';

/**
 * Stage file names
 */
export const STAGE_FILE_NAMES: Record<DesignStage, string> = {
    idea: 'idea.json',
    users: 'users.json',
    features: 'features.json',
    stories: 'stories.json',
    design: 'design.json',
    finalize: 'finalize.json',
};

/**
 * Get the file name for a stage
 */
export function getStageFileName(stage: DesignStage): string {
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
export function createStageFileData(stage: DesignStage, data: unknown): StageFileData {
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
        DESIGN_STAGES.includes(obj.stage as DesignStage) &&
        typeof obj.timestamp === 'number' &&
        obj.data !== undefined
    );
}

/**
 * Derive the current stage from completed stages
 */
export function deriveCurrentStage(
    completedStages: DesignStage[],
    _stageData: Record<DesignStage, unknown>
): DesignStage {
    // Find the first incomplete stage
    for (const stage of DESIGN_STAGES) {
        if (!completedStages.includes(stage)) {
            return stage;
        }
    }

    // All stages complete, return last stage
    return 'finalize';
}

/**
 * Check if all prerequisite stages are complete
 */
export function arePrerequisitesComplete(
    stage: DesignStage,
    completedStages: DesignStage[]
): boolean {
    const stageIndex = DESIGN_STAGES.indexOf(stage);

    for (let i = 0; i < stageIndex; i++) {
        if (!completedStages.includes(DESIGN_STAGES[i])) {
            return false;
        }
    }

    return true;
}

/**
 * Get the next stage after the given stage
 */
export function getNextStage(stage: DesignStage): DesignStage | null {
    const currentIndex = DESIGN_STAGES.indexOf(stage);
    if (currentIndex < DESIGN_STAGES.length - 1) {
        return DESIGN_STAGES[currentIndex + 1];
    }
    return null;
}

/**
 * Get the previous stage before the given stage
 */
export function getPreviousStage(stage: DesignStage): DesignStage | null {
    const currentIndex = DESIGN_STAGES.indexOf(stage);
    if (currentIndex > 0) {
        return DESIGN_STAGES[currentIndex - 1];
    }
    return null;
}

/**
 * Calculate completion percentage
 */
export function calculateProgress(completedStages: DesignStage[]): number {
    return Math.round((completedStages.length / DESIGN_STAGES.length) * 100);
}

/**
 * Get stage index (0-based)
 */
export function getStageIndex(stage: DesignStage): number {
    return DESIGN_STAGES.indexOf(stage);
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
