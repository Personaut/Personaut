import * as vscode from 'vscode';
import { PersonasService } from '../services/PersonasService';
import { InputValidator } from '../../../shared/services';
import { ErrorSanitizer } from '../../../shared/services';
import { WebviewMessage, IFeatureHandler } from '../../../shared/types/CommonTypes';

/**
 * Handler for persona-related messages
 */
export class PersonasHandler implements IFeatureHandler {
  private readonly errorSanitizer: ErrorSanitizer;

  constructor(
    private readonly personasService: PersonasService,
    private readonly inputValidator: InputValidator
  ) {
    this.errorSanitizer = new ErrorSanitizer();
  }

  /**
   * Handle persona-related messages
   */
  public async handle(message: WebviewMessage, webview: vscode.Webview): Promise<void> {
    try {
      switch (message.type) {
        case 'get-personas':
          await this.getPersonas(webview);
          break;
        case 'get-persona':
          await this.getPersona(message.id, webview);
          break;
        case 'search-personas':
          await this.searchPersonas(message.query, webview);
          break;
        case 'create-persona':
          await this.createPersona(message.data, webview);
          break;
        case 'update-persona':
          await this.updatePersona(message.id, message.updates, webview);
          break;
        case 'save-persona':
          await this.savePersona(message, webview);
          break;
        case 'delete-persona':
          await this.deletePersona(message.id, webview);
          break;
        case 'generate-persona-prompt':
          await this.generatePrompt(message.id, webview);
          break;
        case 'generate-persona-backstory':
          await this.generateBackstory(message.id, webview);
          break;
        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      const sanitizedError = this.errorSanitizer.sanitize(error as Error);
      console.error('[PersonasHandler] Error:', error);
      webview.postMessage({
        type: 'error',
        message: sanitizedError.userMessage,
      });
    }
  }

  /**
   * Get all personas
   */
  private async getPersonas(webview: vscode.Webview): Promise<void> {
    const personas = await this.personasService.getPersonas();
    webview.postMessage({
      type: 'personas-list',
      personas,
    });
  }

  /**
   * Get a persona by ID
   */
  private async getPersona(id: string, webview: vscode.Webview): Promise<void> {
    const validation = this.inputValidator.validateInput(id);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid persona ID');
    }

    const persona = await this.personasService.getPersonaById(id);
    if (!persona) {
      throw new Error(`Persona with id ${id} not found`);
    }

    webview.postMessage({
      type: 'persona-details',
      persona,
    });
  }

  /**
   * Search personas by name
   */
  private async searchPersonas(query: string, webview: vscode.Webview): Promise<void> {
    const validation = this.inputValidator.validateInput(query);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid search query');
    }

    const personas = await this.personasService.searchPersonas({ query });
    webview.postMessage({
      type: 'personas-search-results',
      personas,
    });
  }

  /**
   * Create a new persona
   */
  private async createPersona(
    data: { name: string; attributes: Record<string, string> },
    webview: vscode.Webview
  ): Promise<void> {
    const nameValidation = this.inputValidator.validateInput(data.name);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.reason || 'Invalid persona name');
    }

    if (!data.attributes || typeof data.attributes !== 'object') {
      throw new Error('Invalid persona attributes');
    }

    const persona = await this.personasService.createPersona({
      name: data.name,
      attributes: data.attributes,
    });

    webview.postMessage({
      type: 'persona-created',
      persona,
    });
  }

  /**
   * Save a persona (create or update)
   */
  private async savePersona(
    message: WebviewMessage,
    webview: vscode.Webview
  ): Promise<void> {
    const name = message.name as string;
    const attributes = message.attributes as Record<string, string>;
    const id = message.id as string | undefined;

    const nameValidation = this.inputValidator.validateInput(name);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.reason || 'Invalid persona name');
    }

    if (!attributes || typeof attributes !== 'object') {
      throw new Error('Invalid persona attributes');
    }

    let persona;
    if (id) {
      // Update existing persona
      persona = await this.personasService.updatePersona({
        id,
        updates: { name, attributes },
      });
      if (!persona) {
        throw new Error(`Persona with id ${id} not found`);
      }
    } else {
      // Create new persona
      persona = await this.personasService.createPersona({
        name,
        attributes,
      });
    }

    webview.postMessage({
      type: 'persona-saved',
      persona,
    });
  }

  /**
   * Update an existing persona
   */
  private async updatePersona(id: string, updates: any, webview: vscode.Webview): Promise<void> {
    const validation = this.inputValidator.validateInput(id);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid persona ID');
    }

    if (!updates || typeof updates !== 'object') {
      throw new Error('Invalid persona updates');
    }

    const persona = await this.personasService.updatePersona({ id, updates });
    if (!persona) {
      throw new Error(`Persona with id ${id} not found`);
    }

    webview.postMessage({
      type: 'persona-updated',
      persona,
    });
  }

  /**
   * Delete a persona
   */
  private async deletePersona(id: string, webview: vscode.Webview): Promise<void> {
    const validation = this.inputValidator.validateInput(id);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid persona ID');
    }

    const deleted = await this.personasService.deletePersona({ id });
    if (!deleted) {
      throw new Error(`Persona with id ${id} not found`);
    }

    webview.postMessage({
      type: 'persona-deleted',
      id,
    });
  }

  /**
   * Generate a prompt for a persona
   */
  private async generatePrompt(id: string, webview: vscode.Webview): Promise<void> {
    const validation = this.inputValidator.validateInput(id);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid persona ID');
    }

    const prompt = await this.personasService.generatePrompt(id);
    webview.postMessage({
      type: 'persona-prompt-generated',
      id,
      prompt,
    });
  }

  /**
   * Generate a backstory for a persona
   */
  private async generateBackstory(id: string, webview: vscode.Webview): Promise<void> {
    const validation = this.inputValidator.validateInput(id);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid persona ID');
    }

    const backstory = await this.personasService.generateBackstory(id);
    // Get updated persona
    const persona = await this.personasService.getPersonaById(id);

    webview.postMessage({
      type: 'backstory-generated',
      id,
      backstory,
      persona,
    });
  }
}
