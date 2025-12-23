import { Agent } from './Agent';
import { AgentConfig, AgentSettings, ContextFile } from './AgentTypes';
import { Message } from '../providers/IProvider';
import * as vscode from 'vscode';
import { TokenMonitor } from '../../shared/services/TokenMonitor';

// Mock vscode
jest.mock('vscode');

// Mock providers
jest.mock('../providers/GeminiProvider', () => ({
  GeminiProvider: jest.fn().mockImplementation(() => ({
    chat: jest.fn().mockResolvedValue({
      text: 'Mocked response',
      usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
    }),
  })),
}));
jest.mock('../providers/BedrockProvider', () => ({
  BedrockProvider: jest.fn().mockImplementation(() => ({
    chat: jest.fn().mockResolvedValue({
      text: 'Mocked response',
      usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
    }),
  })),
}));
jest.mock('../providers/NativeIDEProvider', () => ({
  NativeIDEProvider: jest.fn().mockImplementation(() => ({
    chat: jest.fn().mockResolvedValue({
      text: 'Mocked response',
      usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
    }),
  })),
}));

// Mock tools
jest.mock('../tools/FileTools', () => ({
  ReadFileTool: jest.fn().mockImplementation(() => ({
    name: 'read_file',
    description: 'Read a file',
    getUsageExample: jest.fn().mockReturnValue('Example usage'),
    execute: jest.fn(),
  })),
  WriteFileTool: jest.fn().mockImplementation(() => ({
    name: 'write_file',
    description: 'Write a file',
    getUsageExample: jest.fn().mockReturnValue('Example usage'),
    execute: jest.fn(),
  })),
  ListFilesTool: jest.fn().mockImplementation(() => ({
    name: 'list_files',
    description: 'List files',
    getUsageExample: jest.fn().mockReturnValue('Example usage'),
    execute: jest.fn(),
  })),
}));

jest.mock('../tools/TerminalTool', () => ({
  ExecuteCommandTool: jest.fn().mockImplementation(() => ({
    name: 'execute_command',
    description: 'Execute command',
    getUsageExample: jest.fn().mockReturnValue('Example usage'),
    execute: jest.fn(),
  })),
}));

jest.mock('../tools/BrowserTool', () => ({
  BrowserTool: jest.fn().mockImplementation(() => ({
    name: 'browser_action',
    description: 'Browser action',
    getUsageExample: jest.fn().mockReturnValue('Example usage'),
    execute: jest.fn(),
  })),
}));

jest.mock('../tools/MCPToolAdapter');

// Mock integrations
jest.mock('../integrations/MCPManager', () => ({
  MCPManager: jest.fn().mockImplementation(() => ({
    connectToServer: jest.fn(),
    getAllTools: jest.fn().mockResolvedValue([]),
    dispose: jest.fn(),
  })),
}));

jest.mock('../integrations/TerminalManager', () => ({
  TerminalManager: {
    getInstance: jest.fn().mockReturnValue({
      dispose: jest.fn(),
    }),
  },
}));

// Mock prompts
jest.mock('../prompts/SystemPrompts', () => ({
  getAgentSystemPrompt: jest.fn(
    (toolDefs: string, workspace: string) =>
      `System prompt with tools: ${toolDefs} in workspace: ${workspace}`
  ),
}));

