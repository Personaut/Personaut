import { PersonaStorage, Persona } from '../../../shared/services';
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
    private readonly personaStorage: PersonaStorage,
    private readonly agentManager: AgentManager
  ) {}

  /**
   * Get all personas
   */
  public async getPersonas(): Promise<Persona[]> {
    return this.personaStorage.getAllPersonas();
  }

  /**
   * Get a persona by ID
   */
  public async getPersonaById(id: string): Promise<Persona | undefined> {
    return this.personaStorage.getPersonaById(id);
  }

  /**
   * Search personas by name
   */
  public async searchPersonas(request: SearchPersonasRequest): Promise<Persona[]> {
    return this.personaStorage.searchPersonas(request.query);
  }

  /**
   * Create a new persona
   */
  public async createPersona(request: CreatePersonaRequest): Promise<Persona> {
    return this.personaStorage.createPersona(request.name, request.attributes);
  }

  /**
   * Update an existing persona
   */
  public async updatePersona(request: UpdatePersonaRequest): Promise<Persona | undefined> {
    return this.personaStorage.updatePersona(request.id, request.updates);
  }

  /**
   * Delete a persona
   */
  public async deletePersona(request: DeletePersonaRequest): Promise<boolean> {
    return this.personaStorage.deletePersona(request.id);
  }

  /**
   * Generate a backstory prompt for a persona
   */
  public async generatePrompt(id: string): Promise<string> {
    const persona = await this.getPersonaById(id);
    if (!persona) {
      throw new Error(`Persona with id ${id} not found`);
    }
    return this.personaStorage.generatePrompt(persona);
  }

  /**
   * Generate a backstory for a persona using AI
   * Creates a chat-mode agent with persona system prompt, streams content generation,
   * and disposes the agent after completion
   * 
   * @param id - Persona ID
   * @param onProgress - Optional callback for streaming progress updates
   * @returns Generated backstory as a string
   * 
   * Validates: Personas Integration
   */
  public async generateBackstory(
    id: string,
    onProgress?: (chunk: string) => void
  ): Promise<string> {
    const persona = await this.getPersonaById(id);
    if (!persona) {
      throw new Error(`Persona with id ${id} not found`);
    }

    // Create a unique conversation ID for this persona backstory generation
    const conversationId = `persona-backstory-${id}-${Date.now()}`;

    console.log('[PersonasService] Generating backstory:', {
      personaId: id,
      personaName: persona.name,
      conversationId,
      timestamp: Date.now(),
    });

    let agent;
    let generatedBackstory = '';

    try {
      // Create chat-mode agent with persona system prompt
      agent = await this.agentManager.getOrCreateAgent(conversationId, 'chat');

      // Build the user prompt from persona attributes
      const prompt = this.personaStorage.generatePrompt(persona);

      // Send message to agent with backstory generation system prompt
      // The agent will handle the conversation and call onDidUpdateMessages callback
      // which will save the conversation via ConversationManager
      await agent.chat(
        prompt,
        [], // No context files for persona backstory generation
        {}, // Default settings
        BACKSTORY_GENERATION_PROMPT, // System instruction for backstory generation
        false // Not a persona chat (this is generating a persona)
      );

      // Retrieve the generated content from the saved conversation
      const conversation = await this.agentManager['config'].conversationManager.getConversation(
        conversationId
      );

      if (conversation && conversation.messages.length > 0) {
        // Get the last model response
        const modelMessages = conversation.messages.filter((msg: any) => msg.role === 'model');
        if (modelMessages.length > 0) {
          const lastModelMessage = modelMessages[modelMessages.length - 1];
          generatedBackstory = lastModelMessage.text || '';
        }
      }

      // If we have a progress callback and content, call it with the full content
      if (onProgress && generatedBackstory) {
        onProgress(generatedBackstory);
      }

      // Update persona with generated backstory
      await this.updatePersona({
        id,
        updates: { backstory: generatedBackstory },
      });

      console.log('[PersonasService] Backstory generated successfully:', {
        personaId: id,
        personaName: persona.name,
        conversationId,
        backstoryLength: generatedBackstory.length,
      });

      return generatedBackstory;
    } catch (error: any) {
      console.error('[PersonasService] Failed to generate backstory:', {
        personaId: id,
        personaName: persona.name,
        conversationId,
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to generate backstory for persona "${persona.name}": ${error.message}`);
    } finally {
      // Always dispose the agent after backstory generation completes
      if (agent) {
        try {
          await this.agentManager.disposeAgent(conversationId);
          console.log('[PersonasService] Persona backstory agent disposed:', {
            personaId: id,
            personaName: persona.name,
            conversationId,
          });
        } catch (disposeError: any) {
          console.error('[PersonasService] Error disposing persona backstory agent:', {
            conversationId,
            error: disposeError.message,
          });
        }
      }
    }
  }
}
