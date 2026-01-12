/**
 * Agent module - handles AI conversations and tool execution
 */

// Legacy exports
export { Agent } from './Agent';
export { AgentManager } from './AgentManager';
export type { AgentMode, ContextFile, AgentSettings, AgentConfig } from './AgentTypes';
export type { AgentManagerConfig, AgentCapability } from './AgentManager';

// Base infrastructure
export { BaseAgent } from './base/BaseAgent';
export type { BaseAgentConfig } from './base/BaseAgent';
export { CapabilityRegistry, AGENT_CAPABILITIES } from './base/AgentCapabilities';
export type { AgentCapability as AgentCapabilityType, AgentTool } from './base/AgentCapabilities';

// Chat agents
export { ChatAgent } from './chat/ChatAgent';
export { PersonaAgent } from './chat/PersonaAgent';
export { AssistantAgent } from './chat/AssistantAgent';

// Build agents
export { DeveloperAgent } from './build/DeveloperAgent';
export { DesignerAgent } from './build/DesignerAgent';
export { ResearchAgent } from './build/ResearchAgent';

// Feedback agents
export { ReviewerAgent } from './feedback/ReviewerAgent';
export type { FeedbackEntry, FeedbackSummary } from './feedback/ReviewerAgent';

// Factory
export { AgentFactory } from './AgentFactory';

// Types
export type {
    AgentType,
    Framework,
    ResearchType,
    PersonaMode,
    RatingSystem,
    DeveloperAgentOptions,
    PersonaAgentOptions,
    ResearchAgentOptions,
    ReviewerAgentOptions,
    AgentCreationOptions,
} from './AgentTypes';
