/**
 * Unit tests for Build Mode screen-based workflow
 * Tests the fixes and implementations we've made
 */

import { BuildModeHandler } from '../BuildModeHandler';

describe('BuildModeHandler - Screen-Based Workflow', () => {
    let handler: BuildModeHandler;
    let mockBuildModeService: any;
    let mockWebview: any;

    beforeEach(() => {
        // Create minimal mocks
        mockBuildModeService = {
            loadStage: jest.fn(),
            saveStage: jest.fn(),
            generateStageContent: jest.fn(),
        };

        const mockStageManager = {} as any;
        const mockContentStreamer = {} as any;
        const mockBuildLogManager = {} as any;
        const mockInputValidator = {} as any;

        handler = new BuildModeHandler(
            mockBuildModeService,
            mockStageManager,
            mockContentStreamer,
            mockBuildLogManager,
            mockInputValidator
        );

        mockWebview = {
            postMessage: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Stage Name Validation', () => {
        it('should accept "building" as a valid stage name', async () => {
            const message = {
                type: 'load-stage-data',
                stage: 'building',
                projectName: 'test-project',
            };

            mockBuildModeService.loadStage.mockResolvedValue({
                stage: 'building',
                data: {},
            });

            await expect(
                handler.handle(message, mockWebview)
            ).resolves.not.toThrow();
        });

        it('should reject "build" as invalid stage name', async () => {
            const message = {
                type: 'load-stage-data',
                stage: 'build',
                projectName: 'test-project',
            };

            await expect(
                handler.handle(message, mockWebview)
            ).rejects.toThrow('Invalid stage name: build');
        });
    });

    describe('Data Loading from Files', () => {
        it('should extract nested data property from design stage file', async () => {
            const stageData = {
                stage: 'design',
                timestamp: Date.now(),
                version: '1.0',
                data: {
                    userFlows: [{ id: 'flow-1', name: 'Test Flow' }],
                    pages: [{ id: 'page-1', name: 'Home' }],
                    framework: 'react',
                },
            };

            mockBuildModeService.loadStage.mockResolvedValue(stageData);

            const message = {
                type: 'load-stage-data',
                stage: 'design',
                projectName: 'test-project',
            };

            await handler.handle(message, mockWebview);

            expect(mockWebview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'stage-data-loaded',
                    stage: 'design',
                    data: stageData,
                })
            );
        });
    });

    describe('Screen Generation', () => {
        it('should generate screens from user stories', async () => {
            const userStories = [
                { id: '1', title: 'User Login', description: 'As a user, I want to log in' },
            ];

            const generatedPages = [
                {
                    id: 'login',
                    name: 'Login Page',
                    purpose: 'User authentication screen',
                    uiElements: ['Email input', 'Password input'],
                    userActions: ['Click login button'],
                },
            ];

            mockBuildModeService.generateStageContent.mockResolvedValue(
                JSON.stringify({ pages: generatedPages })
            );

            mockBuildModeService.loadStage.mockResolvedValue(null);
            mockBuildModeService.saveStage.mockResolvedValue();

            const message = {
                type: 'generate-screens',
                projectName: 'test-project',
                stories: userStories,
                framework: 'react',
            };

            await handler.handle(message, mockWebview);

            expect(mockBuildModeService.generateStageContent).toHaveBeenCalled();
            expect(mockWebview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'screens-generated',
                    screens: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'Login Page',
                            description: 'User authentication screen',
                        }),
                    ]),
                })
            );
        });
    });

    describe('Screen-Based Build Workflow', () => {
        it('should detect screen-based workflow request', async () => {
            const screens = [
                { id: '1', name: 'Home', description: 'Home page', components: [] },
            ];

            const message = {
                type: 'start-build',
                projectName: 'test-project',
                screens,
                framework: 'react',
            };

            await handler.handle(message, mockWebview);

            expect(mockWebview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'build-log',
                    message: expect.stringContaining('not yet fully implemented'),
                })
            );
        });

        it('should require either screens or userStory', async () => {
            const message = {
                type: 'start-build',
                projectName: 'test-project',
                // No screens or userStory
            };

            await expect(
                handler.handle(message, mockWebview)
            ).rejects.toThrow('Project name and either user story or screens are required');
        });
    });
});
