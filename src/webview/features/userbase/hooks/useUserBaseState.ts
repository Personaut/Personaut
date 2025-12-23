import { useState, useCallback, useEffect } from 'react';
import { useVSCode } from '../../../shared/hooks/useVSCode';
import { Persona, PersonaCategory, INITIAL_USERBASE_STATE } from '../types';

/**
 * Return type for useUserBaseState hook
 */
export interface UseUserBaseStateReturn {
    // State
    personas: Persona[];
    categories: PersonaCategory[];
    selectedPersonaId: string | null;
    selectedPersona: Persona | null;
    searchQuery: string;
    viewMode: 'grid' | 'list';
    isLoading: boolean;
    filteredPersonas: Persona[];

    // Setters
    setSelectedPersonaId: (id: string | null) => void;
    setSearchQuery: (query: string) => void;
    setViewMode: (mode: 'grid' | 'list') => void;

    // Actions
    createPersona: (persona: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updatePersona: (id: string, updates: Partial<Persona>) => void;
    deletePersona: (id: string) => void;
    duplicatePersona: (id: string) => void;
    refreshPersonas: () => void;
}

/**
 * Hook for managing userbase state and actions.
 *
 * @example
 * ```tsx
 * function UserBaseView() {
 *   const {
 *     filteredPersonas,
 *     selectedPersona,
 *     setSelectedPersonaId,
 *     createPersona,
 *   } = useUserBaseState();
 *
 *   return (
 *     <div>
 *       <PersonaGrid
 *         personas={filteredPersonas}
 *         onSelect={setSelectedPersonaId}
 *       />
 *       {selectedPersona && <PersonaDetail persona={selectedPersona} />}
 *     </div>
 *   );
 * }
 * ```
 *
 * **Validates: Requirements 13.2, 4.3**
 */
export function useUserBaseState(): UseUserBaseStateReturn {
    const { postMessage, onMessage, getState, setState } = useVSCode();
    const savedState = getState();

    // State
    const [personas, setPersonas] = useState<Persona[]>(
        (savedState as any)?.personas || INITIAL_USERBASE_STATE.personas
    );
    const [categories, setCategories] = useState<PersonaCategory[]>(
        (savedState as any)?.categories || INITIAL_USERBASE_STATE.categories
    );
    const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
        (savedState as any)?.selectedPersonaId || null
    );
    const [searchQuery, setSearchQuery] = useState(
        (savedState as any)?.searchQuery || ''
    );
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(
        (savedState as any)?.viewMode || 'grid'
    );
    const [isLoading, setIsLoading] = useState(false);

    // Computed: selected persona
    const selectedPersona = personas.find((p) => p.id === selectedPersonaId) || null;

    // Computed: filtered personas
    const filteredPersonas = personas.filter((persona) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            persona.name.toLowerCase().includes(query) ||
            persona.occupation?.toLowerCase().includes(query) ||
            persona.location?.toLowerCase().includes(query) ||
            persona.background?.toLowerCase().includes(query)
        );
    });

    // Persist state changes
    useEffect(() => {
        const currentState = getState() || {};
        setState({
            ...currentState,
            personas,
            categories,
            selectedPersonaId,
            searchQuery,
            viewMode,
        });
    }, [personas, categories, selectedPersonaId, searchQuery, viewMode]);

    // Handle messages from extension
    useEffect(() => {
        const unsubscribe = onMessage((message: any) => {
            switch (message.type) {
                case 'personas-loaded':
                    setPersonas(message.personas || []);
                    setCategories(message.categories || []);
                    setIsLoading(false);
                    break;
                case 'persona-created':
                    setPersonas((prev) => [...prev, message.persona]);
                    break;
                case 'persona-updated':
                    setPersonas((prev) =>
                        prev.map((p) => (p.id === message.persona.id ? message.persona : p))
                    );
                    break;
                case 'persona-deleted':
                    setPersonas((prev) => prev.filter((p) => p.id !== message.personaId));
                    if (selectedPersonaId === message.personaId) {
                        setSelectedPersonaId(null);
                    }
                    break;
            }
        });

        return unsubscribe;
    }, [onMessage, selectedPersonaId]);

    // Load personas on mount
    useEffect(() => {
        refreshPersonas();
    }, []);

    // Actions
    const createPersona = useCallback(
        (personaData: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>) => {
            const now = Date.now();
            const newPersona: Persona = {
                ...personaData,
                id: crypto.randomUUID(),
                createdAt: now,
                updatedAt: now,
            };
            setPersonas((prev) => [...prev, newPersona]);
            postMessage({ type: 'create-persona', persona: newPersona });
        },
        [postMessage]
    );

    const updatePersona = useCallback(
        (id: string, updates: Partial<Persona>) => {
            setPersonas((prev) =>
                prev.map((p) =>
                    p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
                )
            );
            postMessage({ type: 'update-persona', personaId: id, updates });
        },
        [postMessage]
    );

    const deletePersona = useCallback(
        (id: string) => {
            setPersonas((prev) => prev.filter((p) => p.id !== id));
            if (selectedPersonaId === id) {
                setSelectedPersonaId(null);
            }
            postMessage({ type: 'delete-persona', personaId: id });
        },
        [postMessage, selectedPersonaId]
    );

    const duplicatePersona = useCallback(
        (id: string) => {
            const original = personas.find((p) => p.id === id);
            if (original) {
                const { id: _id, createdAt: _ca, updatedAt: _ua, ...data } = original;
                createPersona({ ...data, name: `${original.name} (Copy)` });
            }
        },
        [personas, createPersona]
    );

    const refreshPersonas = useCallback(() => {
        setIsLoading(true);
        postMessage({ type: 'get-personas' });
    }, [postMessage]);

    return {
        // State
        personas,
        categories,
        selectedPersonaId,
        selectedPersona,
        searchQuery,
        viewMode,
        isLoading,
        filteredPersonas,

        // Setters
        setSelectedPersonaId,
        setSearchQuery,
        setViewMode,

        // Actions
        createPersona,
        updatePersona,
        deletePersona,
        duplicatePersona,
        refreshPersonas,
    };
}

export default useUserBaseState;
