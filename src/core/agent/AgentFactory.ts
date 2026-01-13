/**
 * AgentFactory - Specialized factory methods for creating typed agents
 * This file contains factory methods to be added to AgentManager
 */

import { ChatAgent } from './chat/ChatAgent';
import { PersonaAgent } from './chat/PersonaAgent';
import { AssistantAgent } from './chat/AssistantAgent';
import { DeveloperAgent } from './build/DeveloperAgent';
import { DesignerAgent } from './build/DesignerAgent';
import { ResearchAgent } from './build/ResearchAgent';
import { SummarizerAgent, SummarizerAgentOptions } from './build/SummarizerAgent';
import { ReviewerAgent } from './feedback/ReviewerAgent';
import {
    DeveloperAgentOptions,
    PersonaAgentOptions,
    ResearchAgentOptions,
    ReviewerAgentOptions,
} from './AgentTypes';

/**
 * Factory methods for specialized agents
 * These methods should be added to AgentManager class
 */
export class AgentFactory {
    /**
     * Create a ChatAgent for general conversation
     */
    static createChatAgent(
        conversationId: string,
        webview: any,
        tokenStorageService: any,
        tokenMonitor: any,
        onDidUpdateMessages: (messages: any[]) => void
    ): ChatAgent {
        return new ChatAgent({
            conversationId,
            webview,
            mode: 'chat',
            tokenStorageService,
            tokenMonitor,
            onDidUpdateMessages,
        });
    }

    /**
     * Create a PersonaAgent for persona-based chat
     */
    static createPersonaAgent(
        conversationId: string,
        webview: any,
        tokenStorageService: any,
        tokenMonitor: any,
        onDidUpdateMessages: (messages: any[]) => void,
        options: PersonaAgentOptions
    ): PersonaAgent {
        return new PersonaAgent(
            {
                conversationId,
                webview,
                mode: 'chat',
                tokenStorageService,
                tokenMonitor,
                onDidUpdateMessages,
            },
            options
        );
    }

    /**
     * Create an AssistantAgent for AI assistant tasks
     */
    static createAssistantAgent(
        conversationId: string,
        webview: any,
        tokenStorageService: any,
        tokenMonitor: any,
        onDidUpdateMessages: (messages: any[]) => void
    ): AssistantAgent {
        return new AssistantAgent({
            conversationId,
            webview,
            mode: 'chat',
            tokenStorageService,
            tokenMonitor,
            onDidUpdateMessages,
        });
    }

    /**
     * Create a DeveloperAgent for framework-specific code generation
     */
    static createDeveloperAgent(
        conversationId: string,
        webview: any,
        tokenStorageService: any,
        tokenMonitor: any,
        onDidUpdateMessages: (messages: any[]) => void,
        options: DeveloperAgentOptions
    ): DeveloperAgent {
        return new DeveloperAgent(
            {
                conversationId,
                webview,
                mode: 'build',
                tokenStorageService,
                tokenMonitor,
                onDidUpdateMessages,
            },
            options
        );
    }

    /**
     * Create a DesignerAgent for UX/UI design
     */
    static createDesignerAgent(
        conversationId: string,
        webview: any,
        tokenStorageService: any,
        tokenMonitor: any,
        onDidUpdateMessages: (messages: any[]) => void
    ): DesignerAgent {
        return new DesignerAgent({
            conversationId,
            webview,
            mode: 'build',
            tokenStorageService,
            tokenMonitor,
            onDidUpdateMessages,
        });
    }

    /**
     * Create a ResearchAgent for market/user research
     */
    static createResearchAgent(
        conversationId: string,
        webview: any,
        tokenStorageService: any,
        tokenMonitor: any,
        onDidUpdateMessages: (messages: any[]) => void,
        options: ResearchAgentOptions
    ): ResearchAgent {
        return new ResearchAgent(
            {
                conversationId,
                webview,
                mode: 'build',
                tokenStorageService,
                tokenMonitor,
                onDidUpdateMessages,
            },
            options
        );
    }

    /**
     * Create a SummarizerAgent for context compression and summarization
     */
    static createSummarizerAgent(
        conversationId: string,
        webview: any,
        tokenStorageService: any,
        tokenMonitor: any,
        onDidUpdateMessages: (messages: any[]) => void,
        options?: SummarizerAgentOptions
    ): SummarizerAgent {
        return new SummarizerAgent(
            {
                conversationId,
                webview,
                mode: 'build',
                tokenStorageService,
                tokenMonitor,
                onDidUpdateMessages,
            },
            options
        );
    }

    /**
     * Create a ReviewerAgent for persona-based feedback
     */
    static createReviewerAgent(
        conversationId: string,
        webview: any,
        tokenStorageService: any,
        tokenMonitor: any,
        onDidUpdateMessages: (messages: any[]) => void,
        options: ReviewerAgentOptions
    ): ReviewerAgent {
        return new ReviewerAgent(
            {
                conversationId,
                webview,
                mode: 'feedback',
                tokenStorageService,
                tokenMonitor,
                onDidUpdateMessages,
            },
            options
        );
    }
}
