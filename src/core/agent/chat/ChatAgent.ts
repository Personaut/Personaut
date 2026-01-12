/**
 * ChatAgent - General conversation agent
 * Handles basic chat interactions with default persona
 */

import { BaseAgent, BaseAgentConfig } from '../base/BaseAgent';
import { AGENT_CAPABILITIES } from '../base/AgentCapabilities';
import { DEFAULT_CHAT_PERSONA_PROMPT } from '../../prompts/ChatPrompts';
import { getAgentSystemPrompt } from '../../prompts/SystemPrompts';

/**
 * ChatAgent handles general conversation
 * Uses default chat persona or custom system prompt
 */
export class ChatAgent extends BaseAgent {
    constructor(config: Omit<BaseAgentConfig, 'agentType'>) {
        super({
            ...config,
            agentType: 'chat',
            mode: config.mode || 'chat',
        });
    }

    /**
     * Register capabilities for chat agent
     */
    protected registerCapabilities(): void {
        this.capabilityRegistry.register(
            this.conversationId,
            AGENT_CAPABILITIES.CONVERSATION
        );
    }

    /**
     * Get system prompt for chat agent
     * Combines tool definitions with default chat persona
     */
    public getSystemPrompt(): string {
        // Get tool definitions
        const toolDefinitions = this.tools
            .map((t, i) => `${i + 1}. ${t.name}:\n${t.getUsageExample()}`)
            .join('\n\n');

        // Get workspace path
        const vscode = require('vscode');
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'Unknown';

        // Combine base system prompt with default chat persona
        const basePrompt = getAgentSystemPrompt(toolDefinitions, workspacePath);
        const chatPersona = DEFAULT_CHAT_PERSONA_PROMPT;

        return `${basePrompt}\n\n${chatPersona}`;
    }
}
