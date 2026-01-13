/**
 * Property Tests for ValidationService
 *
 * These property-based tests validate critical invariants:
 * - Property 2: User Story Format Validation
 * - Property 7: Page Name Uniqueness
 * - Property 14: Input Validation
 *
 * **Part of Build-to-Design Transformation**
 * Validates: Requirements 4.3, 4.4, 4.5, 7.4, 17.4, 18.2, 18.3
 */

import {
    ValidationService,
    PageForValidation,
    TaskForValidation,
    JSONSchema,
} from '../ValidationService';
import { createEmptyTraceabilityMap, TrackedItem } from '../../types/WorkflowStateTypes';

describe('ValidationService Property Tests', () => {
    let validator: ValidationService;

    beforeEach(() => {
        validator = new ValidationService();
    });

    // =========================================================================
    // Property 2: User Story Format Validation
    // =========================================================================
    describe('Property 2: User Story Format Validation', () => {
        /**
         * Property 2: All user stories MUST follow the format:
         * "As a [role], I want [feature], so that [benefit]"
         */

        describe('valid user stories', () => {
            const validStories = [
                'As a user, I want to log in, so that I can access my account.',
                'As an admin, I want to manage users, so that I can control access.',
                'As a developer, I want to write tests, so that I can ensure code quality.',
                'As a customer, I want to view my orders, so that I can track my purchases.',
                'As an end user, I want a simple interface, so that I can navigate easily.',
                'As a project manager, I want to assign tasks, so that work is distributed evenly.',
            ];

            test.each(validStories)('should validate: "%s"', (story) => {
                const result = validator.validateUserStoryFormat(story);
                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
                expect(result.data).toBeDefined();
                expect(result.data?.role).toBeDefined();
                expect(result.data?.want).toBeDefined();
                expect(result.data?.benefit).toBeDefined();
            });

            it('should parse story components correctly', () => {
                const story = 'As a developer, I want to deploy code, so that users get new features.';
                const result = validator.validateUserStoryFormat(story);

                expect(result.isValid).toBe(true);
                expect(result.data?.role).toBe('developer');
                expect(result.data?.want).toBe('to deploy code');
                expect(result.data?.benefit).toBe('users get new features');
            });

            it('should handle "As an" correctly', () => {
                const story = 'As an administrator, I want to reset passwords, so that users can recover access.';
                const result = validator.validateUserStoryFormat(story);

                expect(result.isValid).toBe(true);
                expect(result.data?.role).toBe('administrator');
            });

            it('should handle multiword roles', () => {
                const story = 'As a project team leader, I want to view reports, so that I can track progress.';
                const result = validator.validateUserStoryFormat(story);

                expect(result.isValid).toBe(true);
                expect(result.data?.role).toBe('project team leader');
            });

            it('should remove trailing periods from benefit', () => {
                const story = 'As a user, I want to save data, so that I can access it later...';
                const result = validator.validateUserStoryFormat(story);

                expect(result.isValid).toBe(true);
                expect(result.data?.benefit).not.toMatch(/\.+$/);
            });
        });

        describe('invalid user stories', () => {
            it('should reject empty stories', () => {
                const result = validator.validateUserStoryFormat('');
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'EMPTY_STORY')).toBe(true);
            });

            it('should reject null/undefined', () => {
                expect(validator.validateUserStoryFormat(null as any).isValid).toBe(false);
                expect(validator.validateUserStoryFormat(undefined as any).isValid).toBe(false);
            });

            it('should reject stories too short', () => {
                const result = validator.validateUserStoryFormat('Short.');
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'STORY_TOO_SHORT')).toBe(true);
            });

            it('should reject stories missing "As a"', () => {
                const story = 'I want to log in, so that I can access my account.';
                const result = validator.validateUserStoryFormat(story);
                expect(result.isValid).toBe(false);
                expect(result.warnings.some(w => w.code === 'MISSING_ROLE')).toBe(true);
            });

            it('should reject stories missing "I want"', () => {
                const story = 'As a user, so that I can access my account.';
                const result = validator.validateUserStoryFormat(story);
                expect(result.isValid).toBe(false);
                expect(result.warnings.some(w => w.code === 'MISSING_WANT')).toBe(true);
            });

            it('should reject stories missing "so that"', () => {
                const story = 'As a user, I want to log in to access my account.';
                const result = validator.validateUserStoryFormat(story);
                expect(result.isValid).toBe(false);
                expect(result.warnings.some(w => w.code === 'MISSING_BENEFIT')).toBe(true);
            });

            it('should reject stories with empty role', () => {
                const story = 'As a , I want to log in, so that I can access.';
                const result = validator.validateUserStoryFormat(story);
                expect(result.isValid).toBe(false);
            });

            it('should reject stories with too short want', () => {
                const story = 'As a user, I want x, so that I can access my account.';
                const result = validator.validateUserStoryFormat(story);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'WANT_TOO_SHORT')).toBe(true);
            });

            it('should reject stories with too short benefit', () => {
                const story = 'As a user, I want to log in, so that it.';
                const result = validator.validateUserStoryFormat(story);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'BENEFIT_TOO_SHORT')).toBe(true);
            });
        });
    });

    // =========================================================================
    // Property 7: Page Name Uniqueness
    // =========================================================================
    describe('Property 7: Page Name Uniqueness', () => {
        /**
         * Property 7: For any set of generated pages within a project,
         * all page names SHALL be unique (case-insensitive comparison).
         */

        const existingPages: PageForValidation[] = [
            { id: 'page-1', name: 'Home' },
            { id: 'page-2', name: 'About' },
            { id: 'page-3', name: 'Contact' },
            { id: 'page-4', name: 'Dashboard' },
        ];

        describe('valid page names', () => {
            const validNames = ['Profile', 'Settings', 'Login', 'Register', 'Products'];

            test.each(validNames)('should allow unique name: "%s"', (name) => {
                const result = validator.validatePageNameUniqueness(name, existingPages);
                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should allow special characters in names', () => {
                const result = validator.validatePageNameUniqueness('User-Profile_2', existingPages);
                expect(result.isValid).toBe(true);
            });

            it('should allow numbers in names', () => {
                const result = validator.validatePageNameUniqueness('Step1', existingPages);
                expect(result.isValid).toBe(true);
            });
        });

        describe('invalid page names', () => {
            it('should reject empty names', () => {
                const result = validator.validatePageNameUniqueness('', existingPages);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'EMPTY_PAGE_NAME')).toBe(true);
            });

            it('should reject null/undefined', () => {
                expect(validator.validatePageNameUniqueness(null as any, existingPages).isValid).toBe(false);
                expect(validator.validatePageNameUniqueness(undefined as any, existingPages).isValid).toBe(false);
            });

            it('should reject names too short', () => {
                const result = validator.validatePageNameUniqueness('X', existingPages);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'PAGE_NAME_TOO_SHORT')).toBe(true);
            });

            it('should reject names too long', () => {
                const longName = 'A'.repeat(101);
                const result = validator.validatePageNameUniqueness(longName, existingPages);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'PAGE_NAME_TOO_LONG')).toBe(true);
            });

            it('should reject invalid characters', () => {
                const result = validator.validatePageNameUniqueness('Page@Name!', existingPages);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'INVALID_PAGE_NAME_CHARS')).toBe(true);
            });
        });

        describe('case-insensitive uniqueness', () => {
            it('should reject exact duplicates', () => {
                const result = validator.validatePageNameUniqueness('Home', existingPages);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'DUPLICATE_PAGE_NAME')).toBe(true);
            });

            it('should reject lowercase duplicates', () => {
                const result = validator.validatePageNameUniqueness('home', existingPages);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'DUPLICATE_PAGE_NAME')).toBe(true);
            });

            it('should reject uppercase duplicates', () => {
                const result = validator.validatePageNameUniqueness('HOME', existingPages);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'DUPLICATE_PAGE_NAME')).toBe(true);
            });

            it('should reject mixed case duplicates', () => {
                const result = validator.validatePageNameUniqueness('HoMe', existingPages);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'DUPLICATE_PAGE_NAME')).toBe(true);
            });

            it('should allow same name when updating existing page', () => {
                const result = validator.validatePageNameUniqueness('Home', existingPages, 'page-1');
                expect(result.isValid).toBe(true);
            });
        });

        describe('reserved names warning', () => {
            const reservedNames = ['index', 'home', 'default', 'main', 'root'];

            test.each(reservedNames)('should warn about reserved name: "%s"', (name) => {
                // Need empty pages array since 'home' would conflict with existing
                const result = validator.validatePageNameUniqueness(name, []);
                expect(result.warnings.some(w => w.code === 'RESERVED_PAGE_NAME')).toBe(true);
            });
        });
    });

    // =========================================================================
    // Property 14: Input Validation (JSON Schema)
    // =========================================================================
    describe('Property 14: Input Validation (JSON Schema)', () => {
        /**
         * Property 14: All user inputs and agent outputs MUST be validated
         * against expected formats and schemas before processing.
         */

        describe('type validation', () => {
            it('should validate string type', () => {
                const schema: JSONSchema = { type: 'string' };
                expect(validator.validateAgentOutput('hello', schema).isValid).toBe(true);
                expect(validator.validateAgentOutput(123, schema).isValid).toBe(false);
            });

            it('should validate number type', () => {
                const schema: JSONSchema = { type: 'number' };
                expect(validator.validateAgentOutput(42, schema).isValid).toBe(true);
                expect(validator.validateAgentOutput('42', schema).isValid).toBe(false);
            });

            it('should validate boolean type', () => {
                const schema: JSONSchema = { type: 'boolean' };
                expect(validator.validateAgentOutput(true, schema).isValid).toBe(true);
                expect(validator.validateAgentOutput(false, schema).isValid).toBe(true);
                expect(validator.validateAgentOutput('true', schema).isValid).toBe(false);
            });

            it('should validate array type', () => {
                const schema: JSONSchema = { type: 'array' };
                expect(validator.validateAgentOutput([], schema).isValid).toBe(true);
                expect(validator.validateAgentOutput([1, 2, 3], schema).isValid).toBe(true);
                expect(validator.validateAgentOutput({}, schema).isValid).toBe(false);
            });

            it('should validate object type', () => {
                const schema: JSONSchema = { type: 'object' };
                expect(validator.validateAgentOutput({}, schema).isValid).toBe(true);
                expect(validator.validateAgentOutput({ a: 1 }, schema).isValid).toBe(true);
                expect(validator.validateAgentOutput([], schema).isValid).toBe(false);
            });

            it('should validate null type', () => {
                const schema: JSONSchema = { type: 'null' };
                expect(validator.validateAgentOutput(null, schema).isValid).toBe(true);
                expect(validator.validateAgentOutput(undefined, schema).isValid).toBe(false);
            });
        });

        describe('object property validation', () => {
            const personaSchema: JSONSchema = {
                type: 'object',
                required: ['name', 'role'],
                properties: {
                    name: { type: 'string', minLength: 2 },
                    role: { type: 'string' },
                    age: { type: 'number', minimum: 0, maximum: 150 },
                },
            };

            it('should validate valid objects', () => {
                const result = validator.validateAgentOutput(
                    { name: 'John', role: 'Developer', age: 30 },
                    personaSchema
                );
                expect(result.isValid).toBe(true);
            });

            it('should reject missing required properties', () => {
                const result = validator.validateAgentOutput(
                    { name: 'John' }, // missing 'role'
                    personaSchema
                );
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'MISSING_REQUIRED_PROPERTY')).toBe(true);
            });

            it('should reject invalid property types', () => {
                const result = validator.validateAgentOutput(
                    { name: 'John', role: 'Developer', age: 'thirty' },
                    personaSchema
                );
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'TYPE_MISMATCH')).toBe(true);
            });

            it('should reject values below minimum', () => {
                const result = validator.validateAgentOutput(
                    { name: 'John', role: 'Developer', age: -5 },
                    personaSchema
                );
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'NUMBER_TOO_SMALL')).toBe(true);
            });

            it('should reject values above maximum', () => {
                const result = validator.validateAgentOutput(
                    { name: 'John', role: 'Developer', age: 200 },
                    personaSchema
                );
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'NUMBER_TOO_LARGE')).toBe(true);
            });

            it('should reject strings below minLength', () => {
                const result = validator.validateAgentOutput(
                    { name: 'J', role: 'Developer' },
                    personaSchema
                );
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'STRING_TOO_SHORT')).toBe(true);
            });
        });

        describe('array validation', () => {
            const arraySchema: JSONSchema = {
                type: 'array',
                items: {
                    type: 'string',
                    minLength: 2,
                },
            };

            it('should validate valid arrays', () => {
                const result = validator.validateAgentOutput(
                    ['ab', 'cd', 'ef'],
                    arraySchema
                );
                expect(result.isValid).toBe(true);
            });

            it('should validate empty arrays', () => {
                const result = validator.validateAgentOutput([], arraySchema);
                expect(result.isValid).toBe(true);
            });

            it('should reject invalid array items', () => {
                const result = validator.validateAgentOutput(
                    ['ab', 'x', 'cd'], // 'x' is too short (minLength: 2)
                    arraySchema
                );
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.field?.includes('[1]'))).toBe(true);
                expect(result.errors.some(e => e.code === 'STRING_TOO_SHORT')).toBe(true);
            });
        });

        describe('pattern validation', () => {
            const emailSchema: JSONSchema = {
                type: 'object',
                properties: {
                    email: {
                        type: 'string',
                        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                    },
                },
            };

            it('should validate matching patterns', () => {
                const result = validator.validateAgentOutput(
                    { email: 'test@example.com' },
                    emailSchema
                );
                expect(result.isValid).toBe(true);
            });

            it('should reject non-matching patterns', () => {
                const result = validator.validateAgentOutput(
                    { email: 'not-an-email' },
                    emailSchema
                );
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'PATTERN_MISMATCH')).toBe(true);
            });
        });

        describe('enum validation', () => {
            const prioritySchema: JSONSchema = {
                type: 'object',
                properties: {
                    priority: {
                        type: 'string',
                        enum: ['high', 'medium', 'low'],
                    },
                },
            };

            it('should validate valid enum values', () => {
                expect(validator.validateAgentOutput({ priority: 'high' }, prioritySchema).isValid).toBe(true);
                expect(validator.validateAgentOutput({ priority: 'medium' }, prioritySchema).isValid).toBe(true);
                expect(validator.validateAgentOutput({ priority: 'low' }, prioritySchema).isValid).toBe(true);
            });

            it('should reject invalid enum values', () => {
                const result = validator.validateAgentOutput(
                    { priority: 'urgent' },
                    prioritySchema
                );
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.code === 'INVALID_ENUM_VALUE')).toBe(true);
            });
        });
    });

    // =========================================================================
    // Task Dependency Validation
    // =========================================================================
    describe('Task Dependency Validation', () => {
        const tasks: TaskForValidation[] = [
            { id: 'task-1', dependencies: [] },
            { id: 'task-2', dependencies: ['task-1'] },
            { id: 'task-3', dependencies: ['task-2'] },
            { id: 'task-4', dependencies: ['task-1', 'task-2'] },
        ];

        it('should validate tasks with valid dependencies', () => {
            const newTask: TaskForValidation = {
                id: 'task-5',
                dependencies: ['task-3', 'task-4'],
            };
            const result = validator.validateTaskDependencies(newTask, tasks);
            expect(result.isValid).toBe(true);
        });

        it('should validate tasks with no dependencies', () => {
            const newTask: TaskForValidation = { id: 'task-5', dependencies: [] };
            const result = validator.validateTaskDependencies(newTask, tasks);
            expect(result.isValid).toBe(true);
        });

        it('should reject invalid dependency references', () => {
            const newTask: TaskForValidation = {
                id: 'task-5',
                dependencies: ['task-999'],
            };
            const result = validator.validateTaskDependencies(newTask, tasks);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.code === 'INVALID_DEPENDENCY')).toBe(true);
        });

        it('should reject self-dependencies', () => {
            const newTask: TaskForValidation = {
                id: 'task-5',
                dependencies: ['task-5'],
            };
            const result = validator.validateTaskDependencies(newTask, tasks);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.code === 'SELF_DEPENDENCY')).toBe(true);
        });

        it('should detect circular dependencies', () => {
            const circularTasks: TaskForValidation[] = [
                { id: 'task-a', dependencies: ['task-c'] },
                { id: 'task-b', dependencies: ['task-a'] },
                { id: 'task-c', dependencies: ['task-b'] },
            ];
            const result = validator.validateTaskDependencies(circularTasks[0], circularTasks);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
        });

        it('should warn about long dependency chains', () => {
            // Create a chain of 7 tasks (depth > 5)
            const longChainTasks: TaskForValidation[] = [
                { id: 'task-1', dependencies: [] },
                { id: 'task-2', dependencies: ['task-1'] },
                { id: 'task-3', dependencies: ['task-2'] },
                { id: 'task-4', dependencies: ['task-3'] },
                { id: 'task-5', dependencies: ['task-4'] },
                { id: 'task-6', dependencies: ['task-5'] },
                { id: 'task-7', dependencies: ['task-6'] }, // depth of 6
            ];
            const result = validator.validateTaskDependencies(longChainTasks[6], longChainTasks);
            expect(result.isValid).toBe(true);
            expect(result.warnings.some(w => w.code === 'LONG_DEPENDENCY_CHAIN')).toBe(true);
        });
    });

    // =========================================================================
    // Traceability Link Validation
    // =========================================================================
    describe('Traceability Link Validation', () => {
        it('should validate items with proper links', () => {
            const traceability = createEmptyTraceabilityMap();
            traceability.links.push({
                fromId: 'story-1',
                toId: 'feature-1',
                linkType: 'story-to-feature',
                createdAt: Date.now(),
            });
            traceability.bySourceId['story-1'] = [traceability.links[0]];
            traceability.byTargetId['feature-1'] = [traceability.links[0]];

            const item: TrackedItem = {
                id: 'story-1',
                itemType: 'story',
                isUserModified: false,
                createdAt: Date.now(),
                modifiedAt: Date.now(),
            };

            const result = validator.validateTraceabilityLinks(item, traceability);
            expect(result.isValid).toBe(true);
        });

        it('should warn about orphan story links', () => {
            const traceability = createEmptyTraceabilityMap();

            const item: TrackedItem = {
                id: 'story-1',
                itemType: 'story',
                isUserModified: false,
                createdAt: Date.now(),
                modifiedAt: Date.now(),
            };

            const result = validator.validateTraceabilityLinks(item, traceability);
            expect(result.warnings.some(w => w.code === 'STORY_NO_FEATURE')).toBe(true);
        });

        it('should warn about orphan task links', () => {
            const traceability = createEmptyTraceabilityMap();

            const item: TrackedItem = {
                id: 'task-1',
                itemType: 'task',
                isUserModified: false,
                createdAt: Date.now(),
                modifiedAt: Date.now(),
            };

            const result = validator.validateTraceabilityLinks(item, traceability);
            expect(result.warnings.some(w => w.code === 'TASK_NO_STORY')).toBe(true);
        });
    });
});
