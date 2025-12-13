"use strict";
/**
 * Unit tests for BuildModeHandler.
 *
 * Tests:
 * - Message routing for all build mode message types
 * - Input validation
 * - Error handling
 * - Streaming content handling
 *
 * Validates: Requirements 5.1, 10.1, 10.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
const BuildModeHandler_1 = require("./BuildModeHandler");
describe('BuildModeHandler', () => {
    let buildModeHandler;
    let mockBuildModeService;
    let mockStageManager;
    let mockContentStreamer;
    let mockBuildLogManager;
    let mockInputValidator;
    let mockWebview;
    beforeEach(() => {
        mockBuildModeService = {
            initializeProject: jest.fn(),
            saveStage: jest.fn(),
            loadStage: jest.fn(),
            getBuildState: jest.fn(),
            getBuildLog: jest.fn(),
            appendLogEntry: jest.fn(),
            completeStage: jest.fn(),
            validateTransition: jest.fn(),
            getCompletedStages: jest.fn(),
        };
        mockStageManager = {};
        mockContentStreamer = {};
        mockBuildLogManager = {};
        mockInputValidator = {
            validateInput: jest.fn(),
        };
        mockWebview = {
            postMessage: jest.fn(),
        };
        buildModeHandler = new BuildModeHandler_1.BuildModeHandler(mockBuildModeService, mockStageManager, mockContentStreamer, mockBuildLogManager, mockInputValidator);
    });
    describe('handle', () => {
        it('should route initialize-project message', async () => {
            const message = {
                type: 'initialize-project',
                projectName: 'test-project',
                projectTitle: 'Test Project',
            };
            mockInputValidator.validateInput.mockReturnValue({ valid: true });
            await buildModeHandler.handle(message, mockWebview);
            expect(mockBuildModeService.initializeProject).toHaveBeenCalledWith('test-project', 'Test Project');
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'project-initialized',
                projectName: 'test-project',
                projectTitle: 'Test Project',
                success: true,
            });
        });
        it('should route save-stage-file message', async () => {
            const message = {
                type: 'save-stage-file',
                projectName: 'test-project',
                stage: 'users',
                data: { personas: [] },
                completed: false,
            };
            await buildModeHandler.handle(message, mockWebview);
            expect(mockBuildModeService.saveStage).toHaveBeenCalledWith('test-project', 'users', { personas: [] }, false);
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'stage-file-saved',
                projectName: 'test-project',
                stage: 'users',
                success: true,
            });
        });
        it('should route load-stage-file message', async () => {
            const message = {
                type: 'load-stage-file',
                projectName: 'test-project',
                stage: 'users',
            };
            const mockData = { personas: [{ name: 'User 1' }] };
            mockBuildModeService.loadStage.mockResolvedValue(mockData);
            await buildModeHandler.handle(message, mockWebview);
            expect(mockBuildModeService.loadStage).toHaveBeenCalledWith('test-project', 'users');
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'stage-file-loaded',
                projectName: 'test-project',
                stage: 'users',
                data: mockData,
            });
        });
        it('should route get-build-state message', async () => {
            const message = {
                type: 'get-build-state',
                projectName: 'test-project',
            };
            const mockState = {
                projectName: 'test-project',
                projectTitle: 'Test Project',
                createdAt: Date.now(),
                lastUpdated: Date.now(),
                stages: {},
            };
            mockBuildModeService.getBuildState.mockResolvedValue(mockState);
            await buildModeHandler.handle(message, mockWebview);
            expect(mockBuildModeService.getBuildState).toHaveBeenCalledWith('test-project');
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'build-state',
                projectName: 'test-project',
                buildState: mockState,
            });
        });
        it('should route get-build-log message', async () => {
            const message = {
                type: 'get-build-log',
                projectName: 'test-project',
            };
            const mockLog = {
                projectName: 'test-project',
                entries: [],
                createdAt: Date.now(),
                lastUpdated: Date.now(),
            };
            mockBuildModeService.getBuildLog.mockResolvedValue(mockLog);
            await buildModeHandler.handle(message, mockWebview);
            expect(mockBuildModeService.getBuildLog).toHaveBeenCalledWith('test-project');
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'build-log',
                projectName: 'test-project',
                buildLog: mockLog,
            });
        });
        it('should route append-log-entry message', async () => {
            const entry = {
                timestamp: Date.now(),
                type: 'user',
                stage: 'users',
                content: 'Test message',
            };
            const message = {
                type: 'append-log-entry',
                projectName: 'test-project',
                entry,
            };
            await buildModeHandler.handle(message, mockWebview);
            expect(mockBuildModeService.appendLogEntry).toHaveBeenCalledWith('test-project', entry);
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'log-entry-appended',
                projectName: 'test-project',
                success: true,
            });
        });
        it('should route complete-stage message', async () => {
            const message = {
                type: 'complete-stage',
                projectName: 'test-project',
                stage: 'users',
            };
            await buildModeHandler.handle(message, mockWebview);
            expect(mockBuildModeService.completeStage).toHaveBeenCalledWith('test-project', 'users');
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'stage-completed',
                projectName: 'test-project',
                stage: 'users',
                success: true,
            });
        });
        it('should route validate-transition message', async () => {
            const message = {
                type: 'validate-transition',
                projectName: 'test-project',
                from: 'idea',
                to: 'users',
            };
            const mockTransition = {
                from: 'idea',
                to: 'users',
                valid: true,
            };
            mockBuildModeService.validateTransition.mockResolvedValue(mockTransition);
            await buildModeHandler.handle(message, mockWebview);
            expect(mockBuildModeService.validateTransition).toHaveBeenCalledWith('idea', 'users', 'test-project');
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'transition-validated',
                projectName: 'test-project',
                transition: mockTransition,
            });
        });
        it('should route get-completed-stages message', async () => {
            const message = {
                type: 'get-completed-stages',
                projectName: 'test-project',
            };
            const mockStages = ['idea', 'users'];
            mockBuildModeService.getCompletedStages.mockResolvedValue(mockStages);
            await buildModeHandler.handle(message, mockWebview);
            expect(mockBuildModeService.getCompletedStages).toHaveBeenCalledWith('test-project');
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'completed-stages',
                projectName: 'test-project',
                completedStages: mockStages,
            });
        });
        it('should route generate-content-streaming message', async () => {
            const message = {
                type: 'generate-content-streaming',
                projectName: 'test-project',
                stage: 'users',
                prompt: 'Generate user personas',
            };
            mockInputValidator.validateInput.mockReturnValue({ valid: true });
            await buildModeHandler.handle(message, mockWebview);
            expect(mockInputValidator.validateInput).toHaveBeenCalledWith('Generate user personas');
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'content-generation-started',
                projectName: 'test-project',
                stage: 'users',
            });
        });
    });
    describe('input validation', () => {
        it('should validate project name on initialize', async () => {
            const message = {
                type: 'initialize-project',
                projectName: '<script>alert("xss")</script>',
            };
            mockInputValidator.validateInput.mockReturnValue({
                valid: false,
                reason: 'Invalid characters in input',
            });
            await buildModeHandler.handle(message, mockWebview);
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'error',
                message: expect.any(String),
                context: 'build-mode',
            });
        });
        it('should validate prompt on generate content', async () => {
            const message = {
                type: 'generate-content-streaming',
                projectName: 'test-project',
                stage: 'users',
                prompt: '<script>alert("xss")</script>',
            };
            mockInputValidator.validateInput.mockReturnValue({
                valid: false,
                reason: 'Invalid characters in input',
            });
            await buildModeHandler.handle(message, mockWebview);
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'error',
                message: expect.any(String),
                context: 'build-mode',
            });
        });
        it('should reject missing required fields', async () => {
            const message = {
                type: 'initialize-project',
                // Missing projectName
            };
            await buildModeHandler.handle(message, mockWebview);
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'error',
                message: expect.any(String),
                context: 'build-mode',
            });
        });
    });
    describe('error handling', () => {
        it('should handle service errors', async () => {
            const message = {
                type: 'initialize-project',
                projectName: 'test-project',
            };
            mockInputValidator.validateInput.mockReturnValue({ valid: true });
            mockBuildModeService.initializeProject.mockRejectedValue(new Error('Failed to create directory'));
            await buildModeHandler.handle(message, mockWebview);
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'error',
                message: expect.any(String),
                context: 'build-mode',
            });
        });
        it('should handle unknown message types', async () => {
            const message = {
                type: 'unknown-message-type',
            };
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            await buildModeHandler.handle(message, mockWebview);
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown message type'));
            consoleWarnSpy.mockRestore();
        });
        it('should sanitize error messages', async () => {
            const message = {
                type: 'load-stage-file',
                projectName: 'test-project',
                stage: 'users',
            };
            mockBuildModeService.loadStage.mockRejectedValue(new Error('ENOENT: /home/user/.personaut/test-project/users.stage.json'));
            await buildModeHandler.handle(message, mockWebview);
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'error',
                message: expect.any(String),
                context: 'build-mode',
            });
            // Error message should not contain file paths
            const errorMessage = mockWebview.postMessage.mock.calls[0][0].message;
            expect(errorMessage).not.toContain('/home/user');
        });
    });
});
//# sourceMappingURL=BuildModeHandler.test.js.map