/**
 * UserBase Feature Types
 *
 * Type definitions for the UserBase feature.
 *
 * **Validates: Requirements 13.2**
 */

/**
 * User persona interface
 */
export interface Persona {
    id: string;
    name: string;
    age?: number;
    occupation?: string;
    location?: string;
    background?: string;
    goals?: string[];
    frustrations?: string[];
    behaviors?: string[];
    quotes?: string[];
    avatar?: string;
    createdAt: number;
    updatedAt: number;
}

/**
 * Persona category for grouping
 */
export interface PersonaCategory {
    id: string;
    name: string;
    description?: string;
    personaIds: string[];
}

/**
 * UserBase state interface
 */
export interface UserBaseState {
    /** All personas */
    personas: Persona[];
    /** Categories for organizing personas */
    categories: PersonaCategory[];
    /** Currently selected persona ID */
    selectedPersonaId: string | null;
    /** Search query */
    searchQuery: string;
    /** Current view mode */
    viewMode: 'grid' | 'list';
    /** Loading state */
    isLoading: boolean;
}

/**
 * Initial userbase state
 */
export const INITIAL_USERBASE_STATE: UserBaseState = {
    personas: [],
    categories: [],
    selectedPersonaId: null,
    searchQuery: '',
    viewMode: 'grid',
    isLoading: false,
};

/**
 * Persona field metadata for forms
 */
export interface PersonaField {
    key: keyof Persona;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'array';
    placeholder?: string;
    required?: boolean;
}

/**
 * Fields for persona form
 */
export const PERSONA_FIELDS: PersonaField[] = [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'age', label: 'Age', type: 'number' },
    { key: 'occupation', label: 'Occupation', type: 'text' },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'background', label: 'Background', type: 'textarea' },
    { key: 'goals', label: 'Goals', type: 'array', placeholder: 'Add a goal...' },
    { key: 'frustrations', label: 'Frustrations', type: 'array', placeholder: 'Add a frustration...' },
    { key: 'behaviors', label: 'Behaviors', type: 'array', placeholder: 'Add a behavior...' },
    { key: 'quotes', label: 'Quotes', type: 'array', placeholder: 'Add a quote...' },
];
