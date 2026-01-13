/**
 * ValidationService - Validates agent output and user modifications
 *
 * Minimal implementation for validating:
 * - User story format ("As a [role], I want [feature], so that [benefit]")
 * - Page name uniqueness (case-insensitive)
 * - Task dependencies (no circular dependencies, valid references)
 * - Agent output against JSON schema
 *
 * **Part of Build-to-Design Transformation**
 * Validates: Requirements 4.3, 4.4, 4.5, 7.4, 17.4, 18.2, 18.3
 */

import {
    TrackedItem,
    TraceabilityMap,
} from '../types/WorkflowStateTypes';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Validation error with details
 */
export interface ValidationError {
    /** Error code for programmatic handling */
    code: string;

    /** Human-readable error message */
    message: string;

    /** Field or property that failed validation */
    field?: string;

    /** Expected value or format */
    expected?: string;

    /** Actual value received */
    actual?: string;
}

/**
 * Validation warning (non-blocking)
 */
export interface ValidationWarning {
    /** Warning code */
    code: string;

    /** Human-readable warning message */
    message: string;

    /** Field or property with warning */
    field?: string;
}

/**
 * Result of a validation operation
 */
export interface ValidationResult<T = unknown> {
    /** Whether validation passed */
    isValid: boolean;

    /** List of validation errors (blocking) */
    errors: ValidationError[];

    /** List of validation warnings (non-blocking) */
    warnings: ValidationWarning[];

    /** Validated/parsed data (if valid) */
    data?: T;
}

/**
 * JSON Schema definition (simplified)
 */
export interface JSONSchema {
    type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
    properties?: Record<string, JSONSchemaProperty>;
    required?: string[];
    items?: JSONSchemaProperty;
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    pattern?: string;
    enum?: unknown[];
}

/**
 * JSON Schema property definition
 */
export interface JSONSchemaProperty {
    type: string | string[];
    description?: string;
    required?: boolean;
    default?: unknown;
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    pattern?: string;
    enum?: unknown[];
    items?: JSONSchemaProperty;
    properties?: Record<string, JSONSchemaProperty>;
}

/**
 * Page interface for validation (minimal)
 */
export interface PageForValidation {
    id: string;
    name: string;
}

/**
 * Task interface for validation (minimal)
 */
export interface TaskForValidation {
    id: string;
    dependencies?: string[];
}

// ============================================================================
// USER STORY VALIDATION
// ============================================================================

/**
 * User story format pattern
 * Matches: "As a [role], I want [feature], so that [benefit]"
 * Flexible to allow variations like "As an admin" or multiline
 */
const USER_STORY_PATTERN = /^As\s+(?:a|an)\s+(.+?),\s*I\s+want\s+(.+?),\s*so\s+that\s+(.+)\.?$/i;

/**
 * Parsed user story components
 */
export interface ParsedUserStory {
    role: string;
    want: string;
    benefit: string;
}

// ============================================================================
// VALIDATION SERVICE CLASS
// ============================================================================

/**
 * ValidationService validates agent output and user modifications
 *
 * @example
 * ```typescript
 * const validator = new ValidationService();
 *
 * // Validate user story format
 * const result = validator.validateUserStoryFormat(
 *   "As a user, I want to log in, so that I can access my account."
 * );
 *
 * if (result.isValid) {
 *   console.log('Story is valid:', result.data);
 * }
 *
 * // Validate page name uniqueness
 * const pages = [{ id: '1', name: 'Home' }, { id: '2', name: 'About' }];
 * const nameCheck = validator.validatePageNameUniqueness('HOME', pages);
 * console.log(nameCheck.isValid); // false - case-insensitive duplicate
 * ```
 */
export class ValidationService {
    // =========================================================================
    // USER STORY VALIDATION
    // =========================================================================

