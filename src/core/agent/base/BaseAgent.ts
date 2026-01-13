/**
 * BaseAgent - Abstract base class for all specialized agents
 * Provides common functionality and defines the interface for specialized agents
 */

import * as vscode from 'vscode';
import { IProvider, ApiConfiguration, Message } from '../../providers/IProvider';
import { GeminiProvider } from '../../providers/GeminiProvider';
import { BedrockProvider } from '../../providers/BedrockProvider';
import { NativeIDEProvider } from '../../providers/NativeIDEProvider';
import { ITool } from '../../tools/ITool';
import { ReadFileTool, WriteFileTool, ListFilesTool } from '../../tools/FileTools';
import { ExecuteCommandTool } from '../../tools/TerminalTool';
import { BrowserTool } from '../../tools/BrowserTool';
import { TerminalManager } from '../../integrations/TerminalManager';
import { AgentMode, AgentType, ContextFile, AgentSettings } from '../AgentTypes';
import { AgentCapability, CapabilityRegistry } from './AgentCapabilities';
import { InputValidator } from '../../../shared/services/InputValidator';
import { TokenMonitor } from '../../../shared/services/TokenMonitor';

/**
 * Configuration for BaseAgent initialization
 */
export interface BaseAgentConfig {
    conversationId: string;
    webview: vscode.Webview;
    agentType: AgentType;
    mode: AgentMode;
    tokenStorageService?: any;
    tokenMonitor?: TokenMonitor;
    onDidUpdateMessages: (messages: Message[]) => void;
}

/**
 * Abstract base class for all agents
 * Provides common functionality while allowing specialization
 */
export abstract class BaseAgent {
    // Core properties
    protected provider: IProvider | undefined;
    protected currentConfig: ApiConfiguration | undefined;
    protected abortController: AbortController | null = null;
    protected messageHistory: Message[] = [];
    protected tools: ITool[] = [];
    protected customSystemPrompt: string = '';
    protected isPersonaChat: boolean = false;

    // Public properties
    public readonly conversationId: string;
    public readonly agentType: AgentType;
    public readonly mode: AgentMode;

    // Protected properties
    protected readonly webview: vscode.Webview;
    protected readonly onDidUpdateMessages: (messages: Message[]) => void;
    protected readonly tokenStorageService?: any;
    protected readonly tokenMonitor?: TokenMonitor;
    protected readonly capabilityRegistry: CapabilityRegistry;

    constructor(config: BaseAgentConfig) {
        this.conversationId = config.conversationId;
        this.webview = config.webview;
        this.agentType = config.agentType;
        this.mode = config.mode;
        this.tokenStorageService = config.tokenStorageService;
        this.tokenMonitor = config.tokenMonitor;
        this.onDidUpdateMessages = config.onDidUpdateMessages;
        this.capabilityRegistry = new CapabilityRegistry();

        // Initialize tools and capabilities
        this.initializeTools();
        this.registerCapabilities();
    }

    /**
     * Initialize core tools
     * Can be overridden by specialized agents to add custom tools
     */
    protected initializeTools(): void {
        this.tools = [
            new ReadFileTool(),
            new WriteFileTool(),
            new ListFilesTool(),
            new ExecuteCommandTool(() => this.abortController),
            new BrowserTool(),
        ];
        console.log(
            `[${this.agentType}] Core tools initialized:`,
            this.tools.map((t) => t.name)
        );
    }

    /**
     * Register capabilities for this agent
     * Must be implemented by specialized agents
     */
    protected abstract registerCapabilities(): void;

    /**
     * Get the system prompt for this agent
     * Must be implemented by specialized agents
     */
    public abstract getSystemPrompt(): string;

    /**
     * Get capabilities for this agent
     */
    public getCapabilities(): AgentCapability[] {
        return this.capabilityRegistry.getCapabilities(this.conversationId);
    }

    /**
     * Check if this agent has a specific capability
     */
    public hasCapability(capabilityName: string): boolean {
        return this.capabilityRegistry.hasCapability(this.conversationId, capabilityName);
    }

    /**
     * Get all tools available to this agent
     */
    public getTools(): ITool[] {
        return this.tools;
    }

