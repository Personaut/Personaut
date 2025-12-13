"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonaStorage = void 0;
/**
 * PersonaStorage uses VS Code's globalState for reliable storage
 * without requiring native modules like SQLite
 */
class PersonaStorage {
    constructor(context) {
        this.context = context;
    }
    /**
     * Get all personas
     */
    getAllPersonas() {
        const personas = this.context.globalState.get(PersonaStorage.STORAGE_KEY, []);
        return personas.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    /**
     * Search personas by name
     */
    searchPersonas(query) {
        const personas = this.getAllPersonas();
        const lowerQuery = query.toLowerCase();
        return personas.filter((p) => p.name.toLowerCase().includes(lowerQuery));
    }
    /**
     * Get a persona by ID
     */
    getPersonaById(id) {
        const personas = this.getAllPersonas();
        return personas.find((p) => p.id === id);
    }
    /**
     * Create a new persona
     */
    async createPersona(name, attributes) {
        const personas = this.getAllPersonas();
        const newPersona = {
            id: crypto.randomUUID(),
            name,
            attributes,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        personas.push(newPersona);
        await this.context.globalState.update(PersonaStorage.STORAGE_KEY, personas);
        return newPersona;
    }
    /**
     * Update an existing persona
     */
    async updatePersona(id, updates) {
        const personas = this.getAllPersonas();
        const index = personas.findIndex((p) => p.id === id);
        if (index === -1) {
            return undefined;
        }
        personas[index] = {
            ...personas[index],
            ...updates,
            updatedAt: Date.now(),
        };
        await this.context.globalState.update(PersonaStorage.STORAGE_KEY, personas);
        return personas[index];
    }
    /**
     * Delete a persona
     */
    async deletePersona(id) {
        const personas = this.getAllPersonas();
        const filtered = personas.filter((p) => p.id !== id);
        if (filtered.length === personas.length) {
            return false;
        }
        await this.context.globalState.update(PersonaStorage.STORAGE_KEY, filtered);
        return true;
    }
    /**
     * Generate a natural language prompt from persona attributes
     */
    generatePrompt(persona) {
        const attrs = persona.attributes;
        if (Object.keys(attrs).length === 0) {
            return `Create a backstory for an individual named "${persona.name}".`;
        }
        const attributeDescriptions = Object.entries(attrs)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        return `Create a backstory for an individual that is described with the following characteristics, traits, or demographics: ${attributeDescriptions}`;
    }
}
exports.PersonaStorage = PersonaStorage;
PersonaStorage.STORAGE_KEY = 'personaut.customerProfiles';
//# sourceMappingURL=PersonaStorage.js.map