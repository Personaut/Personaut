/**
 * Agent Capabilities System
 * Defines what each agent type can do and how to discover capabilities
 */

/**
 * Tool definition for agent capabilities
 */
export interface AgentTool {
    name: string;
    description: string;
    parameters?: Record<string, any>;
}

/**
 * Capability definition for agent discovery
 * Describes what an agent can do and what resources it needs
 */
export interface AgentCapability {
    /** Unique capability identifier */
    name: string;

    /** Human-readable description */
    description: string;

    /** Tools this capability requires */
    tools: AgentTool[];

    /** Prompts this capability uses */
    prompts: string[];

    /** Optional metadata */
    metadata?: Record<string, any>;
}

/**
 * Predefined capabilities for different agent types
 */
export const AGENT_CAPABILITIES = {
    // Chat capabilities
    CONVERSATION: {
        name: 'conversation',
        description: 'Engage in natural conversation',
        tools: [],
        prompts: ['DEFAULT_CHAT_PERSONA_PROMPT'],
    } as AgentCapability,

    PERSONA_CHAT: {
        name: 'persona-chat',
        description: 'Chat as a specific persona with backstory',
        tools: [],
        prompts: ['generatePersonaPrompt'],
    } as AgentCapability,

    TOOL_EXECUTION: {
        name: 'tool-execution',
        description: 'Execute tools and commands',
        tools: [
            { name: 'read_file', description: 'Read file contents' },
            { name: 'write_file', description: 'Write to files' },
            { name: 'execute_command', description: 'Execute shell commands' },
        ],
        prompts: ['GENERIC_ASSISTANT_PROMPT'],
    } as AgentCapability,

    // Build capabilities
    CODE_GENERATION: {
        name: 'code-generation',
        description: 'Generate code for specific frameworks',
        tools: [
            { name: 'generate_component', description: 'Generate UI components' },
            { name: 'generate_page', description: 'Generate page components' },
            { name: 'generate_api', description: 'Generate API routes' },
        ],
        prompts: ['getCodePrompt'],
    } as AgentCapability,

    CODE_REPAIR: {
        name: 'code-repair',
        description: 'Fix compilation and runtime errors',
        tools: [
            { name: 'analyze_errors', description: 'Analyze error messages' },
            { name: 'suggest_fixes', description: 'Suggest code fixes' },
            { name: 'apply_fixes', description: 'Apply fixes to code' },
        ],
        prompts: ['getCodePrompt'],
    } as AgentCapability,

    UX_DESIGN: {
        name: 'ux-design',
        description: 'Design user experiences and interfaces',
        tools: [
            { name: 'generate_user_flows', description: 'Create user flow diagrams' },
            { name: 'generate_wireframes', description: 'Create wireframes' },
            { name: 'generate_screens', description: 'Design screen layouts' },
        ],
        prompts: ['DESIGN_PROMPT'],
    } as AgentCapability,

    RESEARCH: {
        name: 'research',
        description: 'Conduct market and user research',
        tools: [
            { name: 'web_search', description: 'Search the web' },
            { name: 'analyze_competitors', description: 'Analyze competitor products' },
            { name: 'synthesize_findings', description: 'Synthesize research data' },
        ],
        prompts: [
            'COMPETITIVE_ANALYSIS_PROMPT',
            'MARKET_RESEARCH_PROMPT',
            'USER_RESEARCHER_PROMPT',
            'RESEARCH_SYNTHESIS_PROMPT',
        ],
    } as AgentCapability,

    // Feedback capabilities
    FEEDBACK_COLLECTION: {
        name: 'feedback-collection',
        description: 'Collect and analyze user feedback',
        tools: [
            { name: 'review_screenshot', description: 'Review UI screenshots' },
            { name: 'rate_experience', description: 'Rate user experience' },
            { name: 'provide_feedback', description: 'Provide detailed feedback' },
        ],
        prompts: ['PERSONA_FEEDBACK_PROMPT'],
    } as AgentCapability,

    FEEDBACK_SYNTHESIS: {
        name: 'feedback-synthesis',
        description: 'Synthesize feedback from multiple sources',
        tools: [
            { name: 'aggregate_ratings', description: 'Aggregate rating data' },
            { name: 'identify_patterns', description: 'Identify feedback patterns' },
            { name: 'generate_summary', description: 'Generate feedback summary' },
        ],
        prompts: ['FEEDBACK_SUMMARY_PROMPT'],
    } as AgentCapability,

    SUMMARIZATION: {
        name: 'summarization',
        description: 'Compress context and summarize iterations',
        tools: [
            { name: 'summarize_iteration', description: 'Summarize iteration history' },
            { name: 'consolidate_feedback', description: 'Consolidate reviewer feedback' },
            { name: 'compress_context', description: 'Compress older iterations' },
            { name: 'detect_conflicts', description: 'Detect conflicting feedback' },
        ],
        prompts: ['SUMMARIZATION_PROMPT'],
    } as AgentCapability,
} as const;

/**
 * Capability registry for runtime capability management
 */
export class CapabilityRegistry {
    private capabilities = new Map<string, AgentCapability[]>();

    /**
     * Register a capability for an agent
     */
    register(agentId: string, capability: AgentCapability): void {
        const existing = this.capabilities.get(agentId) || [];

        // Avoid duplicates
        if (!existing.some(c => c.name === capability.name)) {
            existing.push(capability);
            this.capabilities.set(agentId, existing);
        }
    }

    /**
     * Register multiple capabilities for an agent
     */
    registerMultiple(agentId: string, capabilities: AgentCapability[]): void {
        capabilities.forEach(cap => this.register(agentId, cap));
    }

    /**
     * Get all capabilities for an agent
     */
    getCapabilities(agentId: string): AgentCapability[] {
        return this.capabilities.get(agentId) || [];
    }

    /**
     * Check if an agent has a specific capability
     */
    hasCapability(agentId: string, capabilityName: string): boolean {
        const caps = this.capabilities.get(agentId) || [];
        return caps.some(c => c.name === capabilityName);
    }

    /**
     * Get all tools available to an agent
     */
    getTools(agentId: string): AgentTool[] {
        const caps = this.capabilities.get(agentId) || [];
        return caps.flatMap(c => c.tools);
    }

    /**
     * Get all prompts used by an agent
     */
    getPrompts(agentId: string): string[] {
        const caps = this.capabilities.get(agentId) || [];
        return [...new Set(caps.flatMap(c => c.prompts))];
    }

    /**
     * Remove all capabilities for an agent
     */
    clear(agentId: string): void {
        this.capabilities.delete(agentId);
    }

    /**
     * Remove all capabilities
     */
    clearAll(): void {
        this.capabilities.clear();
    }

    /**
     * Get all registered agent IDs
     */
    getAgentIds(): string[] {
        return Array.from(this.capabilities.keys());
    }
}
