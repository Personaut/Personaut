/**
 * PersonaAgent - Persona-based chat agent
 * Handles conversations as a specific persona with backstory and attributes
 */

import { BaseAgent, BaseAgentConfig } from '../base/BaseAgent';
import { AGENT_CAPABILITIES } from '../base/AgentCapabilities';
import { PersonaAgentOptions, PersonaMode } from '../AgentTypes';
import {
    getAgentModePrompt,
    getTextMessengerModePrompt,
    getFeedbackModePrompt,
    getBuildModePrompt,
} from '../../prompts/PersonaPrompts';

/**
 * PersonaAgent handles persona-based conversations
 * Supports multiple modes: agent, text-messenger, feedback, build
 */
export class PersonaAgent extends BaseAgent {
    private readonly personaName: string;
    private readonly backstory: string;
    private readonly attributes: Record<string, any>;
    private readonly personaMode: PersonaMode;

    constructor(
        config: Omit<BaseAgentConfig, 'agentType'>,
        options: PersonaAgentOptions
    ) {
        super({
            ...config,
            agentType: 'persona',
            mode: config.mode || 'chat',
        });

        this.personaName = options.personaName;
        this.backstory = options.backstory || '';
        this.attributes = options.attributes || {};
        this.personaMode = options.mode || 'agent';
    }

    /**
     * Register capabilities for persona agent
     */
    protected registerCapabilities(): void {
        this.capabilityRegistry.register(
            this.conversationId,
            AGENT_CAPABILITIES.PERSONA_CHAT
        );
    }

    /**
     * Get system prompt for persona agent
     * Returns mode-specific prompt based on persona mode
     */
    public getSystemPrompt(): string {
        // Build persona object for prompt functions
        const persona = {
            id: this.conversationId,
            name: this.personaName,
            backstory: this.backstory,
            attributes: this.attributes,
        };

        switch (this.personaMode) {
            case 'agent':
                return getAgentModePrompt(persona);

            case 'text-messenger':
                return getTextMessengerModePrompt(persona);

            case 'feedback':
                return getFeedbackModePrompt(persona);

            case 'build':
                return getBuildModePrompt(persona);

            default:
                return getAgentModePrompt(persona);
        }
    }

    /**
     * Get persona information
     */
    public getPersonaInfo() {
        return {
            name: this.personaName,
            backstory: this.backstory,
            attributes: this.attributes,
            mode: this.personaMode,
        };
    }

    /**
     * Update persona mode
     */
    public setMode(mode: PersonaMode): void {
        (this as any).personaMode = mode;
    }
}
