"use strict";
/**
 * Array utility functions for common array operations.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.unique = unique;
exports.chunk = chunk;
exports.groupBy = groupBy;
exports.sortBy = sortBy;
exports.last = last;
exports.first = first;
exports.isEmpty = isEmpty;
/**
 * Remove duplicate values from an array.
 *
 * @param arr - The array to deduplicate
 * @returns Array with unique values
 */
function unique(arr) {
    return Array.from(new Set(arr));
}
/**
 * Chunk an array into smaller arrays of a specified size.
 *
 * @param arr - The array to chunk
 * @param size - Size of each chunk
 * @returns Array of chunks
 */
function chunk(arr, size) {
    if (size <= 0) {
        return [];
    }
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}
/**
 * Group array elements by a key function.
 *
 * @param arr - The array to group
 * @param keyFn - Function to extract the grouping key
 * @returns Object with grouped elements
 */
function groupBy(arr, keyFn) {
    const result = {};
    for (const item of arr) {
        const key = keyFn(item);
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(item);
    }
    return result;
}
/**
 * Sort an array by a key function.
 *
 * @param arr - The array to sort
 * @param keyFn - Function to extract the sort key
 * @param order - Sort order ('asc' or 'desc')
 * @returns Sorted array (new array, does not mutate original)
 */
function sortBy(arr, keyFn, order = 'asc') {
    const sorted = [...arr].sort((a, b) => {
        const aKey = keyFn(a);
        const bKey = keyFn(b);
        if (aKey < bKey) {
            return order === 'asc' ? -1 : 1;
        }
        if (aKey > bKey) {
            return order === 'asc' ? 1 : -1;
        }
        return 0;
    });
    return sorted;
}
/**
 * Get the last element of an array.
 *
 * @param arr - The array
 * @returns Last element or undefined if array is empty
 */
function last(arr) {
    return arr[arr.length - 1];
}
/**
 * Get the first element of an array.
 *
 * @param arr - The array
 * @returns First element or undefined if array is empty
 */
function first(arr) {
    return arr[0];
}
/**
 * Check if an array is empty.
 *
 * @param arr - The array to check
 * @returns true if the array is empty
 */
function isEmpty(arr) {
    return arr.length === 0;
}
//# sourceMappingURL=arrayUtils.js.map