/**
 * IterationPlan - Manages iteration checkpoints for resumable builds
 * 
 * Tracks the progress of each iteration step and saves checkpoints to disk.
 * Allows builds to resume from the last completed step after pause/crash.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'failed';
export type PlanStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

export interface IterationStep {
    id: string;
    name: string;
    status: StepStatus;
    startedAt: string | null;
    completedAt: string | null;
    artifacts: Record<string, any>;
    error: string | null;
    progress?: {
        total: number;
        completed: number;
        failed: number;
    };
}

export interface IterationPlanData {
    pageId: string;
    pageName: string;
    iteration: number;
    status: PlanStatus;
    createdAt: string;
    updatedAt: string;
    steps: IterationStep[];
}

/**
 * Manages iteration plan with checkpoints
 */
export class IterationPlan {
    private planPath: string;
    private plan!: IterationPlanData;
    private iterationDir: string;

    constructor(
        baseDir: string,
        private pageId: string,
        private iteration: number
    ) {
        this.iterationDir = path.join(
            baseDir,
            '.personaut',
            'iterations',
            pageId,
            `iteration_${iteration}`
        );
        this.planPath = path.join(this.iterationDir, 'plan.json');
    }

    /**
     * Initialize or load existing plan
     */
    async initialize(pageName: string): Promise<void> {
        if (await this.exists()) {
            // Load existing plan
            this.plan = await this.load();
            console.log(`[IterationPlan] Loaded existing plan for ${pageName} iteration ${this.iteration}`);
        } else {
            // Create new plan
            this.plan = {
                pageId: this.pageId,
                pageName,
                iteration: this.iteration,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                steps: [
                    {
                        id: 'design',
                        name: 'Design Phase',
                        status: 'pending',
                        startedAt: null,
                        completedAt: null,
                        artifacts: {},
                        error: null,
                    },
                    {
                        id: 'development',
                        name: 'Development Phase',
                        status: 'pending',
                        startedAt: null,
                        completedAt: null,
                        artifacts: {},
                        error: null,
                    },
                    {
                        id: 'review',
                        name: 'Review Phase',
                        status: 'pending',
                        startedAt: null,
                        completedAt: null,
                        artifacts: {},
                        error: null,
                        progress: { total: 0, completed: 0, failed: 0 },
                    },
                    {
                        id: 'consolidation',
                        name: 'Consolidation Phase',
                        status: 'pending',
                        startedAt: null,
                        completedAt: null,
                        artifacts: {},
                        error: null,
                    },
                    {
                        id: 'save-feedback',
                        name: 'Save Feedback',
                        status: 'pending',
                        startedAt: null,
                        completedAt: null,
                        artifacts: {},
                        error: null,
                    },
                ],
            };
            await this.save();
            console.log(`[IterationPlan] Created new plan for ${pageName} iteration ${this.iteration}`);
        }
    }

    /**
     * Mark step as started
     */
    async startStep(stepId: string): Promise<void> {
        const step = this.plan.steps.find(s => s.id === stepId);
        if (!step) {
            throw new Error(`Step ${stepId} not found in plan`);
        }

        step.status = 'in-progress';
        step.startedAt = new Date().toISOString();
        this.plan.status = 'in-progress';
        this.plan.updatedAt = new Date().toISOString();

        await this.save();
        console.log(`[IterationPlan] Started step: ${step.name}`);
    }

    /**
     * Mark step as completed
     */
    async completeStep(stepId: string, artifacts: Record<string, any> = {}): Promise<void> {
        const step = this.plan.steps.find(s => s.id === stepId);
        if (!step) {
            throw new Error(`Step ${stepId} not found in plan`);
        }

        step.status = 'completed';
        step.completedAt = new Date().toISOString();
        step.artifacts = { ...step.artifacts, ...artifacts };
        this.plan.updatedAt = new Date().toISOString();

        // Check if all steps are complete
        const allComplete = this.plan.steps.every(s => s.status === 'completed');
        if (allComplete) {
            this.plan.status = 'completed';
        }

        await this.save();
        console.log(`[IterationPlan] Completed step: ${step.name}`);
    }

    /**
     * Mark step as failed
     */
    async failStep(stepId: string, error: string): Promise<void> {
        const step = this.plan.steps.find(s => s.id === stepId);
        if (!step) {
            throw new Error(`Step ${stepId} not found in plan`);
        }

        step.status = 'failed';
        step.error = error;
        this.plan.status = 'failed';
        this.plan.updatedAt = new Date().toISOString();

        await this.save();
        console.log(`[IterationPlan] Failed step: ${step.name} - ${error}`);
    }

    /**
     * Update step progress (for review phase)
     */
    async updateProgress(
        stepId: string,
        progress: { total: number; completed: number; failed: number }
    ): Promise<void> {
        const step = this.plan.steps.find(s => s.id === stepId);
        if (!step) {
            throw new Error(`Step ${stepId} not found in plan`);
        }

        step.progress = progress;
        this.plan.updatedAt = new Date().toISOString();

        await this.save();
    }

    /**
     * Get next pending step
     */
    getNextStep(): IterationStep | null {
        return this.plan.steps.find(s => s.status === 'pending') || null;
    }

    /**
     * Get current in-progress step
     */
    getCurrentStep(): IterationStep | null {
        return this.plan.steps.find(s => s.status === 'in-progress') || null;
    }

    /**
     * Check if step is completed
     */
    isStepCompleted(stepId: string): boolean {
        const step = this.plan.steps.find(s => s.id === stepId);
        return step?.status === 'completed';
    }

    /**
     * Get artifacts from completed step
     */
    getStepArtifacts(stepId: string): Record<string, any> {
        const step = this.plan.steps.find(s => s.id === stepId);
        return step?.artifacts || {};
    }

    /**
     * Get full path to artifact
     */
    getArtifactPath(filename: string): string {
        return path.join(this.iterationDir, filename);
    }

    /**
     * Save plan to disk
     */
    private async save(): Promise<void> {
        const dir = path.dirname(this.planPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(this.planPath, JSON.stringify(this.plan, null, 2), 'utf-8');
    }

    /**
     * Load plan from disk
     */
    private async load(): Promise<IterationPlanData> {
        const content = await fs.readFile(this.planPath, 'utf-8');
        return JSON.parse(content);
    }

    /**
     * Check if plan exists
     */
    private async exists(): Promise<boolean> {
        try {
            await fs.access(this.planPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get plan status
     */
    getStatus(): PlanStatus {
        return this.plan.status;
    }

    /**
     * Get plan data
     */
    getPlan(): IterationPlanData {
        return this.plan;
    }

    /**
     * Get completion percentage
     */
    getCompletionPercentage(): number {
        const completed = this.plan.steps.filter(s => s.status === 'completed').length;
        return (completed / this.plan.steps.length) * 100;
    }

    /**
     * Get summary for logging
     */
    getSummary(): string {
        const completed = this.plan.steps.filter(s => s.status === 'completed').length;
        const inProgress = this.plan.steps.filter(s => s.status === 'in-progress').length;
        const failed = this.plan.steps.filter(s => s.status === 'failed').length;
        const pending = this.plan.steps.filter(s => s.status === 'pending').length;

        return `Status: ${this.plan.status} | Steps: ${completed} completed, ${inProgress} in-progress, ${failed} failed, ${pending} pending`;
    }
}
