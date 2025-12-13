"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
const vscode = __importStar(require("vscode"));
const GeminiProvider_1 = require("../providers/GeminiProvider");
const BedrockProvider_1 = require("../providers/BedrockProvider");
const NativeIDEProvider_1 = require("../providers/NativeIDEProvider");
const FileTools_1 = require("../tools/FileTools");
const TerminalTool_1 = require("../tools/TerminalTool");
const BrowserTool_1 = require("../tools/BrowserTool");
const MCPManager_1 = require("../integrations/MCPManager");
const MCPToolAdapter_1 = require("../tools/MCPToolAdapter");
const TerminalManager_1 = require("../integrations/TerminalManager");
const SystemPrompts_1 = require("../prompts/SystemPrompts");
/**
 * Agent class handles AI conversations and tool execution
 * Manages message history, tool calls, and provider interactions
 */
class Agent {
    constructor(webview, config, 
    // Will be typed properly when shared services are implemented
    tokenStorageService) {
        this.webview = webview;
        this.tokenStorageService = tokenStorageService;
        this.abortController = null;
        this.messageHistory = [];
        this.tools = [];
        this.customSystemPrompt = '';
        this.isPersonaChat = false;
        this.conversationId = config.conversationId;
        this.onDidUpdateMessages = config.onDidUpdateMessages;
        this.mode = config.mode || 'chat';
        this.mcpManager = new MCPManager_1.MCPManager();
        this.initializeTools();
    }
    /**
     * Initialize core tools and load MCP tools
     */
    async initializeTools() {
        // Core Tools
        this.tools = [
            new FileTools_1.ReadFileTool(),
            new FileTools_1.WriteFileTool(),
            new FileTools_1.ListFilesTool(),
            new TerminalTool_1.ExecuteCommandTool(() => this.abortController),
            new BrowserTool_1.BrowserTool(),
        ];
        console.log('[Personaut] Core tools initialized:', this.tools.map((t) => t.name));
        // Load MCP Tools
        try {
            const config = vscode.workspace.getConfiguration('personaut');
            const mcpServers = config.get('mcpServers') || {};
            for (const [name, settings] of Object.entries(mcpServers)) {
                if (settings.command) {
                    await this.mcpManager.connectToServer(name, settings.command, settings.args || []);
                }
            }
            const mcpTools = await this.mcpManager.getAllTools();
            for (const tool of mcpTools) {
                this.tools.push(new MCPToolAdapter_1.MCPToolAdapter(tool, tool.client));
            }
        }
        catch (e) {
            console.error('Failed to initialize MCP tools:', e);
        }
    }
    /**
     * Generate system prompt with tool definitions
     */
    getSystemPrompt() {
        const toolDefinitions = this.tools
            .map((t) => `${this.tools.indexOf(t) + 1}. ${t.name}:\n${t.getUsageExample()}`)
            .join('\n\n');
        console.log('[Personaut] System Prompt Tool Definitions:', toolDefinitions);
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'Unknown';
        return (0, SystemPrompts_1.getAgentSystemPrompt)(toolDefinitions, workspacePath);
    }
    /**
     * Ensure provider is initialized with current configuration
     */
    async ensureInitialized() {
        const config = vscode.workspace.getConfiguration('personaut');
        const providerId = config.get('provider') || 'gemini';
        // Retrieve API keys from secure storage if available, otherwise fall back to config
        let apiKey = '';
        let awsAccessKey = '';
        let awsSecretKey = '';
        if (this.tokenStorageService) {
            const apiKeys = await this.tokenStorageService.getAllApiKeys();
            apiKey = apiKeys.geminiApiKey || '';
            awsAccessKey = apiKeys.awsAccessKey || '';
            awsSecretKey = apiKeys.awsSecretKey || '';
        }
        else {
            // Fallback to config (legacy support)
            apiKey = config.get('geminiApiKey') || '';
            awsAccessKey = config.get('awsAccessKey') || '';
            awsSecretKey = config.get('awsSecretKey') || '';
        }
        // Get model ID from settings or use default
        const { MODEL_IDENTIFIERS } = await Promise.resolve().then(() => __importStar(require('../../config/constants')));
        let modelId;
        if (providerId === 'gemini') {
            // Try to get model from globalState settings first
            const context = vscode.ExtensionContext;
            const settings = context?.globalState?.get('personaut.settings', {});
            modelId = settings?.geminiModel || MODEL_IDENTIFIERS.gemini.default;
        }
        else if (providerId === 'bedrock') {
            modelId = MODEL_IDENTIFIERS.bedrock.default;
        }
        else {
            modelId = '';
        }
        const newConfig = {
            provider: providerId,
            apiKey: apiKey.trim(),
            modelId: modelId,
            awsAccessKey: awsAccessKey,
            awsSecretKey: awsSecretKey,
            awsRegion: config.get('awsRegion') || 'us-east-1',
            awsProfile: config.get('awsProfile') || 'default',
            awsUseProfile: config.get('bedrockUseAwsProfile') || false,
        };
        if (!this.provider || JSON.stringify(this.currentConfig) !== JSON.stringify(newConfig)) {
            if (providerId === 'gemini') {
                if (!newConfig.apiKey) {
                    throw new Error("API key not found. Please set 'personaut.geminiApiKey' in settings.");
                }
                this.provider = new GeminiProvider_1.GeminiProvider(newConfig);
            }
            else if (providerId === 'bedrock') {
                this.provider = new BedrockProvider_1.BedrockProvider(newConfig);
            }
            else if (providerId === 'nativeIde') {
                this.provider = new NativeIDEProvider_1.NativeIDEProvider();
            }
            else {
                throw new Error(`Provider ${providerId} not implemented yet.`);
            }
            this.currentConfig = newConfig;
        }
    }
    /**
     * Main chat method - sends a message and processes the response
     */
    async chat(input, contextFiles = [], settings = {}, systemInstruction, isPersonaChat = false) {
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
        }
        catch (e) {
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
    async loadHistory(messages) {
        this.messageHistory = [...messages];
    }
    /**
     * Abort current operation
     */
    abort() {
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
    dispose() {
        this.mcpManager.dispose();
        TerminalManager_1.TerminalManager.getInstance().dispose();
    }
    /**
     * Main agent loop - handles AI responses and tool execution
     */
    async runLoop(settings) {
        if (this.abortController?.signal.aborted) {
            return;
        }
        // For persona chats, use ONLY the persona prompt (no coding assistant)
        // For agent/assistant chats, combine base prompt with custom prompt
        let dynamicSystemPrompt;
        if (this.isPersonaChat && this.customSystemPrompt) {
            // Pure persona mode - just the persona's instructions
            dynamicSystemPrompt = this.customSystemPrompt;
        }
        else {
            // Assistant mode - coding assistant + custom instructions
            const baseSystemPrompt = this.getSystemPrompt();
            dynamicSystemPrompt = `${baseSystemPrompt}\n\n${this.customSystemPrompt}`;
        }
        let responseText = '';
        try {
            if (!this.provider) {
                throw new Error('Provider not initialized');
            }
            const response = await this.provider.chat(this.messageHistory, dynamicSystemPrompt);
            responseText = response.text;
            if (response.usage) {
                this.webview.postMessage({
                    type: 'usage-update',
                    usage: response.usage,
                });
            }
        }
        catch (e) {
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
                }
                catch (e) {
                    toolResult = `Error executing tool: ${e.message}`;
                }
            }
            else {
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
    checkToolPermission(toolName, settings) {
        // Auto-allow certain tools
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
        // Auto-allow MCP tools for now
        if (!['read_file', 'write_file', 'execute_command', 'list_files', 'browser_action'].includes(toolName)) {
            return true;
        }
        return false;
    }
    /**
     * Basic sanitization of AI response
     * TODO: Use InputValidator from shared services when available
     */
    sanitizeResponse(text) {
        // Basic XSS prevention
        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
    /**
     * Parse tool calls from AI response
     */
    async parseToolCall(text) {
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
            const args = {};
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
        // Generic Tool Matcher for MCP tools
        for (const tool of this.tools) {
            if (['read_file', 'write_file', 'execute_command', 'list_files', 'browser_action'].includes(tool.name)) {
                continue;
            }
            const toolRegex = new RegExp(`<${tool.name}>([\\s\\S]*?)<\\/${tool.name}>`);
            const match = text.match(toolRegex);
            if (match) {
                let args = {};
                let content = match[1].trim();
                try {
                    if (content) {
                        args = JSON.parse(content);
                        content = '';
                    }
                }
                catch (_e) {
                    // If not valid JSON, treat it as plain content
                }
                return { tool: tool.name, args: args, content: content };
            }
            // Check for self-closing tags
            const selfClosingToolRegex = new RegExp(`<${tool.name}\\s+([\\s\\S]*?)\\s*\\/>`);
            const selfClosingMatch = text.match(selfClosingToolRegex);
            if (selfClosingMatch) {
                let args = {};
                const attributesString = selfClosingMatch[1];
                try {
                    if (attributesString.startsWith('{') && attributesString.endsWith('}')) {
                        args = JSON.parse(attributesString);
                    }
                }
                catch (_e) {
                    // Not JSON, treat as empty args
                }
                return { tool: tool.name, args: args };
            }
        }
        return null;
    }
}
exports.Agent = Agent;
//# sourceMappingURL=Agent.js.map