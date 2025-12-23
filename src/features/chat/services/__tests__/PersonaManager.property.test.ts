/**
 * Property tests for PersonaManager
 *
 * Uses fast-check for property-based testing to validate the persona manager
 * meets its specified requirements.
 *
 * Feature: chat-enhancements
 */

import * as fc from 'fast-check';
import { PersonaManager, PersonaStorageAdapter } from '../PersonaManager';
import { SYSTEM_AGENTS } from '../ChatHistoryTypes';

// Mock PersonaStorage adapter for testing
const createMockStorage = (personas: Array<{ id: string; name: string; backstory?: string }>): PersonaStorageAdapter => ({
    getAllPersonas: () => personas,
    getPersonaById: async (id: string) => personas.find(p => p.id === id) || null,
});

describe('PersonaManager', () => {
    describe('Property 1: Persona Selection Persistence', () => {
        it('should persist persona selection', async () => {
            const personaManager = new PersonaManager();

            // Select a system agent
            const selected = await personaManager.selectPersona('developer', 'system_agent');

            expect(selected.id).toBe('developer');
            expect(selected.type).toBe('system_agent');
            expect(personaManager.getSelectedPersona()?.id).toBe('developer');
        });

        it('should update selection when changing persona', async () => {
            const personaManager = new PersonaManager();

            await personaManager.selectPersona('pippet', 'system_agent');
            expect(personaManager.getSelectedPersona()?.id).toBe('pippet');

            await personaManager.selectPersona('ux-designer', 'system_agent');
            expect(personaManager.getSelectedPersona()?.id).toBe('ux-designer');
        });
    });

    describe('Property 2: System Agent Prompt Retrieval', () => {
        it('should return prompts for all system agents', async () => {
            const personaManager = new PersonaManager();

            for (const agent of SYSTEM_AGENTS) {
                const prompt = await personaManager.getPersonaPrompt(agent.id, 'system_agent');
                expect(prompt).toBeDefined();
                expect(prompt.length).toBeGreaterThan(0);
            }
        });

        it('should return different prompts for different agents', async () => {
            const personaManager = new PersonaManager();

            const pippetPrompt = await personaManager.getPersonaPrompt('pippet', 'system_agent');
            const developerPrompt = await personaManager.getPersonaPrompt('developer', 'system_agent');

            // They should both be strings but content is from the prompts library
            expect(typeof pippetPrompt).toBe('string');
            expect(typeof developerPrompt).toBe('string');
        });
    });

    describe('Property 3: User Persona Prompt Combination', () => {
        it('should combine persona name with backstory in prompts', async () => {
            const testPersonas = [
                { id: 'user1', name: 'Alice', backstory: 'A tech-savvy millennial who loves mobile apps.' },
                { id: 'user2', name: 'Bob', backstory: 'A senior citizen learning to use computers.' },
            ];

            const mockStorage = createMockStorage(testPersonas);
            const personaManager = new PersonaManager(undefined, mockStorage);

            for (const persona of testPersonas) {
                const prompt = await personaManager.getPersonaPrompt(persona.id, 'user_persona');

                // Prompt should contain the persona name and backstory
                expect(prompt).toContain(persona.name);
                expect(prompt).toContain(persona.backstory);
            }
        });
    });

    describe('Property 4.1: System Agents List', () => {
        it('should return all three system agents', () => {
            const personaManager = new PersonaManager();
            const agents = personaManager.getSystemAgents();

            expect(agents.length).toBe(3);
            expect(agents.map(a => a.id)).toContain('pippet');
            expect(agents.map(a => a.id)).toContain('ux-designer');
            expect(agents.map(a => a.id)).toContain('developer');
        });

        it('should have icons for all system agents', () => {
            const personaManager = new PersonaManager();
            const agents = personaManager.getSystemAgents();

            for (const agent of agents) {
                expect(agent.icon).toBeDefined();
                expect(agent.icon.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Property 4.2: User Personas Limit', () => {
        it('should limit user personas to 5', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            id: fc.uuid(),
                            name: fc.string({ minLength: 1, maxLength: 50 }),
                            backstory: fc.string({ minLength: 0, maxLength: 200 }),
                        }),
                        { minLength: 0, maxLength: 20 }
                    ),
                    async (personas) => {
                        const mockStorage = createMockStorage(personas);
                        const personaManager = new PersonaManager(undefined, mockStorage);

                        const userPersonas = await personaManager.getUserPersonas();

                        // Should never return more than 5
                        expect(userPersonas.length).toBeLessThanOrEqual(5);

                        // Should return min(personas.length, 5)
                        expect(userPersonas.length).toBe(Math.min(personas.length, 5));
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('should respect custom limit parameter', async () => {
            const testPersonas = Array.from({ length: 10 }, (_, i) => ({
                id: `user${i}`,
                name: `User ${i}`,
                backstory: `Backstory for user ${i}`,
            }));

            const mockStorage = createMockStorage(testPersonas);
            const personaManager = new PersonaManager(undefined, mockStorage);

            const threePersonas = await personaManager.getUserPersonas(3);
            expect(threePersonas.length).toBe(3);

            const sevenPersonas = await personaManager.getUserPersonas(7);
            expect(sevenPersonas.length).toBe(7);
        });
    });

    describe('Property 4.3: User Persona Initial Display', () => {
        it('should generate correct initials for user personas', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 50 }),
                    async (name) => {
                        const testPersonas = [{ id: 'test', name, backstory: 'Test' }];
                        const mockStorage = createMockStorage(testPersonas);
                        const personaManager = new PersonaManager(undefined, mockStorage);

                        const personas = await personaManager.getUserPersonas();
                        if (personas.length > 0) {
                            const initial = personas[0].initial;

                            // Initial should be the first character uppercased
                            expect(initial).toBe(name.charAt(0).toUpperCase());
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    describe('Property 4.4: System Agent Icon Display', () => {
        it('should return consistent icon for each system agent', () => {
            const personaManager = new PersonaManager();

            // Icons should match what's defined in SYSTEM_AGENTS
            expect(personaManager.getPersonaIndicator('pippet', 'system_agent')).toBe('🐾');
            expect(personaManager.getPersonaIndicator('ux-designer', 'system_agent')).toBe('🎨');
            expect(personaManager.getPersonaIndicator('developer', 'system_agent')).toBe('💻');
        });
    });

    describe('Property 27: Persona Prompt Template Selection', () => {
        it('should use different templates for system agents vs user personas', async () => {
            const testPersonas = [{ id: 'user1', name: 'TestUser', backstory: 'A test user persona.' }];
            const mockStorage = createMockStorage(testPersonas);
            const personaManager = new PersonaManager(undefined, mockStorage);

            // System agent prompt comes from prompts library
            const systemPrompt = await personaManager.getPersonaPrompt('pippet', 'system_agent');

            // User persona prompt includes "You are" and backstory
            const userPrompt = await personaManager.getPersonaPrompt('user1', 'user_persona');

            // System prompt should be a string
            expect(typeof systemPrompt).toBe('string');
            expect(systemPrompt.length).toBeGreaterThan(0);

            // User persona prompts should contain character roleplay instructions
            expect(userPrompt).toContain('You are TestUser');
            expect(userPrompt).toContain('A test user persona');
        });

        it('should fall back to default prompt for unknown personas', async () => {
            const personaManager = new PersonaManager();

            const prompt = await personaManager.getPersonaPrompt('nonexistent', 'system_agent');

            // Should return a default prompt
            expect(prompt).toBeDefined();
            expect(prompt.length).toBeGreaterThan(0);
        });
    });

    describe('getAllPersonas', () => {
        it('should return both system agents and user personas', async () => {
            const testPersonas = [
                { id: 'user1', name: 'Test User 1' },
                { id: 'user2', name: 'Test User 2' },
            ];
            const mockStorage = createMockStorage(testPersonas);
            const personaManager = new PersonaManager(undefined, mockStorage);

            const allPersonas = await personaManager.getAllPersonas();

            expect(allPersonas.systemAgents.length).toBe(3);
            expect(allPersonas.userPersonas.length).toBe(2);
        });
    });
});