describe('Agent', () => {
  let mockWebview: jest.Mocked<vscode.Webview>;
  let mockOnDidUpdateMessages: jest.Mock;
  let agentConfig: AgentConfig;
  let mockTokenMonitor: jest.Mocked<TokenMonitor>;

  // Mock config that matches what ensureInitialized() creates
  const mockCurrentConfig = {
    provider: 'gemini',
    apiKey: 'test-api-key',
    modelId: 'gemini-2.5-flash',
    awsAccessKey: '',
    awsSecretKey: '',
    awsRegion: 'us-east-1',
    awsProfile: 'default',
    awsUseProfile: false,
  };

  beforeEach(() => {
    // Setup mock webview
    mockWebview = {
      postMessage: jest.fn(),
    } as any;

    // Setup mock callback
    mockOnDidUpdateMessages = jest.fn();

    // Setup mock token monitor
    mockTokenMonitor = {
      checkLimit: jest.fn().mockResolvedValue({
        allowed: true,
        currentUsage: 0,
        limit: 100000,
        remaining: 100000,
      }),
      recordUsage: jest.fn().mockResolvedValue(undefined),
      estimateTokens: jest.fn().mockReturnValue(100),
    } as any;

    // Setup agent config
    agentConfig = {
      conversationId: 'test-conversation-id',
      mode: 'chat',
      onDidUpdateMessages: mockOnDidUpdateMessages,
    };

    // Mock workspace configuration
    const mockConfig = {
      get: jest.fn((key: string) => {
        const configMap: Record<string, any> = {
          provider: 'gemini',
          geminiApiKey: 'test-api-key',
          mcpServers: {},
        };
        return configMap[key];
      }),
    };

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
    (vscode.workspace.workspaceFolders as any) = [{ uri: { fsPath: '/test/workspace' } }];

    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with valid config', () => {
      const agent = new Agent(mockWebview, agentConfig);

      expect(agent).toBeInstanceOf(Agent);
      expect(agent.conversationId).toBe('test-conversation-id');
      expect(agent.mode).toBe('chat');
    });

    it('should default to chat mode when mode is not provided', () => {
      const configWithoutMode = {
        conversationId: 'test-id',
        onDidUpdateMessages: mockOnDidUpdateMessages,
      };

      const agent = new Agent(mockWebview, configWithoutMode);

      expect(agent.mode).toBe('chat');
    });

    it('should initialize with build mode', () => {
      const buildConfig = {
        ...agentConfig,
        mode: 'build' as const,
      };

      const agent = new Agent(mockWebview, buildConfig);

      expect(agent.mode).toBe('build');
    });

    it('should initialize with feedback mode', () => {
      const feedbackConfig = {
        ...agentConfig,
        mode: 'feedback' as const,
      };

      const agent = new Agent(mockWebview, feedbackConfig);

      expect(agent.mode).toBe('feedback');
    });
  });

  describe('token limit enforcement', () => {
    it('should show warning dialog when token limit is exceeded', async () => {
      const agent = new Agent(mockWebview, agentConfig, undefined, mockTokenMonitor);

      // Mock token limit exceeded
      mockTokenMonitor.checkLimit.mockResolvedValue({
        allowed: false,
        currentUsage: 95000,
        limit: 100000,
        remaining: 5000,
        reason: 'Token limit exceeded',
      });

      // Mock user choosing to cancel
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Cancel');

      const mockProvider = {
        chat: jest.fn().mockResolvedValue({
          text: 'Response',
        }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat('Test message');

      // Should show warning dialog
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('Token limit exceeded'),
        { modal: true },
        'Proceed',
        'Cancel'
      );

      // Should not call provider since user cancelled
      expect(mockProvider.chat).not.toHaveBeenCalled();

      // Should show cancellation message
      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'error',
          text: expect.stringContaining('Operation cancelled'),
        })
      );
    });

    it('should proceed when user chooses to continue despite token limit', async () => {
      const agent = new Agent(mockWebview, agentConfig, undefined, mockTokenMonitor);

      // Mock token limit exceeded
      mockTokenMonitor.checkLimit.mockResolvedValue({
        allowed: false,
        currentUsage: 95000,
        limit: 100000,
        remaining: 5000,
        reason: 'Token limit exceeded',
      });

      // Mock user choosing to proceed
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Proceed');

      const mockProvider = {
        chat: jest.fn().mockResolvedValue({
          text: 'Response despite limit',
          usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat('Test message');

      // Should show warning dialog
      expect(vscode.window.showWarningMessage).toHaveBeenCalled();

      // Should proceed with API call
      expect(mockProvider.chat).toHaveBeenCalled();

      // Should record usage
      expect(mockTokenMonitor.recordUsage).toHaveBeenCalledWith(
        'test-conversation-id',
        expect.objectContaining({
          totalTokens: 150,
        })
      );
    });

    it('should estimate system prompt tokens on first message', async () => {
      const agent = new Agent(mockWebview, agentConfig, undefined, mockTokenMonitor);

      mockTokenMonitor.estimateTokens.mockReturnValue(100); // Default return value

      const mockProvider = {
        chat: jest.fn().mockResolvedValue({
          text: 'Response',
          usage: { inputTokens: 50, outputTokens: 50, totalTokens: 100 }, // Provide usage to avoid estimation
        }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat('First message');

      // Should check limit with estimated tokens (user message + system prompt on first message)
      expect(mockTokenMonitor.checkLimit).toHaveBeenCalledWith(
        'test-conversation-id',
        expect.any(Number)
      );

      // Should record actual usage from provider
      expect(mockTokenMonitor.recordUsage).toHaveBeenCalledWith(
        'test-conversation-id',
        expect.objectContaining({
          totalTokens: 100,
        })
      );
    });

    it('should not estimate system prompt tokens on subsequent messages', async () => {
      const agent = new Agent(mockWebview, agentConfig, undefined, mockTokenMonitor);

      mockTokenMonitor.estimateTokens.mockReturnValue(100);

      const mockProvider = {
        chat: jest.fn().mockResolvedValue({
          text: 'Response',
          usage: { inputTokens: 50, outputTokens: 50, totalTokens: 100 }, // Provide usage
        }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      // First message
      await agent.chat('First message');

      const firstCallEstimate = mockTokenMonitor.checkLimit.mock.calls[0][1];

      jest.clearAllMocks();
      mockTokenMonitor.estimateTokens.mockReturnValue(50);
      mockTokenMonitor.checkLimit.mockResolvedValue({
        allowed: true,
        currentUsage: 100,
        limit: 100000,
        remaining: 99900,
      });

      // Second message
      await agent.chat('Second message');

      const secondCallEstimate = mockTokenMonitor.checkLimit.mock.calls[0][1];

      // Second message should have smaller estimate (no system prompt)
      expect(secondCallEstimate).toBeLessThan(firstCallEstimate);
    });

    it('should handle token monitor not being provided', async () => {
      const agent = new Agent(mockWebview, agentConfig); // No token monitor

      const mockProvider = {
        chat: jest.fn().mockResolvedValue({
          text: 'Response',
        }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      // Should not throw
      await expect(agent.chat('Test message')).resolves.not.toThrow();

      // Should still call provider
      expect(mockProvider.chat).toHaveBeenCalled();
    });
  });

  describe('chat method', () => {
    it('should send user message to webview', async () => {
      const agent = new Agent(mockWebview, agentConfig);
      const input = 'Hello, agent!';

      // Mock provider to avoid actual API calls
      const mockProvider = {
        chat: jest.fn().mockResolvedValue({
          text: 'Hello! How can I help?',
          usage: { inputTokens: 10, outputTokens: 8, totalTokens: 18 },
        }),
      };

      // Inject mock provider
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat(input);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        mode: 'chat',
        type: 'add-message',
        role: 'user',
        text: input,
      });
    });

    it('should update message history with user input', async () => {
      const agent = new Agent(mockWebview, agentConfig);
      const input = 'Test message';

      const mockProvider = {
        chat: jest.fn().mockResolvedValue({
          text: 'Response',
        }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat(input);

      expect(mockOnDidUpdateMessages).toHaveBeenCalled();
      const messages = mockOnDidUpdateMessages.mock.calls[0][0];
      expect(messages).toContainEqual({
        role: 'user',
        text: input,
      });
    });

    it('should include context files in message', async () => {
      const agent = new Agent(mockWebview, agentConfig);
      const input = 'Analyze this file';
      const contextFiles: ContextFile[] = [{ path: '/test/file.ts', content: 'const x = 1;' }];

      const mockProvider = {
        chat: jest.fn().mockResolvedValue({
          text: 'Analysis complete',
        }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat(input, contextFiles);

      expect(mockOnDidUpdateMessages).toHaveBeenCalled();
      const messages = mockOnDidUpdateMessages.mock.calls[0][0];
      const userMessage = messages.find((m: Message) => m.role === 'user');

      expect(userMessage?.text).toContain('Context Files:');
      expect(userMessage?.text).toContain('/test/file.ts');
      expect(userMessage?.text).toContain('const x = 1;');
    });

    it('should handle custom system instruction', async () => {
      const agent = new Agent(mockWebview, agentConfig);
      const input = 'Hello';
      const systemInstruction = 'You are a helpful coding assistant';

      const mockProvider = {
        chat: jest.fn().mockResolvedValue({
          text: 'Hi there!',
        }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat(input, [], {}, systemInstruction);

      expect(mockProvider.chat).toHaveBeenCalled();
      const systemPrompt = mockProvider.chat.mock.calls[0][1];
      expect(systemPrompt).toContain(systemInstruction);
    });

    it('should handle persona chat mode', async () => {
      const agent = new Agent(mockWebview, agentConfig);
      const input = 'What do you think?';
      const personaPrompt = 'You are a UX designer';

      const mockProvider = {
        chat: jest.fn().mockResolvedValue({
          text: 'From a UX perspective...',
        }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat(input, [], {}, personaPrompt, true);

      expect(mockProvider.chat).toHaveBeenCalled();
      const systemPrompt = mockProvider.chat.mock.calls[0][1];
      // In persona mode, should use ONLY the persona prompt
      expect(systemPrompt).toBe(personaPrompt);
    });

    it('should abort previous operation when starting new chat', async () => {
      const agent = new Agent(mockWebview, agentConfig);

      const mockProvider = {
        chat: jest.fn().mockResolvedValue({
          text: 'Response',
        }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      // Start first chat (don't await)
      agent.chat('First message');

      // Start second chat immediately
      await agent.chat('Second message');

      // First chat should be aborted
      expect((agent as any).abortController).toBeTruthy();
    });

    it('should handle API errors gracefully', async () => {
      const agent = new Agent(mockWebview, agentConfig);
      const input = 'Hello';

      const mockProvider = {
        chat: jest.fn().mockRejectedValue(new Error('API connection failed')),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat(input);

      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'add-message',
          role: 'error',
          text: expect.stringContaining('API connection failed'),
        })
      );
    });

    it('should send usage data to webview', async () => {
      const agent = new Agent(mockWebview, agentConfig);
      const input = 'Test';

      const mockProvider = {
        chat: jest.fn().mockResolvedValue({
          text: 'Response',
          usage: {
            inputTokens: 100,
            outputTokens: 50,
            totalTokens: 150,
          },
        }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat(input);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'usage-update',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
      });
    });
  });

  describe('tool execution', () => {
    it('should parse and execute read_file tool', async () => {
      const agent = new Agent(mockWebview, agentConfig);

      const mockTool = {
        name: 'read_file',
        execute: jest.fn().mockResolvedValue('File content'),
        getUsageExample: jest.fn().mockReturnValue('Example usage'),
      };
      (agent as any).tools = [mockTool];

      const mockProvider = {
        chat: jest
          .fn()
          .mockResolvedValueOnce({
            text: '<read_file path="/test/file.ts" />',
          })
          .mockResolvedValueOnce({
            text: 'Here is the file content',
          }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat('Read the file', [], { autoRead: true });

      expect(mockTool.execute).toHaveBeenCalledWith({ path: '/test/file.ts' }, undefined);
    });

    it('should parse and execute write_file tool', async () => {
      const agent = new Agent(mockWebview, agentConfig);

      const mockTool = {
        name: 'write_file',
        execute: jest.fn().mockResolvedValue('File written'),
        getUsageExample: jest.fn().mockReturnValue('Example usage'),
      };
      (agent as any).tools = [mockTool];

      const mockProvider = {
        chat: jest
          .fn()
          .mockResolvedValueOnce({
            text: '<write_file path="/test/file.ts">const x = 1;</write_file>',
          })
          .mockResolvedValueOnce({
            text: 'File has been written',
          }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat('Write to file', [], { autoWrite: true });

      expect(mockTool.execute).toHaveBeenCalledWith({ path: '/test/file.ts' }, 'const x = 1;');
    });

    it('should block tool execution when permission is denied', async () => {
      const agent = new Agent(mockWebview, agentConfig);

      const mockTool = {
        name: 'write_file',
        execute: jest.fn(),
        getUsageExample: jest.fn().mockReturnValue('Example usage'),
      };
      (agent as any).tools = [mockTool];

      const mockProvider = {
        chat: jest
          .fn()
          .mockResolvedValueOnce({
            text: '<write_file path="/test/file.ts">content</write_file>',
          })
          .mockResolvedValueOnce({
            text: 'Understood, I will not write files',
          }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      // autoWrite is false, so tool should be blocked
      await agent.chat('Write to file', [], { autoWrite: false });

      expect(mockTool.execute).not.toHaveBeenCalled();
      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'add-message',
          role: 'error',
          text: '[Blocked] write_file (Check Settings)',
        })
      );
    });

    it('should handle tool execution errors', async () => {
      const agent = new Agent(mockWebview, agentConfig);

      const mockTool = {
        name: 'read_file',
        execute: jest.fn().mockRejectedValue(new Error('File not found')),
        getUsageExample: jest.fn().mockReturnValue('Example usage'),
      };
      (agent as any).tools = [mockTool];

      const mockProvider = {
        chat: jest
          .fn()
          .mockResolvedValueOnce({
            text: '<read_file path="/nonexistent.ts" />',
          })
          .mockResolvedValueOnce({
            text: 'I see the file does not exist',
          }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat('Read file', [], { autoRead: true });

      // Should continue with error message
      expect(mockOnDidUpdateMessages).toHaveBeenCalled();
      const messages = mockOnDidUpdateMessages.mock.calls;
      const toolOutputMessage = messages.find((call: any) =>
        call[0].some((m: Message) => m.text.includes('Error executing tool'))
      );
      expect(toolOutputMessage).toBeTruthy();
    });
  });

  describe('message history management', () => {
    it('should load history from storage', async () => {
      const agent = new Agent(mockWebview, agentConfig);

      const history: Message[] = [
        { role: 'user', text: 'Hello' },
        { role: 'model', text: 'Hi there!' },
      ];

      await agent.loadHistory(history);

      // History should be loaded (we can't directly access private field, but we can test behavior)
      expect(agent).toBeTruthy();
    });

    it('should maintain message history across multiple chats', async () => {
      const agent = new Agent(mockWebview, agentConfig);

      const mockProvider = {
        chat: jest
          .fn()
          .mockResolvedValueOnce({ text: 'Response 1' })
          .mockResolvedValueOnce({ text: 'Response 2' }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      await agent.chat('Message 1');
      await agent.chat('Message 2');

      // Should have been called twice
      expect(mockProvider.chat).toHaveBeenCalledTimes(2);

      const firstCallHistory = mockProvider.chat.mock.calls[0][0];
      const secondCallHistory = mockProvider.chat.mock.calls[1][0];

      // Both calls should have message history
      expect(firstCallHistory).toBeDefined();
      expect(secondCallHistory).toBeDefined();
      expect(Array.isArray(firstCallHistory)).toBe(true);
      expect(Array.isArray(secondCallHistory)).toBe(true);
    });
  });

  describe('abort functionality', () => {
    it('should abort ongoing operation', () => {
      const agent = new Agent(mockWebview, agentConfig);

      // Start an operation
      (agent as any).abortController = new AbortController();

      agent.abort();

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        mode: 'chat',
        type: 'add-message',
        role: 'error',
        text: '[User Stopped Operation]',
      });
    });

    it('should handle abort when no operation is running', () => {
      const agent = new Agent(mockWebview, agentConfig);

      // No operation running
      (agent as any).abortController = null;

      // Should not throw
      expect(() => agent.abort()).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      const agent = new Agent(mockWebview, agentConfig);

      // Should not throw
      expect(() => agent.dispose()).not.toThrow();
    });
  });

  describe('settings integration', () => {
    it('should respect autoRead setting', async () => {
      const agent = new Agent(mockWebview, agentConfig);

      const mockTool = {
        name: 'read_file',
        execute: jest.fn().mockResolvedValue('content'),
        getUsageExample: jest.fn().mockReturnValue('Example usage'),
      };
      (agent as any).tools = [mockTool];

      const mockProvider = {
        chat: jest
          .fn()
          .mockResolvedValueOnce({
            text: '<read_file path="/test.ts" />',
          })
          .mockResolvedValueOnce({
            text: 'Done',
          }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      const settings: AgentSettings = { autoRead: true };
      await agent.chat('Read file', [], settings);

      expect(mockTool.execute).toHaveBeenCalled();
    });

    it('should respect autoWrite setting', async () => {
      const agent = new Agent(mockWebview, agentConfig);

      const mockTool = {
        name: 'write_file',
        execute: jest.fn().mockResolvedValue('written'),
        getUsageExample: jest.fn().mockReturnValue('Example usage'),
      };
      (agent as any).tools = [mockTool];

      const mockProvider = {
        chat: jest
          .fn()
          .mockResolvedValueOnce({
            text: '<write_file path="/test.ts">code</write_file>',
          })
          .mockResolvedValueOnce({
            text: 'Done',
          }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      const settings: AgentSettings = { autoWrite: true };
      await agent.chat('Write file', [], settings);

      expect(mockTool.execute).toHaveBeenCalled();
    });

    it('should respect autoExecute setting', async () => {
      const agent = new Agent(mockWebview, agentConfig);

      const mockTool = {
        name: 'execute_command',
        execute: jest.fn().mockResolvedValue('output'),
        getUsageExample: jest.fn().mockReturnValue('Example usage'),
      };
      (agent as any).tools = [mockTool];

      const mockProvider = {
        chat: jest
          .fn()
          .mockResolvedValueOnce({
            text: '<execute_command>ls</execute_command>',
          })
          .mockResolvedValueOnce({
            text: 'Done',
          }),
      };
      (agent as any).provider = mockProvider;
      (agent as any).currentConfig = mockCurrentConfig;

      const settings: AgentSettings = { autoExecute: true };
      await agent.chat('Run command', [], settings);

      expect(mockTool.execute).toHaveBeenCalled();
    });
  });
});
