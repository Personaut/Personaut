/**
 * Persona file types for file-based storage
 * 
 * Defines the structure of persona data stored on disk.
 */

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
 * Lightweight metadata for persona listing (index)
 */
export interface PersonaMeta {
    id: string;
    name: string;
    versionNumber: number;
    createdAt: number;
    updatedAt: number;
    isFavorite: boolean;
}

/**
 * Index file structure - kept small for fast loading
 */
export interface PersonaIndex {
    version: number;
    lastUpdated: number;
    personas: PersonaMeta[];
    favoriteIds: string[];
}

/**
 * Full persona file structure with all data
 */
export interface PersonaFile {
    version: number;
    metadata: PersonaMeta;
    persona: Persona;
}

/**
 * Current schema versions
 */
export const PERSONA_INDEX_VERSION = 1;
export const PERSONA_FILE_VERSION = 1;

/**
 * Maximum number of favorites allowed
 */
export const MAX_FAVORITES = 5;

/**
 * Create a new empty persona index
 */
export function createEmptyPersonaIndex(): PersonaIndex {
    return {
        version: PERSONA_INDEX_VERSION,
        lastUpdated: Date.now(),
        personas: [],
        favoriteIds: [],
    };
}

/**
 * Create metadata from a persona
 */
export function createPersonaMeta(persona: Persona, isFavorite: boolean = false): PersonaMeta {
    return {
        id: persona.id,
        name: persona.name,
        versionNumber: persona.versionNumber,
        createdAt: persona.createdAt,
        updatedAt: persona.updatedAt,
        isFavorite,
    };
}

/**
 * Create a persona file from a persona
 */
export function createPersonaFile(persona: Persona, isFavorite: boolean = false): PersonaFile {
    return {
        version: PERSONA_FILE_VERSION,
        metadata: createPersonaMeta(persona, isFavorite),
        persona,
    };
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
    versionNumber?: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
}
