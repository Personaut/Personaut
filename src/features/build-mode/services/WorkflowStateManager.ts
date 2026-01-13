/**
 * WorkflowStateManager - Manages workflow state persistence and recovery
 * 
 * Responsibilities:
 * - Persist workflow state to .personaut/workflow-state.json
 * - Load and restore workflow state
 * - Create and manage checkpoints
 * - Track token usage across workflow
 * 
 * Feature: build-agent-architecture-review
 * Validates: Requirements AC-04.1, AC-04.3
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
    WorkflowState,
    PageState,
    Checkpoint,
    CheckpointStep,
    TokenUsageReport,
    WorkflowError,
} from '../types/WorkflowStateTypes';

/**
 * Configuration for WorkflowStateManager
 */
export interface WorkflowStateManagerConfig {
    /** Project name */
    projectName: string;

    /** Base directory for .personaut files */
    baseDir: string;

    /** Maximum number of checkpoints to keep */
    maxCheckpoints?: number;

    /** Whether to auto-save state on updates */
    autoSave?: boolean;
}

/**
 * WorkflowStateManager manages workflow state and checkpoints
 */
export class WorkflowStateManager {
    private config: Required<WorkflowStateManagerConfig>;
    private state: WorkflowState | null = null;
    private stateFilePath: string;
    private checkpointsDir: string;

    constructor(config: WorkflowStateManagerConfig) {
        this.config = {
            ...config,
            maxCheckpoints: config.maxCheckpoints ?? 10,
            autoSave: config.autoSave ?? true,
        };

        // Set up file paths
        const personautDir = path.join(this.config.baseDir, '.personaut', this.config.projectName);
        this.stateFilePath = path.join(personautDir, 'workflow-state.json');
        this.checkpointsDir = path.join(personautDir, 'checkpoints');
    }

    /**
     * Initialize a new workflow state
     * @param pages - Array of page definitions
     * @param maxIterationsPerPage - Maximum iterations per page
     * @returns Initialized workflow state
     */
    async initializeWorkflow(
        pages: Array<{ pageId: string; pageName: string }>,
        maxIterationsPerPage: number = 5
    ): Promise<WorkflowState> {
        const workflowId = crypto.randomUUID();
        const now = Date.now();

        // Initialize page states
        const pageStates: PageState[] = pages.map((page, index) => ({
            pageId: page.pageId,
            pageName: page.pageName,
            pageIndex: index,
            status: index === 0 ? 'in-progress' : 'pending',
            startTime: index === 0 ? now : undefined,
            iterations: [],
            currentIteration: 0,
            maxIterations: maxIterationsPerPage,
            tokenUsage: {
                total: 0,
                byIteration: [],
            },
        }));

        // Initialize workflow state
        this.state = {
            workflowId,
            projectName: this.config.projectName,
            status: 'in-progress',
            startTime: now,
            lastUpdateTime: now,
            schemaVersion: '1.0.0',
            currentPage: {
                pageId: pages[0].pageId,
                pageName: pages[0].pageName,
                pageIndex: 0,
                totalPages: pages.length,
            },
            currentIteration: {
                iteration: 1,
                status: 'designing',
                currentStep: 'page-started',
                startTime: now,
            },
            checkpoints: [],
            pages: pageStates,
            tokenUsage: {
                currentPage: 0,
                currentIteration: 0,
                totalWorkflow: 0,
                estimatedRemaining: 0,
                budgetWarningShown: false,
            },
            errors: [],
            recovery: {
                lastSuccessfulCheckpoint: '',
                canResume: true,
                resumeInstructions: 'Workflow can be resumed from the last checkpoint.',
            },
            contextManagement: {
                slidingWindowDepth: 3,
                lastSummarizationTime: 0,
                compressionRatioAchieved: 0,
                contextOverflowCount: 0,
            },
        };

        // Save initial state
        await this.saveState();

        // Create initial checkpoint
        await this.createCheckpoint('page-started');

        console.log('[WorkflowStateManager] Workflow initialized:', {
            workflowId,
            projectName: this.config.projectName,
            totalPages: pages.length,
        });

        return this.state;
    }

    /**
     * Get current workflow state
     * @returns Current workflow state or null if not initialized
     */
    getState(): WorkflowState | null {
        return this.state;
    }

    /**
     * Update workflow state
     * @param updates - Partial state updates
     * @returns Updated workflow state
     */
    async updateState(updates: Partial<WorkflowState>): Promise<WorkflowState> {
        if (!this.state) {
            throw new Error('Workflow state not initialized. Call initializeWorkflow() first.');
        }

        // Merge updates
        this.state = {
            ...this.state,
            ...updates,
            lastUpdateTime: Date.now(),
        };

        // Auto-save if enabled
        if (this.config.autoSave) {
            await this.saveState();
        }

        console.log('[WorkflowStateManager] State updated:', {
            workflowId: this.state.workflowId,
            status: this.state.status,
            currentPage: this.state.currentPage.pageId,
            currentIteration: this.state.currentIteration.iteration,
        });

        return this.state;
    }

