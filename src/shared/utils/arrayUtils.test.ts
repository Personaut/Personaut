/**
 * Unit tests for array utility functions.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1
 */

import { unique, chunk, groupBy, sortBy, last, first, isEmpty } from './arrayUtils';

describe('arrayUtils', () => {
  describe('unique', () => {
    it('should remove duplicate values', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });

    it('should work with strings', () => {
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty array', () => {
      expect(unique([])).toEqual([]);
    });

    it('should handle array with no duplicates', () => {
      expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('chunk', () => {
    it('should chunk array into specified size', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle exact division', () => {
      expect(chunk([1, 2, 3, 4], 2)).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });

    it('should handle empty array', () => {
      expect(chunk([], 2)).toEqual([]);
    });

    it('should handle size larger than array', () => {
      expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
    });

    it('should handle invalid size', () => {
      expect(chunk([1, 2, 3], 0)).toEqual([]);
      expect(chunk([1, 2, 3], -1)).toEqual([]);
    });
  });

  describe('groupBy', () => {
    it('should group by key function', () => {
      const items = [
        { type: 'fruit', name: 'apple' },
        { type: 'vegetable', name: 'carrot' },
        { type: 'fruit', name: 'banana' },
      ];

      const result = groupBy(items, (item) => item.type);

      expect(result.fruit).toHaveLength(2);
      expect(result.vegetable).toHaveLength(1);
    });

    it('should handle empty array', () => {
      expect(groupBy([], (x) => x)).toEqual({});
    });

    it('should work with numeric keys', () => {
      const items = [1, 2, 3, 4, 5];
      const result = groupBy(items, (x) => (x % 2 === 0 ? 0 : 1));

      expect(result[0]).toEqual([2, 4]);
      expect(result[1]).toEqual([1, 3, 5]);
    });
  });

  describe('sortBy', () => {
    it('should sort by key function ascending', () => {
      const items = [{ age: 30 }, { age: 20 }, { age: 25 }];
      const result = sortBy(items, (item) => item.age);

      expect(result[0].age).toBe(20);
      expect(result[1].age).toBe(25);
      expect(result[2].age).toBe(30);
    });

    it('should sort by key function descending', () => {
      const items = [{ age: 30 }, { age: 20 }, { age: 25 }];
      const result = sortBy(items, (item) => item.age, 'desc');

      expect(result[0].age).toBe(30);
      expect(result[1].age).toBe(25);
      expect(result[2].age).toBe(20);
    });

    it('should work with string keys', () => {
      const items = [{ name: 'charlie' }, { name: 'alice' }, { name: 'bob' }];
      const result = sortBy(items, (item) => item.name);

      expect(result[0].name).toBe('alice');
      expect(result[1].name).toBe('bob');
      expect(result[2].name).toBe('charlie');
    });

    it('should not mutate original array', () => {
      const items = [{ age: 30 }, { age: 20 }];
      const original = [...items];
      sortBy(items, (item) => item.age);

      expect(items).toEqual(original);
    });

    it('should handle empty array', () => {
      expect(sortBy([], (x) => x)).toEqual([]);
    });
  });

  describe('last', () => {
    it('should return last element', () => {
      expect(last([1, 2, 3])).toBe(3);
    });

    it('should return undefined for empty array', () => {
      expect(last([])).toBeUndefined();
    });

    it('should work with single element', () => {
      expect(last([1])).toBe(1);
    });
  });

  describe('first', () => {
    it('should return first element', () => {
      expect(first([1, 2, 3])).toBe(1);
    });

    it('should return undefined for empty array', () => {
      expect(first([])).toBeUndefined();
    });

    it('should work with single element', () => {
      expect(first([1])).toBe(1);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty array', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('should return false for non-empty array', () => {
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty([1, 2, 3])).toBe(false);
    });
  });
});
