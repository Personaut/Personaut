/**
 * Type definitions for the Personas feature
 */

export interface Persona {
  id: string;
  name: string;
  attributes: Record<string, string>;
  backstory?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreatePersonaRequest {
  name: string;
  attributes: Record<string, string>;
}

export interface UpdatePersonaRequest {
  id: string;
  updates: Partial<Omit<Persona, 'id' | 'createdAt'>>;
}

export interface DeletePersonaRequest {
  id: string;
}

export interface GeneratePromptRequest {
  id: string;
}

export interface SearchPersonasRequest {
  query: string;
}
