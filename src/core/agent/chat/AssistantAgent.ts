/**
 * AssistantAgent - AI assistant with full tool execution capabilities
 * Handles coding tasks, file operations, and command execution
 */

import { BaseAgent, BaseAgentConfig } from '../base/BaseAgent';
import { AGENT_CAPABILITIES } from '../base/AgentCapabilities';
import { GENERIC_ASSISTANT_PROMPT } from '../../prompts/SystemPrompts';
import { getAgentSystemPrompt } from '../../prompts/SystemPrompts';

/**
 * AssistantAgent handles AI assistant tasks with full tool access
 * Designed for coding, file operations, and command execution
 */
export class AssistantAgent extends BaseAgent {
    constructor(config: Omit<BaseAgentConfig, 'agentType'>) {
        super({
            ...config,
            agentType: 'assistant',
            mode: config.mode || 'chat',
        });
    }

    /**
     * Register capabilities for assistant agent
     */
    protected registerCapabilities(): void {
        this.capabilityRegistry.registerMultiple(this.conversationId, [
            AGENT_CAPABILITIES.CONVERSATION,
            AGENT_CAPABILITIES.TOOL_EXECUTION,
        ]);
    }

    /**
     * Get system prompt for assistant agent
     * Combines tool definitions with generic assistant prompt
     */
    public getSystemPrompt(): string {
        // Get tool definitions
        const toolDefinitions = this.tools
            .map((t, i) => `${i + 1}. ${t.name}:\n${t.getUsageExample()}`)
            .join('\n\n');

        // Get workspace path
        const vscode = require('vscode');
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'Unknown';

        // Combine base system prompt with generic assistant prompt
        const basePrompt = getAgentSystemPrompt(toolDefinitions, workspacePath);
        const assistantPrompt = GENERIC_ASSISTANT_PROMPT;

        return `${basePrompt}\n\n${assistantPrompt}`;
    }

    /**
     * Get available tools
     */
    public getAvailableTools(): string[] {
        return this.tools.map(t => t.name);
    }

    /**
     * Check if a specific tool is available
     */
    public hasToolAvailable(toolName: string): boolean {
        return this.tools.some(t => t.name === toolName);
    }
}
