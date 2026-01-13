/**
 * HandoffManager - Manages structured data transfer between agents
 * 
 * Responsibilities:
 * - Create handoffs between Designer, Developer, and Reviewer agents
 * - Validate handoff data integrity with checksums
 * - Persist raw feedback to file system
 * - Generate deltas for UX specs
 * 
 * Feature: build-agent-architecture-review
 * Validates: Requirements AC-03.2, AC-11.3, AC-12.7
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Handoff context shared across all handoffs
 */
export interface HandoffContext {
    projectName: string;
    pageId: string;
    pageName: string;
    iteration: number;
}

/**
 * UX specification
 */
export interface UXSpec {
    pageId: string;
    iteration: number;
    content: string;
    checksum: string;
    baseSpecChecksum?: string; // For deltas (iteration > 1)
    isDelta?: boolean;
}

/**
 * Code implementation
 */
export interface Implementation {
    pageId: string;
    iteration: number;
    code: string;
    filePath: string;
    checksum: string;
    baseCodeChecksum?: string; // For deltas
}

/**
 * Raw feedback from a reviewer
 */
export interface RawFeedback {
    personaId: string;
    personaName: string;
    personaRole: string;
    pageId: string;
    iteration: number;
    timestamp: number;
    feedback: {
        likes: string[];
        dislikes: string[];
        suggestions: string[];
        concerns: string[];
        rating: number;
    };
    screenshotPath: string;
}

/**
 * Raw feedback source reference (file-based)
 */
export interface RawFeedbackSource {
    personaId: string;
    personaName: string;
    filePath: string;
    fileSize: number;
    completed: boolean;
}

/**
 * Designer to Developer handoff
 */
export interface DesignerToDeveloperHandoff {
    handoffId: string;
    timestamp: number;
    projectName: string;
    pageId: string;
    pageName: string;
    iteration: number;
    schemaVersion: '1.0.0';
    checksum: string;

    uxSpec: UXSpec;
    previousImplementation?: {
        filePath: string;
        checksum: string;
    };

    tokenMetrics: {
        uxSpecTokens: number;
        contextTokens: number;
    };
}

/**
 * Developer to Reviewer handoff
 */
export interface DeveloperToReviewerHandoff {
    handoffId: string;
    timestamp: number;
    projectName: string;
    pageId: string;
    pageName: string;
    iteration: number;
    schemaVersion: '1.0.0';
    checksum: string;

    implementation: Implementation;
    uxSpec: UXSpec;
    screenshotPath: string;

    tokenMetrics: {
        codeTokens: number;
        contextTokens: number;
    };
}

/**
 * Reviewer to Designer handoff
 */
export interface ReviewerToDesignerHandoff {
    handoffId: string;
    timestamp: number;
    projectName: string;
    pageId: string;
    pageName: string;
    iteration: number;
    schemaVersion: '1.0.0';
    checksum: string;

    rawFeedbackSources: RawFeedbackSource[];
    consolidatedFeedback: string | null;
    screenshotPath: string;

    tokenMetrics: {
        originalFeedbackTokens: number;
        consolidatedTokens: number;
        compressionRatio: number;
    };
}

/**
 * Union type for all handoffs
 */
export type AnyHandoff =
    | DesignerToDeveloperHandoff
    | DeveloperToReviewerHandoff
    | ReviewerToDesignerHandoff;

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Configuration for HandoffManager
 */
export interface HandoffManagerConfig {
    projectName: string;
    baseDir: string;
}

/**
 * HandoffManager manages structured data transfer between agents
 */
export class HandoffManager {
    private storagePath: string;

    constructor(config: HandoffManagerConfig) {
        this.storagePath = path.join(config.baseDir, '.personaut', config.projectName);
    }

    /**
     * Create Designer to Developer handoff
     * @param uxSpec - UX specification
     * @param context - Handoff context
     * @param previousImplementation - Previous implementation (if any)
     * @returns Designer to Developer handoff
     * 
     * Validates: Requirements AC-03.2
     */
    createDesignerToDevHandoff(
        uxSpec: UXSpec,
        context: HandoffContext,
        previousImplementation?: { filePath: string; checksum: string }
    ): DesignerToDeveloperHandoff {
        const handoff: DesignerToDeveloperHandoff = {
            handoffId: crypto.randomUUID(),
            timestamp: Date.now(),
            projectName: context.projectName,
            pageId: context.pageId,
            pageName: context.pageName,
            iteration: context.iteration,
            schemaVersion: '1.0.0',
            checksum: '', // Will be computed
            uxSpec,
            previousImplementation,
            tokenMetrics: {
                uxSpecTokens: this.estimateTokens(uxSpec.content),
                contextTokens: 0, // Will be set by caller
            },
        };

        // Compute checksum
        handoff.checksum = this.computeChecksum(handoff);

        console.log('[HandoffManager] Created Designer→Developer handoff:', {
            handoffId: handoff.handoffId,
            pageId: handoff.pageId,
            iteration: handoff.iteration,
            checksum: handoff.checksum,
        });

        return handoff;
    }

