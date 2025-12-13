"use strict";
/**
 * String utility functions for common string operations.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeProjectName = sanitizeProjectName;
exports.isValidProjectName = isValidProjectName;
exports.truncate = truncate;
exports.capitalize = capitalize;
exports.toKebabCase = toKebabCase;
exports.toCamelCase = toCamelCase;
exports.toPascalCase = toPascalCase;
/**
 * Sanitize a project name to create a valid directory name.
 * - Convert to lowercase
 * - Replace spaces with hyphens
 * - Remove invalid characters
 * - Limit length to 50 characters
 *
 * @param title - The project title to sanitize
 * @returns A valid directory name
 */
function sanitizeProjectName(title) {
    if (!title) {
        return '';
    }
    return title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
}
/**
 * Validate a project name to ensure it only contains valid characters.
 * Valid characters: lowercase alphanumeric, hyphens, underscores.
 *
 * @param name - The project name to validate
 * @returns true if the name is valid
 */
function isValidProjectName(name) {
    if (!name || name.length === 0 || name.length > 50) {
        return false;
    }
    return /^[a-z0-9][a-z0-9-_]*[a-z0-9]$|^[a-z0-9]$/.test(name);
}
/**
 * Truncate a string to a maximum length, adding ellipsis if truncated.
 *
 * @param str - The string to truncate
 * @param maxLength - Maximum length (default: 100)
 * @param ellipsis - Ellipsis string to append (default: '...')
 * @returns Truncated string
 */
function truncate(str, maxLength = 100, ellipsis = '...') {
    if (!str || str.length <= maxLength) {
        return str || '';
    }
    return str.substring(0, maxLength - ellipsis.length) + ellipsis;
}
/**
 * Capitalize the first letter of a string.
 *
 * @param str - The string to capitalize
 * @returns String with first letter capitalized
 */
function capitalize(str) {
    if (!str) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}
/**
 * Convert a string to kebab-case.
 *
 * @param str - The string to convert
 * @returns String in kebab-case
 */
function toKebabCase(str) {
    if (!str) {
        return '';
    }
    return str
        .trim()
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}
/**
 * Convert a string to camelCase.
 *
 * @param str - The string to convert
 * @returns String in camelCase
 */
function toCamelCase(str) {
    if (!str) {
        return '';
    }
    return str
        .trim()
        .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
        .replace(/^[A-Z]/, (char) => char.toLowerCase());
}
/**
 * Convert a string to PascalCase.
 *
 * @param str - The string to convert
 * @returns String in PascalCase
 */
function toPascalCase(str) {
    if (!str) {
        return '';
    }
    const camelCase = toCamelCase(str);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}
//# sourceMappingURL=stringUtils.js.map