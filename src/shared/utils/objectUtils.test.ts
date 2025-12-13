/**
 * Unit tests for object utility functions.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1
 */

import {
  deepClone,
  isEmptyObject,
  pick,
  omit,
  merge,
  getNestedProperty,
  setNestedProperty,
} from './objectUtils';

describe('objectUtils', () => {
  describe('deepClone', () => {
    it('should deep clone an object', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('should handle arrays', () => {
      const arr = [1, 2, { a: 3 }];
      const cloned = deepClone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
    });

    it('should handle null', () => {
      expect(deepClone(null)).toBe(null);
    });

    it('should handle primitives', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone(true)).toBe(true);
    });
  });

  describe('isEmptyObject', () => {
    it('should return true for empty object', () => {
      expect(isEmptyObject({})).toBe(true);
    });

    it('should return false for non-empty object', () => {
      expect(isEmptyObject({ a: 1 })).toBe(false);
    });
  });

  describe('pick', () => {
    it('should pick specified properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['a', 'c']);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should handle non-existent keys', () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, ['a', 'c'] as any);

      expect(result).toEqual({ a: 1 });
    });

    it('should handle empty keys array', () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, []);

      expect(result).toEqual({});
    });
  });

  describe('omit', () => {
    it('should omit specified properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b']);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should handle non-existent keys', () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, ['c'] as any);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle empty keys array', () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, []);

      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('merge', () => {
    it('should merge multiple objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 3, c: 4 };
      const result = merge(obj1, obj2);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should handle empty objects', () => {
      const result = merge({}, { a: 1 });
      expect(result).toEqual({ a: 1 });
    });

    it('should merge multiple objects in order', () => {
      const result = merge({ a: 1 }, { a: 2 }, { a: 3 });
      expect(result).toEqual({ a: 3 });
    });
  });

  describe('getNestedProperty', () => {
    it('should get nested property', () => {
      const obj = { user: { profile: { name: 'John' } } };
      expect(getNestedProperty(obj, 'user.profile.name')).toBe('John');
    });

    it('should return undefined for non-existent path', () => {
      const obj = { user: { profile: { name: 'John' } } };
      expect(getNestedProperty(obj, 'user.profile.age')).toBeUndefined();
    });

    it('should return default value for non-existent path', () => {
      const obj = { user: { profile: { name: 'John' } } };
      expect(getNestedProperty(obj, 'user.profile.age', 25)).toBe(25);
    });

    it('should handle null in path', () => {
      const obj = { user: null };
      expect(getNestedProperty(obj, 'user.profile.name', 'default')).toBe('default');
    });

    it('should handle undefined in path', () => {
      const obj = { user: undefined };
      expect(getNestedProperty(obj, 'user.profile.name', 'default')).toBe('default');
    });
  });

  describe('setNestedProperty', () => {
    it('should set nested property', () => {
      const obj: any = {};
      setNestedProperty(obj, 'user.profile.name', 'John');

      expect(obj.user.profile.name).toBe('John');
    });

    it('should overwrite existing property', () => {
      const obj = { user: { profile: { name: 'Jane' } } };
      setNestedProperty(obj, 'user.profile.name', 'John');

      expect(obj.user.profile.name).toBe('John');
    });

    it('should create intermediate objects', () => {
      const obj: any = { user: {} };
      setNestedProperty(obj, 'user.profile.name', 'John');

      expect(obj.user.profile.name).toBe('John');
    });

    it('should handle single-level path', () => {
      const obj: any = {};
      setNestedProperty(obj, 'name', 'John');

      expect(obj.name).toBe('John');
    });
  });
});
