/**
 * Unit tests for string utility functions.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1
 */

import {
  sanitizeProjectName,
  isValidProjectName,
  truncate,
  capitalize,
  toKebabCase,
  toCamelCase,
  toPascalCase,
} from './stringUtils';

describe('stringUtils', () => {
  describe('sanitizeProjectName', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeProjectName('MyProject')).toBe('myproject');
    });

    it('should replace spaces with hyphens', () => {
      expect(sanitizeProjectName('my project')).toBe('my-project');
    });

    it('should remove invalid characters', () => {
      expect(sanitizeProjectName('my@project!')).toBe('myproject');
    });

    it('should trim leading and trailing spaces', () => {
      expect(sanitizeProjectName('  my project  ')).toBe('my-project');
    });

    it('should limit length to 50 characters', () => {
      const longName = 'a'.repeat(100);
      expect(sanitizeProjectName(longName)).toHaveLength(50);
    });

    it('should handle empty string', () => {
      expect(sanitizeProjectName('')).toBe('');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(sanitizeProjectName('--my-project--')).toBe('my-project');
    });
  });

  describe('isValidProjectName', () => {
    it('should accept valid project names', () => {
      expect(isValidProjectName('my-project')).toBe(true);
      expect(isValidProjectName('my_project')).toBe(true);
      expect(isValidProjectName('myproject123')).toBe(true);
      expect(isValidProjectName('a')).toBe(true);
    });

    it('should reject invalid project names', () => {
      expect(isValidProjectName('')).toBe(false);
      expect(isValidProjectName('-myproject')).toBe(false);
      expect(isValidProjectName('myproject-')).toBe(false);
      expect(isValidProjectName('my project')).toBe(false);
      expect(isValidProjectName('MY-PROJECT')).toBe(false);
    });

    it('should reject names longer than 50 characters', () => {
      const longName = 'a'.repeat(51);
      expect(isValidProjectName(longName)).toBe(false);
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const longStr = 'a'.repeat(150);
      const result = truncate(longStr, 100);
      expect(result).toHaveLength(100);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should not truncate short strings', () => {
      const shortStr = 'hello';
      expect(truncate(shortStr, 100)).toBe('hello');
    });

    it('should use custom ellipsis', () => {
      const longStr = 'a'.repeat(150);
      const result = truncate(longStr, 100, '---');
      expect(result.endsWith('---')).toBe(true);
    });

    it('should handle empty string', () => {
      expect(truncate('', 100)).toBe('');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should not change already capitalized string', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('myVariableName')).toBe('my-variable-name');
    });

    it('should convert PascalCase to kebab-case', () => {
      expect(toKebabCase('MyClassName')).toBe('my-class-name');
    });

    it('should convert spaces to hyphens', () => {
      expect(toKebabCase('my variable name')).toBe('my-variable-name');
    });

    it('should convert underscores to hyphens', () => {
      expect(toKebabCase('my_variable_name')).toBe('my-variable-name');
    });

    it('should handle empty string', () => {
      expect(toKebabCase('')).toBe('');
    });
  });

  describe('toCamelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(toCamelCase('my-variable-name')).toBe('myVariableName');
    });

    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('my_variable_name')).toBe('myVariableName');
    });

    it('should convert spaces to camelCase', () => {
      expect(toCamelCase('my variable name')).toBe('myVariableName');
    });

    it('should handle PascalCase input', () => {
      expect(toCamelCase('MyClassName')).toBe('myClassName');
    });

    it('should handle empty string', () => {
      expect(toCamelCase('')).toBe('');
    });
  });

  describe('toPascalCase', () => {
    it('should convert kebab-case to PascalCase', () => {
      expect(toPascalCase('my-class-name')).toBe('MyClassName');
    });

    it('should convert snake_case to PascalCase', () => {
      expect(toPascalCase('my_class_name')).toBe('MyClassName');
    });

    it('should convert spaces to PascalCase', () => {
      expect(toPascalCase('my class name')).toBe('MyClassName');
    });

    it('should handle camelCase input', () => {
      expect(toPascalCase('myClassName')).toBe('MyClassName');
    });

    it('should handle empty string', () => {
      expect(toPascalCase('')).toBe('');
    });
  });
});
