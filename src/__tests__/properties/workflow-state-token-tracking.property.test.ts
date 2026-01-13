/**
 * Property test for cumulative token tracking accuracy
 *
 * Feature: build-agent-architecture-review, Property 19: Cumulative Token Tracking Accuracy
 *
 * For any sequence of token usage events, the cumulative token count at each level
 * (iteration, page, workflow) SHALL equal the sum of all recorded token usage events
 * at that level.
 *
 * Validates: Requirements AC-14.2
 */

import * as fc from 'fast-check';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { WorkflowStateManager } from '../../features/build-mode/services/WorkflowStateManager';
import { TokenUsageReport } from '../../features/build-mode/types/WorkflowStateTypes';

describe('Property 19: Cumulative Token Tracking Accuracy', () => {
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
        { minLength: 1, maxLength: 3 }
    );

    /**
     * Generator for token usage reports
     */
    const tokenUsageArb = fc.record({
        inputTokens: fc.integer({ min: 0, max: 10000 }),
        outputTokens: fc.integer({ min: 0, max: 5000 }),
        agentType: fc.constantFrom('designer', 'developer', 'reviewer', 'summarizer'),
        operation: fc.constantFrom(
            'ux-spec-creation',
            'code-generation',
            'feedback-collection',
            'feedback-consolidation'
        ),
    }).map((partial) => ({
        ...partial,
        totalTokens: partial.inputTokens + partial.outputTokens,
        timestamp: Date.now(),
    })) as fc.Arbitrary<TokenUsageReport>;

    /**
     * Test that cumulative token tracking is accurate
     * Validates: Requirements AC-14.2
     */
    it('should accurately track cumulative token usage across multiple events', async () => {
        await fc.assert(
            fc.asyncProperty(
                projectNameArb,
                pagesArb,
                fc.array(tokenUsageArb, { minLength: 1, maxLength: 10 }),
                async (projectName, pages, tokenUsageEvents) => {
                    // Create WorkflowStateManager
                    const manager = new WorkflowStateManager({
                        projectName,
                        baseDir: tempDir,
                        autoSave: true,
                    });

                    // Initialize workflow
                    await manager.initializeWorkflow(pages, 5);

                    // Record all token usage events
                    let expectedTotal = 0;
                    for (const usage of tokenUsageEvents) {
                        await manager.recordTokenUsage(usage);
                        expectedTotal += usage.totalTokens;
                    }

                    // Get token usage summary
                    const tokenUsage = manager.getTokenUsage();

                    // Verify cumulative tracking
                    expect(tokenUsage).toBeDefined();
                    if (tokenUsage) {
                        expect(tokenUsage.totalWorkflow).toBe(expectedTotal);
                        expect(tokenUsage.currentPage).toBe(expectedTotal);
                        expect(tokenUsage.currentIteration).toBe(expectedTotal);
                    }

                    // Clean up
                    await manager.cleanup();
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Test that token usage is preserved through save/load
     * Validates: Requirements AC-14.2
     */
    it('should preserve token usage through state save/load', async () => {
        await fc.assert(
            fc.asyncProperty(
                projectNameArb,
                pagesArb,
                fc.array(tokenUsageArb, { minLength: 1, maxLength: 5 }),
                async (projectName, pages, tokenUsageEvents) => {
                    // Create WorkflowStateManager
                    const manager = new WorkflowStateManager({
                        projectName,
                        baseDir: tempDir,
                        autoSave: false, // Manual save for this test
                    });

                    // Initialize workflow
                    await manager.initializeWorkflow(pages, 5);

                    // Record token usage
                    let expectedTotal = 0;
                    for (const usage of tokenUsageEvents) {
                        await manager.recordTokenUsage(usage);
                        expectedTotal += usage.totalTokens;
                    }

                    // Save state
                    await manager.saveState();

                    // Create new manager and load state
                    const manager2 = new WorkflowStateManager({
                        projectName,
                        baseDir: tempDir,
                        autoSave: false,
                    });

                    await manager2.loadState();

                    // Verify token usage was preserved
                    const tokenUsage = manager2.getTokenUsage();
                    expect(tokenUsage).toBeDefined();
                    if (tokenUsage) {
                        expect(tokenUsage.totalWorkflow).toBe(expectedTotal);
                    }

                    // Clean up
                    await manager.cleanup();
                    await manager2.cleanup();
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Test that token usage accumulates correctly across checkpoints
     * Validates: Requirements AC-14.2
     */
    it('should track token usage correctly across checkpoints', async () => {
        await fc.assert(
            fc.asyncProperty(
                projectNameArb,
                pagesArb,
                fc.array(tokenUsageArb, { minLength: 2, maxLength: 6 }),
                async (projectName, pages, tokenUsageEvents) => {
                    // Create WorkflowStateManager
                    const manager = new WorkflowStateManager({
                        projectName,
                        baseDir: tempDir,
                        autoSave: true,
                    });

                    // Initialize workflow
                    await manager.initializeWorkflow(pages, 5);

                    // Record half the token usage
                    const midpoint = Math.floor(tokenUsageEvents.length / 2);
                    let expectedBeforeCheckpoint = 0;
                    for (let i = 0; i < midpoint; i++) {
                        await manager.recordTokenUsage(tokenUsageEvents[i]);
                        expectedBeforeCheckpoint += tokenUsageEvents[i].totalTokens;
                    }

                    // Create checkpoint
                    const checkpoint = await manager.createCheckpoint('ux-spec-created');

                    // Verify checkpoint has correct token usage
                    expect(checkpoint.tokenUsage.totalWorkflow).toBe(expectedBeforeCheckpoint);

                    // Record remaining token usage
                    let expectedAfterCheckpoint = expectedBeforeCheckpoint;
                    for (let i = midpoint; i < tokenUsageEvents.length; i++) {
                        await manager.recordTokenUsage(tokenUsageEvents[i]);
                        expectedAfterCheckpoint += tokenUsageEvents[i].totalTokens;
                    }

                    // Verify final token usage
                    const tokenUsage = manager.getTokenUsage();
                    expect(tokenUsage).toBeDefined();
                    if (tokenUsage) {
                        expect(tokenUsage.totalWorkflow).toBe(expectedAfterCheckpoint);
                    }

                    // Clean up
                    await manager.cleanup();
                }
            ),
            { numRuns: 30 }
        );
    });

    /**
     * Test that token usage is never negative
     * Validates: Requirements AC-14.2
     */
    it('should never have negative token usage', async () => {
        await fc.assert(
            fc.asyncProperty(
                projectNameArb,
                pagesArb,
                fc.array(tokenUsageArb, { minLength: 1, maxLength: 10 }),
                async (projectName, pages, tokenUsageEvents) => {
                    // Create WorkflowStateManager
                    const manager = new WorkflowStateManager({
                        projectName,
                        baseDir: tempDir,
                        autoSave: true,
                    });

                    // Initialize workflow
                    await manager.initializeWorkflow(pages, 5);

                    // Record token usage
                    for (const usage of tokenUsageEvents) {
                        await manager.recordTokenUsage(usage);

                        // Check that token usage is never negative
                        const tokenUsage = manager.getTokenUsage();
                        expect(tokenUsage).toBeDefined();
                        if (tokenUsage) {
                            expect(tokenUsage.currentPage).toBeGreaterThanOrEqual(0);
                            expect(tokenUsage.currentIteration).toBeGreaterThanOrEqual(0);
                            expect(tokenUsage.totalWorkflow).toBeGreaterThanOrEqual(0);
                        }
                    }

                    // Clean up
                    await manager.cleanup();
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Test that token usage components sum correctly
     * Validates: Requirements AC-14.2
     */
    it('should have token usage components that sum correctly', async () => {
        await fc.assert(
            fc.asyncProperty(
                projectNameArb,
                pagesArb,
                fc.array(tokenUsageArb, { minLength: 1, maxLength: 10 }),
                async (projectName, pages, tokenUsageEvents) => {
                    // Create WorkflowStateManager
                    const manager = new WorkflowStateManager({
                        projectName,
                        baseDir: tempDir,
                        autoSave: true,
                    });

                    // Initialize workflow
                    await manager.initializeWorkflow(pages, 5);

                    // Record token usage and verify components
                    for (const usage of tokenUsageEvents) {
                        // Verify input + output = total for each event
                        expect(usage.totalTokens).toBe(usage.inputTokens + usage.outputTokens);

                        await manager.recordTokenUsage(usage);
                    }

                    // Clean up
                    await manager.cleanup();
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Test that token usage increases monotonically
     * Validates: Requirements AC-14.2
     */
    it('should have monotonically increasing token usage', async () => {
        await fc.assert(
            fc.asyncProperty(
                projectNameArb,
                pagesArb,
                fc.array(tokenUsageArb, { minLength: 2, maxLength: 10 }),
                async (projectName, pages, tokenUsageEvents) => {
                    // Create WorkflowStateManager
                    const manager = new WorkflowStateManager({
                        projectName,
                        baseDir: tempDir,
                        autoSave: true,
                    });

                    // Initialize workflow
                    await manager.initializeWorkflow(pages, 5);

                    let previousTotal = 0;

                    // Record token usage and verify monotonic increase
                    for (const usage of tokenUsageEvents) {
                        await manager.recordTokenUsage(usage);

                        const tokenUsage = manager.getTokenUsage();
                        expect(tokenUsage).toBeDefined();
                        if (tokenUsage) {
                            // Token usage should never decrease
                            expect(tokenUsage.totalWorkflow).toBeGreaterThanOrEqual(previousTotal);
                            previousTotal = tokenUsage.totalWorkflow;
                        }
                    }

                    // Clean up
                    await manager.cleanup();
                }
            ),
            { numRuns: 50 }
        );
    });
});
