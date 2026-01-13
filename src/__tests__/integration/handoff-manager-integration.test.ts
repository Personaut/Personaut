/**
 * Integration tests for HandoffManager
 * 
 * Feature: build-agent-architecture-review
 * Validates: Requirements AC-03.2, AC-11.3, AC-12.7
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { HandoffManager } from '../../features/build-mode/services/HandoffManager';
import type {
    HandoffContext,
    UXSpec,
    Implementation,
    RawFeedback,
    RawFeedbackSource,
} from '../../features/build-mode/services/HandoffManager';

describe('HandoffManager Integration Tests', () => {
    let tempDir: string;
    let handoffManager: HandoffManager;
    let context: HandoffContext;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'handoff-test-'));

        handoffManager = new HandoffManager({
            projectName: 'test-project',
            baseDir: tempDir,
        });

        context = {
            projectName: 'test-project',
            pageId: 'login',
            pageName: 'Login Page',
            iteration: 1,
        };
    });

    afterEach(async () => {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Handoff Creation', () => {
        it('should create Designer to Developer handoff', () => {
            const uxSpec: UXSpec = {
                pageId: 'login',
                iteration: 1,
                content: 'Login page with email and password fields',
                checksum: '',
            };
            uxSpec.checksum = handoffManager.computeChecksum(uxSpec.content);

            const handoff = handoffManager.createDesignerToDevHandoff(uxSpec, context);

            expect(handoff).toBeDefined();
            expect(handoff.handoffId).toBeDefined();
            expect(handoff.timestamp).toBeGreaterThan(0);
            expect(handoff.projectName).toBe('test-project');
            expect(handoff.pageId).toBe('login');
            expect(handoff.iteration).toBe(1);
            expect(handoff.schemaVersion).toBe('1.0.0');
            expect(handoff.checksum).toBeDefined();
            expect(handoff.uxSpec).toEqual(uxSpec);
            expect(handoff.tokenMetrics.uxSpecTokens).toBeGreaterThan(0);
        });

        it('should create Developer to Reviewer handoff', () => {
            const uxSpec: UXSpec = {
                pageId: 'login',
                iteration: 1,
                content: 'Login page spec',
                checksum: handoffManager.computeChecksum('Login page spec'),
            };

            const implementation: Implementation = {
                pageId: 'login',
                iteration: 1,
                code: 'const Login = () => { return <div>Login</div>; };',
                filePath: '/src/Login.tsx',
                checksum: '',
            };
            implementation.checksum = handoffManager.computeChecksum(implementation.code);

            const handoff = handoffManager.createDevToReviewerHandoff(
                implementation,
                uxSpec,
                context,
                '/screenshots/login.png'
            );

            expect(handoff).toBeDefined();
            expect(handoff.handoffId).toBeDefined();
            expect(handoff.implementation).toEqual(implementation);
            expect(handoff.uxSpec).toEqual(uxSpec);
            expect(handoff.screenshotPath).toBe('/screenshots/login.png');
            expect(handoff.tokenMetrics.codeTokens).toBeGreaterThan(0);
        });

        it('should create Reviewer to Designer handoff', () => {
            const feedbackRefs: RawFeedbackSource[] = [
                {
                    personaId: 'sarah',
                    personaName: 'Sarah',
                    filePath: '/reviews/login/iteration_1/sarah_raw.json',
                    fileSize: 1024,
                    completed: true,
                },
                {
                    personaId: 'john',
                    personaName: 'John',
                    filePath: '/reviews/login/iteration_1/john_raw.json',
                    fileSize: 2048,
                    completed: true,
                },
            ];

            const handoff = handoffManager.createReviewerToDesignerHandoff(
                feedbackRefs,
                context,
                '/screenshots/login.png'
            );

            expect(handoff).toBeDefined();
            expect(handoff.handoffId).toBeDefined();
            expect(handoff.rawFeedbackSources).toHaveLength(2);
            expect(handoff.rawFeedbackSources[0].personaId).toBe('sarah');
            expect(handoff.consolidatedFeedback).toBeNull();
            expect(handoff.screenshotPath).toBe('/screenshots/login.png');
        });
    });

    describe('Checksum Validation', () => {
        it('should compute consistent checksums', () => {
            const data = { test: 'data', value: 123 };

            const checksum1 = handoffManager.computeChecksum(data);
            const checksum2 = handoffManager.computeChecksum(data);

            expect(checksum1).toBe(checksum2);
            expect(checksum1).toHaveLength(64); // SHA-256 produces 64 hex characters
        });

        it('should compute different checksums for different data', () => {
            const data1 = { test: 'data1' };
            const data2 = { test: 'data2' };

            const checksum1 = handoffManager.computeChecksum(data1);
            const checksum2 = handoffManager.computeChecksum(data2);

            expect(checksum1).not.toBe(checksum2);
        });

        it('should verify valid handoff checksum', () => {
            const uxSpec: UXSpec = {
                pageId: 'login',
                iteration: 1,
                content: 'Test spec',
                checksum: handoffManager.computeChecksum('Test spec'),
            };

            const handoff = handoffManager.createDesignerToDevHandoff(uxSpec, context);
            const isValid = handoffManager.verifyChecksum(handoff);

            expect(isValid).toBe(true);
        });

        it('should detect invalid handoff checksum', () => {
            const uxSpec: UXSpec = {
                pageId: 'login',
                iteration: 1,
                content: 'Test spec',
                checksum: handoffManager.computeChecksum('Test spec'),
            };

            const handoff = handoffManager.createDesignerToDevHandoff(uxSpec, context);

            // Tamper with the handoff
            handoff.pageId = 'modified';

            const isValid = handoffManager.verifyChecksum(handoff);

            expect(isValid).toBe(false);
        });
    });

    describe('Handoff Validation', () => {
        it('should validate complete handoff', () => {
            const uxSpec: UXSpec = {
                pageId: 'login',
                iteration: 1,
                content: 'Test spec',
                checksum: handoffManager.computeChecksum('Test spec'),
            };

            const handoff = handoffManager.createDesignerToDevHandoff(uxSpec, context);
            const result = handoffManager.validateHandoff(handoff);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect missing required fields', () => {
            const uxSpec: UXSpec = {
                pageId: 'login',
                iteration: 1,
                content: 'Test spec',
                checksum: handoffManager.computeChecksum('Test spec'),
            };

            const handoff = handoffManager.createDesignerToDevHandoff(uxSpec, context);

            // Remove required field
            (handoff as any).handoffId = '';

            const result = handoffManager.validateHandoff(handoff);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors).toContain('Missing handoffId');
        });
    });

    describe('Raw Feedback Persistence', () => {
        it('should save and load raw feedback', async () => {
            const feedback: RawFeedback = {
                personaId: 'sarah',
                personaName: 'Sarah',
                personaRole: 'Product Manager',
                pageId: 'login',
                iteration: 1,
                timestamp: Date.now(),
                feedback: {
                    likes: ['Clean design', 'Easy to use'],
                    dislikes: ['Missing forgot password link'],
                    suggestions: ['Add social login options'],
                    concerns: ['Security of password field'],
                    rating: 4,
                },
                screenshotPath: '/screenshots/login.png',
            };

            const filePath = await handoffManager.saveRawFeedback(
                'login',
                1,
                'sarah',
                feedback
            );

            expect(filePath).toBeDefined();
            expect(filePath).toContain('reviews/login/iteration_1/sarah_raw.json');

            // Verify file exists
            const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
            expect(fileExists).toBe(true);

            // Load and verify
            const loadedFeedback = await handoffManager.loadRawFeedback(filePath);
            expect(loadedFeedback.personaId).toBe('sarah');
            expect(loadedFeedback.feedback.rating).toBe(4);
            expect(loadedFeedback.feedback.likes).toHaveLength(2);
        });

        it('should create correct directory structure', async () => {
            const feedback: RawFeedback = {
                personaId: 'john',
                personaName: 'John',
                personaRole: 'Developer',
                pageId: 'dashboard',
                iteration: 2,
                timestamp: Date.now(),
                feedback: {
                    likes: [],
                    dislikes: [],
                    suggestions: [],
                    concerns: [],
                    rating: 5,
                },
                screenshotPath: '/screenshots/dashboard.png',
            };

            const filePath = await handoffManager.saveRawFeedback(
                'dashboard',
                2,
                'john',
                feedback
            );

            expect(filePath).toContain('.personaut/test-project/reviews/dashboard/iteration_2/john_raw.json');
        });

        it('should include checksum in saved feedback', async () => {
            const feedback: RawFeedback = {
                personaId: 'sarah',
                personaName: 'Sarah',
                personaRole: 'PM',
                pageId: 'login',
                iteration: 1,
                timestamp: Date.now(),
                feedback: {
                    likes: ['Good'],
                    dislikes: [],
                    suggestions: [],
                    concerns: [],
                    rating: 4,
                },
                screenshotPath: '/screenshots/login.png',
            };

            const filePath = await handoffManager.saveRawFeedback(
                'login',
                1,
                'sarah',
                feedback
            );

            const content = await fs.readFile(filePath, 'utf-8');
            const savedData = JSON.parse(content);

            expect(savedData.checksum).toBeDefined();
            expect(savedData.savedAt).toBeDefined();
        });
    });

    describe('UX Spec Delta Generation', () => {
        it('should generate delta for iteration > 1', () => {
            const baseChecksum = handoffManager.computeChecksum('Original spec content');
            const currentSpec = 'Updated spec content with changes';

            const delta = handoffManager.generateUXSpecDelta(
                currentSpec,
                baseChecksum,
                2
            );

            expect(delta.iteration).toBe(2);
            expect(delta.content).toBe(currentSpec);
            expect(delta.baseSpecChecksum).toBe(baseChecksum);
            expect(delta.isDelta).toBe(true);
            expect(delta.checksum).toBeDefined();
        });

        it('should compute checksum for delta content', () => {
            const baseChecksum = 'abc123';
            const currentSpec = 'New content';

            const delta = handoffManager.generateUXSpecDelta(
                currentSpec,
                baseChecksum,
                3
            );

            const expectedChecksum = handoffManager.computeChecksum(currentSpec);
            expect(delta.checksum).toBe(expectedChecksum);
        });
    });

    describe('Handoff with Previous Implementation', () => {
        it('should include previous implementation reference', () => {
            const uxSpec: UXSpec = {
                pageId: 'login',
                iteration: 2,
                content: 'Updated spec',
                checksum: handoffManager.computeChecksum('Updated spec'),
                baseSpecChecksum: 'previous-checksum',
                isDelta: true,
            };

            const previousImpl = {
                filePath: '/src/Login.v1.tsx',
                checksum: 'impl-checksum-v1',
            };

            const handoff = handoffManager.createDesignerToDevHandoff(
                uxSpec,
                { ...context, iteration: 2 },
                previousImpl
            );

            expect(handoff.previousImplementation).toBeDefined();
            expect(handoff.previousImplementation?.filePath).toBe('/src/Login.v1.tsx');
            expect(handoff.previousImplementation?.checksum).toBe('impl-checksum-v1');
        });
    });
});
