/**
 * Integration tests for SummarizerAgent
 * 
 * Feature: build-agent-architecture-review
 * Validates: Requirements AC-06.1, AC-11.1, AC-11.2, AC-11.5
 */

import { SummarizerAgent } from '../../core/agent/build/SummarizerAgent';

describe('SummarizerAgent Integration Tests', () => {
    let summarizerAgent: SummarizerAgent;

    beforeEach(() => {
        // Create mock config
        const mockConfig = {
            conversationId: 'test-conversation',
            webview: {} as any,
            tokenStorageService: {} as any,
            tokenMonitor: {} as any,
            onDidUpdateMessages: jest.fn(),
            mode: 'build' as const,
        };

        summarizerAgent = new SummarizerAgent(mockConfig, {
            maxOutputTokens: 1500,
        });
    });

    describe('Configuration', () => {
        it('should initialize with correct configuration', () => {
            expect(summarizerAgent).toBeDefined();
            expect(summarizerAgent.getMaxOutputTokens()).toBe(1500);
        });

        it('should use default max tokens if not specified', () => {
            const mockConfig = {
                conversationId: 'test',
                webview: {} as any,
                tokenStorageService: {} as any,
                tokenMonitor: {} as any,
                onDidUpdateMessages: jest.fn(),
                mode: 'build' as const,
            };

            const agent = new SummarizerAgent(mockConfig);
            expect(agent.getMaxOutputTokens()).toBe(1500); // Default
        });

        it('should allow custom model specification', () => {
            const mockConfig = {
                conversationId: 'test',
                webview: {} as any,
                tokenStorageService: {} as any,
                tokenMonitor: {} as any,
                onDidUpdateMessages: jest.fn(),
                mode: 'build' as const,
            };

            const agent = new SummarizerAgent(mockConfig, {
                model: 'gemini-1.5-flash',
            });

            expect(agent.getModel()).toBe('gemini-1.5-flash');
        });
    });

    describe('System Prompt', () => {
        it('should provide comprehensive system prompt', () => {
            const prompt = summarizerAgent.getSystemPrompt();

            expect(prompt).toContain('summarization');
            expect(prompt).toContain('800 tokens');
            expect(prompt).toContain('1500 tokens');
            expect(prompt).toContain('feedback');
            expect(prompt).toContain('conflicts');
        });
    });

    describe('Conflict Detection', () => {
        it('should detect conflicts when ratings differ by >2 stars', () => {
            const feedback = [
                {
                    personaName: 'Sarah',
                    ratings: {
                        overall: 5,
                        usability: 5,
                        aesthetics: 5,
                        functionality: 5,
                        accessibility: 5,
                    },
                },
                {
                    personaName: 'John',
                    ratings: {
                        overall: 2,
                        usability: 2,
                        aesthetics: 5,
                        functionality: 5,
                        accessibility: 2,
                    },
                },
            ];

            const conflicts = summarizerAgent.detectConflicts(feedback);

            expect(conflicts.length).toBeGreaterThan(0);

            // Should detect conflicts in overall, usability, and accessibility
            const overallConflict = conflicts.find((c: any) => c.aspect === 'overall');
            expect(overallConflict).toBeDefined();
            expect(overallConflict?.spread).toBe(3); // 5 - 2 = 3

            const usabilityConflict = conflicts.find((c: any) => c.aspect === 'usability');
            expect(usabilityConflict).toBeDefined();
            expect(usabilityConflict?.spread).toBe(3);

            // Should NOT detect conflict in aesthetics (same rating)
            const aestheticsConflict = conflicts.find((c: any) => c.aspect === 'aesthetics');
            expect(aestheticsConflict).toBeUndefined();
        });

        it('should not detect conflicts when ratings are close', () => {
            const feedback = [
                {
                    personaName: 'Sarah',
                    ratings: {
                        overall: 4,
                        usability: 4,
                        aesthetics: 4,
                        functionality: 4,
                        accessibility: 4,
                    },
                },
                {
                    personaName: 'John',
                    ratings: {
                        overall: 3,
                        usability: 4,
                        aesthetics: 5,
                        functionality: 3,
                        accessibility: 4,
                    },
                },
            ];

            const conflicts = summarizerAgent.detectConflicts(feedback);

            expect(conflicts).toHaveLength(0); // All differences are ≤2
        });

        it('should detect exact threshold conflicts (spread = 2.01)', () => {
            const feedback = [
                {
                    personaName: 'Alice',
                    ratings: {
                        overall: 5,
                        usability: 5,
                        aesthetics: 5,
                        functionality: 5,
                        accessibility: 5,
                    },
                },
                {
                    personaName: 'Bob',
                    ratings: {
                        overall: 2.5,
                        usability: 5,
                        aesthetics: 5,
                        functionality: 5,
                        accessibility: 5,
                    },
                },
            ];

            const conflicts = summarizerAgent.detectConflicts(feedback);

            // Should detect conflict in overall (spread = 2.5)
            expect(conflicts.length).toBeGreaterThan(0);
            const overallConflict = conflicts.find((c: any) => c.aspect === 'overall');
            expect(overallConflict).toBeDefined();
            expect(overallConflict?.spread).toBe(2.5);
        });

        it('should handle multiple reviewers', () => {
            const feedback = [
                {
                    personaName: 'Sarah',
                    ratings: {
                        overall: 5,
                        usability: 5,
                        aesthetics: 5,
                        functionality: 5,
                        accessibility: 5,
                    },
                },
                {
                    personaName: 'John',
                    ratings: {
                        overall: 4,
                        usability: 4,
                        aesthetics: 4,
                        functionality: 4,
                        accessibility: 4,
                    },
                },
                {
                    personaName: 'Alice',
                    ratings: {
                        overall: 1,
                        usability: 1,
                        aesthetics: 5,
                        functionality: 5,
                        accessibility: 1,
                    },
                },
            ];

            const conflicts = summarizerAgent.detectConflicts(feedback);

            // Should detect conflicts where spread > 2
            expect(conflicts.length).toBeGreaterThan(0);

            const overallConflict = conflicts.find((c: any) => c.aspect === 'overall');
            expect(overallConflict?.spread).toBe(4); // 5 - 1 = 4
            expect(overallConflict?.ratings).toHaveLength(3);
        });

        it('should include all rating details in conflicts', () => {
            const feedback = [
                {
                    personaName: 'Sarah',
                    ratings: {
                        overall: 5,
                        usability: 5,
                        aesthetics: 5,
                        functionality: 5,
                        accessibility: 5,
                    },
                },
                {
                    personaName: 'John',
                    ratings: {
                        overall: 1,
                        usability: 5,
                        aesthetics: 5,
                        functionality: 5,
                        accessibility: 5,
                    },
                },
            ];

            const conflicts = summarizerAgent.detectConflicts(feedback);

            const overallConflict = conflicts.find((c: any) => c.aspect === 'overall');
            expect(overallConflict?.ratings).toEqual([
                { personaName: 'Sarah', rating: 5 },
                { personaName: 'John', rating: 1 },
            ]);
        });
    });

    describe('Token Limits', () => {
        it('should enforce max output tokens for iteration summarization', () => {
            expect(summarizerAgent.getMaxOutputTokens()).toBe(1500);
        });

        it('should use custom max tokens when provided', () => {
            const mockConfig = {
                conversationId: 'test',
                webview: {} as any,
                tokenStorageService: {} as any,
                tokenMonitor: {} as any,
                onDidUpdateMessages: jest.fn(),
                mode: 'build' as const,
            };

            const agent = new SummarizerAgent(mockConfig, {
                maxOutputTokens: 2000,
            });

            expect(agent.getMaxOutputTokens()).toBe(2000);
        });
    });

    describe('Method Availability', () => {
        it('should have summarizeIteration method', () => {
            expect(typeof summarizerAgent.summarizeIteration).toBe('function');
        });

        it('should have consolidateFeedback method', () => {
            expect(typeof summarizerAgent.consolidateFeedback).toBe('function');
        });

        it('should have summarizeOlderIterations method', () => {
            expect(typeof summarizerAgent.summarizeOlderIterations).toBe('function');
        });

        it('should have detectConflicts method', () => {
            expect(typeof summarizerAgent.detectConflicts).toBe('function');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty feedback array for conflict detection', () => {
            const conflicts = summarizerAgent.detectConflicts([]);
            expect(conflicts).toEqual([]);
        });

        it('should handle single reviewer (no conflicts possible)', () => {
            const feedback = [
                {
                    personaName: 'Sarah',
                    ratings: {
                        overall: 5,
                        usability: 5,
                        aesthetics: 5,
                        functionality: 5,
                        accessibility: 5,
                    },
                },
            ];

            const conflicts = summarizerAgent.detectConflicts(feedback);
            expect(conflicts).toHaveLength(0); // No spread with single reviewer
        });

        it('should handle identical ratings from multiple reviewers', () => {
            const feedback = [
                {
                    personaName: 'Sarah',
                    ratings: {
                        overall: 4,
                        usability: 4,
                        aesthetics: 4,
                        functionality: 4,
                        accessibility: 4,
                    },
                },
                {
                    personaName: 'John',
                    ratings: {
                        overall: 4,
                        usability: 4,
                        aesthetics: 4,
                        functionality: 4,
                        accessibility: 4,
                    },
                },
            ];

            const conflicts = summarizerAgent.detectConflicts(feedback);
            expect(conflicts).toHaveLength(0); // All spreads are 0
        });
    });
});
