"use strict";
/**
 * Object utility functions for common object operations.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepClone = deepClone;
exports.isEmptyObject = isEmptyObject;
exports.pick = pick;
exports.omit = omit;
exports.merge = merge;
exports.getNestedProperty = getNestedProperty;
exports.setNestedProperty = setNestedProperty;
/**
 * Deep clone an object using JSON serialization.
 * Note: This method has limitations (functions, undefined, symbols are not cloned).
 *
 * @param obj - The object to clone
 * @returns Deep cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Check if an object is empty (has no own properties).
 *
 * @param obj - The object to check
 * @returns true if the object is empty
 */
function isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
}
/**
 * Pick specific properties from an object.
 *
 * @param obj - The source object
 * @param keys - Keys to pick
 * @returns New object with only the specified keys
 */
function pick(obj, keys) {
    const result = {};
    for (const key of keys) {
        if (key in obj) {
            result[key] = obj[key];
        }
    }
    return result;
}
/**
 * Omit specific properties from an object.
 *
 * @param obj - The source object
 * @param keys - Keys to omit
 * @returns New object without the specified keys
 */
function omit(obj, keys) {
    const result = { ...obj };
    for (const key of keys) {
        delete result[key];
    }
    return result;
}
/**
 * Merge multiple objects into one (shallow merge).
 *
 * @param objects - Objects to merge
 * @returns Merged object
 */
function merge(...objects) {
    return Object.assign({}, ...objects);
}
/**
 * Get a nested property value from an object using a path string.
 *
 * @param obj - The object to query
 * @param path - Property path (e.g., 'user.profile.name')
 * @param defaultValue - Default value if path doesn't exist
 * @returns Property value or default value
 */
function getNestedProperty(obj, path, defaultValue) {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
        if (result === null || result === undefined) {
            return defaultValue;
        }
        result = result[key];
    }
    return result !== undefined ? result : defaultValue;
}
/**
 * Set a nested property value in an object using a path string.
 *
 * @param obj - The object to modify
 * @param path - Property path (e.g., 'user.profile.name')
 * @param value - Value to set
 */
function setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    if (!lastKey) {
        return;
    }
    let current = obj;
    for (const key of keys) {
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    current[lastKey] = value;
}
//# sourceMappingURL=objectUtils.js.map