    /**
     * Validate user story format
     * Expected format: "As a [role], I want [feature], so that [benefit]"
     *
     * @param story - User story string to validate
     * @returns Validation result with parsed components if valid
     */
    validateUserStoryFormat(story: string): ValidationResult<ParsedUserStory> {
        const result: ValidationResult<ParsedUserStory> = {
            isValid: false,
            errors: [],
            warnings: [],
        };

        // Check for empty input
        if (!story || typeof story !== 'string') {
            result.errors.push({
                code: 'EMPTY_STORY',
                message: 'User story cannot be empty',
                field: 'story',
            });
            return result;
        }

        // Trim and normalize whitespace
        const normalized = story.trim().replace(/\s+/g, ' ');

        // Check minimum length
        if (normalized.length < 20) {
            result.errors.push({
                code: 'STORY_TOO_SHORT',
                message: 'User story is too short. Ensure it follows the format: "As a [role], I want [feature], so that [benefit]"',
                field: 'story',
                expected: 'At least 20 characters',
                actual: `${normalized.length} characters`,
            });
            return result;
        }

        // Match against pattern
        const match = normalized.match(USER_STORY_PATTERN);

        if (!match) {
            result.errors.push({
                code: 'INVALID_FORMAT',
                message: 'User story must follow the format: "As a [role], I want [feature], so that [benefit]"',
                field: 'story',
                expected: 'As a [role], I want [feature], so that [benefit]',
                actual: normalized.substring(0, 50) + (normalized.length > 50 ? '...' : ''),
            });

            // Add specific hints based on what's missing
            if (!/^as\s+(?:a|an)\s+/i.test(normalized)) {
                result.warnings.push({
                    code: 'MISSING_ROLE',
                    message: 'Story should start with "As a [role]" or "As an [role]"',
                    field: 'role',
                });
            }
            if (!/I\s+want\s+/i.test(normalized)) {
                result.warnings.push({
                    code: 'MISSING_WANT',
                    message: 'Story should include "I want [feature]"',
                    field: 'want',
                });
            }
            if (!/so\s+that\s+/i.test(normalized)) {
                result.warnings.push({
                    code: 'MISSING_BENEFIT',
                    message: 'Story should include "so that [benefit]"',
                    field: 'benefit',
                });
            }

            return result;
        }

        // Extract components
        const [, role, want, benefit] = match;

        // Validate each component has meaningful content
        if (role.trim().length < 2) {
            result.errors.push({
                code: 'ROLE_TOO_SHORT',
                message: 'The role description is too short',
                field: 'role',
                actual: role.trim(),
            });
            return result;
        }

        if (want.trim().length < 5) {
            result.errors.push({
                code: 'WANT_TOO_SHORT',
                message: 'The feature description is too short',
                field: 'want',
                actual: want.trim(),
            });
            return result;
        }

        if (benefit.trim().length < 5) {
            result.errors.push({
                code: 'BENEFIT_TOO_SHORT',
                message: 'The benefit description is too short',
                field: 'benefit',
                actual: benefit.trim(),
            });
            return result;
        }

        // Valid story
        result.isValid = true;
        result.data = {
            role: role.trim(),
            want: want.trim(),
            benefit: benefit.trim().replace(/\.+$/, ''), // Remove trailing periods
        };

        return result;
    }

    // =========================================================================
    // PAGE NAME VALIDATION
    // =========================================================================

    /**
     * Validate page name uniqueness (case-insensitive)
     *
     * @param pageName - New page name to validate
     * @param existingPages - Array of existing pages
     * @param excludeId - Optional page ID to exclude from comparison (for updates)
     * @returns Validation result
     */
    validatePageNameUniqueness(
        pageName: string,
        existingPages: PageForValidation[],
        excludeId?: string
    ): ValidationResult {
        const result: ValidationResult = {
            isValid: false,
            errors: [],
            warnings: [],
        };

        // Check for empty name
        if (!pageName || typeof pageName !== 'string') {
            result.errors.push({
                code: 'EMPTY_PAGE_NAME',
                message: 'Page name cannot be empty',
                field: 'pageName',
            });
            return result;
        }

        const trimmedName = pageName.trim();

        // Check minimum length
        if (trimmedName.length < 2) {
            result.errors.push({
                code: 'PAGE_NAME_TOO_SHORT',
                message: 'Page name must be at least 2 characters',
                field: 'pageName',
                actual: trimmedName,
            });
            return result;
        }

        // Check maximum length
        if (trimmedName.length > 100) {
            result.errors.push({
                code: 'PAGE_NAME_TOO_LONG',
                message: 'Page name must be 100 characters or less',
                field: 'pageName',
                actual: `${trimmedName.length} characters`,
            });
            return result;
        }

        // Check for invalid characters
        if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
            result.errors.push({
                code: 'INVALID_PAGE_NAME_CHARS',
                message: 'Page name can only contain letters, numbers, spaces, hyphens, and underscores',
                field: 'pageName',
                actual: trimmedName,
            });
            return result;
        }

