/**
 * PersonaGenerationHandler manages persona generation for Build Mode.
 * 
 * Responsibilities:
 * - Generate personas from demographics
 * - Regenerate individual personas
 * - Generate persona attributes and backstories
 * 
 * This handler was extracted from BuildModeHandler to improve code organization.
 */

import { WebviewMessage } from '../../../../shared/types/CommonTypes';
import { PersonasService } from '../../../personas/services/PersonasService';
import { ErrorSanitizer } from '../../../../shared/services/ErrorSanitizer';

export class PersonaGenerationHandler {
    constructor(
        private readonly personasService: PersonasService | undefined,
        private readonly errorSanitizer: ErrorSanitizer
    ) { }

    /**
     * Generate random value within demographic range.
     */
    private generateRandomInRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Pick random item from array.
     */
    private pickRandom<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Generate persona attributes from demographics.
     */
    private generatePersonaAttributes(
        demographics: {
            ageMin?: number;
            ageMax?: number;
            occupations?: string[];
            description?: string;
        },
        index: number
    ): { name: string; attributes: Record<string, string> } {
        // Generate random age within range
        const ageMin = demographics.ageMin || 18;
        const ageMax = demographics.ageMax || 65;
        const age = this.generateRandomInRange(ageMin, ageMax);

        // Pick occupation
        const occupations = demographics.occupations || ['Professional', 'Student', 'Entrepreneur'];
        const occupation = this.pickRandom(occupations);

        // Generate name
        const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Blake', 'Cameron'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
        const name = `${this.pickRandom(firstNames)} ${this.pickRandom(lastNames)}`;

        // Build attributes
        const attributes: Record<string, string> = {
            age: String(age),
            occupation,
        };

        // Add description context if provided
        if (demographics.description) {
            attributes.context = demographics.description;
        }

        // Add persona number for variation
        attributes.personaIndex = String(index + 1);

        return { name, attributes };
    }

    /**
     * Handle generate personas from demographics request.
     * Validates: Requirements 9.1, 9.2
     */
    async handleGeneratePersonasFromDemographics(
        message: WebviewMessage,
        webview: any
    ): Promise<void> {
        if (!this.personasService) {
            throw new Error('PersonasService is not available');
        }

        const demographics = message.demographics || {};
        const count = message.count || 5;

        console.log('[PersonaGenerationHandler] Generating personas from demographics:', {
            demographics,
            count,
        });

        // Notify start
        webview.postMessage({
            type: 'personas-generation-started',
            count,
        });

        const generatedPersonas: any[] = [];

        try {
            for (let i = 0; i < count; i++) {
                // Generate persona attributes
                const { name, attributes } = this.generatePersonaAttributes(demographics, i);

                // Create persona using PersonasService
                const persona = await this.personasService.createPersona({ name, attributes });

                // Send progress update
                webview.postMessage({
                    type: 'persona-created',
                    index: i,
                    persona,
                });

                // Generate backstory for persona
                try {
                    const backstory = await this.personasService.generateBackstory(persona.id);

                    // Update local persona with backstory
                    const updatedPersona = { ...persona, backstory };
                    generatedPersonas.push(updatedPersona);

                    // Send backstory update
                    webview.postMessage({
                        type: 'persona-backstory-generated',
                        index: i,
                        persona: updatedPersona,
                    });
                } catch (backstoryError: any) {
                    console.error(`[PersonaGenerationHandler] Failed to generate backstory for persona ${i}:`, backstoryError);
                    // Still add persona without backstory
                    generatedPersonas.push({ ...persona, backstory: '' });

                    webview.postMessage({
                        type: 'persona-backstory-error',
                        index: i,
                        persona,
                        error: this.errorSanitizer.sanitize(backstoryError).userMessage,
                    });
                }
            }

            // Send completion
            webview.postMessage({
                type: 'personas-generated',
                personas: generatedPersonas,
                count: generatedPersonas.length,
            });

            console.log('[PersonaGenerationHandler] Personas generated successfully:', {
                count: generatedPersonas.length,
            });
        } catch (error: any) {
            console.error('[PersonaGenerationHandler] Failed to generate personas:', error);

            webview.postMessage({
                type: 'personas-generation-error',
                error: this.errorSanitizer.sanitize(error).userMessage,
                partialPersonas: generatedPersonas,
            });
        }
    }

    /**
     * Handle regenerate single persona request.
     * Validates: Requirements 9.5
     */
    async handleRegenerateSinglePersona(
        message: WebviewMessage,
        webview: any
    ): Promise<void> {
        if (!this.personasService) {
            throw new Error('PersonasService is not available');
        }

        if (!message.personaId) {
            throw new Error('Persona ID is required');
        }

        console.log('[PersonaGenerationHandler] Regenerating persona:', {
            personaId: message.personaId,
        });

        try {
            // Generate new backstory
            const backstory = await this.personasService.generateBackstory(message.personaId);

            // Get updated persona
            const updatedPersona = await this.personasService.getPersonaById(message.personaId);

            webview.postMessage({
                type: 'persona-updated',
                personaId: message.personaId,
                persona: updatedPersona,
                backstory,
            });

            console.log('[PersonaGenerationHandler] Persona regenerated successfully:', {
                personaId: message.personaId,
                backstoryLength: backstory?.length || 0,
            });
        } catch (error: any) {
            console.error('[PersonaGenerationHandler] Failed to regenerate persona:', error);

            webview.postMessage({
                type: 'persona-regeneration-error',
                personaId: message.personaId,
                error: this.errorSanitizer.sanitize(error).userMessage,
            });
        }
    }
}