    /**
     * Create Developer to Reviewer handoff
     * @param implementation - Code implementation
     * @param uxSpec - UX specification
     * @param context - Handoff context
     * @param screenshotPath - Path to screenshot
     * @returns Developer to Reviewer handoff
     * 
     * Validates: Requirements AC-03.2
     */
    createDevToReviewerHandoff(
        implementation: Implementation,
        uxSpec: UXSpec,
        context: HandoffContext,
        screenshotPath: string
    ): DeveloperToReviewerHandoff {
        const handoff: DeveloperToReviewerHandoff = {
            handoffId: crypto.randomUUID(),
            timestamp: Date.now(),
            projectName: context.projectName,
            pageId: context.pageId,
            pageName: context.pageName,
            iteration: context.iteration,
            schemaVersion: '1.0.0',
            checksum: '', // Will be computed
            implementation,
            uxSpec,
            screenshotPath,
            tokenMetrics: {
                codeTokens: this.estimateTokens(implementation.code),
                contextTokens: 0, // Will be set by caller
            },
        };

        // Compute checksum
        handoff.checksum = this.computeChecksum(handoff);

        console.log('[HandoffManager] Created Developer→Reviewer handoff:', {
            handoffId: handoff.handoffId,
            pageId: handoff.pageId,
            iteration: handoff.iteration,
            checksum: handoff.checksum,
        });

        return handoff;
    }

    /**
     * Create Reviewer to Designer handoff
     * @param feedbackRefs - Raw feedback source references
     * @param context - Handoff context
     * @param screenshotPath - Path to screenshot
     * @returns Reviewer to Designer handoff
     * 
     * Validates: Requirements AC-03.2
     */
    createReviewerToDesignerHandoff(
        feedbackRefs: RawFeedbackSource[],
        context: HandoffContext,
        screenshotPath: string
    ): ReviewerToDesignerHandoff {
        const handoff: ReviewerToDesignerHandoff = {
            handoffId: crypto.randomUUID(),
            timestamp: Date.now(),
            projectName: context.projectName,
            pageId: context.pageId,
            pageName: context.pageName,
            iteration: context.iteration,
            schemaVersion: '1.0.0',
            checksum: '', // Will be computed
            rawFeedbackSources: feedbackRefs,
            consolidatedFeedback: null, // Will be populated by DesignerAgent
            screenshotPath,
            tokenMetrics: {
                originalFeedbackTokens: 0, // Will be calculated
                consolidatedTokens: 0,
                compressionRatio: 0,
            },
        };

        // Compute checksum
        handoff.checksum = this.computeChecksum(handoff);

        console.log('[HandoffManager] Created Reviewer→Designer handoff:', {
            handoffId: handoff.handoffId,
            pageId: handoff.pageId,
            iteration: handoff.iteration,
            feedbackCount: feedbackRefs.length,
            checksum: handoff.checksum,
        });

        return handoff;
    }

    /**
     * Compute SHA-256 checksum for data
     * @param data - Data to checksum
     * @returns Checksum string
     * 
     * Validates: Requirements AC-03.2
     */
    computeChecksum(data: unknown): string {
        // Create a copy without the checksum field to avoid circular dependency
        const dataForChecksum = JSON.parse(JSON.stringify(data));
        if (typeof dataForChecksum === 'object' && dataForChecksum !== null) {
            delete dataForChecksum.checksum;
        }

        const jsonString = JSON.stringify(dataForChecksum, Object.keys(dataForChecksum).sort());
        return crypto.createHash('sha256').update(jsonString).digest('hex');
    }

    /**
     * Verify checksum of handoff
     * @param handoff - Handoff to verify
     * @returns True if checksum is valid
     * 
     * Validates: Requirements AC-03.2
     */
    verifyChecksum(handoff: AnyHandoff): boolean {
        const storedChecksum = handoff.checksum;
        const computedChecksum = this.computeChecksum(handoff);
        const isValid = storedChecksum === computedChecksum;

        console.log('[HandoffManager] Checksum verification:', {
            handoffId: handoff.handoffId,
            stored: storedChecksum,
            computed: computedChecksum,
            valid: isValid,
        });

        return isValid;
    }