        // Check uniqueness (case-insensitive)
        const normalizedName = trimmedName.toLowerCase();
        const duplicate = existingPages.find(
            page => page.id !== excludeId && page.name.toLowerCase() === normalizedName
        );

        if (duplicate) {
            result.errors.push({
                code: 'DUPLICATE_PAGE_NAME',
                message: `A page named "${duplicate.name}" already exists (names are case-insensitive)`,
                field: 'pageName',
                expected: 'Unique page name',
                actual: trimmedName,
            });
            return result;
        }

        // Check for reserved names
        const reservedNames = ['index', 'home', 'default', 'main', 'root'];
        if (reservedNames.includes(normalizedName)) {
            result.warnings.push({
                code: 'RESERVED_PAGE_NAME',
                message: `"${trimmedName}" is a commonly reserved name and may cause conflicts`,
                field: 'pageName',
            });
        }

        result.isValid = true;
        return result;
    }

    // =========================================================================
    // TASK DEPENDENCY VALIDATION
    // =========================================================================

    /**
     * Validate task dependencies
     *
     * @param task - Task to validate
     * @param existingTasks - Array of all tasks
     * @returns Validation result
     */
    validateTaskDependencies(
        task: TaskForValidation,
        existingTasks: TaskForValidation[]
    ): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
        };

        if (!task.dependencies || task.dependencies.length === 0) {
            return result; // No dependencies to validate
        }

        const taskIds = new Set(existingTasks.map(t => t.id));
        taskIds.add(task.id); // Include the task itself

        // Check each dependency exists
        for (const depId of task.dependencies) {
            if (!taskIds.has(depId)) {
                result.isValid = false;
                result.errors.push({
                    code: 'INVALID_DEPENDENCY',
                    message: `Task "${task.id}" depends on non-existent task "${depId}"`,
                    field: 'dependencies',
                    expected: 'Valid task ID',
                    actual: depId,
                });
            }
        }

        // Check for self-dependency
        if (task.dependencies.includes(task.id)) {
            result.isValid = false;
            result.errors.push({
                code: 'SELF_DEPENDENCY',
                message: `Task "${task.id}" cannot depend on itself`,
                field: 'dependencies',
            });
        }

        // Check for circular dependencies
        if (result.isValid) {
            const circularPath = this.findCircularDependency(task.id, existingTasks);
            if (circularPath) {
                result.isValid = false;
                result.errors.push({
                    code: 'CIRCULAR_DEPENDENCY',
                    message: `Circular dependency detected: ${circularPath.join(' → ')}`,
                    field: 'dependencies',
                });
            }
        }

        // Warn about long dependency chains
        const chainLength = this.calculateDependencyChainLength(task.id, existingTasks);
        if (chainLength > 5) {
            result.warnings.push({
                code: 'LONG_DEPENDENCY_CHAIN',
                message: `Task has a dependency chain of ${chainLength} levels, consider simplifying`,
                field: 'dependencies',
            });
        }

        return result;
    }

    /**
     * Find circular dependency path
     */
    private findCircularDependency(
        taskId: string,
        tasks: TaskForValidation[]
    ): string[] | null {
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const visited = new Set<string>();
        const path: string[] = [];

        const dfs = (currentId: string): boolean => {
            if (path.includes(currentId)) {
                path.push(currentId);
                return true; // Cycle found
            }
            if (visited.has(currentId)) {
                return false;
            }

            visited.add(currentId);
            path.push(currentId);

            const task = taskMap.get(currentId);
            if (task?.dependencies) {
                for (const depId of task.dependencies) {
                    if (dfs(depId)) {
                        return true;
                    }
                }
            }

            path.pop();
            return false;
        };

        if (dfs(taskId)) {
            // Return the circular path
            const cycleStart = path.indexOf(path[path.length - 1]);
            return path.slice(cycleStart);
        }

        return null;
    }

    /**
     * Calculate the longest dependency chain length
     * Returns 0 for cycles (since circular deps are invalid and handled separately)
     */
    private calculateDependencyChainLength(
        taskId: string,
        tasks: TaskForValidation[]
    ): number {
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const cache = new Map<string, number>();
        const visiting = new Set<string>(); // Cycle detection

        const getDepth = (id: string): number => {
            if (cache.has(id)) {
                return cache.get(id)!;
            }

            // Cycle detection - if we're already visiting this node, return 0
            if (visiting.has(id)) {
                return 0;
            }

            visiting.add(id);

            const task = taskMap.get(id);
            if (!task?.dependencies || task.dependencies.length === 0) {
                visiting.delete(id);
                cache.set(id, 0);
                return 0;
            }

            let maxDepth = 0;
            for (const depId of task.dependencies) {
                maxDepth = Math.max(maxDepth, getDepth(depId) + 1);
            }

            visiting.delete(id);
            cache.set(id, maxDepth);
            return maxDepth;
        };

        return getDepth(taskId);
    }

    // =========================================================================
    // JSON SCHEMA VALIDATION
    // =========================================================================

    /**
     * Validate agent output against a JSON schema
     *
     * @param output - Output to validate
     * @param schema - JSON schema to validate against
     * @returns Validation result with typed data if valid
     */
    validateAgentOutput<T>(output: unknown, schema: JSONSchema): ValidationResult<T> {
        const result: ValidationResult<T> = {
            isValid: false,
            errors: [],
            warnings: [],
        };

        // Validate base type
        const typeValid = this.validateType(output, schema.type, 'root');
        if (!typeValid.isValid) {
            result.errors.push(...typeValid.errors);
            return result;
        }

        // Validate object properties
        if (schema.type === 'object' && schema.properties) {
            const obj = output as Record<string, unknown>;

            // Check required properties
            if (schema.required) {
                for (const requiredProp of schema.required) {
                    if (!(requiredProp in obj) || obj[requiredProp] === undefined) {
                        result.errors.push({
                            code: 'MISSING_REQUIRED_PROPERTY',
                            message: `Missing required property: ${requiredProp}`,
                            field: requiredProp,
                        });
                    }
                }
            }

            // Validate each property
            for (const [key, propSchema] of Object.entries(schema.properties)) {
                if (key in obj) {
                    const propResult = this.validateProperty(obj[key], propSchema, key);
                    result.errors.push(...propResult.errors);
                    result.warnings.push(...propResult.warnings);
                }
            }
        }

        // Validate array items
        if (schema.type === 'array' && schema.items && Array.isArray(output)) {
            for (let i = 0; i < output.length; i++) {
                const itemResult = this.validateProperty(output[i], schema.items, `[${i}]`);
                result.errors.push(...itemResult.errors);
                result.warnings.push(...itemResult.warnings);
            }
        }

        if (result.errors.length === 0) {
            result.isValid = true;
            result.data = output as T;
        }

        return result;
    }

    /**
     * Validate a value against a type
     */
    private validateType(
        value: unknown,
        expectedType: string | string[],
        field: string
    ): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
        };

        const types = Array.isArray(expectedType) ? expectedType : [expectedType];
        const actualType = this.getType(value);

        if (!types.includes(actualType)) {
            result.isValid = false;
            result.errors.push({
                code: 'TYPE_MISMATCH',
                message: `Expected ${types.join(' or ')} for ${field}, got ${actualType}`,
                field,
                expected: types.join(' or '),
                actual: actualType,
            });
        }

        return result;
    }

    /**
     * Validate a property against its schema
     */
    private validateProperty(
        value: unknown,
        schema: JSONSchemaProperty,
        field: string
    ): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
        };

        // Skip undefined values (handled by required check)
        if (value === undefined) {
            return result;
        }

        // Type validation
        if (schema.type) {
            const typeResult = this.validateType(value, schema.type, field);
            if (!typeResult.isValid) {
                result.isValid = false;
                result.errors.push(...typeResult.errors);
                return result;
            }
        }

        // String validations
        if (typeof value === 'string') {
            if (schema.minLength !== undefined && value.length < schema.minLength) {
                result.isValid = false;
                result.errors.push({
                    code: 'STRING_TOO_SHORT',
                    message: `${field} must be at least ${schema.minLength} characters`,
                    field,
                    expected: `>= ${schema.minLength} characters`,
                    actual: `${value.length} characters`,
                });
            }
            if (schema.maxLength !== undefined && value.length > schema.maxLength) {
                result.isValid = false;
                result.errors.push({
                    code: 'STRING_TOO_LONG',
                    message: `${field} must be at most ${schema.maxLength} characters`,
                    field,
                    expected: `<= ${schema.maxLength} characters`,
                    actual: `${value.length} characters`,
                });
            }
            if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
                result.isValid = false;
                result.errors.push({
                    code: 'PATTERN_MISMATCH',
                    message: `${field} does not match required pattern`,
                    field,
                    expected: schema.pattern,
                    actual: value.substring(0, 50),
                });
            }
            if (schema.enum && !schema.enum.includes(value)) {
                result.isValid = false;
                result.errors.push({
                    code: 'INVALID_ENUM_VALUE',
                    message: `${field} must be one of: ${schema.enum.join(', ')}`,
                    field,
                    expected: schema.enum.join(', '),
                    actual: value,
                });
            }
        }

        // Number validations
        if (typeof value === 'number') {
            if (schema.minimum !== undefined && value < schema.minimum) {
                result.isValid = false;
                result.errors.push({
                    code: 'NUMBER_TOO_SMALL',
                    message: `${field} must be at least ${schema.minimum}`,
                    field,
                    expected: `>= ${schema.minimum}`,
                    actual: String(value),
                });
            }
            if (schema.maximum !== undefined && value > schema.maximum) {
                result.isValid = false;
                result.errors.push({
                    code: 'NUMBER_TOO_LARGE',
                    message: `${field} must be at most ${schema.maximum}`,
                    field,
                    expected: `<= ${schema.maximum}`,
                    actual: String(value),
                });
            }
        }

        // Array validations
        if (Array.isArray(value) && schema.items) {
            for (let i = 0; i < value.length; i++) {
                const itemResult = this.validateProperty(value[i], schema.items, `${field}[${i}]`);
                result.errors.push(...itemResult.errors);
                result.warnings.push(...itemResult.warnings);
            }
        }

        return result;
    }

    /**
     * Get the JSON type of a value
     */
    private getType(value: unknown): string {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    // =========================================================================
    // TRACEABILITY VALIDATION
    // =========================================================================

    /**
     * Validate traceability links for an item
     *
     * @param item - Tracked item to validate
     * @param traceability - Traceability map
     * @returns Validation result
     */
    validateTraceabilityLinks(
        item: TrackedItem,
        traceability: TraceabilityMap
    ): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
        };

        // Get all outgoing links for this item
        const outgoingLinks = traceability.bySourceId[item.id] || [];

        // Validate each link
        for (const link of outgoingLinks) {
            // Check if target exists in the traceability map
            const targetLinks = traceability.bySourceId[link.toId] ||
                traceability.byTargetId[link.toId];

            if (!targetLinks && !this.isIdInLinks(link.toId, traceability)) {
                result.warnings.push({
                    code: 'ORPHAN_LINK_TARGET',
                    message: `Link from ${item.id} targets unknown item ${link.toId}`,
                    field: 'traceability',
                });
            }
        }

        // Check if item has expected links based on type
        if (item.itemType === 'story') {
            // Stories should link to a feature
            const featureLink = outgoingLinks.find(l => l.linkType === 'story-to-feature');
            if (!featureLink) {
                result.warnings.push({
                    code: 'STORY_NO_FEATURE',
                    message: `Story ${item.id} is not linked to any feature`,
                    field: 'traceability',
                });
            }
        }

        if (item.itemType === 'task') {
            // Tasks should link to a story
            const storyLink = outgoingLinks.find(l => l.linkType === 'task-to-story');
            if (!storyLink) {
                result.warnings.push({
                    code: 'TASK_NO_STORY',
                    message: `Task ${item.id} is not linked to any story`,
                    field: 'traceability',
                });
            }
        }

        return result;
    }

    /**
     * Check if an ID exists anywhere in the traceability links
     */
    private isIdInLinks(id: string, traceability: TraceabilityMap): boolean {
        return traceability.links.some(l => l.fromId === id || l.toId === id);
    }
}

// Export singleton for convenience
export const validationService = new ValidationService();
