/**
 * Integration test for extension initialization
 * Verifies that all services can be properly initialized with AgentManager
 * 
 * Feature: agent-interaction-fixes
 * Validates: Requirements Integration
 */

import * as vscode from 'vscode';
import { Container } from '../../di/Container';
import { AgentManager } from '../../core/agent/AgentManager';
import { ChatService } from '../../features/chat/services/ChatService';
import { PersonasService } from '../../features/personas/services/PersonasService';
import { FeedbackService } from '../../features/feedback/services/FeedbackService';
import { BuildModeService } from '../../features/build-mode/services/BuildModeService';
import { SettingsService } from '../../features/settings/services/SettingsService';

describe('Extension Initialization', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.clear();
  });

  it('should initialize AgentManager with mock webview', () => {
    // Register minimal dependencies
    container.register('tokenStorageService', () => ({
      retrieveApiKey: jest.fn().mockResolvedValue(undefined),
      storeApiKey: jest.fn().mockResolvedValue(undefined),
      deleteApiKey: jest.fn().mockResolvedValue(undefined),
    }));

    container.register('conversationManager', () => ({
      getConversation: jest.fn().mockResolvedValue(null),
      saveConversation: jest.fn().mockResolvedValue({}),
      getAllConversations: jest.fn().mockResolvedValue([]),
      deleteConversation: jest.fn().mockResolvedValue(true),
      clearAllConversations: jest.fn().mockResolvedValue(undefined),
    }));

    // Register AgentManager with mock webview (same pattern as extension.ts)
    let agentManagerInstance: AgentManager | null = null;
    container.register('agentManager', () => {
      if (!agentManagerInstance) {
        const tokenStorageService = container.resolve<any>('tokenStorageService');
        const conversationManager = container.resolve<any>('conversationManager');
        
        const mockWebview = {
          postMessage: () => Promise.resolve(true),
          onDidReceiveMessage: () => ({ dispose: () => {} }),
          asWebviewUri: (uri: vscode.Uri) => uri,
          cspSource: '',
          html: '',
          options: {},
        } as any as vscode.Webview;
        
        agentManagerInstance = new AgentManager({
          webview: mockWebview,
          tokenStorageService,
          conversationManager,
        });
      }
      return agentManagerInstance;
    });

    // Resolve AgentManager
    const agentManager = container.resolve<AgentManager>('agentManager');

    expect(agentManager).toBeDefined();
    expect(agentManager).toBeInstanceOf(AgentManager);
  });

  it('should initialize ChatService with AgentManager', () => {
    // Setup dependencies
    container.register('tokenStorageService', () => ({
      retrieveApiKey: jest.fn().mockResolvedValue(undefined),
      storeApiKey: jest.fn().mockResolvedValue(undefined),
      deleteApiKey: jest.fn().mockResolvedValue(undefined),
    }));

    container.register('conversationManager', () => ({
      getConversation: jest.fn().mockResolvedValue(null),
      saveConversation: jest.fn().mockResolvedValue({}),
      getAllConversations: jest.fn().mockResolvedValue([]),
      deleteConversation: jest.fn().mockResolvedValue(true),
      clearAllConversations: jest.fn().mockResolvedValue(undefined),
    }));

    let agentManagerInstance: AgentManager | null = null;
    container.register('agentManager', () => {
      if (!agentManagerInstance) {
        const tokenStorageService = container.resolve<any>('tokenStorageService');
        const conversationManager = container.resolve<any>('conversationManager');
        
        const mockWebview = {
          postMessage: () => Promise.resolve(true),
          onDidReceiveMessage: () => ({ dispose: () => {} }),
          asWebviewUri: (uri: vscode.Uri) => uri,
          cspSource: '',
          html: '',
          options: {},
        } as any as vscode.Webview;
        
        agentManagerInstance = new AgentManager({
          webview: mockWebview,
          tokenStorageService,
          conversationManager,
        });
      }
      return agentManagerInstance;
    });

    container.register('chatService', () => {
      const agentManager = container.resolve<AgentManager>('agentManager');
      const conversationManager = container.resolve<any>('conversationManager');
      return new ChatService(agentManager, conversationManager);
    });

    // Resolve ChatService
    const chatService = container.resolve<ChatService>('chatService');

    expect(chatService).toBeDefined();
    expect(chatService).toBeInstanceOf(ChatService);
  });

  it('should initialize all services with AgentManager', () => {
    // Setup all dependencies
    container.register('tokenStorageService', () => ({
      retrieveApiKey: jest.fn().mockResolvedValue(undefined),
      storeApiKey: jest.fn().mockResolvedValue(undefined),
      deleteApiKey: jest.fn().mockResolvedValue(undefined),
    }));

    container.register('conversationManager', () => ({
      getConversation: jest.fn().mockResolvedValue(null),
      saveConversation: jest.fn().mockResolvedValue({}),
      getAllConversations: jest.fn().mockResolvedValue([]),
      deleteConversation: jest.fn().mockResolvedValue(true),
      clearAllConversations: jest.fn().mockResolvedValue(undefined),
    }));

    container.register('personaStorage', () => ({
      getAllPersonas: jest.fn().mockResolvedValue([]),
      getPersonaById: jest.fn().mockResolvedValue(null),
      createPersona: jest.fn().mockResolvedValue({}),
      updatePersona: jest.fn().mockResolvedValue({}),
      deletePersona: jest.fn().mockResolvedValue(true),
      searchPersonas: jest.fn().mockResolvedValue([]),
      generatePrompt: jest.fn().mockReturnValue(''),
    }));

    container.register('feedbackStorage', () => ({
      get: jest.fn().mockReturnValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    }));

    container.register('stageManager', () => ({
      getStage: jest.fn().mockResolvedValue(null),
      saveStage: jest.fn().mockResolvedValue(undefined),
    }));

    container.register('buildLogManager', () => ({
      appendLog: jest.fn().mockResolvedValue(undefined),
      getLogs: jest.fn().mockResolvedValue([]),
    }));

    container.register('contentStreamer', () => ({
      streamContent: jest.fn().mockResolvedValue(undefined),
    }));

    let agentManagerInstance: AgentManager | null = null;
    container.register('agentManager', () => {
      if (!agentManagerInstance) {
        const tokenStorageService = container.resolve<any>('tokenStorageService');
        const conversationManager = container.resolve<any>('conversationManager');
        
        const mockWebview = {
          postMessage: () => Promise.resolve(true),
          onDidReceiveMessage: () => ({ dispose: () => {} }),
          asWebviewUri: (uri: vscode.Uri) => uri,
          cspSource: '',
          html: '',
          options: {},
        } as any as vscode.Webview;
        
        agentManagerInstance = new AgentManager({
          webview: mockWebview,
          tokenStorageService,
          conversationManager,
        });
      }
      return agentManagerInstance;
    });

    // Register all services
    container.register('chatService', () => {
      const agentManager = container.resolve<AgentManager>('agentManager');
      const conversationManager = container.resolve<any>('conversationManager');
      return new ChatService(agentManager, conversationManager);
    });

    container.register('personasService', () => {
      const personaStorage = container.resolve<any>('personaStorage');
      const agentManager = container.resolve<AgentManager>('agentManager');
      return new PersonasService(personaStorage, agentManager);
    });

    container.register('feedbackService', () => {
      const storage = container.resolve<any>('feedbackStorage');
      const agentManager = container.resolve<AgentManager>('agentManager');
      return new FeedbackService(storage, agentManager);
    });

    container.register('buildModeService', () => {
      const stageManager = container.resolve<any>('stageManager');
      const buildLogManager = container.resolve<any>('buildLogManager');
      const contentStreamer = container.resolve<any>('contentStreamer');
      const agentManager = container.resolve<AgentManager>('agentManager');
      return new BuildModeService(stageManager, buildLogManager, contentStreamer, agentManager);
    });

    container.register('settingsService', () => {
      const tokenStorageService = container.resolve<any>('tokenStorageService');
      const agentManager = container.resolve<AgentManager>('agentManager');
      return new SettingsService(tokenStorageService, agentManager);
    });

    // Resolve all services
    const chatService = container.resolve<ChatService>('chatService');
    const personasService = container.resolve<PersonasService>('personasService');
    const feedbackService = container.resolve<FeedbackService>('feedbackService');
    const buildModeService = container.resolve<BuildModeService>('buildModeService');
    const settingsService = container.resolve<SettingsService>('settingsService');

    // Verify all services are initialized
    expect(chatService).toBeDefined();
    expect(chatService).toBeInstanceOf(ChatService);
    
    expect(personasService).toBeDefined();
    expect(personasService).toBeInstanceOf(PersonasService);
    
    expect(feedbackService).toBeDefined();
    expect(feedbackService).toBeInstanceOf(FeedbackService);
    
    expect(buildModeService).toBeDefined();
    expect(buildModeService).toBeInstanceOf(BuildModeService);
    
    expect(settingsService).toBeDefined();
    expect(settingsService).toBeInstanceOf(SettingsService);
  });
});
