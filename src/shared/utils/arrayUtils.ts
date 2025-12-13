/**
 * Array utility functions for common array operations.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1
 */

/**
 * Remove duplicate values from an array.
 *
 * @param arr - The array to deduplicate
 * @returns Array with unique values
 */
export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * Chunk an array into smaller arrays of a specified size.
 *
 * @param arr - The array to chunk
 * @param size - Size of each chunk
 * @returns Array of chunks
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) {
    return [];
  }

  const chunks: T[][] = [];
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
export function groupBy<T, K extends string | number>(
  arr: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;

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
export function sortBy<T>(
  arr: T[],
  keyFn: (item: T) => string | number,
  order: 'asc' | 'desc' = 'asc'
): T[] {
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
export function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

/**
 * Get the first element of an array.
 *
 * @param arr - The array
 * @returns First element or undefined if array is empty
 */
export function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

/**
 * Check if an array is empty.
 *
 * @param arr - The array to check
 * @returns true if the array is empty
 */
export function isEmpty<T>(arr: T[]): boolean {
  return arr.length === 0;
}
