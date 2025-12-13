"use strict";
/**
 * Unit tests for string utility functions.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
const stringUtils_1 = require("./stringUtils");
describe('stringUtils', () => {
    describe('sanitizeProjectName', () => {
        it('should convert to lowercase', () => {
            expect((0, stringUtils_1.sanitizeProjectName)('MyProject')).toBe('myproject');
        });
        it('should replace spaces with hyphens', () => {
            expect((0, stringUtils_1.sanitizeProjectName)('my project')).toBe('my-project');
        });
        it('should remove invalid characters', () => {
            expect((0, stringUtils_1.sanitizeProjectName)('my@project!')).toBe('myproject');
        });
        it('should trim leading and trailing spaces', () => {
            expect((0, stringUtils_1.sanitizeProjectName)('  my project  ')).toBe('my-project');
        });
        it('should limit length to 50 characters', () => {
            const longName = 'a'.repeat(100);
            expect((0, stringUtils_1.sanitizeProjectName)(longName)).toHaveLength(50);
        });
        it('should handle empty string', () => {
            expect((0, stringUtils_1.sanitizeProjectName)('')).toBe('');
        });
        it('should remove leading and trailing hyphens', () => {
            expect((0, stringUtils_1.sanitizeProjectName)('--my-project--')).toBe('my-project');
        });
    });
    describe('isValidProjectName', () => {
        it('should accept valid project names', () => {
            expect((0, stringUtils_1.isValidProjectName)('my-project')).toBe(true);
            expect((0, stringUtils_1.isValidProjectName)('my_project')).toBe(true);
            expect((0, stringUtils_1.isValidProjectName)('myproject123')).toBe(true);
            expect((0, stringUtils_1.isValidProjectName)('a')).toBe(true);
        });
        it('should reject invalid project names', () => {
            expect((0, stringUtils_1.isValidProjectName)('')).toBe(false);
            expect((0, stringUtils_1.isValidProjectName)('-myproject')).toBe(false);
            expect((0, stringUtils_1.isValidProjectName)('myproject-')).toBe(false);
            expect((0, stringUtils_1.isValidProjectName)('my project')).toBe(false);
            expect((0, stringUtils_1.isValidProjectName)('MY-PROJECT')).toBe(false);
        });
        it('should reject names longer than 50 characters', () => {
            const longName = 'a'.repeat(51);
            expect((0, stringUtils_1.isValidProjectName)(longName)).toBe(false);
        });
    });
    describe('truncate', () => {
        it('should truncate long strings', () => {
            const longStr = 'a'.repeat(150);
            const result = (0, stringUtils_1.truncate)(longStr, 100);
            expect(result).toHaveLength(100);
            expect(result.endsWith('...')).toBe(true);
        });
        it('should not truncate short strings', () => {
            const shortStr = 'hello';
            expect((0, stringUtils_1.truncate)(shortStr, 100)).toBe('hello');
        });
        it('should use custom ellipsis', () => {
            const longStr = 'a'.repeat(150);
            const result = (0, stringUtils_1.truncate)(longStr, 100, '---');
            expect(result.endsWith('---')).toBe(true);
        });
        it('should handle empty string', () => {
            expect((0, stringUtils_1.truncate)('', 100)).toBe('');
        });
    });
    describe('capitalize', () => {
        it('should capitalize first letter', () => {
            expect((0, stringUtils_1.capitalize)('hello')).toBe('Hello');
        });
        it('should not change already capitalized string', () => {
            expect((0, stringUtils_1.capitalize)('Hello')).toBe('Hello');
        });
        it('should handle single character', () => {
            expect((0, stringUtils_1.capitalize)('a')).toBe('A');
        });
        it('should handle empty string', () => {
            expect((0, stringUtils_1.capitalize)('')).toBe('');
        });
    });
    describe('toKebabCase', () => {
        it('should convert camelCase to kebab-case', () => {
            expect((0, stringUtils_1.toKebabCase)('myVariableName')).toBe('my-variable-name');
        });
        it('should convert PascalCase to kebab-case', () => {
            expect((0, stringUtils_1.toKebabCase)('MyClassName')).toBe('my-class-name');
        });
        it('should convert spaces to hyphens', () => {
            expect((0, stringUtils_1.toKebabCase)('my variable name')).toBe('my-variable-name');
        });
        it('should convert underscores to hyphens', () => {
            expect((0, stringUtils_1.toKebabCase)('my_variable_name')).toBe('my-variable-name');
        });
        it('should handle empty string', () => {
            expect((0, stringUtils_1.toKebabCase)('')).toBe('');
        });
    });
    describe('toCamelCase', () => {
        it('should convert kebab-case to camelCase', () => {
            expect((0, stringUtils_1.toCamelCase)('my-variable-name')).toBe('myVariableName');
        });
        it('should convert snake_case to camelCase', () => {
            expect((0, stringUtils_1.toCamelCase)('my_variable_name')).toBe('myVariableName');
        });
        it('should convert spaces to camelCase', () => {
            expect((0, stringUtils_1.toCamelCase)('my variable name')).toBe('myVariableName');
        });
        it('should handle PascalCase input', () => {
            expect((0, stringUtils_1.toCamelCase)('MyClassName')).toBe('myClassName');
        });
        it('should handle empty string', () => {
            expect((0, stringUtils_1.toCamelCase)('')).toBe('');
        });
    });
    describe('toPascalCase', () => {
        it('should convert kebab-case to PascalCase', () => {
            expect((0, stringUtils_1.toPascalCase)('my-class-name')).toBe('MyClassName');
        });
        it('should convert snake_case to PascalCase', () => {
            expect((0, stringUtils_1.toPascalCase)('my_class_name')).toBe('MyClassName');
        });
        it('should convert spaces to PascalCase', () => {
            expect((0, stringUtils_1.toPascalCase)('my class name')).toBe('MyClassName');
        });
        it('should handle camelCase input', () => {
            expect((0, stringUtils_1.toPascalCase)('myClassName')).toBe('MyClassName');
        });
        it('should handle empty string', () => {
            expect((0, stringUtils_1.toPascalCase)('')).toBe('');
        });
    });
});
//# sourceMappingURL=stringUtils.test.js.map