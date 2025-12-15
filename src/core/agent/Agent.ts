import * as vscode from 'vscode';
import { IProvider, ApiConfiguration, Message } from '../providers/IProvider';
import { GeminiProvider } from '../providers/GeminiProvider';
import { BedrockProvider } from '../providers/BedrockProvider';
import { NativeIDEProvider } from '../providers/NativeIDEProvider';
import { ITool, ToolCall } from '../tools/ITool';
import { ReadFileTool, WriteFileTool, ListFilesTool } from '../tools/FileTools';
import { ExecuteCommandTool } from '../tools/TerminalTool';
import { BrowserTool } from '../tools/BrowserTool';
import { TerminalManager } from '../integrations/TerminalManager';
import { getAgentSystemPrompt } from '../prompts/SystemPrompts';
import { AgentMode, ContextFile, AgentSettings, AgentConfig } from './AgentTypes';
import { InputValidator } from '../../shared/services/InputValidator';
import { TokenMonitor } from '../../shared/services/TokenMonitor';

/**
 * Agent class handles AI conversations and tool execution
 * Manages message history, tool calls, and provider interactions
 */
export class Agent {
  private provider: IProvider | undefined;
  private currentConfig: ApiConfiguration | undefined;
  private abortController: AbortController | null = null;
  private messageHistory: Message[] = [];
  private tools: ITool[] = [];
  public readonly conversationId: string;
  private readonly onDidUpdateMessages: (messages: Message[]) => void;
  private customSystemPrompt: string = '';
  private isPersonaChat: boolean = false;

  public readonly mode: AgentMode;

  constructor(
    private readonly webview: vscode.Webview,
    config: AgentConfig,
    // Will be typed properly when shared services are implemented
    private readonly tokenStorageService?: any,
    private readonly tokenMonitor?: TokenMonitor,
  ) {
    this.conversationId = config.conversationId;
    this.onDidUpdateMessages = config.onDidUpdateMessages;
    this.mode = config.mode || 'chat';
    this.initializeTools();
  }

  /**
   * Initialize core tools
   */
  private initializeTools() {
    // Core Tools
    this.tools = [
      new ReadFileTool(),
      new WriteFileTool(),
      new ListFilesTool(),
      new ExecuteCommandTool(() => this.abortController),
      new BrowserTool(),
    ];
    console.log(
      '[Personaut] Core tools initialized:',
      this.tools.map((t) => t.name)
    );
  }

  /**
   * Generate system prompt with tool definitions
   */
  private getSystemPrompt(): string {
    const toolDefinitions = this.tools
      .map((t) => `${this.tools.indexOf(t) + 1}. ${t.name}:\n${t.getUsageExample()}`)
      .join('\n\n');
    console.log('[Personaut] System Prompt Tool Definitions:', toolDefinitions);

    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'Unknown';
    return getAgentSystemPrompt(toolDefinitions, workspacePath);
  }

