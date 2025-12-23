import * as vscode from 'vscode';

/**
 * Extended Persona interface with full metadata
 * Validates: Requirements 1.2, 2.1, 3.1
 */
export interface Persona {
  id: string;
  name: string;
  attributes: Record<string, string>;
  backstory?: string;
  additionalContext?: string;
  generationPrompt?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  apiUsed?: string;
  modelUsed?: string;
  versionNumber: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Legacy persona format for migration
 */
export interface LegacyPersona {
  id?: string;
  name: string;
  backstory?: string;
  attributes?: Record<string, string>;
  additionalContext?: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Maximum number of favorites allowed
 * Validates: Requirements 4.1, 4.2
 */
export const MAX_FAVORITES = 5;

/**
 * Error class for favorites limit exceeded
 */
export class FavoritesLimitError extends Error {
  constructor() {
    super(`Cannot add more than ${MAX_FAVORITES} favorites`);
    this.name = 'FavoritesLimitError';
  }
}

/**
 * Error class for persona database errors
 */
export class PersonaDatabaseError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'PersonaDatabaseError';
  }
}

/**
 * PersonaStorage uses VS Code's globalState for reliable storage
 * without requiring native modules like SQLite
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3
 */
export class PersonaStorage {
  private static STORAGE_KEY = 'personaut.customerProfiles';
  private static FAVORITES_KEY = 'personaut.favoritePersonas';
  private static MIGRATION_KEY = 'personaut.personasMigrated';

  constructor(private context: vscode.ExtensionContext) { }

  /**
   * Initialize storage with migration check
   * Validates: Requirements 16.1, 16.5
   */
  public async initialize(): Promise<void> {
    await this.runMigrationIfNeeded();
  }

