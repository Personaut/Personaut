/**
 * IterationPlan - Unit Tests
 * 
 * Tests the checkpointing functionality for resumable builds
 */

import { IterationPlan } from '../IterationPlan';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs module
jest.mock('fs/promises');

describe('IterationPlan', () => {
    const mockBaseDir = '/test/project';
    const mockPageId = 'testPage';
    const mockIteration = 1;
    const mockPageName = 'Test Page';

    let plan: IterationPlan;
    let mockFs: jest.Mocked<typeof fs>;

    beforeEach(() => {
        mockFs = fs as jest.Mocked<typeof fs>;
        jest.clearAllMocks();

        plan = new IterationPlan(mockBaseDir, mockPageId, mockIteration);
    });

    describe('initialize', () => {
        it('should create new plan if none exists', async () => {
            // Mock plan doesn't exist
            mockFs.access.mockRejectedValue(new Error('File not found'));
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);

            await plan.initialize(mockPageName);

            const planData = plan.getPlan();
            expect(planData.pageId).toBe(mockPageId);
            expect(planData.pageName).toBe(mockPageName);
            expect(planData.iteration).toBe(mockIteration);
            expect(planData.status).toBe('pending');
            expect(planData.steps).toHaveLength(5);
            expect(planData.steps[0].id).toBe('design');
            expect(planData.steps[1].id).toBe('development');
            expect(planData.steps[2].id).toBe('review');
            expect(planData.steps[3].id).toBe('consolidation');
            expect(planData.steps[4].id).toBe('save-feedback');
        });

        it('should load existing plan if it exists', async () => {
            const existingPlan = {
                pageId: mockPageId,
                pageName: mockPageName,
                iteration: mockIteration,
                status: 'in-progress' as const,
                createdAt: '2026-01-08T07:00:00Z',
                updatedAt: '2026-01-08T07:05:00Z',
                steps: [
                    {
                        id: 'design',
                        name: 'Design Phase',
                        status: 'completed' as const,
                        startedAt: '2026-01-08T07:00:00Z',
                        completedAt: '2026-01-08T07:02:00Z',
                        artifacts: { uxSpec: 'ux-spec.md' },
                        error: null,
                    },
                    {
                        id: 'development',
                        name: 'Development Phase',
                        status: 'in-progress' as const,
                        startedAt: '2026-01-08T07:02:00Z',
                        completedAt: null,
                        artifacts: {},
                        error: null,
                    },
                    {
                        id: 'review',
                        name: 'Review Phase',
                        status: 'pending' as const,
                        startedAt: null,
                        completedAt: null,
                        artifacts: {},
                        error: null,
                        progress: { total: 0, completed: 0, failed: 0 },
                    },
                    {
                        id: 'consolidation',
                        name: 'Consolidation Phase',
                        status: 'pending' as const,
                        startedAt: null,
                        completedAt: null,
                        artifacts: {},
                        error: null,
                    },
                    {
                        id: 'save-feedback',
                        name: 'Save Feedback',
                        status: 'pending' as const,
                        startedAt: null,
                        completedAt: null,
                        artifacts: {},
                        error: null,
                    },
                ],
            };

            // Mock plan exists
            mockFs.access.mockResolvedValue(undefined);
            mockFs.readFile.mockResolvedValue(JSON.stringify(existingPlan));

            await plan.initialize(mockPageName);

            const planData = plan.getPlan();
            expect(planData.status).toBe('in-progress');
            expect(planData.steps[0].status).toBe('completed');
            expect(planData.steps[1].status).toBe('in-progress');
        });
    });

    describe('step management', () => {
        beforeEach(async () => {
            // Initialize with new plan
            mockFs.access.mockRejectedValue(new Error('File not found'));
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
            await plan.initialize(mockPageName);
        });

        it('should start a step', async () => {
            await plan.startStep('design');

            const planData = plan.getPlan();
            const designStep = planData.steps.find(s => s.id === 'design');

            expect(designStep?.status).toBe('in-progress');
            expect(designStep?.startedAt).toBeTruthy();
            expect(planData.status).toBe('in-progress');
        });

        it('should complete a step with artifacts', async () => {
            await plan.startStep('design');
            await plan.completeStep('design', { uxSpec: 'ux-spec.md' });

            const planData = plan.getPlan();
            const designStep = planData.steps.find(s => s.id === 'design');

            expect(designStep?.status).toBe('completed');
            expect(designStep?.completedAt).toBeTruthy();
            expect(designStep?.artifacts.uxSpec).toBe('ux-spec.md');
        });

        it('should mark plan as completed when all steps are done', async () => {
            // Complete all steps
            for (const stepId of ['design', 'development', 'review', 'consolidation', 'save-feedback']) {
                await plan.startStep(stepId);
                await plan.completeStep(stepId, {});
            }

            const planData = plan.getPlan();
            expect(planData.status).toBe('completed');
        });

        it('should fail a step with error message', async () => {
            await plan.startStep('design');
            await plan.failStep('design', 'Network error');

            const planData = plan.getPlan();
            const designStep = planData.steps.find(s => s.id === 'design');

            expect(designStep?.status).toBe('failed');
            expect(designStep?.error).toBe('Network error');
            expect(planData.status).toBe('failed');
        });

        it('should update progress for review step', async () => {
            await plan.startStep('review');
            await plan.updateProgress('review', { total: 3, completed: 2, failed: 0 });

            const planData = plan.getPlan();
            const reviewStep = planData.steps.find(s => s.id === 'review');

            expect(reviewStep?.progress).toEqual({ total: 3, completed: 2, failed: 0 });
        });
    });

    describe('step queries', () => {
        beforeEach(async () => {
            mockFs.access.mockRejectedValue(new Error('File not found'));
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
            await plan.initialize(mockPageName);
        });

        it('should check if step is completed', async () => {
            expect(plan.isStepCompleted('design')).toBe(false);

            await plan.startStep('design');
            expect(plan.isStepCompleted('design')).toBe(false);

            await plan.completeStep('design', {});
            expect(plan.isStepCompleted('design')).toBe(true);
        });

        it('should get step artifacts', async () => {
            await plan.startStep('design');
            await plan.completeStep('design', { uxSpec: 'ux-spec.md', extra: 'data' });

            const artifacts = plan.getStepArtifacts('design');
            expect(artifacts.uxSpec).toBe('ux-spec.md');
            expect(artifacts.extra).toBe('data');
        });

        it('should get next pending step', async () => {
            let nextStep = plan.getNextStep();
            expect(nextStep?.id).toBe('design');

            await plan.startStep('design');
            await plan.completeStep('design', {});

            nextStep = plan.getNextStep();
            expect(nextStep?.id).toBe('development');
        });

        it('should get current in-progress step', async () => {
            let currentStep = plan.getCurrentStep();
            expect(currentStep).toBeNull();

            await plan.startStep('design');
            currentStep = plan.getCurrentStep();
            expect(currentStep?.id).toBe('design');

            await plan.completeStep('design', {});
            currentStep = plan.getCurrentStep();
            expect(currentStep).toBeNull();
        });

        it('should get artifact path', () => {
            const artifactPath = plan.getArtifactPath('ux-spec.md');
            expect(artifactPath).toBe(
                path.join(mockBaseDir, '.personaut', 'iterations', mockPageId, 'iteration_1', 'ux-spec.md')
            );
        });
    });

    describe('status and summary', () => {
        beforeEach(async () => {
            mockFs.access.mockRejectedValue(new Error('File not found'));
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
            await plan.initialize(mockPageName);
        });

        it('should get plan status', () => {
            expect(plan.getStatus()).toBe('pending');
        });

        it('should calculate completion percentage', async () => {
            expect(plan.getCompletionPercentage()).toBe(0);

            await plan.startStep('design');
            await plan.completeStep('design', {});
            expect(plan.getCompletionPercentage()).toBe(20); // 1/5 = 20%

            await plan.startStep('development');
            await plan.completeStep('development', {});
            expect(plan.getCompletionPercentage()).toBe(40); // 2/5 = 40%
        });

        it('should generate summary string', async () => {
            const summary = plan.getSummary();
            expect(summary).toContain('Status: pending');
            expect(summary).toContain('0 completed');
            expect(summary).toContain('5 pending');

            await plan.startStep('design');
            await plan.completeStep('design', {});

            const summary2 = plan.getSummary();
            expect(summary2).toContain('1 completed');
            expect(summary2).toContain('4 pending');
        });
    });

    describe('error handling', () => {
        beforeEach(async () => {
            mockFs.access.mockRejectedValue(new Error('File not found'));
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
            await plan.initialize(mockPageName);
        });

        it('should throw error for invalid step id', async () => {
            await expect(plan.startStep('invalid-step')).rejects.toThrow('Step invalid-step not found');
            await expect(plan.completeStep('invalid-step', {})).rejects.toThrow('Step invalid-step not found');
            await expect(plan.failStep('invalid-step', 'error')).rejects.toThrow('Step invalid-step not found');
        });
    });

    describe('persistence', () => {
        beforeEach(async () => {
            mockFs.access.mockRejectedValue(new Error('File not found'));
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
            await plan.initialize(mockPageName);
        });

        it('should save plan to disk when step starts', async () => {
            await plan.startStep('design');

            expect(mockFs.writeFile).toHaveBeenCalled();
            const lastCall = (mockFs.writeFile as jest.Mock).mock.calls.slice(-1)[0];
            const savedData = JSON.parse(lastCall[1]);

            expect(savedData.steps[0].status).toBe('in-progress');
        });

        it('should save plan to disk when step completes', async () => {
            await plan.startStep('design');
            await plan.completeStep('design', { uxSpec: 'ux-spec.md' });

            expect(mockFs.writeFile).toHaveBeenCalled();
            const lastCall = (mockFs.writeFile as jest.Mock).mock.calls.slice(-1)[0];
            const savedData = JSON.parse(lastCall[1]);

            expect(savedData.steps[0].status).toBe('completed');
            expect(savedData.steps[0].artifacts.uxSpec).toBe('ux-spec.md');
        });
    });
});