  /**
   * Ensure provider is initialized with current configuration
   */
  private async ensureInitialized() {
    const config = vscode.workspace.getConfiguration('personaut');
    const providerId = config.get<string>('provider') || 'gemini';

    // Retrieve API keys from secure storage if available, otherwise fall back to config
    let apiKey = '';
    let awsAccessKey = '';
    let awsSecretKey = '';

    if (this.tokenStorageService) {
      const apiKeys = await this.tokenStorageService.getAllApiKeys();
      apiKey = apiKeys.geminiApiKey || '';
      awsAccessKey = apiKeys.awsAccessKey || '';
      awsSecretKey = apiKeys.awsSecretKey || '';
    } else {
      // Fallback to config (legacy support)
      apiKey = config.get<string>('geminiApiKey') || '';
      awsAccessKey = config.get<string>('awsAccessKey') || '';
      awsSecretKey = config.get<string>('awsSecretKey') || '';
    }

    // Get model ID from settings or use default
    const { MODEL_IDENTIFIERS } = await import('../../config/constants');
    let modelId: string;

    if (providerId === 'gemini') {
      // Try to get model from globalState settings first
      const context = (vscode as any).ExtensionContext;
      const settings = context?.globalState?.get('personaut.settings', {}) as any;
      modelId = settings?.geminiModel || MODEL_IDENTIFIERS.gemini.default;
    } else if (providerId === 'bedrock') {
      modelId = MODEL_IDENTIFIERS.bedrock.default;
    } else {
      modelId = '';
    }

    const newConfig: ApiConfiguration = {
      provider: providerId,
      apiKey: apiKey.trim(),
      modelId: modelId,
      awsAccessKey: awsAccessKey,
      awsSecretKey: awsSecretKey,
      awsRegion: config.get<string>('awsRegion') || 'us-east-1',
      awsProfile: config.get<string>('awsProfile') || 'default',
      awsUseProfile: config.get<boolean>('bedrockUseAwsProfile') || false,
    };

    if (!this.provider || JSON.stringify(this.currentConfig) !== JSON.stringify(newConfig)) {
      if (providerId === 'gemini') {
        if (!newConfig.apiKey) {
          throw new Error("API key not found. Please set 'personaut.geminiApiKey' in settings.");
        }
        this.provider = new GeminiProvider(newConfig);
      } else if (providerId === 'bedrock') {
        this.provider = new BedrockProvider(newConfig);
      } else if (providerId === 'nativeIde') {
        this.provider = new NativeIDEProvider();
      } else {
        throw new Error(`Provider ${providerId} not implemented yet.`);
      }
      this.currentConfig = newConfig;
    }
  }

  /**
   * Main chat method - sends a message and processes the response
   */
  async chat(
    input: string,
    contextFiles: ContextFile[] = [],
    settings: AgentSettings = {},
    systemInstruction?: string,
    isPersonaChat: boolean = false
  ) {
    console.log('[Agent] chat called with settings:', {
      autoRead: settings.autoRead,
      autoWrite: settings.autoWrite,
      autoExecute: settings.autoExecute,
      conversationId: this.conversationId,
    });

    if (systemInstruction) {
      this.customSystemPrompt = systemInstruction;
    }
    this.isPersonaChat = isPersonaChat;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.webview.postMessage({ mode: this.mode, type: 'add-message', role: 'user', text: input });

    let fullMessage = input;
    if (contextFiles.length > 0) {
      fullMessage += '\n\nContext Files:\n';
      contextFiles.forEach((file) => {
        fullMessage += `\n--- ${file.path} ---\n${file.content}\n--- End of ${file.path} ---\n`;
      });
    }

    this.messageHistory.push({ role: 'user', text: fullMessage });
    this.onDidUpdateMessages(this.messageHistory);

    try {
      await this.ensureInitialized();
      await this.runLoop(settings);
    } catch (e: any) {
      this.webview.postMessage({
        mode: this.mode,
        type: 'add-message',
        role: 'error',
        text: e.message,
      });
      this.messageHistory.pop();
      this.onDidUpdateMessages(this.messageHistory);
    }
  }

  /**
   * Load message history from storage
   */
  public async loadHistory(messages: Message[]) {
    this.messageHistory = [...messages];
  }

