"use strict";
/**
 * Unit tests for object utility functions.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
const objectUtils_1 = require("./objectUtils");
describe('objectUtils', () => {
    describe('deepClone', () => {
        it('should deep clone an object', () => {
            const obj = { a: 1, b: { c: 2 } };
            const cloned = (0, objectUtils_1.deepClone)(obj);
            expect(cloned).toEqual(obj);
            expect(cloned).not.toBe(obj);
            expect(cloned.b).not.toBe(obj.b);
        });
        it('should handle arrays', () => {
            const arr = [1, 2, { a: 3 }];
            const cloned = (0, objectUtils_1.deepClone)(arr);
            expect(cloned).toEqual(arr);
            expect(cloned).not.toBe(arr);
        });
        it('should handle null', () => {
            expect((0, objectUtils_1.deepClone)(null)).toBe(null);
        });
        it('should handle primitives', () => {
            expect((0, objectUtils_1.deepClone)(42)).toBe(42);
            expect((0, objectUtils_1.deepClone)('hello')).toBe('hello');
            expect((0, objectUtils_1.deepClone)(true)).toBe(true);
        });
    });
    describe('isEmptyObject', () => {
        it('should return true for empty object', () => {
            expect((0, objectUtils_1.isEmptyObject)({})).toBe(true);
        });
        it('should return false for non-empty object', () => {
            expect((0, objectUtils_1.isEmptyObject)({ a: 1 })).toBe(false);
        });
    });
    describe('pick', () => {
        it('should pick specified properties', () => {
            const obj = { a: 1, b: 2, c: 3 };
            const result = (0, objectUtils_1.pick)(obj, ['a', 'c']);
            expect(result).toEqual({ a: 1, c: 3 });
        });
        it('should handle non-existent keys', () => {
            const obj = { a: 1, b: 2 };
            const result = (0, objectUtils_1.pick)(obj, ['a', 'c']);
            expect(result).toEqual({ a: 1 });
        });
        it('should handle empty keys array', () => {
            const obj = { a: 1, b: 2 };
            const result = (0, objectUtils_1.pick)(obj, []);
            expect(result).toEqual({});
        });
    });
    describe('omit', () => {
        it('should omit specified properties', () => {
            const obj = { a: 1, b: 2, c: 3 };
            const result = (0, objectUtils_1.omit)(obj, ['b']);
            expect(result).toEqual({ a: 1, c: 3 });
        });
        it('should handle non-existent keys', () => {
            const obj = { a: 1, b: 2 };
            const result = (0, objectUtils_1.omit)(obj, ['c']);
            expect(result).toEqual({ a: 1, b: 2 });
        });
        it('should handle empty keys array', () => {
            const obj = { a: 1, b: 2 };
            const result = (0, objectUtils_1.omit)(obj, []);
            expect(result).toEqual({ a: 1, b: 2 });
        });
    });
    describe('merge', () => {
        it('should merge multiple objects', () => {
            const obj1 = { a: 1, b: 2 };
            const obj2 = { b: 3, c: 4 };
            const result = (0, objectUtils_1.merge)(obj1, obj2);
            expect(result).toEqual({ a: 1, b: 3, c: 4 });
        });
        it('should handle empty objects', () => {
            const result = (0, objectUtils_1.merge)({}, { a: 1 });
            expect(result).toEqual({ a: 1 });
        });
        it('should merge multiple objects in order', () => {
            const result = (0, objectUtils_1.merge)({ a: 1 }, { a: 2 }, { a: 3 });
            expect(result).toEqual({ a: 3 });
        });
    });
    describe('getNestedProperty', () => {
        it('should get nested property', () => {
            const obj = { user: { profile: { name: 'John' } } };
            expect((0, objectUtils_1.getNestedProperty)(obj, 'user.profile.name')).toBe('John');
        });
        it('should return undefined for non-existent path', () => {
            const obj = { user: { profile: { name: 'John' } } };
            expect((0, objectUtils_1.getNestedProperty)(obj, 'user.profile.age')).toBeUndefined();
        });
        it('should return default value for non-existent path', () => {
            const obj = { user: { profile: { name: 'John' } } };
            expect((0, objectUtils_1.getNestedProperty)(obj, 'user.profile.age', 25)).toBe(25);
        });
        it('should handle null in path', () => {
            const obj = { user: null };
            expect((0, objectUtils_1.getNestedProperty)(obj, 'user.profile.name', 'default')).toBe('default');
        });
        it('should handle undefined in path', () => {
            const obj = { user: undefined };
            expect((0, objectUtils_1.getNestedProperty)(obj, 'user.profile.name', 'default')).toBe('default');
        });
    });
    describe('setNestedProperty', () => {
        it('should set nested property', () => {
            const obj = {};
            (0, objectUtils_1.setNestedProperty)(obj, 'user.profile.name', 'John');
            expect(obj.user.profile.name).toBe('John');
        });
        it('should overwrite existing property', () => {
            const obj = { user: { profile: { name: 'Jane' } } };
            (0, objectUtils_1.setNestedProperty)(obj, 'user.profile.name', 'John');
            expect(obj.user.profile.name).toBe('John');
        });
        it('should create intermediate objects', () => {
            const obj = { user: {} };
            (0, objectUtils_1.setNestedProperty)(obj, 'user.profile.name', 'John');
            expect(obj.user.profile.name).toBe('John');
        });
        it('should handle single-level path', () => {
            const obj = {};
            (0, objectUtils_1.setNestedProperty)(obj, 'name', 'John');
            expect(obj.name).toBe('John');
        });
    });
});
//# sourceMappingURL=objectUtils.test.js.map