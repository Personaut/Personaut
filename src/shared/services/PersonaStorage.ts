import * as vscode from 'vscode';

export interface Persona {
  id: string;
  name: string;
  attributes: Record<string, string>;
  backstory?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * PersonaStorage uses VS Code's globalState for reliable storage
 * without requiring native modules like SQLite
 */
export class PersonaStorage {
  private static STORAGE_KEY = 'personaut.customerProfiles';

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Get all personas
   */
  public getAllPersonas(): Persona[] {
    const personas = this.context.globalState.get<Persona[]>(PersonaStorage.STORAGE_KEY, []);
    return personas.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Search personas by name
   */
  public searchPersonas(query: string): Persona[] {
    const personas = this.getAllPersonas();
    const lowerQuery = query.toLowerCase();
    return personas.filter((p) => p.name.toLowerCase().includes(lowerQuery));
  }

  /**
   * Get a persona by ID
   */
  public getPersonaById(id: string): Persona | undefined {
    const personas = this.getAllPersonas();
    return personas.find((p) => p.id === id);
  }

  /**
   * Create a new persona
   */
  public async createPersona(name: string, attributes: Record<string, string>): Promise<Persona> {
    const personas = this.getAllPersonas();

    const newPersona: Persona = {
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
  public async updatePersona(
    id: string,
    updates: Partial<Omit<Persona, 'id' | 'createdAt'>>
  ): Promise<Persona | undefined> {
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
  public async deletePersona(id: string): Promise<boolean> {
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
  public generatePrompt(persona: Persona): string {
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
