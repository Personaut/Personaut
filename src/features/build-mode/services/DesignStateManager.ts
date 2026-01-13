/**
 * DesignStateManager - Extends WorkflowStateManager with traceability support
 *
 * This extends the existing WorkflowStateManager with:
 * - Traceability map management
 * - Link creation and validation
 * - Design workflow state persistence
 *
 * **Part of Build-to-Design Transformation**
 * Validates: Requirements 19.1, 19.2, 19.3, 19.4
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
    DesignWorkflowState,
    DesignStageName,
    DesignStageData,
    TraceabilityMap,
    TraceabilityLink,
    LinkType,
    TrackedItem,
    TokenUsageByStage,
    TraceabilityValidationResult,
    createEmptyTraceabilityMap,
    generateTrackedId,
    TrackedItemType,
} from '../types/WorkflowStateTypes';

/**
 * Configuration for DesignStateManager
 */
export interface DesignStateManagerConfig {
    /** Project name */
    projectName: string;

    /** Base directory for .personaut files */
    baseDir: string;

    /** Whether to auto-save state on updates */
    autoSave?: boolean;
}

/**
 * DesignStateManager manages Design workflow state with traceability support
 *
 * @example
 * ```typescript
 * const manager = new DesignStateManager({
 *   projectName: 'my-project',
 *   baseDir: '/path/to/workspace',
 * });
 *
 * await manager.initializeDesignWorkflow('My Project', 'Description');
 *
 * // Add traceability link
 * manager.addTraceabilityLink('story-abc123', 'feature-def456', 'story-to-feature');
 *
 * // Query links
 * const stories = manager.getStoriesForFeature('feature-def456');
 * ```
 */
export class DesignStateManager {
    private config: Required<DesignStateManagerConfig>;
    private state: DesignWorkflowState | null = null;
    private stateFilePath: string;

