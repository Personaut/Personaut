/**
 * Object utility functions for common object operations.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1
 */

/**
 * Deep clone an object using JSON serialization.
 * Note: This method has limitations (functions, undefined, symbols are not cloned).
 *
 * @param obj - The object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
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
export function isEmptyObject(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Pick specific properties from an object.
 *
 * @param obj - The source object
 * @param keys - Keys to pick
 * @returns New object with only the specified keys
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;

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
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
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
export function merge<T extends object>(...objects: Partial<T>[]): T {
  return Object.assign({}, ...objects) as T;
}

/**
 * Get a nested property value from an object using a path string.
 *
 * @param obj - The object to query
 * @param path - Property path (e.g., 'user.profile.name')
 * @param defaultValue - Default value if path doesn't exist
 * @returns Property value or default value
 */
export function getNestedProperty<T = any>(
  obj: any,
  path: string,
  defaultValue?: T
): T | undefined {
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
export function setNestedProperty(obj: any, path: string, value: any): void {
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
