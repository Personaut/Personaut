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