    /**
     * Validate handoff data integrity
     * @param handoff - Handoff to validate
     * @returns Validation result
     * 
     * Validates: Requirements AC-03.2
     */
    validateHandoff(handoff: AnyHandoff): ValidationResult {
        const errors: string[] = [];

        // Check required fields
        if (!handoff.handoffId) errors.push('Missing handoffId');
        if (!handoff.timestamp) errors.push('Missing timestamp');
        if (!handoff.projectName) errors.push('Missing projectName');
        if (!handoff.pageId) errors.push('Missing pageId');
        if (!handoff.pageName) errors.push('Missing pageName');
        if (handoff.iteration === undefined) errors.push('Missing iteration');
        if (!handoff.schemaVersion) errors.push('Missing schemaVersion');
        if (!handoff.checksum) errors.push('Missing checksum');

        // Verify checksum
        if (!this.verifyChecksum(handoff)) {
            errors.push('Checksum verification failed');
        }

        // Type-specific validation
        if ('uxSpec' in handoff && 'implementation' in handoff) {
            // DeveloperToReviewerHandoff
            if (!handoff.uxSpec) errors.push('Missing uxSpec');
            if (!handoff.implementation) errors.push('Missing implementation');
            if (!handoff.screenshotPath) errors.push('Missing screenshotPath');
        } else if ('uxSpec' in handoff) {
            // DesignerToDeveloperHandoff
            if (!handoff.uxSpec) errors.push('Missing uxSpec');
        } else if ('rawFeedbackSources' in handoff) {
            // ReviewerToDesignerHandoff
            if (!handoff.rawFeedbackSources) errors.push('Missing rawFeedbackSources');
            if (!handoff.screenshotPath) errors.push('Missing screenshotPath');
        }

        const valid = errors.length === 0;

        console.log('[HandoffManager] Handoff validation:', {
            handoffId: handoff.handoffId,
            valid,
            errorCount: errors.length,
        });

        return { valid, errors };
    }

    /**
     * Save raw feedback to file system
     * @param pageId - Page ID
     * @param iteration - Iteration number
     * @param personaId - Persona ID
     * @param feedback - Raw feedback
     * @returns File path
     * 
     * Validates: Requirements AC-12.7
     */
    async saveRawFeedback(
        pageId: string,
        iteration: number,
        personaId: string,
        feedback: RawFeedback
    ): Promise<string> {
        const dir = path.join(this.storagePath, 'reviews', pageId, `iteration_${iteration}`);
        await fs.mkdir(dir, { recursive: true });

        const filePath = path.join(dir, `${personaId}_raw.json`);
        const content = JSON.stringify(
            {
                ...feedback,
                savedAt: Date.now(),
                checksum: this.computeChecksum(feedback),
            },
            null,
            2
        );

        await fs.writeFile(filePath, content, 'utf-8');

        console.log('[HandoffManager] Saved raw feedback:', {
            pageId,
            iteration,
            personaId,
            filePath,
        });

        return filePath;
    }

    /**
     * Load raw feedback from file system
     * @param filePath - File path
     * @returns Raw feedback
     * 
     * Validates: Requirements AC-12.7
     */
    async loadRawFeedback(filePath: string): Promise<RawFeedback> {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        console.log('[HandoffManager] Loaded raw feedback:', {
            filePath,
            personaId: data.personaId,
            iteration: data.iteration,
        });

        return data as RawFeedback;
    }

    /**
     * Generate delta UX spec for iteration > 1
     * @param currentSpec - Current UX spec content
     * @param baseSpecChecksum - Base spec checksum
     * @param iteration - Current iteration
     * @returns UX spec with delta
     * 
     * Validates: Requirements AC-11.3
     */
    generateUXSpecDelta(
        currentSpec: string,
        baseSpecChecksum: string,
        iteration: number
    ): UXSpec {
        const spec: UXSpec = {
            pageId: '', // Will be set by caller
            iteration,
            content: currentSpec,
            checksum: this.computeChecksum(currentSpec),
            baseSpecChecksum,
            isDelta: true,
        };

        console.log('[HandoffManager] Generated UX spec delta:', {
            iteration,
            baseSpecChecksum,
            currentChecksum: spec.checksum,
        });

        return spec;
    }

    /**
     * Estimate token count for text
     * @param text - Text to estimate
     * @returns Estimated token count
     */
    private estimateTokens(text: string): number {
        // Rough estimation: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
    }
}