  /**
   * Get all personas
   */
  public getAllPersonas(): Persona[] {
    const personas = this.context.globalState.get<Persona[]>(PersonaStorage.STORAGE_KEY, []);
    // Ensure version number exists for all personas (backwards compatibility)
    const normalizedPersonas = personas.map(p => ({
      ...p,
      versionNumber: p.versionNumber ?? 1,
    }));
    return normalizedPersonas.sort((a, b) => b.updatedAt - a.updatedAt);
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
   * Get persona count
   */
  public getPersonaCount(): number {
    return this.getAllPersonas().length;
  }

  /**
   * Create a new persona
   * Validates: Requirements 1.2, 2.5
   */
  public async createPersona(
    name: string,
    attributes: Record<string, string>,
    options?: {
      additionalContext?: string;
      generationPrompt?: string;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      apiUsed?: string;
      modelUsed?: string;
    }
  ): Promise<Persona> {
    const personas = this.getAllPersonas();

    const newPersona: Persona = {
      id: crypto.randomUUID(),
      name,
      attributes,
      additionalContext: options?.additionalContext,
      generationPrompt: options?.generationPrompt,
      inputTokens: options?.inputTokens ?? 0,
      outputTokens: options?.outputTokens ?? 0,
      totalTokens: options?.totalTokens ?? 0,
      apiUsed: options?.apiUsed,
      modelUsed: options?.modelUsed,
      versionNumber: 1,
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
   * Regenerate a persona with version increment
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4
   */
  public async regeneratePersona(
    id: string,
    updates: {
      name?: string;
      attributes?: Record<string, string>;
      additionalContext?: string;
      backstory?: string;
      generationPrompt?: string;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      apiUsed?: string;
      modelUsed?: string;
    }
  ): Promise<Persona | undefined> {
    const personas = this.getAllPersonas();
    const index = personas.findIndex((p) => p.id === id);

    if (index === -1) {
      return undefined;
    }

    // Preserve original persona_id and created_at, increment version
    personas[index] = {
      ...personas[index],
      ...updates,
      versionNumber: (personas[index].versionNumber ?? 1) + 1,
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

    // Also remove from favorites if present
    await this.removeFavorite(id);
    await this.context.globalState.update(PersonaStorage.STORAGE_KEY, filtered);
    return true;
  }

  // ==================== FAVORITES MANAGEMENT ====================
  // Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5

  /**
   * Get all favorite persona IDs
   */
  public getFavoriteIds(): string[] {
    return this.context.globalState.get<string[]>(PersonaStorage.FAVORITES_KEY, []);
  }

  /**
   * Get all favorite personas with full data
   */
  public getFavorites(): Persona[] {
    const favoriteIds = this.getFavoriteIds();
    const allPersonas = this.getAllPersonas();
    return allPersonas.filter(p => favoriteIds.includes(p.id));
  }

  /**
   * Get favorites count
   */
  public getFavoritesCount(): number {
    return this.getFavoriteIds().length;
  }

  /**
   * Check if a persona is a favorite
   */
  public isFavorite(id: string): boolean {
    const favorites = this.getFavoriteIds();
    return favorites.includes(id);
  }

  /**
   * Add a persona to favorites
   * Validates: Requirements 4.1, 4.2
   * @throws FavoritesLimitError if limit exceeded
   */
  public async addFavorite(id: string): Promise<void> {
    const favorites = this.getFavoriteIds();

    // Check if already a favorite
    if (favorites.includes(id)) {
      return;
    }

    // Check limit
    if (favorites.length >= MAX_FAVORITES) {
      throw new FavoritesLimitError();
    }

    // Verify persona exists
    const persona = this.getPersonaById(id);
    if (!persona) {
      throw new PersonaDatabaseError(`Persona with id ${id} not found`);
    }

    favorites.push(id);
    await this.context.globalState.update(PersonaStorage.FAVORITES_KEY, favorites);
  }

  /**
   * Remove a persona from favorites
   * Validates: Requirements 4.3
   */
  public async removeFavorite(id: string): Promise<void> {
    const favorites = this.getFavoriteIds();
    const filtered = favorites.filter(fid => fid !== id);
    await this.context.globalState.update(PersonaStorage.FAVORITES_KEY, filtered);
  }

  /**
   * Toggle favorite status
   */
  public async toggleFavorite(id: string): Promise<boolean> {
    if (this.isFavorite(id)) {
      await this.removeFavorite(id);
      return false;
    } else {
      await this.addFavorite(id);
      return true;
    }
  }

  // ==================== MIGRATION ====================
  // Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5

  /**
   * Check if migration has been completed
   */
  public isMigrated(): boolean {
    return this.context.globalState.get<boolean>(PersonaStorage.MIGRATION_KEY, false);
  }

  /**
   * Run migration if needed
   */
  private async runMigrationIfNeeded(): Promise<void> {
    if (this.isMigrated()) {
      return;
    }

    // Get current personas and normalize them
    const personas = this.context.globalState.get<Persona[]>(PersonaStorage.STORAGE_KEY, []);

    if (personas.length === 0) {
      // No personas to migrate, mark as done
      await this.context.globalState.update(PersonaStorage.MIGRATION_KEY, true);
      return;
    }

    // Normalize existing personas to have all required fields
    const normalizedPersonas = personas.map(p => ({
      ...p,
      versionNumber: p.versionNumber ?? 1,
      inputTokens: p.inputTokens ?? 0,
      outputTokens: p.outputTokens ?? 0,
      totalTokens: p.totalTokens ?? 0,
    }));

    await this.context.globalState.update(PersonaStorage.STORAGE_KEY, normalizedPersonas);
    await this.context.globalState.update(PersonaStorage.MIGRATION_KEY, true);

    console.log(`[PersonaStorage] Migration completed for ${normalizedPersonas.length} personas`);
  }

  /**
   * Migrate personas from legacy format
   * Validates: Requirements 16.2, 16.3, 16.4
   */
  public async migrateFromLegacy(legacyPersonas: LegacyPersona[]): Promise<{
    succeeded: number;
    failed: number;
    errors: Array<{ persona: LegacyPersona; error: string }>;
  }> {
    const results = {
      succeeded: 0,
      failed: 0,
      errors: [] as Array<{ persona: LegacyPersona; error: string }>,
    };

    for (const legacy of legacyPersonas) {
      try {
        await this.createPersona(
          legacy.name,
          legacy.attributes ?? {},
          {
            additionalContext: legacy.additionalContext,
          }
        );

        // Update with backstory if present
        if (legacy.backstory && legacy.id) {
          const newPersona = this.getPersonaById(legacy.id);
          if (newPersona) {
            await this.updatePersona(legacy.id, { backstory: legacy.backstory });
          }
        }

        results.succeeded++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          persona: legacy,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  // ==================== PROMPT GENERATION ====================

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

  // ==================== CLIPBOARD SUPPORT ====================
  // Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5

  /**
   * Get copyable text for a persona field
   */
  public getCopyableText(persona: Persona, field: 'prompt' | 'backstory'): string | null {
    switch (field) {
      case 'prompt':
        return persona.generationPrompt ?? this.generatePrompt(persona);
      case 'backstory':
        return persona.backstory ?? null;
      default:
        return null;
    }
  }
}
