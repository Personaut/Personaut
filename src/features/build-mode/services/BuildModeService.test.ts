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

import { BuildModeService } from './BuildModeService';
import { StageManager } from './StageManager';
import { BuildLogManager } from './BuildLogManager';
import { ContentStreamer } from './ContentStreamer';
import { AgentManager } from '../../../core/agent/AgentManager';
import { BuildState, BuildLog, BuildLogEntry, StageName } from '../types/BuildModeTypes';

describe('BuildModeService', () => {
  let buildModeService: BuildModeService;
  let mockStageManager: jest.Mocked<StageManager>;
  let mockBuildLogManager: jest.Mocked<BuildLogManager>;
  let mockContentStreamer: jest.Mocked<ContentStreamer>;
  let mockAgentManager: jest.Mocked<AgentManager>;

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
    } as any;

    mockBuildLogManager = {
      initializeBuildLog: jest.fn(),
      readBuildLog: jest.fn(),
      appendLogEntry: jest.fn(),
    } as any;

    mockContentStreamer = {
      completeStage: jest.fn(),
    } as any;

    // Create a mock conversation manager
    const mockConversationManager = {
      getConversation: jest.fn(),
    };

    mockAgentManager = {
      getOrCreateAgent: jest.fn(),
      disposeAgent: jest.fn(),
      // Use bracket notation to access private property in tests
      ['config']: {
        conversationManager: mockConversationManager,
      },
    } as any;

    buildModeService = new BuildModeService(
      mockStageManager,
      mockBuildLogManager,
      mockContentStreamer,
      mockAgentManager
    );
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

      expect(mockStageManager.writeStageFile).toHaveBeenCalledWith(
        projectName,
        stage,
        data,
        completed
      );
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

      expect(mockStageManager.writeStageFile).toHaveBeenCalledWith(
        projectName,
        stage,
        data,
        completed
      );
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
      const expectedState: BuildState = {
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
      const expectedLog: BuildLog = {
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
      const entry: BuildLogEntry = {
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
      const stage: StageName = 'users';

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

  describe('generateStageContent', () => {
    it('should generate stage content using agent', async () => {
      const projectName = 'test-project';
      const stage = 'users';
      const prompt = 'Generate user personas';
      const expectedContent = 'Generated content for users stage';

      // Mock agent
      const mockAgent = {
        chat: jest.fn().mockResolvedValue(undefined),
      };

      mockAgentManager.getOrCreateAgent.mockResolvedValue(mockAgent as any);
      (mockAgentManager['config'].conversationManager.getConversation as jest.Mock).mockReturnValue({
        id: 'build-test-project-users-123',
        title: 'Build Mode',
        timestamp: Date.now(),
        messages: [
          { role: 'user', text: prompt },
          { role: 'model', text: expectedContent },
        ],
      });

      const result = await buildModeService.generateStageContent(
        projectName,
        stage,
        prompt
      );

      expect(result).toBe(expectedContent);
      expect(mockAgentManager.getOrCreateAgent).toHaveBeenCalledWith(
        expect.stringContaining('build-test-project-users'),
        'build'
      );
      expect(mockAgent.chat).toHaveBeenCalledWith(
        prompt,
        [],
        {},
        expect.stringContaining(stage),
        false
      );
      expect(mockAgentManager.disposeAgent).toHaveBeenCalledWith(
        expect.stringContaining('build-test-project-users')
      );
    });

    it('should call progress callback with generated content', async () => {
      const projectName = 'test-project';
      const stage = 'features';
      const prompt = 'Generate features';
      const expectedContent = 'Generated features content';
      const progressCallback = jest.fn();

      const mockAgent = {
        chat: jest.fn().mockResolvedValue(undefined),
      };

      mockAgentManager.getOrCreateAgent.mockResolvedValue(mockAgent as any);
      (mockAgentManager['config'].conversationManager.getConversation as jest.Mock).mockReturnValue({
        id: 'build-test-project-features-123',
        title: 'Build Mode',
        timestamp: Date.now(),
        messages: [
          { role: 'user', text: prompt },
          { role: 'model', text: expectedContent },
        ],
      });

      await buildModeService.generateStageContent(
        projectName,
        stage,
        prompt,
        progressCallback
      );

      expect(progressCallback).toHaveBeenCalledWith(expectedContent);
    });

    it('should dispose agent even if generation fails', async () => {
      const projectName = 'test-project';
      const stage = 'users';
      const prompt = 'Generate user personas';

      const mockAgent = {
        chat: jest.fn().mockRejectedValue(new Error('AI generation failed')),
      };

      mockAgentManager.getOrCreateAgent.mockResolvedValue(mockAgent as any);

      await expect(
        buildModeService.generateStageContent(projectName, stage, prompt)
      ).rejects.toThrow('Failed to generate content for stage "users"');

      expect(mockAgentManager.disposeAgent).toHaveBeenCalledWith(
        expect.stringContaining('build-test-project-users')
      );
    });

    it('should handle empty conversation gracefully', async () => {
      const projectName = 'test-project';
      const stage = 'users';
      const prompt = 'Generate user personas';

      const mockAgent = {
        chat: jest.fn().mockResolvedValue(undefined),
      };

      mockAgentManager.getOrCreateAgent.mockResolvedValue(mockAgent as any);
      (mockAgentManager['config'].conversationManager.getConversation as jest.Mock).mockReturnValue(undefined);

      const result = await buildModeService.generateStageContent(
        projectName,
        stage,
        prompt
      );

      expect(result).toBe('');
      expect(mockAgentManager.disposeAgent).toHaveBeenCalled();
    });
  });
});
