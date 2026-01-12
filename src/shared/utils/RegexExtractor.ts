/**
 * Regex-based JSON extraction utilities
 * 
 * These functions provide last-resort fallback extraction when:
 * 1. parseJson fails
 * 2. AI repair fails
 * 3. We still need to extract some data from the response
 * 
 * Each function extracts specific data structures using regex patterns.
 */

/**
 * Extract features from malformed JSON using regex
 */
export function extractFeaturesWithRegex(text: string): any[] {
    const features: any[] = [];

    try {
        // Try to find feature objects in the text using regex
        // Pattern: "name": "...", "description": "...", "score": ..., etc.
        const featurePattern = /"name"\s*:\s*"([^"]+)"[^}]*"description"\s*:\s*"([^"]+)"[^}]*"score"\s*:\s*(\d+)/g;

        let match;
        while ((match = featurePattern.exec(text)) !== null) {
            features.push({
                name: match[1],
                description: match[2],
                score: parseInt(match[3], 10),
                frequency: 'Medium',
                priority: 'Medium',
                mentionedBy: [],
                reasoning: 'Extracted via regex fallback',
            });
        }

        // If no features found with full pattern, try simpler pattern
        if (features.length === 0) {
            const simplePattern = /"name"\s*:\s*"([^"]+)"/g;
            while ((match = simplePattern.exec(text)) !== null) {
                features.push({
                    name: match[1],
                    description: 'Description not available',
                    score: 5,
                    frequency: 'Medium',
                    priority: 'Medium',
                    mentionedBy: [],
                    reasoning: 'Extracted via simple regex fallback',
                });
            }
        }

        console.log(`[RegexExtractor] Extracted ${features.length} features`);
    } catch (error) {
        console.error('[RegexExtractor] Feature extraction error:', error);
    }

    return features;
}

/**
 * Extract user stories from malformed JSON using regex
 */
export function extractStoriesWithRegex(text: string): any[] {
    const stories: any[] = [];

    try {
        // Pattern 1: Full story with title and description
        const storyPattern = /"title"\s*:\s*"([^"]+)"[^}]*"description"\s*:\s*"([^"]+)"/g;

        let match;
        let index = 0;
        while ((match = storyPattern.exec(text)) !== null) {
            stories.push({
                id: `story-${index + 1}-${Date.now()}`,
                title: match[1],
                description: match[2],
                acceptanceCriteria: [],
                clarifyingQuestions: [],
                requirements: [],
                featureId: null,
                personaId: null,
                answers: {},
                expanded: false,
            });
            index++;
        }

        // Pattern 2: If no stories found, try to find just titles
        if (stories.length === 0) {
            const titlePattern = /"title"\s*:\s*"([^"]+)"/g;
            index = 0;
            while ((match = titlePattern.exec(text)) !== null) {
                stories.push({
                    id: `story-${index + 1}-${Date.now()}`,
                    title: match[1],
                    description: 'Description not available',
                    acceptanceCriteria: [],
                    clarifyingQuestions: [],
                    requirements: [],
                    featureId: null,
                    personaId: null,
                    answers: {},
                    expanded: false,
                });
                index++;
            }
        }

        console.log(`[RegexExtractor] Extracted ${stories.length} stories`);
    } catch (error) {
        console.error('[RegexExtractor] Story extraction error:', error);
    }

    return stories;
}

/**
 * Extract personas from malformed JSON using regex
 */
export function extractPersonasWithRegex(text: string): any[] {
    const personas: any[] = [];

    try {
        // Pattern 1: Full persona with name and backstory
        const personaPattern = /"name"\s*:\s*"([^"]+)"[^}]*"backstory"\s*:\s*"([^"]+)"/g;

        let match;
        let index = 0;
        while ((match = personaPattern.exec(text)) !== null) {
            personas.push({
                id: `persona-${index + 1}`,
                name: match[1],
                backstory: match[2],
                age: 0,
                occupation: 'Unknown',
                goals: [],
                painPoints: [],
                techSavviness: 'Medium',
            });
            index++;
        }

        // Pattern 2: If no personas found, try to find just names
        if (personas.length === 0) {
            const namePattern = /"name"\s*:\s*"([^"]+)"/g;
            index = 0;
            while ((match = namePattern.exec(text)) !== null) {
                personas.push({
                    id: `persona-${index + 1}`,
                    name: match[1],
                    backstory: 'Backstory not available',
                    age: 0,
                    occupation: 'Unknown',
                    goals: [],
                    painPoints: [],
                    techSavviness: 'Medium',
                });
                index++;
            }
        }

        console.log(`[RegexExtractor] Extracted ${personas.length} personas`);
    } catch (error) {
        console.error('[RegexExtractor] Persona extraction error:', error);
    }

    return personas;
}

/**
 * Extract user flows from malformed JSON using regex
 */
export function extractUserFlowsWithRegex(text: string): any[] {
    const flows: any[] = [];

    try {
        // Pattern: Flow with name and description
        const flowPattern = /"name"\s*:\s*"([^"]+)"[^}]*"description"\s*:\s*"([^"]+)"/g;

        let match;
        let index = 0;
        while ((match = flowPattern.exec(text)) !== null) {
            flows.push({
                id: `flow-${index + 1}`,
                name: match[1],
                description: match[2],
                steps: [],
                personas: [],
            });
            index++;
        }

        // Fallback: Just names
        if (flows.length === 0) {
            const namePattern = /"name"\s*:\s*"([^"]+)"/g;
            index = 0;
            while ((match = namePattern.exec(text)) !== null) {
                flows.push({
                    id: `flow-${index + 1}`,
                    name: match[1],
                    description: 'Description not available',
                    steps: [],
                    personas: [],
                });
                index++;
            }
        }

        console.log(`[RegexExtractor] Extracted ${flows.length} user flows`);
    } catch (error) {
        console.error('[RegexExtractor] User flow extraction error:', error);
    }

    return flows;
}

/**
 * Extract screens/pages from malformed JSON using regex
 */
export function extractScreensWithRegex(text: string): any[] {
    const screens: any[] = [];

    try {
        // Pattern: Screen with name and purpose
        const screenPattern = /"name"\s*:\s*"([^"]+)"[^}]*"purpose"\s*:\s*"([^"]+)"/g;

        let match;
        let index = 0;
        while ((match = screenPattern.exec(text)) !== null) {
            screens.push({
                id: `screen-${index + 1}`,
                name: match[1],
                purpose: match[2],
                components: [],
                userFlows: [],
            });
            index++;
        }

        // Fallback: Just names
        if (screens.length === 0) {
            const namePattern = /"name"\s*:\s*"([^"]+)"/g;
            index = 0;
            while ((match = namePattern.exec(text)) !== null) {
                screens.push({
                    id: `screen-${index + 1}`,
                    name: match[1],
                    purpose: 'Purpose not available',
                    components: [],
                    userFlows: [],
                });
                index++;
            }
        }

        console.log(`[RegexExtractor] Extracted ${screens.length} screens`);
    } catch (error) {
        console.error('[RegexExtractor] Screen extraction error:', error);
    }

    return screens;
}
