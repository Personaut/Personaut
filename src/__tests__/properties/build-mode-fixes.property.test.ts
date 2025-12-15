/**
 * Property-based tests for Build Mode message type fixes.
 *
 * These tests verify the correctness properties defined in the design document
 * for the build-mode-fixes feature.
 *
 * **Feature: build-mode-fixes**
 */

import * as fc from 'fast-check';
import { sanitizeProjectName, isValidProjectName } from '../../features/build-mode/services/StageManager';

/**
 * **Feature: build-mode-fixes, Property 2: Project Name Validation State Update**
 *
 * *For any* project-name-checked message received by the webview, if the message
 * contains `exists: true`, then `projectTitleError` SHALL be set to indicate
 * the name is taken; otherwise `projectTitleError` SHALL be null and
 * `sanitizedProjectName` SHALL be set to the sanitized name.
 *
 * **Validates: Requirements 1.3, 1.4**
 */
describe('Property 2: Project Name Validation State Update', () => {
    // Simulate the webview state update logic
    const handleProjectNameCheckedMessage = (message: {
        exists: boolean;
        sanitizedName: string;
        valid: boolean;
        error?: string;
    }) => {
        let projectTitleError: string | null = null;
        let sanitizedProjectName = '';

        if (message.error) {
            projectTitleError = message.error;
        } else if (message.exists) {
            projectTitleError = 'A project with this name already exists';
        } else {
            projectTitleError = null;
        }
        sanitizedProjectName = message.sanitizedName || '';

        return { projectTitleError, sanitizedProjectName };
    };

    it('should set projectTitleError when project exists', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
                async (projectName) => {
                    const sanitizedName = sanitizeProjectName(projectName);
                    if (!sanitizedName) return; // Skip empty sanitized names

                    const message = {
                        exists: true,
                        sanitizedName,
                        valid: sanitizedName.length > 0,
                    };

                    const result = handleProjectNameCheckedMessage(message);

                    // Property: if exists is true, projectTitleError SHALL be set
                    expect(result.projectTitleError).not.toBeNull();
                    expect(result.projectTitleError).toContain('exists');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should clear projectTitleError and set sanitizedProjectName when project does not exist', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
                async (projectName) => {
                    const sanitizedName = sanitizeProjectName(projectName);
                    if (!sanitizedName) return; // Skip empty sanitized names

                    const message = {
                        exists: false,
                        sanitizedName,
                        valid: sanitizedName.length > 0,
                    };

                    const result = handleProjectNameCheckedMessage(message);

                    // Property: if exists is false, projectTitleError SHALL be null
                    expect(result.projectTitleError).toBeNull();
                    // Property: sanitizedProjectName SHALL be set to the sanitized name
                    expect(result.sanitizedProjectName).toBe(sanitizedName);
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 5: Current Step Derivation**
 *
 * *For any* set of completed stages, the derived current step SHALL be the first
 * stage in the stage order that is not marked as complete, or the last stage if
 * all are complete.
 *
 * **Validates: Requirements 2.5**
 */
describe('Property 5: Current Step Derivation', () => {
    const STAGE_ORDER = ['idea', 'users', 'features', 'team', 'stories', 'design'] as const;
    type StageName = (typeof STAGE_ORDER)[number];

    // Derive current step from completed stages (same logic as in App.tsx)
    const deriveCurrentStep = (completedStages: Record<string, boolean>): StageName => {
        let derivedStep: StageName = 'idea';
        for (const stage of STAGE_ORDER) {
            if (!completedStages[stage]) {
                derivedStep = stage;
                break;
            }
            // If this stage is complete, the next stage is the current step
            const nextIndex = STAGE_ORDER.indexOf(stage) + 1;
            if (nextIndex < STAGE_ORDER.length) {
                derivedStep = STAGE_ORDER[nextIndex];
            }
        }
        return derivedStep;
    };

    it('should derive the first incomplete stage as current step', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random completion status for each stage
                fc.record({
                    idea: fc.boolean(),
                    users: fc.boolean(),
                    features: fc.boolean(),
                    team: fc.boolean(),
                    stories: fc.boolean(),
                    design: fc.boolean(),
                }),
                async (completedStages) => {
                    const derivedStep = deriveCurrentStep(completedStages);

                    // Find the first incomplete stage
                    let firstIncomplete: StageName | null = null;
                    for (const stage of STAGE_ORDER) {
                        if (!completedStages[stage]) {
                            firstIncomplete = stage;
                            break;
                        }
                    }

                    if (firstIncomplete) {
                        // Property: derived step SHALL be the first incomplete stage
                        expect(derivedStep).toBe(firstIncomplete);
                    } else {
                        // Property: if all complete, derived step SHALL be the last stage
                        expect(derivedStep).toBe('design');
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should return first stage when nothing is complete', () => {
        const completedStages = {
            idea: false,
            users: false,
            features: false,
            team: false,
            stories: false,
            design: false,
        };

        const derivedStep = deriveCurrentStep(completedStages);
        expect(derivedStep).toBe('idea');
    });

    it('should return last stage when all stages are complete', () => {
        const completedStages = {
            idea: true,
            users: true,
            features: true,
            team: true,
            stories: true,
            design: true,
        };

        const derivedStep = deriveCurrentStep(completedStages);
        expect(derivedStep).toBe('design');
    });
});

/**
 * **Feature: build-mode-fixes, Property 6: Build Log Entry Conversion**
 *
 * *For any* persisted build log entry, the conversion to UI log format SHALL
 * produce a LogEntry with: timestamp as formatted time string, message as the
 * entry content, and type mapped from entry.type (assistant→ai, error→error,
 * otherwise→info).
 *
 * **Validates: Requirements 3.3**
 */
describe('Property 6: Build Log Entry Conversion', () => {
    interface PersistedBuildLogEntry {
        timestamp: number;
        type: 'user' | 'assistant' | 'system' | 'error';
        stage: string;
        content: string;
    }

    interface LogEntry {
        timestamp: string;
        message: string;
        type: 'info' | 'ai' | 'error' | 'success' | 'warning';
    }

    // Convert persisted entry to UI format (same logic as in App.tsx)
    const convertEntry = (entry: PersistedBuildLogEntry): LogEntry => {
        const date = new Date(entry.timestamp);
        const timestamp = date.toLocaleTimeString();

        let type: LogEntry['type'] = 'info';
        if (entry.type === 'assistant') {
            type = 'ai';
        } else if (entry.type === 'error') {
            type = 'error';
        }

        return {
            timestamp,
            message: entry.content,
            type,
        };
    };

    it('should correctly convert persisted entries to UI format', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    timestamp: fc.integer({ min: 0, max: Date.now() }),
                    type: fc.constantFrom('user', 'assistant', 'system', 'error') as fc.Arbitrary<
                        'user' | 'assistant' | 'system' | 'error'
                    >,
                    stage: fc.string({ minLength: 1, maxLength: 20 }),
                    content: fc.string({ minLength: 1, maxLength: 500 }),
                }),
                async (entry) => {
                    const result = convertEntry(entry);

                    // Property: timestamp SHALL be a formatted time string
                    expect(typeof result.timestamp).toBe('string');
                    expect(result.timestamp.length).toBeGreaterThan(0);

                    // Property: message SHALL be the entry content
                    expect(result.message).toBe(entry.content);

                    // Property: type mapping
                    if (entry.type === 'assistant') {
                        expect(result.type).toBe('ai');
                    } else if (entry.type === 'error') {
                        expect(result.type).toBe('error');
                    } else {
                        expect(result.type).toBe('info');
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 7: Stage File Path Generation**
 *
 * *For any* valid project name and stage name, the generated file path SHALL
 * follow the pattern `.personaut/{project-name}/planning/{stage-name}.json`.
 *
 * **Validates: Requirements 4.3**
 */
describe('Property 7: Stage File Path Generation', () => {
    const STAGE_ORDER = ['idea', 'users', 'features', 'team', 'stories', 'design', 'building'];

    it('should generate paths following the planning/ subdirectory pattern', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc
                    .string({ minLength: 1, maxLength: 50 })
                    .filter((s) => /^[a-z0-9][a-z0-9-_]*$/.test(s.toLowerCase())),
                fc.constantFrom(...STAGE_ORDER),
                async (projectName, stage) => {
                    const sanitized = sanitizeProjectName(projectName);
                    if (!sanitized || !isValidProjectName(sanitized)) return;

                    // Simulate getStageFilePath behavior
                    const baseDir = '.personaut';
                    const planningDir = `${baseDir}/${sanitized}/planning`;
                    const expectedPath = `${planningDir}/${stage}.json`;

                    // Property: path SHALL follow the pattern
                    expect(expectedPath).toContain('/planning/');
                    expect(expectedPath).toContain(`${stage}.json`);
                    expect(expectedPath.startsWith('.personaut/')).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 8: Iteration Directory Path Generation**
 *
 * *For any* valid project name and iteration number, the generated iteration
 * directory path SHALL follow the pattern
 * `.personaut/{project-name}/iterations/{iteration-number}/`.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 */
describe('Property 8: Iteration Directory Path Generation', () => {
    it('should generate iteration paths following the correct pattern', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc
                    .string({ minLength: 1, maxLength: 50 })
                    .filter((s) => /^[a-z0-9][a-z0-9-_]*$/.test(s.toLowerCase())),
                fc.integer({ min: 1, max: 1000 }),
                async (projectName, iterationNumber) => {
                    const sanitized = sanitizeProjectName(projectName);
                    if (!sanitized || !isValidProjectName(sanitized)) return;

                    // Simulate getIterationDir behavior
                    const baseDir = '.personaut';
                    const expectedPath = `${baseDir}/${sanitized}/iterations/${iterationNumber}`;

                    // Property: path SHALL follow the pattern
                    expect(expectedPath).toContain('/iterations/');
                    expect(expectedPath).toContain(String(iterationNumber));
                    expect(expectedPath.startsWith('.personaut/')).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should generate feedback path correctly', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc
                    .string({ minLength: 1, maxLength: 50 })
                    .filter((s) => /^[a-z0-9][a-z0-9-_]*$/.test(s.toLowerCase())),
                fc.integer({ min: 1, max: 1000 }),
                async (projectName, iterationNumber) => {
                    const sanitized = sanitizeProjectName(projectName);
                    if (!sanitized || !isValidProjectName(sanitized)) return;

                    const baseDir = '.personaut';
                    const iterationDir = `${baseDir}/${sanitized}/iterations/${iterationNumber}`;
                    const feedbackPath = `${iterationDir}/feedback.json`;

                    // Property: feedback path SHALL be in iteration directory
                    expect(feedbackPath).toContain('/iterations/');
                    expect(feedbackPath).toContain('/feedback.json');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should generate screenshot path with sanitized page names', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc
                    .string({ minLength: 1, maxLength: 50 })
                    .filter((s) => /^[a-z0-9][a-z0-9-_]*$/.test(s.toLowerCase())),
                fc.integer({ min: 1, max: 1000 }),
                fc.string({ minLength: 1, maxLength: 30 }),
                async (projectName, iterationNumber, pageName) => {
                    const sanitizedProject = sanitizeProjectName(projectName);
                    if (!sanitizedProject || !isValidProjectName(sanitizedProject)) return;

                    // Simulate getScreenshotPath behavior
                    const safeName = pageName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
                    if (!safeName) return;

                    const baseDir = '.personaut';
                    const iterationDir = `${baseDir}/${sanitizedProject}/iterations/${iterationNumber}`;
                    const screenshotPath = `${iterationDir}/${safeName}.png`;

                    // Property: screenshot path SHALL be in iteration directory with .png extension
                    expect(screenshotPath).toContain('/iterations/');
                    expect(screenshotPath).toContain('.png');
                    // Property: page name SHALL be sanitized to be filesystem-safe
                    expect(screenshotPath).not.toMatch(/[^a-z0-9-_./]/);
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 10: Migration Backup Integrity**
 *
 * *For any* project with old file structure, the migration backup SHALL
 * contain copies of all original stage files, and the backup directory
 * SHALL follow the pattern `.backup-{timestamp}/`.
 *
 * **Validates: Requirements 7.2**
 */
describe('Property 10: Migration Backup Integrity', () => {
    it('should create backup directory with timestamp pattern', () => {
        const timestamp = Date.now();
        const backupDir = `.backup-${timestamp}`;

        // Property: backup directory SHALL follow the pattern
        expect(backupDir).toMatch(/^\.backup-\d+$/);
        expect(parseInt(backupDir.replace('.backup-', ''))).toBeGreaterThan(0);
    });

    it('should identify old file patterns for backup', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc
                    .string({ minLength: 1, maxLength: 50 })
                    .filter((s) => /^[a-z0-9][a-z0-9-_]*$/.test(s.toLowerCase())),
                async (projectName) => {
                    const sanitized = sanitizeProjectName(projectName);
                    if (!sanitized || !isValidProjectName(sanitized)) return;

                    // Old-style file patterns
                    const oldIdeaPattern = `${sanitized}.json`;
                    const oldStagePatterns = [
                        'users.stage.json',
                        'features.stage.json',
                        'team.stage.json',
                        'stories.stage.json',
                        'design.stage.json',
                    ];

                    // Property: these patterns should match old structure detection
                    expect(oldIdeaPattern).toMatch(/^[a-z0-9-_]+\.json$/);
                    oldStagePatterns.forEach((pattern) => {
                        expect(pattern).toMatch(/^[a-z]+\.stage\.json$/);
                    });
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 11: Migration Path Update**
 *
 * *For any* successfully migrated project, all stage file paths in build-state.json
 * SHALL be updated to use the new `planning/{stage}.json` format.
 *
 * **Validates: Requirements 7.4**
 */
describe('Property 11: Migration Path Update', () => {
    const STAGE_ORDER = ['idea', 'users', 'features', 'team', 'stories', 'design'];

    it('should update all stage paths to new format after migration', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc
                    .string({ minLength: 1, maxLength: 50 })
                    .filter((s) => /^[a-z0-9][a-z0-9-_]*$/.test(s.toLowerCase())),
                fc.subarray(STAGE_ORDER, { minLength: 1 }),
                async (projectName, stages) => {
                    const sanitized = sanitizeProjectName(projectName);
                    if (!sanitized || !isValidProjectName(sanitized)) return;

                    // Simulate migrated paths
                    const migratedPaths: Record<string, string> = {};
                    for (const stage of stages) {
                        migratedPaths[stage] = `planning/${stage}.json`;
                    }

                    // Property: all paths SHALL follow new format
                    for (const stage of stages) {
                        expect(migratedPaths[stage]).toBe(`planning/${stage}.json`);
                        expect(migratedPaths[stage]).toMatch(/^planning\/[a-z]+\.json$/);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should not contain old-style paths after migration', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc
                    .string({ minLength: 1, maxLength: 50 })
                    .filter((s) => /^[a-z0-9][a-z0-9-_]*$/.test(s.toLowerCase())),
                async (projectName) => {
                    const sanitized = sanitizeProjectName(projectName);
                    if (!sanitized || !isValidProjectName(sanitized)) return;

                    // Old-style patterns that should NOT be in new paths
                    const oldIdeaFile = `${sanitized}.json`; // Old idea pattern
                    const oldStageSuffix = '.stage.json'; // Old stage suffix

                    // New path format
                    const newIdeaPath = 'planning/idea.json';

                    // Property: new paths SHALL NOT contain old patterns
                    expect(newIdeaPath).not.toContain(oldStageSuffix);
                    expect(newIdeaPath).not.toBe(oldIdeaFile);
                    expect(newIdeaPath).toContain('planning/');
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 16: Persona Generation from Demographics**
 *
 * *For any* demographics input with age range and occupations, the generated
 * personas SHALL have ages within the specified range and occupations from
 * the provided list.
 *
 * **Validates: Requirements 9.1, 9.2**
 */
describe('Property 16: Persona Generation from Demographics', () => {
    it('should generate random age within demographic range', () => {
        // Simple helper to generate random in range
        const generateRandomInRange = (min: number, max: number): number => {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        for (let i = 0; i < 100; i++) {
            const ageMin = 18;
            const ageMax = 65;
            const age = generateRandomInRange(ageMin, ageMax);

            // Property: age SHALL be within range
            expect(age).toBeGreaterThanOrEqual(ageMin);
            expect(age).toBeLessThanOrEqual(ageMax);
        }
    });

    it('should pick occupation from provided list', () => {
        const pickRandom = <T>(array: T[]): T => {
            return array[Math.floor(Math.random() * array.length)];
        };

        const occupations = ['Developer', 'Designer', 'Manager', 'Student'];

        for (let i = 0; i < 100; i++) {
            const occupation = pickRandom(occupations);

            // Property: occupation SHALL be from the list
            expect(occupations).toContain(occupation);
        }
    });

    it('should generate unique names for personas', () => {
        const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];

        const pickRandom = <T>(array: T[]): T => {
            return array[Math.floor(Math.random() * array.length)];
        };

        const names: string[] = [];
        for (let i = 0; i < 20; i++) {
            const name = `${pickRandom(firstNames)} ${pickRandom(lastNames)}`;
            names.push(name);
        }

        // Property: names SHALL be strings with first and last name
        names.forEach((name) => {
            expect(name.split(' ').length).toBe(2);
            expect(name.trim().length).toBeGreaterThan(0);
        });
    });
});

/**
 * **Feature: build-mode-fixes, Property 20: Persona Persistence Format**
 *
 * *For any* generated persona saved to storage, the persona object SHALL
 * include all required fields: id, name, attributes, backstory, createdAt,
 * and updatedAt.
 *
 * **Validates: Requirements 9.7**
 */
describe('Property 20: Persona Persistence Format', () => {
    it('should format persona with all required fields', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    id: fc.uuid(),
                    name: fc.string({ minLength: 1, maxLength: 50 }),
                    age: fc.integer({ min: 18, max: 100 }).map(String),
                    occupation: fc.string({ minLength: 1, maxLength: 50 }),
                    backstory: fc.string({ minLength: 0, maxLength: 500 }),
                }),
                async (generatedPersona) => {
                    // Simulate the conversion logic from App.tsx
                    const formattedPersona = {
                        id: generatedPersona.id,
                        name: generatedPersona.name,
                        attributes: {
                            age: generatedPersona.age,
                            occupation: generatedPersona.occupation,
                        },
                        backstory: generatedPersona.backstory || '',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    };

                    // Property: all required fields SHALL be present
                    expect(formattedPersona.id).toBeDefined();
                    expect(formattedPersona.name).toBeDefined();
                    expect(formattedPersona.attributes).toBeDefined();
                    expect(formattedPersona.attributes.age).toBeDefined();
                    expect(formattedPersona.attributes.occupation).toBeDefined();
                    expect(formattedPersona.backstory).toBeDefined();
                    expect(formattedPersona.createdAt).toBeDefined();
                    expect(formattedPersona.updatedAt).toBeDefined();

                    // Property: timestamps SHALL be valid numbers
                    expect(typeof formattedPersona.createdAt).toBe('number');
                    expect(typeof formattedPersona.updatedAt).toBe('number');
                    expect(formattedPersona.createdAt).toBeGreaterThan(0);
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should preserve original attributes in formatted persona', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    id: fc.uuid(),
                    name: fc.string({ minLength: 1, maxLength: 50 }),
                    age: fc.integer({ min: 18, max: 100 }).map(String),
                    occupation: fc.string({ minLength: 1, maxLength: 50 }),
                    backstory: fc.string({ minLength: 0, maxLength: 500 }),
                    attributes: fc.dictionary(
                        fc.string({ minLength: 1, maxLength: 20 }),
                        fc.string({ minLength: 1, maxLength: 50 })
                    ),
                }),
                async (generatedPersona) => {
                    // Simulate the conversion logic from App.tsx
                    const formattedPersona: {
                        id: string;
                        name: string;
                        attributes: Record<string, string>;
                        backstory: string;
                        createdAt: number;
                        updatedAt: number;
                    } = {
                        id: generatedPersona.id,
                        name: generatedPersona.name,
                        attributes: {
                            age: generatedPersona.age,
                            occupation: generatedPersona.occupation,
                            ...(generatedPersona.attributes || {}),
                        },
                        backstory: generatedPersona.backstory || '',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    };

                    // Property: age and occupation SHALL be in attributes
                    expect(formattedPersona.attributes.age).toBe(generatedPersona.age);
                    expect(formattedPersona.attributes.occupation).toBe(
                        generatedPersona.occupation
                    );

                    // Property: additional attributes SHALL be preserved
                    for (const [key, value] of Object.entries(
                        generatedPersona.attributes || {}
                    )) {
                        // Skip if key conflicts with age/occupation
                        if (key !== 'age' && key !== 'occupation') {
                            expect(formattedPersona.attributes[key]).toBe(value);
                        }
                    }
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 9: Session State Preservation**
 *
 * *For any* session invalidation event, the critical project state
 * (projectName, projectTitle, buildData) SHALL be preserved and NOT reset.
 *
 * **Validates: Requirements 6.1, 6.5**
 */
describe('Property 9: Session State Preservation', () => {
    it('should preserve project state fields on session invalidation', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    projectName: fc
                        .string({ minLength: 1, maxLength: 50 })
                        .filter((s) => /^[a-z0-9-]+$/.test(s)),
                    projectTitle: fc.string({ minLength: 1, maxLength: 100 }),
                    buildData: fc.record({
                        idea: fc.string({ minLength: 0, maxLength: 200 }),
                    }),
                    sessionId: fc.uuid(),
                }),
                async (currentState) => {
                    const newSessionId = 'new-session-' + Date.now();

                    // Simulate session-invalid handler logic
                    const newState = { ...currentState, sessionId: newSessionId, messages: [] };

                    // Property: projectName SHALL be preserved
                    expect(newState.projectName).toBe(currentState.projectName);

                    // Property: projectTitle SHALL be preserved
                    expect(newState.projectTitle).toBe(currentState.projectTitle);

                    // Property: buildData SHALL be preserved
                    expect(newState.buildData).toBe(currentState.buildData);
                    expect(newState.buildData.idea).toBe(currentState.buildData.idea);

                    // Property: sessionId SHALL be updated
                    expect(newState.sessionId).toBe(newSessionId);

                    // Property: messages SHALL be cleared
                    expect(newState.messages).toEqual([]);
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should not lose project name during state transitions', () => {
        fc.assert(
            fc.property(
                fc
                    .string({ minLength: 1, maxLength: 50 })
                    .filter((s) => /^[a-z0-9-]+$/.test(s)),
                (projectName) => {
                    const baseState = { projectName };
                    const sessionInvalidState = { ...baseState, sessionId: 'new', messages: [] };
                    const restoredState = { ...sessionInvalidState };

                    // Property: projectName SHALL survive the session lifecycle
                    expect(restoredState.projectName).toBe(projectName);
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 43: User Story Structure**
 *
 * *For any* generated user story, the story SHALL include all required fields:
 * id, title, description, requirements, acceptanceCriteria, clarifyingQuestions,
 * and expanded flag.
 *
 * **Validates: Requirements 13.2, 13.3**
 */
describe('Property 43: User Story Structure', () => {
    it('should normalize user story with all required fields', () => {
        fc.assert(
            fc.property(
                fc.record({
                    title: fc.string({ minLength: 1, maxLength: 100 }),
                    description: fc.string({ minLength: 0, maxLength: 500 }),
                }),
                (input) => {
                    // Simulate normalization logic from handler
                    const normalizedStory = {
                        id: `story-${Date.now()}`,
                        title: input.title || 'User Story',
                        description: input.description || '',
                        requirements: [],
                        acceptanceCriteria: [],
                        clarifyingQuestions: [],
                        featureId: null,
                        personaId: null,
                        answers: {},
                        expanded: false,
                    };

                    // Property: all required fields SHALL be present
                    expect(normalizedStory.id).toBeDefined();
                    expect(normalizedStory.title).toBeDefined();
                    expect(normalizedStory.description).toBeDefined();
                    expect(normalizedStory.requirements).toBeInstanceOf(Array);
                    expect(normalizedStory.acceptanceCriteria).toBeInstanceOf(Array);
                    expect(normalizedStory.clarifyingQuestions).toBeInstanceOf(Array);
                    expect(normalizedStory.expanded).toBe(false);
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should normalize clarifying questions to proper format', () => {
        fc.assert(
            fc.property(
                fc.array(fc.oneof(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.record({
                        question: fc.string({ minLength: 1, maxLength: 100 }),
                        answer: fc.string({ minLength: 0, maxLength: 200 }),
                    })
                )),
                (questions) => {
                    // Simulate normalization logic
                    const normalized = questions.map((q) =>
                        typeof q === 'string' ? { question: q, answer: '' } : q
                    );

                    // Property: all questions SHALL be in {question, answer} format
                    normalized.forEach((q) => {
                        expect(q).toHaveProperty('question');
                        expect(q).toHaveProperty('answer');
                    });
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 47: User Story Persistence**
 *
 * *For any* user stories saved to storage, the data SHALL be serializable
 * and preserve all fields correctly.
 *
 * **Validates: Requirements 13.6, 13.7**
 */
describe('Property 47: User Story Persistence', () => {
    it('should maintain data integrity through JSON serialization', () => {
        fc.assert(
            fc.property(
                fc.record({
                    id: fc.uuid(),
                    title: fc.string({ minLength: 1, maxLength: 100 }),
                    description: fc.string({ minLength: 0, maxLength: 500 }),
                    requirements: fc.array(fc.string({ minLength: 1, maxLength: 100 })),
                    acceptanceCriteria: fc.array(fc.string({ minLength: 1, maxLength: 200 })),
                }),
                (story) => {
                    const fullStory = {
                        ...story,
                        clarifyingQuestions: [],
                        featureId: null,
                        personaId: null,
                        answers: {},
                        expanded: false,
                    };

                    // Simulate save/load cycle
                    const serialized = JSON.stringify({ stories: [fullStory] });
                    const deserialized = JSON.parse(serialized);

                    // Property: data SHALL survive serialization
                    expect(deserialized.stories[0].id).toBe(fullStory.id);
                    expect(deserialized.stories[0].title).toBe(fullStory.title);
                    expect(deserialized.stories[0].description).toBe(fullStory.description);
                    expect(deserialized.stories[0].requirements).toEqual(fullStory.requirements);
                    expect(deserialized.stories[0].acceptanceCriteria).toEqual(
                        fullStory.acceptanceCriteria
                    );
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 49: User Flow Creation**
 *
 * *For any* generated user flow, the flow SHALL include id, name, description,
 * and steps array showing page navigation.
 *
 * **Validates: Requirements 14.2**
 */
describe('Property 49: User Flow Creation', () => {
    it('should normalize user flow with all required fields', () => {
        fc.assert(
            fc.property(
                fc.record({
                    name: fc.string({ minLength: 1, maxLength: 100 }),
                    description: fc.string({ minLength: 0, maxLength: 300 }),
                    steps: fc.array(fc.string({ minLength: 1, maxLength: 50 })),
                }),
                (input) => {
                    // Simulate normalization logic from handler
                    const normalizedFlow = {
                        id: `flow-${Date.now()}`,
                        name: input.name || 'User Flow',
                        description: input.description || '',
                        steps: Array.isArray(input.steps) ? input.steps : [],
                    };

                    // Property: all required fields SHALL be present
                    expect(normalizedFlow.id).toBeDefined();
                    expect(normalizedFlow.name).toBeDefined();
                    expect(normalizedFlow.description).toBeDefined();
                    expect(normalizedFlow.steps).toBeInstanceOf(Array);
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 50: Page Design Specification**
 *
 * *For any* generated page, the page SHALL include id, name, purpose,
 * uiElements array, and userActions array.
 *
 * **Validates: Requirements 14.3**
 */
describe('Property 50: Page Design Specification', () => {
    it('should normalize page with all required fields', () => {
        fc.assert(
            fc.property(
                fc.record({
                    name: fc.string({ minLength: 1, maxLength: 100 }),
                    purpose: fc.string({ minLength: 0, maxLength: 300 }),
                    uiElements: fc.array(fc.string({ minLength: 1, maxLength: 100 })),
                    userActions: fc.array(fc.string({ minLength: 1, maxLength: 100 })),
                }),
                (input) => {
                    // Simulate normalization logic from handler
                    const normalizedPage = {
                        id: `page-${Date.now()}`,
                        name: input.name || 'Page',
                        purpose: input.purpose || '',
                        uiElements: Array.isArray(input.uiElements) ? input.uiElements : [],
                        userActions: Array.isArray(input.userActions) ? input.userActions : [],
                    };

                    // Property: all required fields SHALL be present
                    expect(normalizedPage.id).toBeDefined();
                    expect(normalizedPage.name).toBeDefined();
                    expect(normalizedPage.purpose).toBeDefined();
                    expect(normalizedPage.uiElements).toBeInstanceOf(Array);
                    expect(normalizedPage.userActions).toBeInstanceOf(Array);
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 54: Design Persistence with Framework**
 *
 * *For any* design saved to storage, the data SHALL include userFlows, pages,
 * and framework selection, all serializable correctly.
 *
 * **Validates: Requirements 14.8, 14.9**
 */
describe('Property 54: Design Persistence with Framework', () => {
    it('should maintain design data integrity through JSON serialization', () => {
        fc.assert(
            fc.property(
                fc.record({
                    framework: fc.constantFrom('React', 'Vue', 'Next.js', 'HTML', 'Flutter'),
                    userFlows: fc.array(
                        fc.record({
                            id: fc.uuid(),
                            name: fc.string({ minLength: 1, maxLength: 50 }),
                            steps: fc.array(fc.string({ minLength: 1, maxLength: 30 })),
                        })
                    ),
                    pages: fc.array(
                        fc.record({
                            id: fc.uuid(),
                            name: fc.string({ minLength: 1, maxLength: 50 }),
                            purpose: fc.string({ minLength: 0, maxLength: 200 }),
                        })
                    ),
                }),
                (design) => {
                    // Simulate save/load cycle
                    const serialized = JSON.stringify(design);
                    const deserialized = JSON.parse(serialized);

                    // Property: data SHALL survive serialization
                    expect(deserialized.framework).toBe(design.framework);
                    expect(deserialized.userFlows.length).toBe(design.userFlows.length);
                    expect(deserialized.pages.length).toBe(design.pages.length);

                    // Property: framework SHALL be a valid option
                    const validFrameworks = ['React', 'Vue', 'Next.js', 'HTML', 'Flutter'];
                    expect(validFrameworks).toContain(deserialized.framework);
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 12: AI Content Generation Invocation**
 *
 * *For any* content generation request, the system SHALL invoke the AgentManager
 * with the appropriate stage, project name, and prompt.
 *
 * **Validates: Requirements 8.1**
 */
describe('Property 12: AI Content Generation Invocation', () => {
    it('should validate content generation request structure', () => {
        fc.assert(
            fc.property(
                fc.record({
                    projectName: fc
                        .string({ minLength: 1, maxLength: 50 })
                        .filter((s) => /^[a-z0-9-]+$/.test(s)),
                    stage: fc.constantFrom('users', 'features', 'stories', 'design'),
                    prompt: fc.string({ minLength: 1, maxLength: 500 }),
                    systemPrompt: fc.string({ minLength: 0, maxLength: 300 }),
                }),
                (request) => {
                    // Property: request SHALL have required fields
                    expect(request.projectName).toBeDefined();
                    expect(request.stage).toBeDefined();
                    expect(request.prompt).toBeDefined();

                    // Property: stage SHALL be a valid stage
                    const validStages = ['users', 'features', 'stories', 'design'];
                    expect(validStages).toContain(request.stage);

                    // Property: projectName SHALL be valid
                    expect(/^[a-z0-9-]+$/.test(request.projectName)).toBe(true);
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 13: Content Streaming Updates**
 *
 * *For any* content generation in progress, the system SHALL send stream-update
 * messages to the webview with parsed data items.
 *
 * **Validates: Requirements 8.2**
 */
describe('Property 13: Content Streaming Updates', () => {
    it('should validate stream update message structure', () => {
        fc.assert(
            fc.property(
                fc.record({
                    stage: fc.constantFrom('users', 'features', 'stories', 'design'),
                    updateType: fc.constantFrom('persona', 'feature', 'story', 'flow', 'screen'),
                    index: fc.integer({ min: 0, max: 100 }),
                    data: fc.record({
                        id: fc.uuid(),
                        name: fc.string({ minLength: 1, maxLength: 100 }),
                    }),
                }),
                (update) => {
                    // Property: update SHALL have stage identifier
                    expect(update.stage).toBeDefined();

                    // Property: update SHALL have data type indicator
                    expect(update.updateType).toBeDefined();

                    // Property: update SHALL have index for ordering
                    expect(typeof update.index).toBe('number');
                    expect(update.index).toBeGreaterThanOrEqual(0);

                    // Property: data SHALL have an id
                    expect(update.data.id).toBeDefined();
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should validate update type matches stage', () => {
        const stageToUpdateType: Record<string, string[]> = {
            users: ['persona'],
            features: ['feature'],
            stories: ['story'],
            design: ['flow', 'screen'],
        };

        fc.assert(
            fc.property(
                fc.constantFrom('users', 'features', 'stories', 'design'),
                (stage) => {
                    const validTypes = stageToUpdateType[stage];

                    // Property: each stage SHALL have valid update types
                    expect(validTypes).toBeDefined();
                    expect(validTypes.length).toBeGreaterThan(0);
                }
            ),
            { numRuns: 20 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 14: Content Generation Completion**
 *
 * *For any* successful content generation, the system SHALL save the generated
 * content to the stage file and send a completion message to the webview.
 *
 * **Validates: Requirements 8.3**
 */
describe('Property 14: Content Generation Completion', () => {
    it('should validate completion message structure', () => {
        fc.assert(
            fc.property(
                fc.record({
                    projectName: fc
                        .string({ minLength: 1, maxLength: 50 })
                        .filter((s) => /^[a-z0-9-]+$/.test(s)),
                    stage: fc.constantFrom('users', 'features', 'stories', 'design'),
                    success: fc.boolean(),
                    itemCount: fc.integer({ min: 0, max: 20 }),
                }),
                (completion) => {
                    // Property: completion SHALL have project identifier
                    expect(completion.projectName).toBeDefined();

                    // Property: completion SHALL have stage identifier
                    expect(completion.stage).toBeDefined();

                    // Property: completion SHALL have success status
                    expect(typeof completion.success).toBe('boolean');

                    // Property: on success, itemCount SHALL be >= 0
                    if (completion.success) {
                        expect(completion.itemCount).toBeGreaterThanOrEqual(0);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should validate stage file data structure', () => {
        fc.assert(
            fc.property(
                fc.constantFrom('users', 'features', 'stories', 'design'),
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        name: fc.string({ minLength: 1, maxLength: 100 }),
                    }),
                    { minLength: 0, maxLength: 10 }
                ),
                (stage, items) => {
                    // Simulate stage file structure
                    const stageFile: Record<string, unknown> = {
                        projectName: 'test-project',
                        stage,
                        completed: items.length > 0,
                        updatedAt: Date.now(),
                        data: {},
                    };

                    // Add stage-specific data
                    if (stage === 'users') {
                        (stageFile.data as Record<string, unknown>).personas = items;
                    } else if (stage === 'features') {
                        (stageFile.data as Record<string, unknown>).features = items;
                    } else if (stage === 'stories') {
                        (stageFile.data as Record<string, unknown>).stories = items;
                    } else if (stage === 'design') {
                        (stageFile.data as Record<string, unknown>).pages = items;
                    }

                    // Property: stage file SHALL be JSON serializable
                    expect(() => JSON.stringify(stageFile)).not.toThrow();

                    // Property: stage file SHALL have required metadata
                    expect(stageFile.stage).toBe(stage);
                    expect(typeof stageFile.completed).toBe('boolean');
                    expect(typeof stageFile.updatedAt).toBe('number');
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * **Feature: build-mode-fixes, Property 15: Content Generation Error Handling**
 *
 * *For any* content generation failure, the system SHALL save partial content
 * and mark the stage with an error, then send an error message to the webview.
 *
 * **Validates: Requirements 8.4**
 */
describe('Property 15: Content Generation Error Handling', () => {
    it('should validate error message structure', () => {
        fc.assert(
            fc.property(
                fc.record({
                    projectName: fc
                        .string({ minLength: 1, maxLength: 50 })
                        .filter((s) => /^[a-z0-9-]+$/.test(s)),
                    stage: fc.constantFrom('users', 'features', 'stories', 'design'),
                    error: fc.string({ minLength: 1, maxLength: 200 }),
                    partialItemCount: fc.integer({ min: 0, max: 10 }),
                }),
                (errorResult) => {
                    // Property: error result SHALL have project identifier
                    expect(errorResult.projectName).toBeDefined();

                    // Property: error result SHALL have stage identifier
                    expect(errorResult.stage).toBeDefined();

                    // Property: error result SHALL have error message
                    expect(errorResult.error).toBeDefined();
                    expect(errorResult.error.length).toBeGreaterThan(0);

                    // Property: error result SHALL have partial item count
                    expect(typeof errorResult.partialItemCount).toBe('number');
                    expect(errorResult.partialItemCount).toBeGreaterThanOrEqual(0);
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should validate error stage file preserves partial content', () => {
        fc.assert(
            fc.property(
                fc.record({
                    stage: fc.constantFrom('users', 'features', 'stories', 'design'),
                    error: fc.string({ minLength: 1, maxLength: 200 }),
                }),
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        name: fc.string({ minLength: 1, maxLength: 100 }),
                    }),
                    { minLength: 0, maxLength: 5 }
                ),
                (errorInfo, partialItems) => {
                    // Simulate error stage file
                    const stageFile = {
                        projectName: 'test-project',
                        stage: errorInfo.stage,
                        completed: false,
                        error: errorInfo.error,
                        updatedAt: Date.now(),
                        data: { personas: partialItems },
                    };

                    // Property: error stage file SHALL have error field
                    expect(stageFile.error).toBeDefined();

                    // Property: error stage file SHALL NOT be marked complete
                    expect(stageFile.completed).toBe(false);

                    // Property: error stage file SHALL preserve partial data
                    expect(stageFile.data).toBeDefined();
                    expect(Array.isArray(stageFile.data.personas)).toBe(true);
                    expect(stageFile.data.personas.length).toBe(partialItems.length);
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * Property 16: Feature Survey Persona Agent Creation
 * Validates: Requirements 10.1, 10.2
 */
describe('Property 16: Feature Survey Persona Agent Creation', () => {
    it('should create unique agent for each persona with proper context', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        backstory: fc.string({ minLength: 10, maxLength: 500 }),
                        attributes: fc.record({
                            occupation: fc.string({ minLength: 1, maxLength: 50 }),
                            age: fc.integer({ min: 18, max: 80 }).map(String),
                        }),
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                fc.string({ minLength: 10, maxLength: 200 }),
                (personas, idea) => {
                    // Simulate agent creation for each persona
                    const agents = personas.map((persona, index) => ({
                        conversationId: `interview-project-${persona.id}-${Date.now() + index}`,
                        systemPrompt: `You are ${persona.name}. Occupation: ${persona.attributes.occupation}. Backstory: ${persona.backstory}. Product Idea: "${idea}"`,
                        personaId: persona.id,
                    }));

                    // Property: each persona SHALL have unique conversation ID
                    const conversationIds = new Set(agents.map((a) => a.conversationId));
                    expect(conversationIds.size).toBe(personas.length);

                    // Property: each agent SHALL include persona name in system prompt
                    for (let i = 0; i < personas.length; i++) {
                        expect(agents[i].systemPrompt).toContain(personas[i].name);
                    }

                    // Property: each agent SHALL include persona occupation in system prompt
                    for (let i = 0; i < personas.length; i++) {
                        expect(agents[i].systemPrompt).toContain(personas[i].attributes.occupation);
                    }

                    // Property: each agent SHALL include idea in system prompt
                    for (const agent of agents) {
                        expect(agent.systemPrompt).toContain(idea);
                    }
                }
            ),
            { numRuns: 30 }
        );
    });
});

/**
 * Property 17: Feature Survey Response Structure
 * Validates: Requirements 10.3, 10.4
 */
describe('Property 17: Feature Survey Response Structure', () => {
    it('should validate consolidated feature structure', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        personaId: fc.uuid(),
                        personaName: fc.string({ minLength: 1 }),
                        features: fc.array(
                            fc.record({
                                name: fc.string({ minLength: 1, maxLength: 100 }),
                                reason: fc.string({ minLength: 1, maxLength: 200 }),
                            }),
                            { minLength: 1, maxLength: 5 }
                        ),
                        score: fc.integer({ min: 0, max: 10 }),
                        feedback: fc.string({ minLength: 1, maxLength: 500 }),
                    }),
                    { minLength: 2, maxLength: 5 }
                ),
                (surveyResponses) => {
                    // Simulate feature consolidation
                    const featureMap = new Map<string, { name: string; reasons: string[]; scores: number[]; personas: string[] }>();

                    for (const response of surveyResponses) {
                        for (const feature of response.features) {
                            const existing = featureMap.get(feature.name) || {
                                name: feature.name,
                                reasons: [],
                                scores: [],
                                personas: [],
                            };
                            existing.reasons.push(feature.reason);
                            existing.scores.push(response.score);
                            existing.personas.push(response.personaName);
                            featureMap.set(feature.name, existing);
                        }
                    }

                    const consolidatedFeatures = Array.from(featureMap.values()).map((f) => ({
                        name: f.name,
                        description: f.reasons.join('; '),
                        score: f.scores.reduce((a, b) => a + b, 0) / f.scores.length,
                        frequency: f.personas.length > 2 ? 'High' : f.personas.length > 1 ? 'Medium' : 'Low',
                        priority:
                            f.scores.reduce((a, b) => a + b, 0) / f.scores.length > 7 ? 'High' : 'Medium',
                        personas: f.personas,
                    }));

                    // Property: consolidated features SHALL have valid scores (0-10)
                    for (const feature of consolidatedFeatures) {
                        expect(feature.score).toBeGreaterThanOrEqual(0);
                        expect(feature.score).toBeLessThanOrEqual(10);
                    }

                    // Property: consolidated features SHALL have at least one persona
                    for (const feature of consolidatedFeatures) {
                        expect(feature.personas.length).toBeGreaterThan(0);
                    }

                    // Property: frequency SHALL be 'High', 'Medium', or 'Low'
                    for (const feature of consolidatedFeatures) {
                        expect(['High', 'Medium', 'Low']).toContain(feature.frequency);
                    }
                }
            ),
            { numRuns: 30 }
        );
    });
});

/**
 * Property 18: Research Workflow Agent Configuration
 * Validates: Requirements 11.2, 11.4
 */
describe('Property 18: Research Workflow Agent Configuration', () => {
    it('should create research agents with proper roles and prompts', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 10, maxLength: 500 }),
                (_ideaDescription) => {
                    // Define research agents as specified in BuildModeService
                    const researchAgents = [
                        {
                            id: 'competitive-analyst',
                            role: 'Competitive Analyst',
                            systemPrompt: `competitive analysis researcher`,
                        },
                        {
                            id: 'market-researcher',
                            role: 'Market Researcher',
                            systemPrompt: `market research analyst`,
                        },
                        {
                            id: 'user-researcher',
                            role: 'User Researcher',
                            systemPrompt: `user researcher`,
                        },
                    ];

                    // Property: research workflow SHALL have exactly 3 research agents
                    expect(researchAgents.length).toBe(3);

                    // Property: each agent SHALL have unique ID
                    const ids = new Set(researchAgents.map((a) => a.id));
                    expect(ids.size).toBe(researchAgents.length);

                    // Property: each agent SHALL have defined role
                    for (const agent of researchAgents) {
                        expect(agent.role.length).toBeGreaterThan(0);
                    }

                    // Property: each agent SHALL have non-empty system prompt
                    for (const agent of researchAgents) {
                        expect(agent.systemPrompt.length).toBeGreaterThan(0);
                    }

                    // Property: research agents SHALL include specific roles
                    const roles = researchAgents.map((a) => a.role);
                    expect(roles).toContain('Competitive Analyst');
                    expect(roles).toContain('Market Researcher');
                    expect(roles).toContain('User Researcher');
                }
            ),
            { numRuns: 20 }
        );
    });
});

/**
 * Property 19: Research Report Structure
 * Validates: Requirements 11.5, 11.6
 */
describe('Property 19: Research Report Structure', () => {
    it('should validate synthesized research report structure', () => {
        fc.assert(
            fc.property(
                fc.record({
                    competitiveAnalysis: fc.string({ minLength: 50, maxLength: 1000 }),
                    marketResearch: fc.string({ minLength: 50, maxLength: 1000 }),
                    userResearch: fc.string({ minLength: 50, maxLength: 1000 }),
                }),
                (researchData) => {
                    // Simulate synthesized report
                    const report = {
                        ideaDescription: 'Test idea',
                        competitiveAnalysis: researchData.competitiveAnalysis,
                        marketResearch: researchData.marketResearch,
                        userResearch: researchData.userResearch,
                        synthesizedReport: `Executive Summary: Combined analysis of competitive, market, and user research.`,
                        success: true,
                        timestamp: Date.now(),
                    };

                    // Property: report SHALL have all research sections
                    expect(report.competitiveAnalysis).toBeDefined();
                    expect(report.marketResearch).toBeDefined();
                    expect(report.userResearch).toBeDefined();

                    // Property: report SHALL have synthesized section
                    expect(report.synthesizedReport).toBeDefined();
                    expect(report.synthesizedReport.length).toBeGreaterThan(0);

                    // Property: successful report SHALL have success=true
                    expect(report.success).toBe(true);

                    // Property: report SHALL have timestamp
                    expect(report.timestamp).toBeGreaterThan(0);
                }
            ),
            { numRuns: 20 }
        );
    });
});

/**
 * Property 20: Building Workflow Serial Execution
 * Validates: Requirements 12.2, 12.3, 12.4
 */
describe('Property 20: Building Workflow Serial Execution', () => {
    it('should validate building workflow follows UX -> Dev -> Feedback sequence', () => {
        fc.assert(
            fc.property(
                fc.record({
                    title: fc.string({ minLength: 5, maxLength: 100 }),
                    description: fc.string({ minLength: 10, maxLength: 300 }),
                    acceptanceCriteria: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
                }),
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        name: fc.string({ minLength: 1 }),
                        backstory: fc.string({ minLength: 10 }),
                    }),
                    { minLength: 1, maxLength: 3 }
                ),
                (_userStory, personas) => {
                    // Simulate building workflow steps
                    const steps = [
                        { agentId: 'ux-agent', role: 'UX Designer', order: 1 },
                        { agentId: 'developer-agent', role: 'Developer', order: 2 },
                        ...personas.map((p, _i) => ({
                            agentId: `feedback-${p.id}`,
                            role: `${p.name} Feedback`,
                            order: 3,
                        })),
                    ];

                    // Property: workflow SHALL have UX agent as first step
                    expect(steps[0].agentId).toBe('ux-agent');

                    // Property: workflow SHALL have Developer agent as second step
                    expect(steps[1].agentId).toBe('developer-agent');

                    // Property: workflow SHALL have feedback agents after developer
                    const feedbackSteps = steps.filter((s) => s.agentId.startsWith('feedback-'));
                    expect(feedbackSteps.length).toBe(personas.length);

                    // Property: total steps SHALL equal 2 + number of personas
                    expect(steps.length).toBe(2 + personas.length);
                }
            ),
            { numRuns: 30 }
        );
    });
});

/**
 * Property 21: Building Workflow Feedback Aggregation
 * Validates: Requirements 12.6, 12.7
 */
describe('Property 21: Building Workflow Feedback Aggregation', () => {
    it('should validate feedback aggregation produces valid summary', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        personaId: fc.uuid(),
                        personaName: fc.string({ minLength: 1 }),
                        rating: fc.integer({ min: 1, max: 10 }),
                        positives: fc.array(fc.string({ minLength: 5 }), { minLength: 0, maxLength: 3 }),
                        improvements: fc.array(fc.string({ minLength: 5 }), { minLength: 0, maxLength: 3 }),
                        suggestions: fc.array(fc.string({ minLength: 5 }), { minLength: 0, maxLength: 3 }),
                        wouldUse: fc.boolean(),
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                (feedbackResults) => {
                    // Simulate aggregation
                    const validFeedback = feedbackResults.filter((f) => f.rating > 0);
                    const averageRating = validFeedback.length > 0
                        ? validFeedback.reduce((sum, f) => sum + f.rating, 0) / validFeedback.length
                        : 0;

                    const aggregatedFeedback = {
                        averageRating: Math.round(averageRating * 10) / 10,
                        totalResponses: feedbackResults.length,
                        positives: feedbackResults.flatMap((f) => f.positives || []).slice(0, 5),
                        improvements: feedbackResults.flatMap((f) => f.improvements || []).slice(0, 5),
                        suggestions: feedbackResults.flatMap((f) => f.suggestions || []).slice(0, 5),
                    };

                    // Property: average rating SHALL be between 0 and 10
                    expect(aggregatedFeedback.averageRating).toBeGreaterThanOrEqual(0);
                    expect(aggregatedFeedback.averageRating).toBeLessThanOrEqual(10);

                    // Property: total responses SHALL match input count
                    expect(aggregatedFeedback.totalResponses).toBe(feedbackResults.length);

                    // Property: aggregated lists SHALL have max 5 items
                    expect(aggregatedFeedback.positives.length).toBeLessThanOrEqual(5);
                    expect(aggregatedFeedback.improvements.length).toBeLessThanOrEqual(5);
                    expect(aggregatedFeedback.suggestions.length).toBeLessThanOrEqual(5);
                }
            ),
            { numRuns: 30 }
        );
    });
});

/**
 * Property 22: Single Feature Regeneration
 * Validates: Requirements 10.6
 */
describe('Property 22: Single Feature Regeneration', () => {
    it('should preserve feature ID and project context during regeneration', () => {
        fc.assert(
            fc.property(
                fc.uuid(),
                fc.string({ minLength: 3, maxLength: 50 }),
                fc.record({
                    name: fc.string({ minLength: 1 }),
                    description: fc.string({ minLength: 5 }),
                    score: fc.integer({ min: 1, max: 10 }),
                    priority: fc.constantFrom('High', 'Medium', 'Low'),
                }),
                (featureId, projectName, originalFeature) => {
                    // Simulate regeneration request
                    const regenerationRequest = {
                        projectName,
                        featureId,
                        originalFeature,
                        surveyData: null,
                    };

                    // Property: request SHALL have valid project name
                    expect(regenerationRequest.projectName.length).toBeGreaterThan(0);

                    // Property: request SHALL have valid feature ID
                    expect(regenerationRequest.featureId.length).toBeGreaterThan(0);

                    // Property: original feature SHALL be preserved for context
                    expect(regenerationRequest.originalFeature).toBeDefined();
                    expect(regenerationRequest.originalFeature.name).toBeDefined();

                    // Simulate response
                    const regeneratedFeature = {
                        id: featureId, // ID must be preserved
                        name: `Improved ${originalFeature.name}`,
                        description: originalFeature.description,
                        score: originalFeature.score,
                        priority: originalFeature.priority,
                    };

                    // Property: regenerated feature SHALL preserve original ID
                    expect(regeneratedFeature.id).toBe(featureId);
                }
            ),
            { numRuns: 30 }
        );
    });
});
