import { useCallback, useRef, useEffect } from 'react';
import { useVSCode } from '../../../shared/hooks/useVSCode';
import { BuildStage } from '../types';
import { createStageFileData } from '../utils/stageFiles';

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_DELAY = 500;

/**
 * Return type for useBuildPersistence hook
 */
export interface UseBuildPersistenceReturn {
    /** Save stage data with debouncing */
    saveStageData: (stage: BuildStage, data: unknown) => void;
    /** Save stage data immediately (no debounce) */
    saveStageDataImmediate: (stage: BuildStage, data: unknown) => void;
    /** Load stage data from file */
    loadStageData: (stage: BuildStage) => void;
    /** Cancel pending saves */
    cancelPendingSaves: () => void;
    /** Check if there are pending saves */
    hasPendingSaves: () => boolean;
}

/**
 * Hook for build mode persistence with debouncing.
 *
 * Provides debounced save operations to prevent excessive file writes
 * while still ensuring data is persisted reliably.
 *
 * @example
 * ```tsx
 * function UsersStage() {
 *   const { saveStageData, saveStageDataImmediate } = useBuildPersistence();
 *   
 *   // Debounced save on input change
 *   const handleChange = (demographics) => {
 *     setDemographics(demographics);
 *     saveStageData('users', { demographics });
 *   };
 *   
 *   // Immediate save on stage completion
 *   const handleComplete = () => {
 *     saveStageDataImmediate('users', { demographics, personas });
 *     goToNextStage();
 *   };
 * }
 * ```
 *
 * **Validates: Requirements 37.1, 37.2, 37.4, 39.2, 40.1, 40.2**
 */
export function useBuildPersistence(): UseBuildPersistenceReturn {
    const { postMessage } = useVSCode();
    const pendingTimers = useRef<Map<BuildStage, NodeJS.Timeout>>(new Map());
    const pendingData = useRef<Map<BuildStage, unknown>>(new Map());

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Save any pending data before unmount
            pendingTimers.current.forEach((timer) => clearTimeout(timer));
            pendingData.current.forEach((data, stage) => {
                const fileData = createStageFileData(stage, data);
                postMessage({ type: 'save-stage-data', stage, data: fileData });
                console.log(`[BuildPersistence] Flushing pending save for stage: ${stage}`);
            });
        };
    }, [postMessage]);

    /**
     * Save stage data with debouncing
     */
    const saveStageData = useCallback(
        (stage: BuildStage, data: unknown) => {
            // Cancel existing timer for this stage
            const existingTimer = pendingTimers.current.get(stage);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            // Store the pending data
            pendingData.current.set(stage, data);

            // Set new debounced timer
            const timer = setTimeout(() => {
                const fileData = createStageFileData(stage, data);
                postMessage({ type: 'save-stage-data', stage, data: fileData });
                console.log(`[BuildPersistence] Saved stage data (debounced): ${stage}`);

                // Clean up
                pendingTimers.current.delete(stage);
                pendingData.current.delete(stage);
            }, DEBOUNCE_DELAY);

            pendingTimers.current.set(stage, timer);
        },
        [postMessage]
    );

    /**
     * Save stage data immediately without debouncing
     */
    const saveStageDataImmediate = useCallback(
        (stage: BuildStage, data: unknown) => {
            // Cancel any pending debounced save for this stage
            const existingTimer = pendingTimers.current.get(stage);
            if (existingTimer) {
                clearTimeout(existingTimer);
                pendingTimers.current.delete(stage);
            }
            pendingData.current.delete(stage);

            // Save immediately
            const fileData = createStageFileData(stage, data);
            postMessage({ type: 'save-stage-data', stage, data: fileData });
            console.log(`[BuildPersistence] Saved stage data (immediate): ${stage}`);
        },
        [postMessage]
    );

    /**
     * Load stage data from file
     */
    const loadStageData = useCallback(
        (stage: BuildStage) => {
            postMessage({ type: 'load-stage-data', stage });
            console.log(`[BuildPersistence] Loading stage data: ${stage}`);
        },
        [postMessage]
    );

    /**
     * Cancel all pending saves
     */
    const cancelPendingSaves = useCallback(() => {
        pendingTimers.current.forEach((timer) => clearTimeout(timer));
        pendingTimers.current.clear();
        pendingData.current.clear();
        console.log('[BuildPersistence] Cancelled all pending saves');
    }, []);

    /**
     * Check if there are pending saves
     */
    const hasPendingSaves = useCallback(() => {
        return pendingTimers.current.size > 0;
    }, []);

    return {
        saveStageData,
        saveStageDataImmediate,
        loadStageData,
        cancelPendingSaves,
        hasPendingSaves,
    };
}

export default useBuildPersistence;
