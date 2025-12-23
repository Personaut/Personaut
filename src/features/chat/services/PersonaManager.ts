/**
 * PersonaManager manages persona selection and prompt generation
 * 
 * Feature: chat-enhancements
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 10.1, 10.2, 10.3
 */

import {
    SystemAgent,
    UserPersona,
    SelectedPersona,
    IPersonaManager,
    SYSTEM_AGENTS,
    IChatHistoryService,
} from './ChatHistoryTypes';
import { getChatPersonaPrompt, ChatPersonaConfig } from '../../../core/prompts';

/**
 * Default prompt when persona prompt is not found
 */
const DEFAULT_PROMPT = `You are a helpful AI assistant for the Personaut extension.
You help users with persona creation, user research, and product development.
Be friendly, professional, and provide actionable insights.`;

/**
 * Interface for persona storage adapter
 */
export interface PersonaStorageAdapter {
    getAllPersonas(): Array<{
        id: string;
        name: string;
        backstory?: string;
        createdAt?: number;
    }>;
    getPersonaById(id: string): Promise<{
        id: string;
        name: string;
        backstory?: string;
    } | null>;
}

export class PersonaManager implements IPersonaManager {
    private selectedPersona: SelectedPersona | null = null;

    constructor(
        private readonly chatHistoryService?: IChatHistoryService,
        private readonly personaStorage?: PersonaStorageAdapter
    ) { }

    /**
     * Get all system agents
     * Validates: Requirements 4.1
     */
    getSystemAgents(): SystemAgent[] {
        return SYSTEM_AGENTS;
    }

    /**
     * Get user personas with limit (default 5)
     * Validates: Requirements 4.2, 4.5
     */
    async getUserPersonas(limit: number = 5): Promise<UserPersona[]> {
        if (!this.personaStorage) {
            return [];
        }

        try {
            const personas = this.personaStorage.getAllPersonas();
            return personas.slice(0, limit).map(p => ({
                id: p.id,
                name: p.name,
                backstory: p.backstory || '',
                initial: p.name.charAt(0).toUpperCase(),
                createdAt: p.createdAt || Date.now(),
            }));
        } catch (error) {
            console.error('[PersonaManager] Failed to get user personas:', error);
            return [];
        }
    }

    /**
     * Get the prompt for a persona
     * Validates: Requirements 1.3, 1.4, 10.1, 10.2, 10.3
     */
    async getPersonaPrompt(personaId: string, personaType: string): Promise<string> {
        try {
            if (personaType === 'system_agent' || personaType === 'agent') {
                // Find system agent
                const agent = SYSTEM_AGENTS.find(a => a.id === personaId);
                if (agent) {
                    // Use centralized prompts library
                    const config: ChatPersonaConfig = {
                        id: agent.id,
                        name: agent.name,
                        type: 'agent',
                    };
                    return getChatPersonaPrompt(config);
                }
            } else if (personaType === 'user_persona' || personaType === 'user') {
                // Get user persona from storage
                if (this.personaStorage) {
                    const persona = await this.personaStorage.getPersonaById(personaId);
                    if (persona && persona.backstory) {
                        return `You are ${persona.name}. ${persona.backstory}

Respond as this persona would, staying true to their character, background, and perspective. Do not break character.
Provide responses that reflect this persona's unique viewpoint, experiences, and communication style.`;
                    }
                }
            }

            // Fallback to default prompt
            console.warn('[PersonaManager] Persona prompt not found, using default:', {
                personaId,
                personaType,
            });
            return DEFAULT_PROMPT;
        } catch (error) {
            console.error('[PersonaManager] Error getting persona prompt:', error);
            return DEFAULT_PROMPT;
        }
    }

    /**
     * Select a persona and persist the selection
     * Validates: Requirements 1.2
     */
    async selectPersona(personaId: string, personaType: string): Promise<SelectedPersona> {
        let selected: SelectedPersona;

        if (personaType === 'system_agent' || personaType === 'agent') {
            const agent = SYSTEM_AGENTS.find(a => a.id === personaId);
            if (agent) {
                selected = {
                    type: 'system_agent',
                    id: agent.id,
                    name: agent.name,
                    displayIndicator: agent.icon,
                };
            } else {
                // Default to Pippet
                selected = {
                    type: 'default',
                    id: 'pippet',
                    name: 'Pippet',
                    displayIndicator: '🐾',
                };
            }
        } else if (personaType === 'user_persona' || personaType === 'user') {
            if (this.personaStorage) {
                const persona = await this.personaStorage.getPersonaById(personaId);
                if (persona) {
                    selected = {
                        type: 'user_persona',
                        id: persona.id,
                        name: persona.name,
                        displayIndicator: persona.name.charAt(0).toUpperCase(),
                    };
                } else {
                    // Fallback to default
                    selected = {
                        type: 'default',
                        id: 'pippet',
                        name: 'Pippet',
                        displayIndicator: '🐾',
                    };
                }
            } else {
                selected = {
                    type: 'default',
                    id: 'pippet',
                    name: 'Pippet',
                    displayIndicator: '🐾',
                };
            }
        } else {
            // Default selection
            selected = {
                type: 'default',
                id: 'pippet',
                name: 'Pippet',
                displayIndicator: '🐾',
            };
        }

        this.selectedPersona = selected;

        // Persist selection
        if (this.chatHistoryService) {
            await this.chatHistoryService.setSetting('selectedPersonaId', selected.id);
            await this.chatHistoryService.setSetting('selectedPersonaType', selected.type);
        }

        console.log('[PersonaManager] Persona selected:', selected);
        return selected;
    }

    /**
     * Get the currently selected persona
     */
    getSelectedPersona(): SelectedPersona | null {
        return this.selectedPersona;
    }

    /**
     * Load persisted persona selection
     */
    async loadPersistedSelection(): Promise<SelectedPersona | null> {
        if (!this.chatHistoryService) {
            return null;
        }

        try {
            const personaId = await this.chatHistoryService.getSetting('selectedPersonaId');
            const personaType = await this.chatHistoryService.getSetting('selectedPersonaType');

            if (personaId && personaType) {
                return this.selectPersona(personaId, personaType);
            }
        } catch (error) {
            console.error('[PersonaManager] Failed to load persisted selection:', error);
        }

        return null;
    }

    /**
     * Get persona display indicator
     * Validates: Requirements 4.3, 4.4
     */
    getPersonaIndicator(personaId: string, personaType: string): string {
        if (personaType === 'system_agent' || personaType === 'agent') {
            const agent = SYSTEM_AGENTS.find(a => a.id === personaId);
            return agent?.icon || '🤖';
        }

        // For user personas, return first letter uppercase
        if (this.selectedPersona && this.selectedPersona.id === personaId) {
            return this.selectedPersona.displayIndicator;
        }

        return personaId.charAt(0).toUpperCase();
    }

    /**
     * Get all available personas (system + user)
     */
    async getAllPersonas(): Promise<{
        systemAgents: SystemAgent[];
        userPersonas: UserPersona[];
    }> {
        const systemAgents = this.getSystemAgents();
        const userPersonas = await this.getUserPersonas();

        return {
            systemAgents,
            userPersonas,
        };
    }
}