  /**
   * Abort current operation
   */
  public abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.webview.postMessage({
        mode: this.mode,
        type: 'add-message',
        role: 'error',
        text: '[User Stopped Operation]',
      });
    }
  }

  /**
   * Clean up resources
   */
  public dispose() {
    TerminalManager.getInstance().dispose();
  }

  /**
   * Main agent loop - handles AI responses and tool execution
   */
  private async runLoop(settings: AgentSettings) {
    if (this.abortController?.signal.aborted) {
      return;
    }

    // For persona chats, use ONLY the persona prompt (no coding assistant)
    // For agent/assistant chats, combine base prompt with custom prompt
    let dynamicSystemPrompt: string;
    if (this.isPersonaChat && this.customSystemPrompt) {
      // Pure persona mode - just the persona's instructions
      dynamicSystemPrompt = this.customSystemPrompt;
    } else {
      // Assistant mode - coding assistant + custom instructions
      const baseSystemPrompt = this.getSystemPrompt();
      dynamicSystemPrompt = `${baseSystemPrompt}\n\n${this.customSystemPrompt}`;
    }

    let responseText = '';
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      // Check token limits before making provider call
      if (this.tokenMonitor) {
        // Estimate tokens for the last user message
        const lastUserMessage = this.messageHistory[this.messageHistory.length - 1];
        const estimatedTokens = lastUserMessage
          ? this.tokenMonitor.estimateTokens(lastUserMessage.text)
          : 100; // Default estimate

        const checkResult = await this.tokenMonitor.checkLimit(this.conversationId, estimatedTokens);

        if (!checkResult.allowed) {
          this.webview.postMessage({
            mode: this.mode,
            type: 'add-message',
            role: 'error',
            text: `Token limit exceeded:\n\n${checkResult.reason}`,
          });
          this.webview.postMessage({
            type: 'token-limit-error',
            message: checkResult.reason || 'Token limit exceeded',
            currentUsage: checkResult.currentUsage,
            limit: checkResult.limit,
          });
          // Remove the user message that was just added
          this.messageHistory.pop();
          this.onDidUpdateMessages(this.messageHistory);
          return;
        }
      }

      const response = await this.provider.chat(this.messageHistory, dynamicSystemPrompt);
      responseText = response.text;

      // Record token usage after successful provider call
      if (this.tokenMonitor) {
        if (response.usage) {
          await this.tokenMonitor.recordUsage(this.conversationId, {
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
            totalTokens: response.usage.totalTokens,
          });
        } else {
          // Estimate usage if provider doesn't return it
          const estimatedInput = this.tokenMonitor.estimateTokens(
            this.messageHistory.map(m => m.text).join('\n')
          );
          const estimatedOutput = this.tokenMonitor.estimateTokens(responseText);
          await this.tokenMonitor.recordUsage(this.conversationId, {
            inputTokens: estimatedInput,
            outputTokens: estimatedOutput,
            totalTokens: estimatedInput + estimatedOutput,
          });
        }
      }

      if (response.usage) {
        this.webview.postMessage({
          type: 'usage-update',
          usage: response.usage,
        });
      }
    } catch (e: any) {
      this.webview.postMessage({
        mode: this.mode,
        type: 'add-message',
        role: 'error',
        text: `AI Connection Error: ${e.message}\n\nPlease check your internet connection or API key.`,
      });
      return;
    }

    if (this.abortController?.signal.aborted) {
      return;
    }

    // Sanitize AI response before rendering in webview
    const sanitizedResponse = this.sanitizeResponse(responseText);

    this.messageHistory.push({ role: 'model', text: responseText });
    this.onDidUpdateMessages(this.messageHistory);
    this.webview.postMessage({
      mode: this.mode,
      type: 'add-message',
      role: 'model',
      text: sanitizedResponse,
    });

    const toolCall = await this.parseToolCall(responseText);

    if (toolCall) {
      console.log(`[Agent] Tool call detected: ${toolCall.tool}, path: ${toolCall.args?.path || 'N/A'}`);

      if (this.abortController?.signal.aborted) {
        return;
      }

      this.webview.postMessage({ type: 'status', text: `Executing ${toolCall.tool}...` });

      // Check permissions
      const allowed = this.checkToolPermission(toolCall.tool, settings);
      console.log(`[Agent] Tool ${toolCall.tool} permission check: ${allowed ? 'ALLOWED' : 'DENIED'} (autoWrite=${settings.autoWrite})`);

      if (!allowed) {
        const denialMsg = `User denied permission to execute ${toolCall.tool}. Ask the user to enable it in settings if needed.`;
        this.webview.postMessage({
          mode: this.mode,
          type: 'add-message',
          role: 'error',
          text: `[Blocked] ${toolCall.tool} (Check Settings)`,
        });

        this.messageHistory.push({ role: 'user', text: denialMsg });
        this.onDidUpdateMessages(this.messageHistory);
        await this.runLoop(settings);
        return;
      }

      const toolInstance = this.tools.find((t) => t.name === toolCall.tool);
      let toolResult = '';
      if (toolInstance) {
        try {
          console.log(`[Agent] Executing tool ${toolCall.tool}...`);
          toolResult = await toolInstance.execute(toolCall.args, toolCall.content);
          console.log(`[Agent] Tool ${toolCall.tool} result: ${toolResult.substring(0, 100)}...`);
        } catch (e: any) {
          console.error(`[Agent] Tool ${toolCall.tool} error:`, e.message);
          toolResult = `Error executing tool: ${e.message}`;
        }
      } else {
        console.warn(`[Agent] Unknown tool: ${toolCall.tool}`);
        toolResult = 'Unknown tool.';
      }

      const toolOutputMessage = `Tool Output:\n${toolResult}`;
      this.messageHistory.push({ role: 'user', text: toolOutputMessage });
      this.onDidUpdateMessages(this.messageHistory);

      await this.runLoop(settings);
    }
  }

  /**
   * Check if tool execution is allowed based on settings
   */
  private checkToolPermission(toolName: string, settings: AgentSettings): boolean {
    // Auto-allow certain tools based on settings
    if (toolName === 'read_file' && settings.autoRead) {
      return true;
    }
    if (toolName === 'write_file' && settings.autoWrite) {
      return true;
    }
    if (toolName === 'execute_command' && settings.autoExecute) {
      return true;
    }
    if (toolName === 'list_files' && settings.autoRead) {
      return true;
    }
    if (toolName === 'browser_action') {
      return true;
    }

    return false;
  }

  /**
   * Sanitize AI response using InputValidator
   * Prevents XSS attacks by sanitizing HTML and removing dangerous patterns
   */
  private sanitizeResponse(text: string): string {
    const validator = new InputValidator();
    return validator.sanitizeResponse(text);
  }

  /**
   * Parse tool calls from AI response
   */
  private async parseToolCall(text: string): Promise<ToolCall | null> {
    // Regex for <write_file path="...">content</write_file>
    const writeMatch = text.match(/<write_file\s+path="([^"]+)">([\s\S]*?)<\/write_file>/);
    if (writeMatch) {
      return { tool: 'write_file', args: { path: writeMatch[1] }, content: writeMatch[2] };
    }

    // Regex for <read_file path="..." />
    const readMatch = text.match(/<read_file\s+path="([^"]+)"\s*\/>/);
    if (readMatch) {
      return { tool: 'read_file', args: { path: readMatch[1] } };
    }

    // Regex for <execute_command>command</execute_command>
    const execMatch = text.match(/<execute_command>([\s\S]*?)<\/execute_command>/);
    if (execMatch) {
      return { tool: 'execute_command', args: {}, content: execMatch[1] };
    }

    // Regex for <list_files path="..." />
    const listMatch = text.match(/<list_files\s+path="([^"]+)"\s*\/>/);
    if (listMatch) {
      return { tool: 'list_files', args: { path: listMatch[1] } };
    }

    // Regex for <browser_action action="..." ... />
    const browserMatch = text.match(/<browser_action\s+([\s\S]*?)\s*\/>/);
    if (browserMatch) {
      const attributes = browserMatch[1];
      const args: any = {};
      const actionMatch = attributes.match(/action="([^"]+)"/);
      const urlMatch = attributes.match(/url="([^"]+)"/);
      const selectorMatch = attributes.match(/selector="([^"]+)"/);
      const textMatch = attributes.match(/text="([^"]+)"/);

      if (actionMatch) {
        args.action = actionMatch[1];
      }
      if (urlMatch) {
        args.url = urlMatch[1];
      }
      if (selectorMatch) {
        args.selector = selectorMatch[1];
      }
      if (textMatch) {
        args.text = textMatch[1];
      }

      return { tool: 'browser_action', args: args };
    }


    return null;
  }
}