    /**
     * Save workflow state to disk
     * @returns Path to saved state file
     */
    async saveState(): Promise<string> {
        if (!this.state) {
            throw new Error('No state to save. Initialize workflow first.');
        }

        // Ensure directory exists
        await fs.mkdir(path.dirname(this.stateFilePath), { recursive: true });

        // Write state to file
        await fs.writeFile(
            this.stateFilePath,
            JSON.stringify(this.state, null, 2),
            'utf-8'
        );

        console.log('[WorkflowStateManager] State saved:', {
            path: this.stateFilePath,
            workflowId: this.state.workflowId,
        });

        return this.stateFilePath;
    }

    /**
     * Load workflow state from disk
     * @returns Loaded workflow state
     */
    async loadState(): Promise<WorkflowState> {
        try {
            const data = await fs.readFile(this.stateFilePath, 'utf-8');
            this.state = JSON.parse(data) as WorkflowState;

            console.log('[WorkflowStateManager] State loaded:', {
                workflowId: this.state.workflowId,
                status: this.state.status,
                currentPage: this.state.currentPage.pageId,
            });

            return this.state;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                throw new Error(`Workflow state file not found: ${this.stateFilePath}`);
            }
            throw new Error(`Failed to load workflow state: ${error.message}`);
        }
    }

    /**
     * Check if workflow state exists on disk
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
     * Create a checkpoint for recovery
     * @param step - Checkpoint step identifier
     * @returns Created checkpoint
     */
    async createCheckpoint(step: CheckpointStep): Promise<Checkpoint> {
        if (!this.state) {
            throw new Error('Cannot create checkpoint: workflow state not initialized.');
        }

        const checkpointId = `${step}-${Date.now()}`;
        const checkpoint: Checkpoint = {
            id: checkpointId,
            timestamp: Date.now(),
            step,
            pageId: this.state.currentPage.pageId,
            iteration: this.state.currentIteration.iteration,
            stateSnapshot: {
                status: this.state.status,
                currentPage: { ...this.state.currentPage },
                currentIteration: { ...this.state.currentIteration },
                tokenUsage: { ...this.state.tokenUsage },
            },
            tokenUsage: {
                currentPage: this.state.tokenUsage.currentPage,
                currentIteration: this.state.tokenUsage.currentIteration,
                totalWorkflow: this.state.tokenUsage.totalWorkflow,
            },
            isValid: true,
        };

        // Ensure checkpoints directory exists
        await fs.mkdir(this.checkpointsDir, { recursive: true });

        // Save checkpoint to file
        const checkpointPath = path.join(this.checkpointsDir, `${checkpointId}.json`);
        await fs.writeFile(
            checkpointPath,
            JSON.stringify(checkpoint, null, 2),
            'utf-8'
        );
        checkpoint.filePath = checkpointPath;

        // Add to state
        this.state.checkpoints.push(checkpoint);

        // Update recovery info
        this.state.recovery.lastSuccessfulCheckpoint = checkpointId;

        // Enforce checkpoint limit
        await this.enforceCheckpointLimit();

        // Save state
        if (this.config.autoSave) {
            await this.saveState();
        }

        console.log('[WorkflowStateManager] Checkpoint created:', {
            checkpointId,
            step,
            pageId: checkpoint.pageId,
            iteration: checkpoint.iteration,
        });

        return checkpoint;
    }

    /**
     * Load a checkpoint from disk
     * @param checkpointId - Checkpoint ID to load
     * @returns Loaded checkpoint
     */
    async loadCheckpoint(checkpointId: string): Promise<Checkpoint> {
        const checkpointPath = path.join(this.checkpointsDir, `${checkpointId}.json`);

        try {
            const data = await fs.readFile(checkpointPath, 'utf-8');
            const checkpoint = JSON.parse(data) as Checkpoint;

            console.log('[WorkflowStateManager] Checkpoint loaded:', {
                checkpointId,
                step: checkpoint.step,
                pageId: checkpoint.pageId,
            });

            return checkpoint;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                throw new Error(`Checkpoint not found: ${checkpointId}`);
            }
            throw new Error(`Failed to load checkpoint: ${error.message}`);
        }
    }

    /**
     * Get the last successful checkpoint
     * @returns Last checkpoint or null if none exist
     */
    async getLastCheckpoint(): Promise<Checkpoint | null> {
        if (!this.state || this.state.checkpoints.length === 0) {
            return null;
        }

        const lastCheckpointId = this.state.recovery.lastSuccessfulCheckpoint;
        if (!lastCheckpointId) {
            return null;
        }

        try {
            return await this.loadCheckpoint(lastCheckpointId);
        } catch (error) {
            console.error('[WorkflowStateManager] Failed to load last checkpoint:', error);
            return null;
        }
    }

    /**
     * Restore workflow from a checkpoint
     * @param checkpointId - Checkpoint ID to restore from
     * @returns Restored workflow state
     */
    async restoreFromCheckpoint(checkpointId: string): Promise<WorkflowState> {
        if (!this.state) {
            throw new Error('Cannot restore: workflow state not initialized.');
        }

        const checkpoint = await this.loadCheckpoint(checkpointId);

        if (!checkpoint.isValid) {
            throw new Error(`Checkpoint ${checkpointId} is not valid for recovery.`);
        }

        // Restore state from checkpoint snapshot
        this.state = {
            ...this.state,
            ...checkpoint.stateSnapshot,
            lastUpdateTime: Date.now(),
            recovery: {
                ...this.state.recovery,
                lastSuccessfulCheckpoint: checkpointId,
                canResume: true,
                resumeInstructions: `Restored from checkpoint: ${checkpoint.step}`,
            },
        };

        await this.saveState();

        console.log('[WorkflowStateManager] Workflow restored from checkpoint:', {
            checkpointId,
            step: checkpoint.step,
            pageId: checkpoint.pageId,
            iteration: checkpoint.iteration,
        });

        return this.state;
    }

    /**
     * Enforce checkpoint limit by removing oldest checkpoints
     */
    private async enforceCheckpointLimit(): Promise<void> {
        if (!this.state) {
            return;
        }

        while (this.state.checkpoints.length > this.config.maxCheckpoints) {
            const oldestCheckpoint = this.state.checkpoints.shift();
            if (oldestCheckpoint?.filePath) {
                try {
                    await fs.unlink(oldestCheckpoint.filePath);
                    console.log('[WorkflowStateManager] Removed old checkpoint:', oldestCheckpoint.id);
                } catch (error) {
                    console.error('[WorkflowStateManager] Failed to remove checkpoint file:', error);
                }
            }
        }
    }

    /**
     * Record token usage for current iteration
     * @param usage - Token usage report
     */
    async recordTokenUsage(usage: TokenUsageReport): Promise<void> {
        if (!this.state) {
            throw new Error('Cannot record token usage: workflow state not initialized.');
        }

        // Update token usage
        this.state.tokenUsage.currentIteration += usage.totalTokens;
        this.state.tokenUsage.currentPage += usage.totalTokens;
        this.state.tokenUsage.totalWorkflow += usage.totalTokens;
        this.state.lastUpdateTime = Date.now();

        // Add to current iteration's token usage
        const currentPage = this.state.pages[this.state.currentPage.pageIndex];
        const currentIteration = currentPage.iterations[currentPage.currentIteration - 1];
        if (currentIteration) {
            currentIteration.tokenUsage.push(usage);
        }

        // Auto-save if enabled
        if (this.config.autoSave) {
            await this.saveState();
        }

        console.log('[WorkflowStateManager] Token usage recorded:', {
            operation: usage.operation,
            tokens: usage.totalTokens,
            totalWorkflow: this.state.tokenUsage.totalWorkflow,
        });
    }

    /**
     * Get token usage summary
     * @returns Token usage summary
     */
    getTokenUsage(): {
        currentPage: number;
        currentIteration: number;
        totalWorkflow: number;
        budget?: number;
    } | null {
        if (!this.state) {
            return null;
        }

        return {
            currentPage: this.state.tokenUsage.currentPage,
            currentIteration: this.state.tokenUsage.currentIteration,
            totalWorkflow: this.state.tokenUsage.totalWorkflow,
            budget: this.state.tokenUsage.budget,
        };
    }

    /**
     * Add an error to the workflow state
     * @param error - Workflow error
     */
    async addError(error: WorkflowError): Promise<void> {
        if (!this.state) {
            throw new Error('Cannot add error: workflow state not initialized.');
        }

        this.state.errors.push(error);
        this.state.lastUpdateTime = Date.now();

        // Update recovery status if error is critical
        if (error.severity === 'critical' && !error.recoverable) {
            this.state.recovery.canResume = false;
            this.state.recovery.resumeInstructions = error.recoveryInstructions || 'Manual intervention required.';
        }

        // Auto-save if enabled
        if (this.config.autoSave) {
            await this.saveState();
        }

        console.error('[WorkflowStateManager] Error added:', {
            errorId: error.id,
            severity: error.severity,
            message: error.message,
        });
    }

    /**
     * Clean up workflow state and checkpoints
     */
    async cleanup(): Promise<void> {
        console.log('[WorkflowStateManager] Cleaning up workflow state');

        // Clear in-memory state
        this.state = null;

        // Note: We don't delete files on cleanup to preserve state for recovery
        // Use deleteWorkflowState() to permanently delete state
    }

    /**
     * Permanently delete workflow state and all checkpoints
     */
    async deleteWorkflowState(): Promise<void> {
        console.log('[WorkflowStateManager] Deleting workflow state');

        // Delete state file
        try {
            await fs.unlink(this.stateFilePath);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error('[WorkflowStateManager] Failed to delete state file:', error);
            }
        }

        // Delete checkpoints directory
        try {
            await fs.rm(this.checkpointsDir, { recursive: true, force: true });
        } catch (error) {
            console.error('[WorkflowStateManager] Failed to delete checkpoints:', error);
        }

        // Clear in-memory state
        this.state = null;
    }
}
