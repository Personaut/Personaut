import { PersonaFileStorage } from './PersonaFileStorage';
import { Persona } from '../types/PersonaFileTypes';
import { AgentManager } from '../../../core/agent/AgentManager';
import { BACKSTORY_GENERATION_PROMPT } from '../../../core/prompts/PersonaPrompts';
import {
  CreatePersonaRequest,
  UpdatePersonaRequest,
  DeletePersonaRequest,
  SearchPersonasRequest,
} from '../types/PersonasTypes';

/**
 * Service for managing personas
 * 
 * Validates: Personas Integration
 */
export class PersonasService {
  constructor(
    private readonly personaStorage: PersonaFileStorage,
    private readonly agentManager?: AgentManager
  ) { }

  /**
   * Get all personas
   */
  public async getPersonas(): Promise<Persona[]> {
    return await this.personaStorage.getAllPersonas();
  }

  /**
   * Get a persona by ID
   */
  public async getPersonaById(id: string): Promise<Persona | null> {
    return await this.personaStorage.getPersonaById(id);
  }

  /**
   * Search personas by name
   */
  public async searchPersonas(request: SearchPersonasRequest): Promise<Persona[]> {
    return await this.personaStorage.searchPersonas(request.query);
  }

  /**
   * Create a new persona
   */
  public async createPersona(request: CreatePersonaRequest): Promise<Persona> {
    return await this.personaStorage.createPersona(request.name, request.attributes);
  }

  /**
   * Update an existing persona
   */
  public async updatePersona(request: UpdatePersonaRequest): Promise<Persona | null> {
    return await this.personaStorage.updatePersona(request.id, request.updates);
  }

  /**
   * Delete a persona
   */
  public async deletePersona(request: DeletePersonaRequest): Promise<boolean> {
    return await this.personaStorage.deletePersona(request.id);
  }

  // ==================== FAVORITES MANAGEMENT ====================

  /**
   * Add a persona to favorites
   */
  public async addFavorite(id: string): Promise<void> {
    return await this.personaStorage.addFavorite(id);
  }

  /**
   * Remove a persona from favorites
   */
  public async removeFavorite(id: string): Promise<void> {
    return await this.personaStorage.removeFavorite(id);
  }

  /**
   * Toggle a persona's favorite status
   */
  public async toggleFavorite(id: string): Promise<boolean> {
    return await this.personaStorage.toggleFavorite(id);
  }

  /**
   * Get all favorites
   */
  public async getFavorites(): Promise<Persona[]> {
    return await this.personaStorage.getFavorites();
  }

  // ==================== REGENERATE ====================

  /**
   * Regenerate a persona with version increment
   */
  public async regeneratePersona(
    id: string,
    updates?: Partial<Omit<Persona, 'id' | 'createdAt'>>
  ): Promise<Persona | null> {
    return await this.personaStorage.regeneratePersona(id, updates || {});
  }

  // ==================== PROMPT GENERATION ====================

  /**
   * Generate a prompt for a persona
   */
  public async generatePrompt(id: string): Promise<string | null> {
    const persona = await this.personaStorage.getPersonaById(id);
    if (!persona) {
      return null;
    }
    return this.personaStorage.generatePrompt(persona);
  }

  // ==================== AI FEATURES ====================

  /**
   * Generate a backstory for a persona using AI
   * 
   * Uses the AgentManager to generate a contextually appropriate backstory
   * based on the persona's attributes and existing information.
   * 
   * @param id - The persona ID to generate backstory for
   * @returns The generated backstory text, or null if generation failed
   */
  public async generateBackstory(id: string): Promise<string | null> {
    const persona = await this.personaStorage.getPersonaById(id);
    if (!persona) {
      throw new Error(`Persona with id ${id} not found`);
    }

    // If no agentManager, return existing backstory or null
    if (!this.agentManager) {
      console.warn('[PersonasService] AgentManager not available for backstory generation');
      return persona.backstory || null;
    }

    const prompt = this.personaStorage.generatePrompt(persona);

    try {
      // Use direct provider call to avoid creating chat history entries
      // We still want token monitoring, so we'll manually record usage
      const provider = await this.agentManager.getProvider();
      if (!provider) {
        throw new Error('No AI provider available');
      }

      // Replace {prompt} placeholder with the actual persona description
      const fullPrompt = BACKSTORY_GENERATION_PROMPT.replace('{prompt}', prompt);

      console.log('[PersonasService] Generating backstory with prompt:', prompt);

      // Make direct provider call (no conversation history)
      const response = await provider.chat(
        [{ role: 'user', text: fullPrompt }],
        '' // Empty system instruction - all instructions are in the prompt
      );

      const backstory = response.text?.trim() || '';

      // Manually record token usage for monitoring
      // Use a special conversation ID that won't appear in history
      const tokenMonitor = (this.agentManager as any).tokenMonitor;
      if (tokenMonitor && response.usage) {
        const tempConversationId = `persona-backstory-${id}`;
        await tokenMonitor.recordUsage(tempConversationId, response.usage);
        console.log('[PersonasService] Recorded token usage for backstory generation');
      }

      // Update the persona with the generated backstory
      await this.personaStorage.updatePersona(id, {
        backstory,
      });

      return backstory;
    } catch (error: any) {
      console.error(`[PersonasService] Failed to generate backstory for persona ${id}:`, error);
      throw error;
    }
  }
}
