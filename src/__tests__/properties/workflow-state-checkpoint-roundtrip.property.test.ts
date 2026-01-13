/**
 * Property test for checkpoint round-trip consistency
 *
 * Feature: build-agent-architecture-review, Property 4: Checkpoint Round-Trip Consistency
 *
 * For any valid WorkflowState, serializing to a checkpoint and then deserializing
 * SHALL produce an equivalent WorkflowState object.
 *
 * Validates: Requirements AC-04.1, AC-04.3
 */

import * as fc from 'fast-check';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { WorkflowStateManager } from '../../features/build-mode/services/WorkflowStateManager';
import { CheckpointStep } from '../../features/build-mode/types/WorkflowStateTypes';

describe('Property 4: Checkpoint Round-Trip Consistency', () => {
    let tempDir: string;

    beforeEach(async () => {
        // Create a temporary directory for each test
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-test-'));
    });

    afterEach(async () => {
        // Clean up temporary directory
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            console.error('Failed to clean up temp directory:', error);
        }
    });

    /**
     * Generator for project names
     */
    const projectNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(
        (s) => !s.includes('/') && !s.includes('\\') && s.trim().length > 0
    );

    /**
     * Generator for page definitions
     */
    const pagesArb = fc.array(
        fc.record({
            pageId: fc.string({ minLength: 1, maxLength: 20 }),
            pageName: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        { minLength: 1, maxLength: 5 }
    );

    /**
     * Generator for checkpoint steps
     */
    const checkpointStepArb = fc.constantFrom<CheckpointStep>(
        'framework-initialized',
        'page-started',
        'iteration-started',
        'ux-spec-created',
        'code-implemented',
        'screenshot-captured',
        'feedback-collected',
        'feedback-consolidated',
        'iteration-complete',
        'page-complete'
    );

    /**
     * Test that checkpoint round-trip preserves state
     * Validates: Requirements AC-04.1, AC-04.3
     */
    it('should preserve workflow state through checkpoint round-trip', async () => {
        await fc.assert(
            fc.asyncProperty(
                projectNameArb,
                pagesArb,
                checkpointStepArb,
                async (projectName, pages, checkpointStep) => {
                    // Create WorkflowStateManager
                    const manager = new WorkflowStateManager({
                        projectName,
                        baseDir: tempDir,
                        autoSave: true,
                    });

                    // Initialize workflow
                    const initialState = await manager.initializeWorkflow(pages, 5);

                    // Verify initial state
                    expect(initialState).toBeDefined();
                    expect(initialState.projectName).toBe(projectName);
                    expect(initialState.pages.length).toBe(pages.length);

                    // Create a checkpoint
                    const checkpoint = await manager.createCheckpoint(checkpointStep);

                    // Verify checkpoint was created
                    expect(checkpoint).toBeDefined();
                    expect(checkpoint.step).toBe(checkpointStep);
                    expect(checkpoint.isValid).toBe(true);

                    // Load the checkpoint
                    const loadedCheckpoint = await manager.loadCheckpoint(checkpoint.id);

                    // Verify checkpoint round-trip
                    expect(loadedCheckpoint).toBeDefined();
                    expect(loadedCheckpoint.id).toBe(checkpoint.id);
                    expect(loadedCheckpoint.step).toBe(checkpoint.step);
                    expect(loadedCheckpoint.pageId).toBe(checkpoint.pageId);
                    expect(loadedCheckpoint.iteration).toBe(checkpoint.iteration);
                    expect(loadedCheckpoint.isValid).toBe(checkpoint.isValid);

                    // Verify state snapshot consistency
                    expect(loadedCheckpoint.stateSnapshot).toEqual(checkpoint.stateSnapshot);
                    expect(loadedCheckpoint.tokenUsage).toEqual(checkpoint.tokenUsage);

                    // Clean up
                    await manager.cleanup();
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Test that state can be saved and loaded
     * Validates: Requirements AC-04.1
     */
    it('should preserve workflow state through save/load round-trip', async () => {
        await fc.assert(
            fc.asyncProperty(projectNameArb, pagesArb, async (projectName, pages) => {
                // Create WorkflowStateManager
                const manager = new WorkflowStateManager({
                    projectName,
                    baseDir: tempDir,
                    autoSave: false, // Manual save for this test
                });

                // Initialize workflow
                const initialState = await manager.initializeWorkflow(pages, 5);

                // Save state
                await manager.saveState();

                // Create a new manager instance
                const manager2 = new WorkflowStateManager({
                    projectName,
                    baseDir: tempDir,
                    autoSave: false,
                });

                // Load state
                const loadedState = await manager2.loadState();

                // Verify state round-trip
                expect(loadedState.workflowId).toBe(initialState.workflowId);
                expect(loadedState.projectName).toBe(initialState.projectName);
                expect(loadedState.status).toBe(initialState.status);
                expect(loadedState.schemaVersion).toBe(initialState.schemaVersion);
                expect(loadedState.pages.length).toBe(initialState.pages.length);
                expect(loadedState.currentPage).toEqual(initialState.currentPage);

                // Clean up
                await manager.cleanup();
                await manager2.cleanup();
            }),
            { numRuns: 50 }
        );
    });

    /**
     * Test that restoring from checkpoint works correctly
     * Validates: Requirements AC-04.3
     */
    it('should restore workflow state from checkpoint', async () => {
        await fc.assert(
            fc.asyncProperty(
                projectNameArb,
                pagesArb,
                checkpointStepArb,
                async (projectName, pages, checkpointStep) => {
                    // Create WorkflowStateManager
                    const manager = new WorkflowStateManager({
                        projectName,
                        baseDir: tempDir,
                        autoSave: true,
                    });

                    // Initialize workflow
                    await manager.initializeWorkflow(pages, 5);

                    // Create a checkpoint
                    const checkpoint = await manager.createCheckpoint(checkpointStep);

                    // Modify state (simulate progress)
                    const currentState = manager.getState();
                    if (currentState) {
                        await manager.updateState({
                            status: 'paused',
                            lastUpdateTime: Date.now(),
                        });
                    }

                    // Restore from checkpoint
                    const restoredState = await manager.restoreFromCheckpoint(checkpoint.id);

                    // Verify restoration
                    expect(restoredState).toBeDefined();
                    expect(restoredState.recovery.lastSuccessfulCheckpoint).toBe(checkpoint.id);
                    expect(restoredState.recovery.canResume).toBe(true);

                    // Clean up
                    await manager.cleanup();
                }
            ),
            { numRuns: 30 }
        );
    });

    /**
     * Test that checkpoint limit enforcement works
     * Validates: Requirements AC-04.1
     */
    it('should enforce checkpoint limit by removing oldest checkpoints', async () => {
        await fc.assert(
            fc.asyncProperty(
                projectNameArb,
                pagesArb,
                fc.integer({ min: 3, max: 5 }),
                async (projectName, pages, maxCheckpoints) => {
                    // Create WorkflowStateManager with checkpoint limit
                    const manager = new WorkflowStateManager({
                        projectName,
                        baseDir: tempDir,
                        maxCheckpoints,
                        autoSave: true,
                    });

                    // Initialize workflow
                    await manager.initializeWorkflow(pages, 5);

                    // Create more checkpoints than the limit
                    const checkpointSteps: CheckpointStep[] = [
                        'page-started',
                        'iteration-started',
                        'ux-spec-created',
                        'code-implemented',
                        'screenshot-captured',
                        'feedback-collected',
                        'feedback-consolidated',
                        'iteration-complete',
                    ];

                    for (let i = 0; i < maxCheckpoints + 3; i++) {
                        const step = checkpointSteps[i % checkpointSteps.length];
                        await manager.createCheckpoint(step);
                    }

                    // Verify checkpoint count is at most maxCheckpoints
                    const state = manager.getState();
                    expect(state).toBeDefined();
                    if (state) {
                        expect(state.checkpoints.length).toBeLessThanOrEqual(maxCheckpoints);
                    }

                    // Clean up
                    await manager.cleanup();
                }
            ),
            { numRuns: 20 }
        );
    });

    /**
     * Test that getLastCheckpoint returns the most recent checkpoint
     * Validates: Requirements AC-04.3
     */
    it('should return the last checkpoint correctly', async () => {
        await fc.assert(
            fc.asyncProperty(projectNameArb, pagesArb, async (projectName, pages) => {
                // Create WorkflowStateManager
                const manager = new WorkflowStateManager({
                    projectName,
                    baseDir: tempDir,
                    autoSave: true,
                });

                // Initialize workflow
                await manager.initializeWorkflow(pages, 5);

                // Create multiple checkpoints
                await manager.createCheckpoint('page-started');
                await manager.createCheckpoint('iteration-started');
                const lastCheckpoint = await manager.createCheckpoint('ux-spec-created');

                // Get last checkpoint
                const retrievedCheckpoint = await manager.getLastCheckpoint();

                // Verify it's the last one created
                expect(retrievedCheckpoint).toBeDefined();
                if (retrievedCheckpoint) {
                    expect(retrievedCheckpoint.id).toBe(lastCheckpoint.id);
                    expect(retrievedCheckpoint.step).toBe('ux-spec-created');
                }

                // Clean up
                await manager.cleanup();
            }),
            { numRuns: 30 }
        );
    });

    /**
     * Test that state exists check works correctly
     * Validates: Requirements AC-04.1
     */
    it('should correctly report whether state exists', async () => {
        await fc.assert(
            fc.asyncProperty(projectNameArb, pagesArb, async (projectName, pages) => {
                // Create WorkflowStateManager
                const manager = new WorkflowStateManager({
                    projectName,
                    baseDir: tempDir,
                    autoSave: true,
                });

                // State should not exist initially
                const existsBefore = await manager.stateExists();
                expect(existsBefore).toBe(false);

                // Initialize workflow
                await manager.initializeWorkflow(pages, 5);

                // State should exist after initialization
                const existsAfter = await manager.stateExists();
                expect(existsAfter).toBe(true);

                // Delete state
                await manager.deleteWorkflowState();

                // State should not exist after deletion
                const existsAfterDelete = await manager.stateExists();
                expect(existsAfterDelete).toBe(false);

                // Clean up
                await manager.cleanup();
            }),
            { numRuns: 30 }
        );
    });
});
