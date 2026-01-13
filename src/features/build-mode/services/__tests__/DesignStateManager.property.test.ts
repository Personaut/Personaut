/**
 * Property Tests for DesignStateManager
 *
 * These property-based tests validate critical invariants:
 * - Property 4: State Persistence Round-Trip
 * - Property 5: Traceability ID Uniqueness
 *
 * **Part of Build-to-Design Transformation**
 * Validates: Requirements 13.1-13.5, 19.1
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { DesignStateManager } from '../DesignStateManager';
import {
    TrackedItemType,
    generateTrackedId,
} from '../../types/WorkflowStateTypes';

describe('DesignStateManager Property Tests', () => {
    let tempDir: string;
    let manager: DesignStateManager;

    beforeEach(async () => {
        // Create a unique temp directory for each test
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'design-state-test-'));
        manager = new DesignStateManager({
            projectName: 'test-project',
            baseDir: tempDir,
            autoSave: false, // Disable auto-save for testing
        });
    });

    afterEach(async () => {
        // Clean up temp directory
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    // =========================================================================
    // Property 4: State Persistence Round-Trip
    // =========================================================================
    describe('Property 4: State Persistence Round-Trip', () => {
        /**
         * Property 4: For any valid DesignWorkflowState, serializing to storage
         * and then deserializing SHALL produce an equivalent state object with
         * all stage data, traceability links, and token usage preserved.
         */
        it('should preserve state data through save/load cycle', async () => {
            // Initialize state
            await manager.initializeDesignWorkflow('Test Project', 'A test project description');

            // Add some stage data
            await manager.setStageData('idea', {
                projectName: 'Test Project',
                projectDescription: 'A test project description',
                completedAt: Date.now(),
            });

            await manager.setStageData('users', {
                personas: [
                    { id: 'persona-abc123', name: 'Test User', role: 'Developer' },
                ],
                completedAt: Date.now(),
            });

            // Mark stages complete
            await manager.markStageComplete('idea');
            await manager.markStageComplete('users');

            // Add traceability links
            manager.linkStoryToFeature('story-001', 'feature-001');
            manager.linkPageToStories('page-001', ['story-001', 'story-002']);
            manager.linkTaskToStoryAndPage('task-001', 'story-001', 'page-001');

            // Record token usage
            await manager.recordTokenUsage('idea', 100);
            await manager.recordTokenUsage('users', 250);

            // Get original state
            const originalState = manager.getState();
            expect(originalState).not.toBeNull();

            // Save state
            await manager.save();

            // Create new manager and load
            const newManager = new DesignStateManager({
                projectName: 'test-project',
                baseDir: tempDir,
                autoSave: false,
            });

            const loadedState = await newManager.load();
            expect(loadedState).not.toBeNull();

            // Verify all properties are preserved
            expect(loadedState!.workflowId).toBe(originalState!.workflowId);
            expect(loadedState!.projectName).toBe(originalState!.projectName);
            expect(loadedState!.projectDescription).toBe(originalState!.projectDescription);
            expect(loadedState!.currentStage).toBe(originalState!.currentStage);
            expect(loadedState!.completedStages).toEqual(originalState!.completedStages);
            expect(loadedState!.schemaVersion).toBe('2.0.0');

            // Verify stage data preserved
            expect(loadedState!.stageData.idea).toEqual(originalState!.stageData.idea);
            expect(loadedState!.stageData.users).toEqual(originalState!.stageData.users);

            // Verify traceability links preserved
            expect(loadedState!.traceability.links.length).toBe(originalState!.traceability.links.length);
            expect(loadedState!.traceability.links).toEqual(originalState!.traceability.links);

            // Verify token usage preserved
            expect(loadedState!.tokenUsage.total).toBe(originalState!.tokenUsage.total);
            expect(loadedState!.tokenUsage.byStage).toEqual(originalState!.tokenUsage.byStage);

            // Verify timestamps preserved
            expect(loadedState!.createdAt).toBe(originalState!.createdAt);
        });

        it('should preserve traceability link indices after round-trip', async () => {
            await manager.initializeDesignWorkflow('Test Project', 'Description');

            // Add multiple links
            manager.linkStoryToFeature('story-001', 'feature-001');
            manager.linkStoryToFeature('story-002', 'feature-001');
            manager.linkStoryToFeature('story-003', 'feature-002');
            manager.linkPageToStories('page-001', ['story-001', 'story-002']);

            // Save and reload
            await manager.save();

            const newManager = new DesignStateManager({
                projectName: 'test-project',
                baseDir: tempDir,
                autoSave: false,
            });
            await newManager.load();

            // Verify query results match
            expect(newManager.getStoriesForFeature('feature-001').sort()).toEqual(['story-001', 'story-002']);
            expect(newManager.getStoriesForFeature('feature-002')).toEqual(['story-003']);
            expect(newManager.getPagesForStory('story-001')).toEqual(['page-001']);
            expect(newManager.getPagesForStory('story-002')).toEqual(['page-001']);
        });

        it('should handle empty state round-trip', async () => {
            await manager.initializeDesignWorkflow('Empty Project', '');
            await manager.save();

            const newManager = new DesignStateManager({
                projectName: 'test-project',
                baseDir: tempDir,
                autoSave: false,
            });
            const loadedState = await newManager.load();

            expect(loadedState).not.toBeNull();
            expect(loadedState!.traceability.links).toHaveLength(0);
            expect(loadedState!.tokenUsage.total).toBe(0);
        });

        it('should preserve complex nested stage data', async () => {
            await manager.initializeDesignWorkflow('Complex Project', 'Description');

            const complexStageData = {
                features: [
                    {
                        id: 'feature-001',
                        name: 'Authentication',
                        description: 'User authentication feature',
                        priority: 'high',
                        isUserModified: false,
                        subFeatures: [
                            { name: 'Login', completed: true },
                            { name: 'Logout', completed: false },
                        ],
                    },
                ],
                metadata: {
                    version: 1,
                    lastEditor: 'user-123',
                },
                completedAt: Date.now(),
            };

            await manager.setStageData('features', complexStageData);
            await manager.save();

            const newManager = new DesignStateManager({
                projectName: 'test-project',
                baseDir: tempDir,
                autoSave: false,
            });
            await newManager.load();

            const loadedStageData = newManager.getStageData('features');
            expect(loadedStageData).toEqual(complexStageData);
        });
    });

    // =========================================================================
    // Property 5: Traceability ID Uniqueness
    // =========================================================================
    describe('Property 5: Traceability ID Uniqueness', () => {
        /**
         * Property 5: For any generated item (Feature, Story, Page, Task),
         * the assigned Traceability_ID SHALL be unique across the entire workflow.
         */
        it('should generate unique IDs for all item types', () => {
            const itemTypes: TrackedItemType[] = ['feature', 'story', 'page', 'flow', 'task'];
            const generatedIds = new Set<string>();

            // Generate 100 IDs of each type
            for (const type of itemTypes) {
                for (let i = 0; i < 100; i++) {
                    const id = generateTrackedId(type);

                    // Check uniqueness
                    expect(generatedIds.has(id)).toBe(false);
                    generatedIds.add(id);

                    // Check format: {type}-{uuid}
                    expect(id.startsWith(`${type}-`)).toBe(true);
                    expect(id.length).toBeGreaterThan(type.length + 1);
                }
            }

            // Verify we generated 500 unique IDs
            expect(generatedIds.size).toBe(500);
        });

        it('should maintain ID uniqueness when using manager.generateId', async () => {
            await manager.initializeDesignWorkflow('Test Project', 'Description');

            const generatedIds = new Set<string>();

            // Generate IDs through the manager
            for (let i = 0; i < 50; i++) {
                const featureId = manager.generateId('feature');
                const storyId = manager.generateId('story');
                const pageId = manager.generateId('page');
                const taskId = manager.generateId('task');

                // All should be unique
                expect(generatedIds.has(featureId)).toBe(false);
                expect(generatedIds.has(storyId)).toBe(false);
                expect(generatedIds.has(pageId)).toBe(false);
                expect(generatedIds.has(taskId)).toBe(false);

                generatedIds.add(featureId);
                generatedIds.add(storyId);
                generatedIds.add(pageId);
                generatedIds.add(taskId);
            }

            expect(generatedIds.size).toBe(200);
        });

        it('should generate IDs in correct format', () => {
            const formatRegex = /^(feature|story|page|flow|task)-[a-f0-9]{8}$/;

            const featureId = generateTrackedId('feature');
            const storyId = generateTrackedId('story');
            const pageId = generateTrackedId('page');
            const flowId = generateTrackedId('flow');
            const taskId = generateTrackedId('task');

            expect(formatRegex.test(featureId)).toBe(true);
            expect(formatRegex.test(storyId)).toBe(true);
            expect(formatRegex.test(pageId)).toBe(true);
            expect(formatRegex.test(flowId)).toBe(true);
            expect(formatRegex.test(taskId)).toBe(true);
        });

        it('should track all IDs in workflow', async () => {
            await manager.initializeDesignWorkflow('Test Project', 'Description');

            // Add links with various IDs
            const featureId = manager.generateId('feature');
            const storyId1 = manager.generateId('story');
            const storyId2 = manager.generateId('story');
            const pageId = manager.generateId('page');
            const taskId = manager.generateId('task');

            manager.linkStoryToFeature(storyId1, featureId);
            manager.linkStoryToFeature(storyId2, featureId);
            manager.linkPageToStories(pageId, [storyId1, storyId2]);
            manager.linkTaskToStoryAndPage(taskId, storyId1, pageId);

            // Get all tracked IDs
            const allIds = manager.getAllTrackedIds();

            expect(allIds.has(featureId)).toBe(true);
            expect(allIds.has(storyId1)).toBe(true);
            expect(allIds.has(storyId2)).toBe(true);
            expect(allIds.has(pageId)).toBe(true);
            expect(allIds.has(taskId)).toBe(true);

            // All IDs should be unique
            expect(allIds.size).toBe(5);
        });
    });

    // =========================================================================
    // Additional Traceability Tests
    // =========================================================================
    describe('Traceability Link Integrity', () => {
        it('should correctly link stories to features', async () => {
            await manager.initializeDesignWorkflow('Test Project', 'Description');

            manager.linkStoryToFeature('story-001', 'feature-001');
            manager.linkStoryToFeature('story-002', 'feature-001');
            manager.linkStoryToFeature('story-003', 'feature-002');

            expect(manager.getStoriesForFeature('feature-001').sort()).toEqual(['story-001', 'story-002']);
            expect(manager.getStoriesForFeature('feature-002')).toEqual(['story-003']);
            expect(manager.getStoriesForFeature('feature-003')).toEqual([]);
        });

        it('should correctly query reverse links', async () => {
            await manager.initializeDesignWorkflow('Test Project', 'Description');

            manager.linkStoryToFeature('story-001', 'feature-001');

            // Get the feature for a story
            expect(manager.getFeatureForStory('story-001')).toBe('feature-001');
            expect(manager.getFeatureForStory('story-999')).toBeNull();
        });

        it('should detect circular dependencies in tasks', async () => {
            await manager.initializeDesignWorkflow('Test Project', 'Description');

            // Create a cycle: task-001 -> task-002 -> task-003 -> task-001
            manager.linkTaskDependency('task-001', 'task-002');
            manager.linkTaskDependency('task-002', 'task-003');
            manager.linkTaskDependency('task-003', 'task-001');

            expect(manager.hasCircularDependency('task-001')).toBe(true);
            expect(manager.hasCircularDependency('task-002')).toBe(true);
            expect(manager.hasCircularDependency('task-003')).toBe(true);
        });

        it('should not falsely detect circular dependencies', async () => {
            await manager.initializeDesignWorkflow('Test Project', 'Description');

            // Create a valid DAG: task-001 <- task-002 <- task-003
            manager.linkTaskDependency('task-002', 'task-001');
            manager.linkTaskDependency('task-003', 'task-002');

            expect(manager.hasCircularDependency('task-001')).toBe(false);
            expect(manager.hasCircularDependency('task-002')).toBe(false);
            expect(manager.hasCircularDependency('task-003')).toBe(false);
        });

        it('should handle diamond dependencies without false positives', async () => {
            await manager.initializeDesignWorkflow('Test Project', 'Description');

            // Diamond pattern:
            //     task-001
            //    /        \
            // task-002  task-003
            //    \        /
            //     task-004
            manager.linkTaskDependency('task-002', 'task-001');
            manager.linkTaskDependency('task-003', 'task-001');
            manager.linkTaskDependency('task-004', 'task-002');
            manager.linkTaskDependency('task-004', 'task-003');

            expect(manager.hasCircularDependency('task-001')).toBe(false);
            expect(manager.hasCircularDependency('task-002')).toBe(false);
            expect(manager.hasCircularDependency('task-003')).toBe(false);
            expect(manager.hasCircularDependency('task-004')).toBe(false);
        });
    });

    // =========================================================================
    // Token Warning Threshold (Property 12)
    // =========================================================================
    describe('Token Warning Threshold', () => {
        it('should trigger warning when usage exceeds 80% of budget', async () => {
            await manager.initializeDesignWorkflow('Test Project', 'Description');

            // Set a budget
            await manager.updateState({
                tokenUsage: {
                    ...manager.getTokenUsage()!,
                    budget: 1000,
                },
            });

            // Use tokens below threshold
            await manager.recordTokenUsage('idea', 700);
            expect(manager.getTokenUsage()!.budgetWarningShown).toBe(false);

            // Exceed 80% threshold
            await manager.recordTokenUsage('users', 100);
            expect(manager.getTokenUsage()!.budgetWarningShown).toBe(true);
        });
    });
});
