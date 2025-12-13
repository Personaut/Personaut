"use strict";
/**
 * Unit tests for BuildModeService.
 *
 * Tests:
 * - initializeProject method
 * - saveStage method
 * - loadStage method
 * - generateStageContent method
 * - stage transition validation
 *
 * Validates: Requirements 5.1, 5.2, 5.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
const BuildModeService_1 = require("./BuildModeService");
describe('BuildModeService', () => {
    let buildModeService;
    let mockStageManager;
    let mockBuildLogManager;
    let mockContentStreamer;
    beforeEach(() => {
        // Create mock instances
        mockStageManager = {
            initializeProject: jest.fn(),
            writeStageFile: jest.fn(),
            readStageFile: jest.fn(),
            readBuildState: jest.fn(),
            getCompletedStages: jest.fn(),
            validateTransition: jest.fn(),
            projectExistsAsync: jest.fn(),
        };
        mockBuildLogManager = {
            initializeBuildLog: jest.fn(),
            readBuildLog: jest.fn(),
            appendLogEntry: jest.fn(),
        };
        mockContentStreamer = {
            completeStage: jest.fn(),
        };
        buildModeService = new BuildModeService_1.BuildModeService(mockStageManager, mockBuildLogManager, mockContentStreamer);
    });
    describe('initializeProject', () => {
        it('should initialize project with stage manager and build log manager', async () => {
            const projectName = 'test-project';
            const projectTitle = 'Test Project';
            await buildModeService.initializeProject(projectName, projectTitle);
            expect(mockStageManager.initializeProject).toHaveBeenCalledWith(projectName, projectTitle);
            expect(mockBuildLogManager.initializeBuildLog).toHaveBeenCalledWith(projectName);
        });
        it('should initialize project without title', async () => {
            const projectName = 'test-project';
            await buildModeService.initializeProject(projectName);
            expect(mockStageManager.initializeProject).toHaveBeenCalledWith(projectName, undefined);
            expect(mockBuildLogManager.initializeBuildLog).toHaveBeenCalledWith(projectName);
        });
    });
    describe('saveStage', () => {
        it('should save stage file with data', async () => {
            const projectName = 'test-project';
            const stage = 'users';
            const data = { personas: [] };
            const completed = false;
            mockStageManager.writeStageFile.mockResolvedValue({
                success: true,
                filePath: '/path/to/file',
                isAlternateLocation: false,
            });
            await buildModeService.saveStage(projectName, stage, data, completed);
            expect(mockStageManager.writeStageFile).toHaveBeenCalledWith(projectName, stage, data, completed);
        });
        it('should save completed stage', async () => {
            const projectName = 'test-project';
            const stage = 'users';
            const data = { personas: [{ name: 'User 1' }] };
            const completed = true;
            mockStageManager.writeStageFile.mockResolvedValue({
                success: true,
                filePath: '/path/to/file',
                isAlternateLocation: false,
            });
            await buildModeService.saveStage(projectName, stage, data, completed);
            expect(mockStageManager.writeStageFile).toHaveBeenCalledWith(projectName, stage, data, completed);
        });
    });
    describe('loadStage', () => {
        it('should load stage data', async () => {
            const projectName = 'test-project';
            const stage = 'users';
            const expectedData = { personas: [{ name: 'User 1' }] };
            mockStageManager.readStageFile.mockResolvedValue({
                stage,
                completed: true,
                timestamp: Date.now(),
                data: expectedData,
                version: '1.0',
            });
            const result = await buildModeService.loadStage(projectName, stage);
            expect(result).toEqual(expectedData);
            expect(mockStageManager.readStageFile).toHaveBeenCalledWith(projectName, stage);
        });
        it('should return null if stage file does not exist', async () => {
            const projectName = 'test-project';
            const stage = 'users';
            mockStageManager.readStageFile.mockResolvedValue(null);
            const result = await buildModeService.loadStage(projectName, stage);
            expect(result).toBeNull();
        });
    });
    describe('getBuildState', () => {
        it('should get build state', async () => {
            const projectName = 'test-project';
            const expectedState = {
                projectName,
                projectTitle: 'Test Project',
                createdAt: Date.now(),
                lastUpdated: Date.now(),
                stages: {},
            };
            mockStageManager.readBuildState.mockResolvedValue(expectedState);
            const result = await buildModeService.getBuildState(projectName);
            expect(result).toEqual(expectedState);
            expect(mockStageManager.readBuildState).toHaveBeenCalledWith(projectName);
        });
    });
    describe('getBuildLog', () => {
        it('should get build log', async () => {
            const projectName = 'test-project';
            const expectedLog = {
                projectName,
                entries: [],
                createdAt: Date.now(),
                lastUpdated: Date.now(),
            };
            mockBuildLogManager.readBuildLog.mockResolvedValue(expectedLog);
            const result = await buildModeService.getBuildLog(projectName);
            expect(result).toEqual(expectedLog);
            expect(mockBuildLogManager.readBuildLog).toHaveBeenCalledWith(projectName);
        });
    });
    describe('appendLogEntry', () => {
        it('should append log entry', async () => {
            const projectName = 'test-project';
            const entry = {
                timestamp: Date.now(),
                type: 'user',
                stage: 'users',
                content: 'Test message',
            };
            mockBuildLogManager.appendLogEntry.mockResolvedValue({
                success: true,
                filePath: '/path/to/log',
            });
            await buildModeService.appendLogEntry(projectName, entry);
            expect(mockBuildLogManager.appendLogEntry).toHaveBeenCalledWith(projectName, entry);
        });
    });
    describe('completeStage', () => {
        it('should complete stage', async () => {
            const projectName = 'test-project';
            const stage = 'users';
            await buildModeService.completeStage(projectName, stage);
            expect(mockContentStreamer.completeStage).toHaveBeenCalledWith(projectName, stage);
        });
    });
    describe('validateTransition', () => {
        it('should validate valid transition', async () => {
            const projectName = 'test-project';
            const from = 'idea';
            const to = 'users';
            mockStageManager.getCompletedStages.mockResolvedValue(['idea']);
            mockStageManager.validateTransition.mockReturnValue({
                from,
                to,
                valid: true,
            });
            const result = await buildModeService.validateTransition(from, to, projectName);
            expect(result.valid).toBe(true);
            expect(mockStageManager.getCompletedStages).toHaveBeenCalledWith(projectName);
            expect(mockStageManager.validateTransition).toHaveBeenCalledWith(from, to, ['idea']);
        });
        it('should validate invalid transition', async () => {
            const projectName = 'test-project';
            const from = 'idea';
            const to = 'features';
            mockStageManager.getCompletedStages.mockResolvedValue(['idea']);
            mockStageManager.validateTransition.mockReturnValue({
                from,
                to,
                valid: false,
                reason: "Cannot transition to features: previous stage 'users' is not complete",
            });
            const result = await buildModeService.validateTransition(from, to, projectName);
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('users');
        });
    });
    describe('getCompletedStages', () => {
        it('should get completed stages', async () => {
            const projectName = 'test-project';
            const expectedStages = ['idea', 'users'];
            mockStageManager.getCompletedStages.mockResolvedValue(expectedStages);
            const result = await buildModeService.getCompletedStages(projectName);
            expect(result).toEqual(expectedStages);
            expect(mockStageManager.getCompletedStages).toHaveBeenCalledWith(projectName);
        });
    });
    describe('projectExists', () => {
        it('should check if project exists', async () => {
            const projectName = 'test-project';
            mockStageManager.projectExistsAsync.mockResolvedValue(true);
            const result = await buildModeService.projectExists(projectName);
            expect(result).toBe(true);
            expect(mockStageManager.projectExistsAsync).toHaveBeenCalledWith(projectName);
        });
        it('should return false if project does not exist', async () => {
            const projectName = 'nonexistent-project';
            mockStageManager.projectExistsAsync.mockResolvedValue(false);
            const result = await buildModeService.projectExists(projectName);
            expect(result).toBe(false);
        });
    });
});
//# sourceMappingURL=BuildModeService.test.js.map