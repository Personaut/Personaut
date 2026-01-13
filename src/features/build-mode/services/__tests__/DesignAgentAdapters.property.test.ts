/**
 * DesignAgentAdapters Property Tests
 *
 * Property 1: Stage Data Flow Integrity
 * - Data produced by each stage flows correctly to the next stage
 * - All required fields are present
 * - No data loss during stage transitions
 *
 * Validates: Requirements 5.1, 6.1, 7.1, 8.1, 9.1
 */

import {
    DEFAULT_DESIGN_PERSONAS,
    PERSONA_INTERVIEW_SYSTEM_PROMPT,
    PERSONA_INTERVIEW_QUESTIONS,
} from '../DesignAgentAdapters';
import {
    FEATURE_GENERATION_PROMPT,
    STORY_GENERATION_PROMPT,
    PAGE_GENERATION_PROMPT,
    FLOW_GENERATION_PROMPT,
    TASK_GENERATION_PROMPT,
    PERSONA_SYNTHESIS_PROMPT,
} from '../../../../core/prompts/DesignPrompts';

describe('Design Stage Data Flow Property Tests', () => {
    // ========================================================================
    // Property 1: Stage Data Flow Integrity
    // ========================================================================
    describe('Property 1: Stage Data Flow Integrity', () => {
        describe('Persona data structure', () => {
            it('should have all required persona fields', () => {
                for (const persona of DEFAULT_DESIGN_PERSONAS) {
                    expect(persona.id).toBeDefined();
                    expect(persona.name).toBeDefined();
                    expect(persona.role).toBeDefined();
                    expect(persona.archetype).toBeDefined();
                    expect(persona.backstory).toBeDefined();
                    expect(Array.isArray(persona.goals)).toBe(true);
                    expect(persona.goals.length).toBeGreaterThan(0);
                    expect(Array.isArray(persona.painPoints)).toBe(true);
                    expect(persona.painPoints.length).toBeGreaterThan(0);
                    expect(persona.technicalProficiency).toBeDefined();
                }
            });

            it('should have three default personas with different archetypes', () => {
                expect(DEFAULT_DESIGN_PERSONAS.length).toBe(3);
                const archetypes = DEFAULT_DESIGN_PERSONAS.map(p => p.archetype);
                expect(archetypes).toContain('tech-savvy');
                expect(archetypes).toContain('business-owner');
                expect(archetypes).toContain('it-admin');
            });

            it('should have unique persona IDs', () => {
                const ids = DEFAULT_DESIGN_PERSONAS.map(p => p.id);
                const uniqueIds = new Set(ids);
                expect(uniqueIds.size).toBe(ids.length);
            });
        });

        describe('Persona interview prompts', () => {
            it('should generate valid interview system prompt for each persona', () => {
                const projectDescription = 'A project management tool for remote teams';

                for (const persona of DEFAULT_DESIGN_PERSONAS) {
                    const prompt = PERSONA_INTERVIEW_SYSTEM_PROMPT(persona, projectDescription);

                    // Should include persona identity
                    expect(prompt).toContain(persona.name);
                    expect(prompt).toContain(persona.role);
                    expect(prompt).toContain(persona.backstory);

                    // Should include goals
                    for (const goal of persona.goals) {
                        expect(prompt).toContain(goal);
                    }

                    // Should include pain points
                    for (const painPoint of persona.painPoints) {
                        expect(prompt).toContain(painPoint);
                    }

                    // Should include project description
                    expect(prompt).toContain(projectDescription);

                    // Should have roleplay instructions
                    expect(prompt).toContain('You ARE');
                }
            });

            it('should have interview questions for each archetype', () => {
                expect(PERSONA_INTERVIEW_QUESTIONS.common.length).toBeGreaterThan(0);
                expect(PERSONA_INTERVIEW_QUESTIONS['tech-savvy'].length).toBeGreaterThan(0);
                expect(PERSONA_INTERVIEW_QUESTIONS['business-owner'].length).toBeGreaterThan(0);
                expect(PERSONA_INTERVIEW_QUESTIONS['it-admin'].length).toBeGreaterThan(0);
            });

            it('should have common questions applicable to all personas', () => {
                const commonQuestions = PERSONA_INTERVIEW_QUESTIONS.common;

                // Common questions should cover key areas
                const questionsText = commonQuestions.join(' ').toLowerCase();
                expect(questionsText).toContain('challenge');
                expect(questionsText).toContain('success');
            });
        });

        describe('Stage transition: Users -> Features', () => {
            it('should generate valid feature generation prompt from personas', () => {
                const projectDescription = 'A code review automation tool';
                const personasJson = JSON.stringify(DEFAULT_DESIGN_PERSONAS, null, 2);

                const prompt = FEATURE_GENERATION_PROMPT(projectDescription, personasJson);

                // Should include project context
                expect(prompt).toContain(projectDescription);

                // Should include persona data
                for (const persona of DEFAULT_DESIGN_PERSONAS) {
                    expect(prompt).toContain(persona.name);
                }

                // Should request proper output format
                expect(prompt).toContain('features');
                expect(prompt).toContain('priority');
                expect(prompt).toContain('suggestedBy');
            });
        });

        describe('Stage transition: Features -> Stories', () => {
            it('should generate valid story generation prompt from feature', () => {
                const feature = JSON.stringify({
                    id: 'feature-1',
                    name: 'Code Review Dashboard',
                    description: 'A dashboard showing pending code reviews',
                    suggestedBy: ['persona-tech-savvy'],
                    priority: 'P0',
                });
                const personasJson = JSON.stringify(DEFAULT_DESIGN_PERSONAS, null, 2);

                const prompt = STORY_GENERATION_PROMPT(feature, personasJson);

                // Should include feature context
                expect(prompt).toContain('Code Review Dashboard');

                // Should require proper story format
                expect(prompt).toContain('As a');
                expect(prompt).toContain('I want');
                expect(prompt).toContain('so that');
                expect(prompt).toContain('acceptanceCriteria');
            });
        });

        describe('Stage transition: Stories -> Design', () => {
            it('should generate valid page generation prompt from stories', () => {
                const stories = JSON.stringify([
                    {
                        id: 'story-1',
                        featureId: 'feature-1',
                        title: 'View pending reviews',
                        fullStory: 'As a developer, I want to see pending reviews, so that I can prioritize my work',
                    },
                ]);

                const prompt = PAGE_GENERATION_PROMPT(stories);

                // Should include story context
                expect(prompt).toContain('pending reviews');

                // Should request page structure
                expect(prompt).toContain('pages');
                expect(prompt).toContain('components');
                expect(prompt).toContain('dataRequirements');
            });

            it('should generate valid flow generation prompt from pages and stories', () => {
                const pages = JSON.stringify([
                    { id: 'page-1', name: 'Dashboard', purpose: 'Overview of pending reviews' },
                    { id: 'page-2', name: 'Review Detail', purpose: 'View and comment on a review' },
                ]);
                const stories = JSON.stringify([
                    { id: 'story-1', title: 'View pending reviews' },
                ]);

                const prompt = FLOW_GENERATION_PROMPT(pages, stories);

                // Should include page context
                expect(prompt).toContain('Dashboard');
                expect(prompt).toContain('Review Detail');

                // Should request flow structure
                expect(prompt).toContain('flows');
                expect(prompt).toContain('steps');
                expect(prompt).toContain('startPageId');
                expect(prompt).toContain('endPageId');
            });
        });

        describe('Stage transition: Design -> Tasks', () => {
            it('should generate valid task generation prompt from stories and pages', () => {
                const stories = JSON.stringify([
                    {
                        id: 'story-1',
                        title: 'View pending reviews',
                        acceptanceCriteria: ['Given I am logged in, when I visit dashboard, then I see reviews'],
                    },
                ]);
                const pages = JSON.stringify([
                    {
                        id: 'page-1',
                        name: 'Dashboard',
                        components: [{ name: 'ReviewList', type: 'list' }],
                    },
                ]);

                const prompt = TASK_GENERATION_PROMPT(stories, pages);

                // Should include context
                expect(prompt).toContain('View pending reviews');
                expect(prompt).toContain('Dashboard');
                expect(prompt).toContain('ReviewList');

                // Should request task structure
                expect(prompt).toContain('tasks');
                expect(prompt).toContain('dependencies');
                expect(prompt).toContain('storyId');
                expect(prompt).toContain('pageId');
            });
        });
    });

    // ========================================================================
    // Property: Persona Interview Authenticity
    // ========================================================================
    describe('Property: Persona Interview Authenticity', () => {
        it('should create distinct prompts for each persona type', () => {
            const projectDescription = 'An analytics dashboard';
            const prompts = DEFAULT_DESIGN_PERSONAS.map(p =>
                PERSONA_INTERVIEW_SYSTEM_PROMPT(p, projectDescription)
            );

            // Each prompt should be unique
            const uniquePrompts = new Set(prompts);
            expect(uniquePrompts.size).toBe(prompts.length);
        });

        it('should emphasize roleplay in interview prompts', () => {
            const projectDescription = 'A task management app';

            for (const persona of DEFAULT_DESIGN_PERSONAS) {
                const prompt = PERSONA_INTERVIEW_SYSTEM_PROMPT(persona, projectDescription);

                // Should have strong roleplay instructions
                expect(prompt).toContain('You ARE');
                expect(prompt).toContain('Fully embody');
                expect(prompt).toContain('authentic');
            }
        });

        it('should include persona-specific technical context', () => {
            const projectDescription = 'A developer tool';

            for (const persona of DEFAULT_DESIGN_PERSONAS) {
                const prompt = PERSONA_INTERVIEW_SYSTEM_PROMPT(persona, projectDescription);

                // Should mention technical proficiency
                expect(prompt).toContain(persona.technicalProficiency);
            }
        });
    });

    // ========================================================================
    // Property: Interview Question Coverage
    // ========================================================================
    describe('Property: Interview Question Coverage', () => {
        it('should have questions that cover user needs discovery', () => {
            const allQuestions = [
                ...PERSONA_INTERVIEW_QUESTIONS.common,
                ...PERSONA_INTERVIEW_QUESTIONS['tech-savvy'],
                ...PERSONA_INTERVIEW_QUESTIONS['business-owner'],
                ...PERSONA_INTERVIEW_QUESTIONS['it-admin'],
            ];

            const questionsText = allQuestions.join(' ').toLowerCase();

            // Should cover key discovery areas
            expect(questionsText).toContain('challenge'); // Pain points
            expect(questionsText).toContain('success'); // Goals
        });

        it('should have archetype-specific questions matching archetypes', () => {
            // Tech-savvy should ask about integrations/API
            const techQuestions = PERSONA_INTERVIEW_QUESTIONS['tech-savvy'].join(' ').toLowerCase();
            expect(techQuestions).toContain('integration');

            // Business owner should ask about ROI
            const bizQuestions = PERSONA_INTERVIEW_QUESTIONS['business-owner'].join(' ').toLowerCase();
            expect(bizQuestions).toContain('roi');

            // IT admin should ask about security
            const itQuestions = PERSONA_INTERVIEW_QUESTIONS['it-admin'].join(' ').toLowerCase();
            expect(itQuestions).toContain('security');
        });
    });

    // ========================================================================
    // Property: Synthesis Prompt Completeness
    // ========================================================================
    describe('Property: Synthesis Prompt Completeness', () => {
        it('should create synthesis prompt that includes interview data', () => {
            const interviewInsights = JSON.stringify({
                persona1: 'Needs API access',
                persona2: 'Needs ROI visibility',
                persona3: 'Needs security compliance',
            });

            const prompt = PERSONA_SYNTHESIS_PROMPT(interviewInsights);

            // Should include the insights
            expect(prompt).toContain('API access');
            expect(prompt).toContain('ROI visibility');
            expect(prompt).toContain('security compliance');

            // Should request synthesis output
            expect(prompt).toContain('personas');
            expect(prompt).toContain('sharedNeeds');
            expect(prompt).toContain('conflictingNeeds');
        });
    });
});