    /**
     * Ensure provider is initialized with current configuration
     */
    protected async ensureInitialized(): Promise<void> {
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
        const { MODEL_IDENTIFIERS } = await import('../../../config/constants');
        let modelId: string;

        if (providerId === 'gemini') {
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
    public async chat(
        input: string,
        contextFiles: ContextFile[] = [],
        settings: AgentSettings = {},
        systemInstruction?: string,
        isPersonaChat: boolean = false,
        images?: string[]
    ): Promise<void> {
        console.log(`[${this.agentType}] chat called with settings:`, {
            autoRead: settings.autoRead,
            autoWrite: settings.autoWrite,
            autoExecute: settings.autoExecute,
            conversationId: this.conversationId,
            hasImages: images && images.length > 0,
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

        // Extract images from context files
        const extractedImages: string[] = [];
        const textFiles: ContextFile[] = [];

        contextFiles.forEach((file) => {
            if (file.content.startsWith('data:image/')) {
                extractedImages.push(file.content);
                console.log(`[${this.agentType}] Extracted image from context:`, file.path);
            } else {
                textFiles.push(file);
            }
        });

        const allImages = [...(images || []), ...extractedImages];

        let fullMessage = input;
        if (textFiles.length > 0) {
            fullMessage += '\n\nContext Files:\n';
            textFiles.forEach((file) => {
                fullMessage += `\n--- ${file.path} ---\n${file.content}\n--- End of ${file.path} ---\n`;
            });
        }

        // Add message to history
        this.messageHistory.push({
            role: 'user',
            text: fullMessage,
            images: allImages && allImages.length > 0 ? allImages : undefined
        });

        console.log(`[${this.agentType}] Message added to history:`, {
            conversationId: this.conversationId,
            totalMessages: this.messageHistory.length,
            imageCount: allImages.length
        });

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
    public async loadHistory(messages: Message[]): Promise<void> {
        this.messageHistory = [...messages];
    }

    /**
     * Abort current operation
     */
    public abort(): void {
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
    public dispose(): void {
        TerminalManager.getInstance().dispose();
        this.capabilityRegistry.clear(this.conversationId);
    }

    /**
     * Main agent loop - handles AI responses and tool execution
     * Can be overridden by specialized agents for custom behavior
     */
    protected async runLoop(settings: AgentSettings): Promise<void> {
        console.log(`[${this.agentType}] runLoop called`);
        console.log(`[${this.agentType}] Abort controller:`, {
            exists: !!this.abortController,
            aborted: this.abortController?.signal.aborted
        });

        if (this.abortController?.signal.aborted) {
            console.error(`[${this.agentType}] Abort signal detected - exiting runLoop early!`);
            return;
        }

        // Get dynamic system prompt
        const dynamicSystemPrompt = this.buildSystemPrompt();
        console.log(`[${this.agentType}] System prompt length:`, dynamicSystemPrompt.length);

        let responseText = '';
        try {
            if (!this.provider) {
                throw new Error('Provider not initialized');
            }

            // Check token limits
            if (this.tokenMonitor) {
                await this.checkTokenLimits(dynamicSystemPrompt);
            }

            const response = await this.provider.chat(this.messageHistory, dynamicSystemPrompt);
            responseText = response.text;

            // Record token usage
            if (this.tokenMonitor) {
                await this.recordTokenUsage(response, responseText);
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

        // Sanitize and send response
        const sanitizedResponse = this.sanitizeResponse(responseText);
        this.messageHistory.push({ role: 'model', text: responseText });
        this.onDidUpdateMessages(this.messageHistory);
        this.webview.postMessage({
            mode: this.mode,
            type: 'add-message',
            role: 'model',
            text: sanitizedResponse,
        });

        // Handle tool calls
        await this.handleToolCalls(responseText, settings);
    }

    /**
     * Build the complete system prompt
     * Combines base prompt with custom prompt
     */
    protected buildSystemPrompt(): string {
        if (this.isPersonaChat && this.customSystemPrompt) {
            // Pure persona mode - just the persona's instructions
            return this.customSystemPrompt;
        } else {
            // Assistant mode - base prompt + custom instructions
            const basePrompt = this.getSystemPrompt();
            return this.customSystemPrompt
                ? `${basePrompt}\n\n${this.customSystemPrompt}`
                : basePrompt;
        }
    }

    /**
     * Check token limits before making API call
     */
    protected async checkTokenLimits(systemPrompt: string): Promise<void> {
        if (!this.tokenMonitor) return;

        const lastUserMessage = this.messageHistory[this.messageHistory.length - 1];
        const userMessageTokens = lastUserMessage
            ? this.tokenMonitor.estimateTokens(lastUserMessage.text)
            : 100;

        const systemPromptTokens = this.messageHistory.length === 1
            ? this.tokenMonitor.estimateTokens(systemPrompt)
            : 0;

        const estimatedTokens = userMessageTokens + systemPromptTokens;
        const checkResult = await this.tokenMonitor.checkLimit(this.conversationId, estimatedTokens);

        if (!checkResult.allowed) {
            const proceed = await vscode.window.showWarningMessage(
                `Token limit exceeded. Current usage: ${checkResult.currentUsage}, Estimated: ${estimatedTokens}, Limit: ${checkResult.limit}. ` +
                `Do you want to proceed anyway?`,
                { modal: true },
                'Proceed',
                'Cancel'
            );

            if (proceed !== 'Proceed') {
                this.webview.postMessage({
                    mode: this.mode,
                    type: 'add-message',
                    role: 'error',
                    text: `Operation cancelled: Token limit exceeded.`,
                });
                this.messageHistory.pop();
                this.onDidUpdateMessages(this.messageHistory);
                throw new Error('Token limit exceeded');
            }
        }
    }

    /**
     * Record token usage after API call
     */
    protected async recordTokenUsage(response: any, responseText: string): Promise<void> {
        if (!this.tokenMonitor) return;

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

    /**
     * Handle tool calls from AI response
     * Can be overridden by specialized agents
     */
    protected async handleToolCalls(responseText: string, settings: AgentSettings): Promise<void> {
        const toolCall = await this.parseToolCall(responseText);

        if (toolCall) {
            console.log(`[${this.agentType}] Tool call detected: ${toolCall.tool}`);

            if (this.abortController?.signal.aborted) {
                return;
            }

            this.webview.postMessage({ type: 'status', text: `Executing ${toolCall.tool}...` });

            // Check permissions
            const allowed = this.checkToolPermission(toolCall.tool, settings);

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
                    toolResult = await toolInstance.execute(toolCall.args, toolCall.content);
                } catch (e: any) {
                    toolResult = `Error executing tool: ${e.message}`;
                }
            } else {
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
    protected checkToolPermission(toolName: string, settings: AgentSettings): boolean {
        if (toolName === 'read_file' && settings.autoRead) return true;
        if (toolName === 'write_file' && settings.autoWrite) return true;
        if (toolName === 'execute_command' && settings.autoExecute) return true;
        if (toolName === 'list_files' && settings.autoRead) return true;
        if (toolName === 'browser_action') return true;
        return false;
    }

    /**
     * Sanitize AI response
     */
    protected sanitizeResponse(text: string): string {
        const validator = new InputValidator();
        return validator.sanitizeResponse(text);
    }

    /**
     * Parse tool calls from AI response
     */
    protected async parseToolCall(text: string): Promise<any | null> {
        // Write file
        const writeMatch = text.match(/<write_file\s+path="([^"]+)">([\s\S]*?)<\/write_file>/);
        if (writeMatch) {
            return { tool: 'write_file', args: { path: writeMatch[1] }, content: writeMatch[2] };
        }

        // Read file
        const readMatch = text.match(/<read_file\s+path="([^"]+)"\s*\/>/);
        if (readMatch) {
            return { tool: 'read_file', args: { path: readMatch[1] } };
        }

        // Execute command
        const execMatch = text.match(/<execute_command>([\s\S]*?)<\/execute_command>/);
        if (execMatch) {
            return { tool: 'execute_command', args: {}, content: execMatch[1] };
        }

        // List files
        const listMatch = text.match(/<list_files\s+path="([^"]+)"\s*\/>/);
        if (listMatch) {
            return { tool: 'list_files', args: { path: listMatch[1] } };
        }

        // Browser action
        const browserMatch = text.match(/<browser_action\s+([\s\S]*?)\s*\/>/);
        if (browserMatch) {
            const attributes = browserMatch[1];
            const args: any = {};
            const actionMatch = attributes.match(/action="([^"]+)"/);
            const urlMatch = attributes.match(/url="([^"]+)"/);
            const selectorMatch = attributes.match(/selector="([^"]+)"/);
            const textMatch = attributes.match(/text="([^"]+)"/);

            if (actionMatch) args.action = actionMatch[1];
            if (urlMatch) args.url = urlMatch[1];
            if (selectorMatch) args.selector = selectorMatch[1];
            if (textMatch) args.text = textMatch[1];

            return { tool: 'browser_action', args: args };
        }

        return null;
    }
}
