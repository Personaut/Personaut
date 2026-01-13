/**
 * DesignerAgent - UX/UI design agent
 * Handles user experience design, wireframes, and screen specifications
 */

import { BaseAgent, BaseAgentConfig } from '../base/BaseAgent';
import { AGENT_CAPABILITIES } from '../base/AgentCapabilities';
import { DESIGN_PROMPT } from '../../prompts/BuildPrompts';

/**
 * DesignerAgent handles UX/UI design tasks
 * Generates user flows, wireframes, and screen specifications
 */
export class DesignerAgent extends BaseAgent {
    constructor(config: Omit<BaseAgentConfig, 'agentType'>) {
        super({
            ...config,
            agentType: 'designer',
            mode: config.mode || 'build',
        });
    }

    /**
     * Register capabilities for designer agent
     */
    protected registerCapabilities(): void {
        this.capabilityRegistry.register(
            this.conversationId,
            AGENT_CAPABILITIES.UX_DESIGN
        );
    }

    /**
     * Get system prompt for designer agent
     * Returns UX design prompt
     */
    public getSystemPrompt(): string {
        return DESIGN_PROMPT;
    }

    /**
     * Generate user flows from requirements
     * @param requirements - Product requirements
     * @returns User flow specifications
     */
    public async generateUserFlows(requirements: string): Promise<string> {
        const prompt = `Create user flows for the following requirements:\n\n${requirements}\n\nProvide:\n- Main user journeys\n- Screen transitions\n- User actions\n- Decision points\n- Success/error states`;

        let userFlows = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                userFlows = lastMessage.text;
            }
        };

        await this.chat(prompt, [], {}, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        return userFlows;
    }

    /**
     * Generate screen designs
     * @param screenName - Name of the screen
     * @param purpose - Purpose and requirements
     * @returns Screen design specification
     */
    public async generateScreen(screenName: string, purpose: string): Promise<string> {
        const prompt = `Design a screen named "${screenName}":\n\n${purpose}\n\nProvide:\n- Layout structure\n- UI components\n- Interaction behaviors\n- Accessibility considerations\n- Responsive design notes`;

        let screenDesign = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                screenDesign = lastMessage.text;
            }
        };

        await this.chat(prompt, [], {}, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        return screenDesign;
    }

    /**
     * Generate wireframes
     * @param description - Feature description
     * @returns Wireframe specifications
     */
    public async generateWireframes(description: string): Promise<string> {
        const prompt = `Create wireframes for:\n\n${description}\n\nProvide:\n- Layout sketches (ASCII art or description)\n- Component placement\n- Content hierarchy\n- Navigation structure\n- Annotations`;

        let wireframes = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                wireframes = lastMessage.text;
            }
        };

        await this.chat(prompt, [], {}, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        return wireframes;
    }

    /**
     * Create a design system
     * @param brandGuidelines - Brand guidelines and preferences
     * @returns Design system specification
     */
    public async createDesignSystem(brandGuidelines?: string): Promise<string> {
        const guidelines = brandGuidelines || 'Modern, clean, accessible design';
        const prompt = `Create a design system based on:\n\n${guidelines}\n\nInclude:\n- Color palette\n- Typography scale\n- Spacing system\n- Component styles\n- Accessibility guidelines`;

        let designSystem = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                designSystem = lastMessage.text;
            }
        };

        await this.chat(prompt, [], {}, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        return designSystem;
    }

    /**
     * Get UX design best practices
     */
    public getDesignPrinciples(): string[] {
        return [
            'User-centered design',
            'Consistency across screens',
            'Clear visual hierarchy',
            'Accessible to all users (WCAG 2.1 AA)',
            'Responsive and mobile-first',
            'Intuitive navigation',
            'Meaningful feedback',
            'Error prevention and recovery',
            'Performance optimization',
            'Progressive disclosure',
        ];
    }
}
