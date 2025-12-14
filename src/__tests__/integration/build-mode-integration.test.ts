/**
 * Build Mode Integration Tests
 *
 * Tests the complete build flow from project creation to state restoration.
 *
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { StageManager, isValidProjectName } from '../../features/build-mode/services/StageManager';
import { BuildLogManager } from '../../features/build-mode/services/BuildLogManager';

describe('Build Mode Integration Tests', () => {
    let testDir: string;
    let stageManager: StageManager;
    let buildLogManager: BuildLogManager;

    beforeEach(async () => {
        // Create a temporary directory for each test
        testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personaut-test-'));
        stageManager = new StageManager(testDir);
        buildLogManager = new BuildLogManager(testDir);
    });

    afterEach(() => {
        // Clean up temporary directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    /**
     * Task 28.1: Integration test for complete build flow
     */
    describe('Complete Build Flow', () => {
        it('should create project with correct folder structure', async () => {
            const projectName = 'test-project';
            const projectTitle = 'Test Project';

            // Initialize project
            await stageManager.initializeProject(projectName, projectTitle);

            // Verify project folder exists (baseDir/projectName)
            const projectDir = path.join(testDir, projectName);
            expect(fs.existsSync(projectDir)).toBe(true);

            // Verify planning/ subdirectory exists
            const planningDir = path.join(projectDir, 'planning');
            expect(fs.existsSync(planningDir)).toBe(true);

            // Verify build-state.json exists
            const buildStatePath = path.join(projectDir, 'build-state.json');
            expect(fs.existsSync(buildStatePath)).toBe(true);
        });

        it('should save and load stage files correctly', async () => {
            const projectName = 'test-project';
            const projectTitle = 'Test Project';

            // Initialize project
            await stageManager.initializeProject(projectName, projectTitle);

            // Save idea stage
            const ideaData = { idea: 'A great product idea' };
            await stageManager.writeStageFile(projectName, 'idea', ideaData, true);

            // Load idea stage
            const loadedIdea = await stageManager.readStageFile(projectName, 'idea');
            expect(loadedIdea).not.toBeNull();
            expect(loadedIdea?.data.idea).toBe('A great product idea');
            expect(loadedIdea?.completed).toBe(true);
        });

        it('should track completed stages correctly', async () => {
            const projectName = 'test-project';

            // Initialize project
            await stageManager.initializeProject(projectName);

            // Save and mark stages as completed
            await stageManager.writeStageFile(projectName, 'idea', { idea: 'idea' }, true);
            await stageManager.writeStageFile(projectName, 'users', { personas: [] }, true);
            await stageManager.writeStageFile(projectName, 'features', { features: [] }, false);

            // Get completed stages
            const completedStages = await stageManager.getCompletedStages(projectName);
            expect(completedStages).toContain('idea');
            expect(completedStages).toContain('users');
            expect(completedStages).not.toContain('features');
        });

        it('should validate project names correctly', () => {
            // Valid project names
            expect(isValidProjectName('my-project')).toBe(true);
            expect(isValidProjectName('project123')).toBe(true);
            expect(isValidProjectName('a')).toBe(true);

            // Invalid project names
            expect(isValidProjectName('')).toBe(false);
            expect(isValidProjectName('../hack')).toBe(false);
            expect(isValidProjectName('project/name')).toBe(false);
            expect(isValidProjectName('project\\name')).toBe(false);
        });
    });

    /**
     * Task 28.2: Integration test for state restoration
     */
    describe('State Restoration', () => {
        it('should restore project state from disk after simulated session invalidation', async () => {
            const projectName = 'restore-test';
            const projectTitle = 'Restore Test Project';

            // Initialize project and save some state
            await stageManager.initializeProject(projectName, projectTitle);
            await stageManager.writeStageFile(projectName, 'idea', {
                idea: 'My great idea',
                projectTitle,
            }, true);
            await stageManager.writeStageFile(projectName, 'users', {
                personas: [{ id: '1', name: 'User A' }],
            }, true);

            // Simulate session invalidation by creating a new StageManager instance
            const newStageManager = new StageManager(testDir);

            // Verify project can be loaded
            const exists = await newStageManager.projectExistsAsync(projectName);
            expect(exists).toBe(true);

            // Verify build state is restored
            const buildState = await newStageManager.readBuildState(projectName);
            expect(buildState).not.toBeNull();
            expect(buildState?.projectName).toBe(projectName);
            expect(buildState?.projectTitle).toBe(projectTitle);

            // Verify stage data is restored
            const ideaData = await newStageManager.readStageFile(projectName, 'idea');
            expect(ideaData).not.toBeNull();
            expect(ideaData?.data.idea).toBe('My great idea');

            const usersData = await newStageManager.readStageFile(projectName, 'users');
            expect(usersData).not.toBeNull();
            expect(usersData?.data.personas).toHaveLength(1);
        });

        it('should list all available projects', async () => {
            // Create multiple projects
            await stageManager.initializeProject('project-one');
            await stageManager.initializeProject('project-two');
            await stageManager.initializeProject('project-three');

            // Get projects list
            const projects = await stageManager.getProjects();
            expect(projects).toContain('project-one');
            expect(projects).toContain('project-two');
            expect(projects).toContain('project-three');
            expect(projects).toHaveLength(3);
        });
    });

    /**
     * Task 28.3: Integration test for iteration data
     */
    describe('Iteration Data', () => {
        it('should save and load iteration feedback', async () => {
            const projectName = 'iteration-test';
            const iterationNumber = 1;

            // Initialize project
            await stageManager.initializeProject(projectName);

            // Save feedback
            const feedback = [
                { personaId: '1', rating: 4, comment: 'Looks good!' },
                { personaId: '2', rating: 3, comment: 'Needs work' },
            ];
            await stageManager.saveIterationFeedback(projectName, iterationNumber, feedback);

            // Load iteration data
            const iterationData = await stageManager.loadIterationData(projectName, iterationNumber);
            expect(iterationData?.feedback).toEqual(feedback);
        });

        it('should save and load consolidated feedback', async () => {
            const projectName = 'iteration-test';
            const iterationNumber = 1;

            // Initialize project
            await stageManager.initializeProject(projectName);

            // Save consolidated feedback
            const markdown = '# Consolidated Feedback\n\n- Item 1\n- Item 2';
            await stageManager.saveConsolidatedFeedback(projectName, iterationNumber, markdown);

            // Load iteration data
            const iterationData = await stageManager.loadIterationData(projectName, iterationNumber);
            expect(iterationData?.consolidatedFeedback).toBe(markdown);
        });

        it('should save screenshots with sanitized page names', async () => {
            const projectName = 'iteration-test';
            const iterationNumber = 1;
            const pageName = 'Home Page';
            const screenshotData = Buffer.from('fake-screenshot-data').toString('base64');

            // Initialize project
            await stageManager.initializeProject(projectName);

            // Save screenshot
            const savedPath = await stageManager.saveScreenshot(
                projectName,
                iterationNumber,
                pageName,
                Buffer.from(screenshotData, 'base64')
            );

            // Verify file was saved
            expect(fs.existsSync(savedPath)).toBe(true);

            // Verify filename is sanitized (no spaces)
            expect(savedPath).toContain('home-page.png');
        });

        it('should handle multiple iterations correctly', async () => {
            const projectName = 'multi-iteration';

            // Initialize project
            await stageManager.initializeProject(projectName);

            // Save feedback for multiple iterations
            await stageManager.saveIterationFeedback(projectName, 1, [{ personaId: '1', rating: 3 }]);
            await stageManager.saveIterationFeedback(projectName, 2, [{ personaId: '1', rating: 4 }]);
            await stageManager.saveIterationFeedback(projectName, 3, [{ personaId: '1', rating: 5 }]);

            // Load each iteration
            const iter1 = await stageManager.loadIterationData(projectName, 1);
            const iter2 = await stageManager.loadIterationData(projectName, 2);
            const iter3 = await stageManager.loadIterationData(projectName, 3);

            expect(iter1?.feedback?.[0]?.rating).toBe(3);
            expect(iter2?.feedback?.[0]?.rating).toBe(4);
            expect(iter3?.feedback?.[0]?.rating).toBe(5);
        });
    });

    /**
     * Build log integration
     */
    describe('Build Log', () => {
        it('should initialize and persist build log', async () => {
            const projectName = 'log-test';

            // Initialize build log
            await buildLogManager.initializeBuildLog(projectName);

            // Append entries
            await buildLogManager.appendLogEntry(projectName, {
                timestamp: Date.now(),
                type: 'user',
                stage: 'idea',
                content: 'Started project',
            });
            await buildLogManager.appendLogEntry(projectName, {
                timestamp: Date.now(),
                type: 'assistant',
                stage: 'idea',
                content: 'Acknowledged',
            });

            // Read log
            const log = await buildLogManager.readBuildLog(projectName);
            expect(log).not.toBeNull();
            expect(log?.entries).toHaveLength(2);
            expect(log?.entries[0].content).toBe('Started project');
            expect(log?.entries[1].content).toBe('Acknowledged');
        });
    });

    /**
     * Migration compatibility
     */
    describe('Migration Compatibility', () => {
        it('should detect old file structure with projectName.json', () => {
            const projectName = 'old-structure';

            // Create old-style file structure manually (baseDir/projectName)
            const projectDir = path.join(testDir, projectName);
            fs.mkdirSync(projectDir, { recursive: true });

            // Create old-style idea file (OLD format: {projectName}.json)
            fs.writeFileSync(
                path.join(projectDir, `${projectName}.json`),
                JSON.stringify({ idea: 'old idea' })
            );

            // Detect old structure
            const hasOldStructure = stageManager.detectOldStructure(projectName);
            expect(hasOldStructure).toBe(true);
        });

        it('should not detect old structure for new format', async () => {
            const projectName = 'new-structure';

            // Create new-style file structure
            await stageManager.initializeProject(projectName);
            await stageManager.writeStageFile(projectName, 'idea', { idea: 'new idea' }, true);

            // Should NOT detect old structure
            const hasOldStructure = stageManager.detectOldStructure(projectName);
            expect(hasOldStructure).toBe(false);
        });
    });

    /**
     * Task 28.4: Integration test for feature generation
     */
    describe('Feature Generation Flow', () => {
        it('should save and load generated features', async () => {
            const projectName = 'feature-test';

            // Initialize project
            await stageManager.initializeProject(projectName);

            // Save features
            const features = [
                {
                    id: '1',
                    name: 'User Authentication',
                    description: 'Allow users to log in',
                    score: 8,
                    priority: 'Must-Have',
                },
                {
                    id: '2',
                    name: 'Dashboard',
                    description: 'Overview of user data',
                    score: 6,
                    priority: 'Should-Have',
                },
            ];
            await stageManager.writeStageFile(
                projectName,
                'features',
                { features },
                true
            );

            // Load features
            const file = await stageManager.readStageFile(projectName, 'features');
            expect(file?.data.features).toEqual(features);
            expect(file?.data.features).toHaveLength(2);
        });

        it('should persist feature metadata with survey data', async () => {
            const projectName = 'feature-survey-test';

            await stageManager.initializeProject(projectName);

            // Save features with survey metadata
            const features = [
                {
                    id: '1',
                    name: 'Search',
                    surveyResponses: [
                        { personaId: 'p1', score: 9, feedback: 'Essential!' },
                        { personaId: 'p2', score: 7, feedback: 'Nice to have' },
                    ],
                },
            ];
            await stageManager.writeStageFile(
                projectName,
                'features',
                { features, surveyComplete: true },
                true
            );

            const file = await stageManager.readStageFile(projectName, 'features');
            expect(file?.data.surveyComplete).toBe(true);
            expect(file?.data.features[0].surveyResponses).toHaveLength(2);
        });
    });

    /**
     * Task 28.7: Integration test for stories generation
     */
    describe('Stories Generation Flow', () => {
        it('should save and load user stories', async () => {
            const projectName = 'stories-test';

            await stageManager.initializeProject(projectName);

            // Save stories
            const stories = [
                {
                    id: 'story-1',
                    title: 'User Login',
                    description: 'As a user, I want to log in to access my account',
                    acceptanceCriteria: ['Email validation', 'Password requirements'],
                    clarifyingQuestions: [],
                },
                {
                    id: 'story-2',
                    title: 'View Dashboard',
                    description: 'As a user, I want to see my dashboard after login',
                    acceptanceCriteria: ['Show recent activity'],
                    clarifyingQuestions: [{ question: 'What data?', answer: 'Activity' }],
                },
            ];
            await stageManager.writeStageFile(projectName, 'stories', { stories }, true);

            // Load stories
            const file = await stageManager.readStageFile(projectName, 'stories');
            expect(file?.data.stories).toHaveLength(2);
            expect(file?.data.stories[0].title).toBe('User Login');
            expect(file?.data.stories[1].clarifyingQuestions).toHaveLength(1);
        });

        it('should preserve story structure after edit', async () => {
            const projectName = 'stories-edit-test';

            await stageManager.initializeProject(projectName);

            // Initial save
            const stories = [
                { id: 'story-1', title: 'Original', description: 'Initial' },
            ];
            await stageManager.writeStageFile(projectName, 'stories', { stories }, true);

            // Edit story
            const updatedStories = [
                { id: 'story-1', title: 'Updated', description: 'Modified', acceptanceCriteria: ['New criteria'] },
            ];
            await stageManager.writeStageFile(projectName, 'stories', { stories: updatedStories }, true);

            const file = await stageManager.readStageFile(projectName, 'stories');
            expect(file?.data.stories[0].title).toBe('Updated');
            expect(file?.data.stories[0].acceptanceCriteria).toEqual(['New criteria']);
        });
    });

    /**
     * Task 28.8: Integration test for design generation
     */
    describe('Design Generation Flow', () => {
        it('should save and load user flows', async () => {
            const projectName = 'design-test';

            await stageManager.initializeProject(projectName);

            // Save design with user flows
            const design = {
                userFlows: [
                    {
                        id: 'flow-1',
                        name: 'Login Flow',
                        description: 'User authentication journey',
                        steps: ['Landing Page', 'Login Form', 'Dashboard'],
                    },
                    {
                        id: 'flow-2',
                        name: 'Checkout Flow',
                        description: 'Purchase completion',
                        steps: ['Cart', 'Payment', 'Confirmation'],
                    },
                ],
                pages: [],
                framework: 'React',
            };
            await stageManager.writeStageFile(projectName, 'design', design, true);

            // Load design
            const file = await stageManager.readStageFile(projectName, 'design');
            expect(file?.data.userFlows).toHaveLength(2);
            expect(file?.data.framework).toBe('React');
            expect(file?.data.userFlows[0].steps).toHaveLength(3);
        });

        it('should save and load page specifications', async () => {
            const projectName = 'design-pages-test';

            await stageManager.initializeProject(projectName);

            // Save design with pages
            const design = {
                userFlows: [],
                pages: [
                    {
                        id: 'page-1',
                        name: 'Dashboard',
                        purpose: 'Display user overview and recent activity',
                        uiElements: ['Header', 'Activity Feed', 'Stats Card'],
                        userActions: ['View details', 'Quick actions'],
                    },
                    {
                        id: 'page-2',
                        name: 'Settings',
                        purpose: 'Allow user to modify preferences',
                        uiElements: ['Form', 'Save Button'],
                        userActions: ['Edit settings', 'Save changes'],
                    },
                ],
                framework: 'Next.js',
            };
            await stageManager.writeStageFile(projectName, 'design', design, true);

            const file = await stageManager.readStageFile(projectName, 'design');
            expect(file?.data.pages).toHaveLength(2);
            expect(file?.data.pages[0].uiElements).toContain('Header');
            expect(file?.data.pages[1].userActions).toContain('Save changes');
        });

        it('should persist framework selection', async () => {
            const projectName = 'design-framework-test';

            await stageManager.initializeProject(projectName);

            const frameworks = ['React', 'Vue', 'Next.js', 'HTML', 'Flutter'];

            for (const framework of frameworks) {
                await stageManager.writeStageFile(
                    projectName,
                    'design',
                    { userFlows: [], pages: [], framework },
                    true
                );

                const file = await stageManager.readStageFile(projectName, 'design');
                expect(file?.data.framework).toBe(framework);
            }
        });
    });
});
