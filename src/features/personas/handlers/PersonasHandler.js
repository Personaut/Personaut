"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonasHandler = void 0;
const services_1 = require("../../../shared/services");
/**
 * Handler for persona-related messages
 */
class PersonasHandler {
    constructor(personasService, inputValidator) {
        this.personasService = personasService;
        this.inputValidator = inputValidator;
        this.errorSanitizer = new services_1.ErrorSanitizer();
    }
    /**
     * Handle persona-related messages
     */
    async handle(message, webview) {
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
        }
        catch (error) {
            const sanitizedError = this.errorSanitizer.sanitize(error);
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
    async getPersonas(webview) {
        const personas = await this.personasService.getPersonas();
        webview.postMessage({
            type: 'personas-list',
            personas,
        });
    }
    /**
     * Get a persona by ID
     */
    async getPersona(id, webview) {
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
    async searchPersonas(query, webview) {
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
    async createPersona(data, webview) {
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
     * Update an existing persona
     */
    async updatePersona(id, updates, webview) {
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
    async deletePersona(id, webview) {
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
    async generatePrompt(id, webview) {
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
    async generateBackstory(id, webview) {
        const validation = this.inputValidator.validateInput(id);
        if (!validation.valid) {
            throw new Error(validation.reason || 'Invalid persona ID');
        }
        const backstory = await this.personasService.generateBackstory(id);
        webview.postMessage({
            type: 'persona-backstory-generated',
            id,
            backstory,
        });
    }
}
exports.PersonasHandler = PersonasHandler;
//# sourceMappingURL=PersonasHandler.js.map