    constructor(config: DesignStateManagerConfig) {
        this.config = {
            ...config,
            autoSave: config.autoSave ?? true,
        };

        // Set up file paths
        const personautDir = path.join(this.config.baseDir, '.personaut', this.config.projectName);
        this.stateFilePath = path.join(personautDir, 'design-workflow-state.json');
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /**
     * Initialize a new Design workflow state
     * @param projectName - Project name
     * @param projectDescription - Project description
     * @returns Initialized Design workflow state
     */
    async initializeDesignWorkflow(
        projectName: string,
        projectDescription: string
    ): Promise<DesignWorkflowState> {
        const now = Date.now();

        // Create empty stage data for all stages
        const stageData: Record<DesignStageName, DesignStageData> = {
            idea: {},
            users: {},
            features: {},
            stories: {},
            design: {},
            finalize: {},
        };

        // Create initial token usage
        const tokenUsage: TokenUsageByStage = {
            byStage: {
                idea: 0,
                users: 0,
                features: 0,
                stories: 0,
                design: 0,
                finalize: 0,
            },
            total: 0,
            budgetWarningShown: false,
        };

        // Initialize workflow state
        this.state = {
            workflowId: generateTrackedId('flow'),
            projectName,
            projectDescription,
            currentStage: 'idea',
            completedStages: [],
            stageData,
            traceability: createEmptyTraceabilityMap(),
            tokenUsage,
            createdAt: now,
            updatedAt: now,
            schemaVersion: '2.0.0',
        };

        // Save initial state
        await this.save();

        console.log('[DesignStateManager] Design workflow initialized:', {
            workflowId: this.state.workflowId,
            projectName,
        });

        return this.state;
    }

    // =========================================================================
    // STATE MANAGEMENT
    // =========================================================================

    /**
     * Get current Design workflow state
     * @returns Current state or null if not initialized
     */
    getState(): DesignWorkflowState | null {
        return this.state;
    }

    /**
     * Update workflow state
     * @param updates - Partial state updates
     * @returns Updated state
     */
    async updateState(updates: Partial<DesignWorkflowState>): Promise<DesignWorkflowState> {
        if (!this.state) {
            throw new Error('Design workflow state not initialized. Call initializeDesignWorkflow() first.');
        }

        // Merge updates
        this.state = {
            ...this.state,
            ...updates,
            updatedAt: Date.now(),
        };

        // Auto-save if enabled
        if (this.config.autoSave) {
            await this.save();
        }

        return this.state;
    }

    // =========================================================================
    // STAGE DATA
    // =========================================================================

    /**
     * Get stage data for a specific stage
     * @param stageId - Stage identifier
     * @returns Stage data or null
     */
    getStageData<T extends DesignStageData>(stageId: DesignStageName): T | null {
        if (!this.state) {
            return null;
        }
        return this.state.stageData[stageId] as T;
    }

    /**
     * Set stage data for a specific stage
     * @param stageId - Stage identifier
     * @param data - Stage data to set
     */
    async setStageData<T extends DesignStageData>(stageId: DesignStageName, data: T): Promise<void> {
        if (!this.state) {
            throw new Error('Design workflow state not initialized.');
        }

        this.state.stageData[stageId] = data;
        this.state.updatedAt = Date.now();

        if (this.config.autoSave) {
            await this.save();
        }
    }

    /**
     * Mark a stage as complete
     * @param stageId - Stage to mark complete
     */
    async markStageComplete(stageId: DesignStageName): Promise<void> {
        if (!this.state) {
            throw new Error('Design workflow state not initialized.');
        }

        if (!this.state.completedStages.includes(stageId)) {
            this.state.completedStages.push(stageId);
            this.state.stageData[stageId].completedAt = Date.now();
        }

        this.state.updatedAt = Date.now();

        if (this.config.autoSave) {
            await this.save();
        }
    }

    // =========================================================================
    // TRACEABILITY
    // =========================================================================

    /**
     * Get the traceability map
     * @returns Traceability map
     */
    getTraceabilityMap(): TraceabilityMap {
        if (!this.state) {
            return createEmptyTraceabilityMap();
        }
        return this.state.traceability;
    }

    /**
     * Add a traceability link between two items
     * @param fromId - Source item ID
     * @param toId - Target item ID
     * @param linkType - Type of link
     * @returns The created link
     */
    addTraceabilityLink(fromId: string, toId: string, linkType: LinkType): TraceabilityLink {
        if (!this.state) {
            throw new Error('Design workflow state not initialized.');
        }

        const link: TraceabilityLink = {
            fromId,
            toId,
            linkType,
            createdAt: Date.now(),
        };

        // Add to main links array
        this.state.traceability.links.push(link);

        // Add to bySourceId index
        if (!this.state.traceability.bySourceId[fromId]) {
            this.state.traceability.bySourceId[fromId] = [];
        }
        this.state.traceability.bySourceId[fromId].push(link);

        // Add to byTargetId index
        if (!this.state.traceability.byTargetId[toId]) {
            this.state.traceability.byTargetId[toId] = [];
        }
        this.state.traceability.byTargetId[toId].push(link);

        // Add to byLinkType index
        if (!this.state.traceability.byLinkType[linkType]) {
            this.state.traceability.byLinkType[linkType] = [];
        }
        this.state.traceability.byLinkType[linkType].push(link);

        // Update timestamp
        this.state.traceability.lastUpdated = Date.now();
        this.state.updatedAt = Date.now();

        console.log('[DesignStateManager] Traceability link added:', { fromId, toId, linkType });

        return link;
    }

    /**
     * Link a story to a feature
     * @param storyId - Story ID
     * @param featureId - Feature ID
     */
    linkStoryToFeature(storyId: string, featureId: string): TraceabilityLink {
        return this.addTraceabilityLink(storyId, featureId, 'story-to-feature');
    }

    /**
     * Link a page to stories
     * @param pageId - Page ID
     * @param storyIds - Story IDs
     */
    linkPageToStories(pageId: string, storyIds: string[]): TraceabilityLink[] {
        return storyIds.map(storyId => this.addTraceabilityLink(pageId, storyId, 'page-to-story'));
    }

    /**
     * Link a task to a story and page
     * @param taskId - Task ID
     * @param storyId - Story ID
     * @param pageId - Page ID
     */
    linkTaskToStoryAndPage(taskId: string, storyId: string, pageId: string): TraceabilityLink[] {
        return [
            this.addTraceabilityLink(taskId, storyId, 'task-to-story'),
            this.addTraceabilityLink(taskId, pageId, 'task-to-page'),
        ];
    }

    /**
     * Link a task dependency
     * @param taskId - Task ID
     * @param dependsOnTaskId - ID of task this depends on
     */
    linkTaskDependency(taskId: string, dependsOnTaskId: string): TraceabilityLink {
        return this.addTraceabilityLink(taskId, dependsOnTaskId, 'task-dependency');
    }

    // =========================================================================
    // TRACEABILITY QUERIES
    // =========================================================================

    /**
     * Get all stories linked to a feature
     * @param featureId - Feature ID
     * @returns Array of story IDs
     */
    getStoriesForFeature(featureId: string): string[] {
        if (!this.state) {
            return [];
        }

        const links = this.state.traceability.byTargetId[featureId] || [];
        return links
            .filter(link => link.linkType === 'story-to-feature')
            .map(link => link.fromId);
    }

    /**
     * Get all pages linked to a story
     * @param storyId - Story ID
     * @returns Array of page IDs
     */
    getPagesForStory(storyId: string): string[] {
        if (!this.state) {
            return [];
        }

        const links = this.state.traceability.byTargetId[storyId] || [];
        return links
            .filter(link => link.linkType === 'page-to-story')
            .map(link => link.fromId);
    }

    /**
     * Get all tasks linked to a story
     * @param storyId - Story ID
     * @returns Array of task IDs
     */
    getTasksForStory(storyId: string): string[] {
        if (!this.state) {
            return [];
        }

        const links = this.state.traceability.byTargetId[storyId] || [];
        return links
            .filter(link => link.linkType === 'task-to-story')
            .map(link => link.fromId);
    }

    /**
     * Get all tasks linked to a page
     * @param pageId - Page ID
     * @returns Array of task IDs
     */
    getTasksForPage(pageId: string): string[] {
        if (!this.state) {
            return [];
        }

        const links = this.state.traceability.byTargetId[pageId] || [];
        return links
            .filter(link => link.linkType === 'task-to-page')
            .map(link => link.fromId);
    }

    /**
     * Get all dependencies for a task
     * @param taskId - Task ID
     * @returns Array of dependency task IDs
     */
    getTaskDependencies(taskId: string): string[] {
        if (!this.state) {
            return [];
        }

        const links = this.state.traceability.bySourceId[taskId] || [];
        return links
            .filter(link => link.linkType === 'task-dependency')
            .map(link => link.toId);
    }

    /**
     * Get the feature for a story
     * @param storyId - Story ID
     * @returns Feature ID or null
     */
    getFeatureForStory(storyId: string): string | null {
        if (!this.state) {
            return null;
        }

        const links = this.state.traceability.bySourceId[storyId] || [];
        const featureLink = links.find(link => link.linkType === 'story-to-feature');
        return featureLink ? featureLink.toId : null;
    }

    // =========================================================================
    // ID GENERATION
    // =========================================================================

    /**
     * Generate a unique ID for a tracked item
     * @param type - Type of item
     * @returns Unique ID in format: {type}-{uuid}
     */
    generateId(type: TrackedItemType): string {
        return generateTrackedId(type);
    }

    // =========================================================================
    // TOKEN TRACKING
    // =========================================================================

    /**
     * Record token usage for a stage
     * @param stage - Stage identifier
     * @param tokens - Token count to add
     */
    async recordTokenUsage(stage: DesignStageName, tokens: number): Promise<void> {
        if (!this.state) {
            throw new Error('Design workflow state not initialized.');
        }

        this.state.tokenUsage.byStage[stage] += tokens;
        this.state.tokenUsage.total += tokens;
        this.state.updatedAt = Date.now();

        // Check for budget warning
        if (this.state.tokenUsage.budget && !this.state.tokenUsage.budgetWarningShown) {
            const usagePercent = this.state.tokenUsage.total / this.state.tokenUsage.budget;
            if (usagePercent >= 0.8) {
                this.state.tokenUsage.budgetWarningShown = true;
                console.warn('[DesignStateManager] Token usage warning: 80% of budget used');
            }
        }

        if (this.config.autoSave) {
            await this.save();
        }
    }

    /**
     * Get token usage summary
     * @returns Token usage by stage
     */
    getTokenUsage(): TokenUsageByStage | null {
        if (!this.state) {
            return null;
        }
        return this.state.tokenUsage;
    }

    // =========================================================================
    // PERSISTENCE
    // =========================================================================

    /**
     * Save Design workflow state to disk
     * @returns Path to saved state file
     */
    async save(): Promise<string> {
        if (!this.state) {
            throw new Error('No state to save. Initialize Design workflow first.');
        }

        // Ensure directory exists
        await fs.mkdir(path.dirname(this.stateFilePath), { recursive: true });

        // Write state to file
        await fs.writeFile(
            this.stateFilePath,
            JSON.stringify(this.state, null, 2),
            'utf-8'
        );

        console.log('[DesignStateManager] State saved:', {
            path: this.stateFilePath,
            workflowId: this.state.workflowId,
        });

        return this.stateFilePath;
    }

    /**
     * Load Design workflow state from disk
     * @returns Loaded state or null if not found
     */
    async load(): Promise<DesignWorkflowState | null> {
        try {
            const data = await fs.readFile(this.stateFilePath, 'utf-8');
            this.state = JSON.parse(data) as DesignWorkflowState;

            console.log('[DesignStateManager] State loaded:', {
                workflowId: this.state.workflowId,
                currentStage: this.state.currentStage,
            });

            return this.state;
        } catch (error: unknown) {
            const err = error as NodeJS.ErrnoException;
            if (err.code === 'ENOENT') {
                return null;
            }
            throw new Error(`Failed to load Design workflow state: ${err.message}`);
        }
    }

    /**
     * Check if Design workflow state exists on disk
     * @returns True if state file exists
     */
    async stateExists(): Promise<boolean> {
        try {
            await fs.access(this.stateFilePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Delete Design workflow state
     */
    async deleteState(): Promise<void> {
        try {
            await fs.unlink(this.stateFilePath);
        } catch (error: unknown) {
            const err = error as NodeJS.ErrnoException;
            if (err.code !== 'ENOENT') {
                console.error('[DesignStateManager] Failed to delete state file:', err);
            }
        }

        this.state = null;
    }

    // =========================================================================
    // VALIDATION
    // =========================================================================

    /**
     * Validate a tracked item's traceability links
     * @param item - Item to validate
     * @returns Validation result
     */
    validateItemLinks(item: TrackedItem): TraceabilityValidationResult {
        const result: TraceabilityValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
        };

        if (!this.state) {
            result.isValid = false;
            result.errors.push({
                code: 'STATE_NOT_INITIALIZED',
                message: 'Design workflow state not initialized',
                itemId: item.id,
            });
            return result;
        }

        // Get all links where this item is the source
        const outgoingLinks = this.state.traceability.bySourceId[item.id] || [];

        // Check all outgoing links point to valid items
        for (const link of outgoingLinks) {
            // For now, we just validate the link exists
            // More specific validation would check if the target ID exists in the stage data
            if (!link.toId) {
                result.isValid = false;
                result.errors.push({
                    code: 'INVALID_LINK_TARGET',
                    message: `Link from ${item.id} has no target ID`,
                    itemId: item.id,
                    linkType: link.linkType,
                });
            }
        }

        return result;
    }

    /**
     * Check for circular dependencies in task links
     * @param taskId - Task to check
     * @returns true if circular dependency exists
     */
    hasCircularDependency(taskId: string): boolean {
        const visited = new Set<string>();
        const stack = new Set<string>();

        const dfs = (currentId: string): boolean => {
            if (stack.has(currentId)) {
                return true; // Circular dependency found
            }
            if (visited.has(currentId)) {
                return false; // Already checked, no cycle
            }

            visited.add(currentId);
            stack.add(currentId);

            const dependencies = this.getTaskDependencies(currentId);
            for (const depId of dependencies) {
                if (dfs(depId)) {
                    return true;
                }
            }

            stack.delete(currentId);
            return false;
        };

        return dfs(taskId);
    }

    /**
     * Generate all unique IDs currently in use
     * @returns Set of all IDs
     */
    getAllTrackedIds(): Set<string> {
        const ids = new Set<string>();

        if (!this.state) {
            return ids;
        }

        // Collect all IDs from links
        for (const link of this.state.traceability.links) {
            ids.add(link.fromId);
            ids.add(link.toId);
        }

        return ids;
    }
}
