"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonasService = void 0;
const PersonaPrompts_1 = require("../../../core/prompts/PersonaPrompts");
/**
 * Service for managing personas
 */
class PersonasService {
    constructor(personaStorage, aiProvider) {
        this.personaStorage = personaStorage;
        this.aiProvider = aiProvider;
    }
    /**
     * Get all personas
     */
    async getPersonas() {
        return this.personaStorage.getAllPersonas();
    }
    /**
     * Get a persona by ID
     */
    async getPersonaById(id) {
        return this.personaStorage.getPersonaById(id);
    }
    /**
     * Search personas by name
     */
    async searchPersonas(request) {
        return this.personaStorage.searchPersonas(request.query);
    }
    /**
     * Create a new persona
     */
    async createPersona(request) {
        return this.personaStorage.createPersona(request.name, request.attributes);
    }
    /**
     * Update an existing persona
     */
    async updatePersona(request) {
        return this.personaStorage.updatePersona(request.id, request.updates);
    }
    /**
     * Delete a persona
     */
    async deletePersona(request) {
        return this.personaStorage.deletePersona(request.id);
    }
    /**
     * Generate a backstory prompt for a persona
     */
    async generatePrompt(id) {
        const persona = await this.getPersonaById(id);
        if (!persona) {
            throw new Error(`Persona with id ${id} not found`);
        }
        return this.personaStorage.generatePrompt(persona);
    }
    /**
     * Generate a backstory for a persona using AI
     */
    async generateBackstory(id) {
        const persona = await this.getPersonaById(id);
        if (!persona) {
            throw new Error(`Persona with id ${id} not found`);
        }
        const prompt = this.personaStorage.generatePrompt(persona);
        const response = await this.aiProvider.chat([{ role: 'user', text: prompt }], PersonaPrompts_1.BACKSTORY_GENERATION_PROMPT);
        // Update persona with generated backstory
        await this.updatePersona({
            id,
            updates: { backstory: response.text },
        });
        return response.text;
    }
}
exports.PersonasService = PersonasService;
//# sourceMappingURL=PersonasService.js.map