"use strict";
/**
 * Unit tests for time utility functions.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
const timeUtils_1 = require("./timeUtils");
describe('timeUtils', () => {
    describe('formatElapsedTime', () => {
        it('should format milliseconds', () => {
            expect((0, timeUtils_1.formatElapsedTime)(500)).toBe('500ms');
            expect((0, timeUtils_1.formatElapsedTime)(999)).toBe('999ms');
        });
        it('should format seconds', () => {
            expect((0, timeUtils_1.formatElapsedTime)(1000)).toBe('1s');
            expect((0, timeUtils_1.formatElapsedTime)(5000)).toBe('5s');
            expect((0, timeUtils_1.formatElapsedTime)(59000)).toBe('59s');
        });
        it('should format minutes and seconds', () => {
            expect((0, timeUtils_1.formatElapsedTime)(60000)).toBe('1m 0s');
            expect((0, timeUtils_1.formatElapsedTime)(90000)).toBe('1m 30s');
            expect((0, timeUtils_1.formatElapsedTime)(150000)).toBe('2m 30s');
        });
        it('should handle negative values', () => {
            expect((0, timeUtils_1.formatElapsedTime)(-100)).toBe('0ms');
        });
        it('should handle zero', () => {
            expect((0, timeUtils_1.formatElapsedTime)(0)).toBe('0ms');
        });
    });
    describe('formatTimestamp', () => {
        it('should format timestamp with time', () => {
            const timestamp = new Date('2024-01-15T10:30:00').getTime();
            const result = (0, timeUtils_1.formatTimestamp)(timestamp);
            expect(result).toContain('1/15/2024');
            expect(result).toContain('10:30');
        });
        it('should format timestamp without time', () => {
            const timestamp = new Date('2024-01-15T10:30:00').getTime();
            const result = (0, timeUtils_1.formatTimestamp)(timestamp, false);
            expect(result).toContain('1/15/2024');
            expect(result).not.toContain('10:30');
        });
        it('should handle invalid timestamp', () => {
            expect((0, timeUtils_1.formatTimestamp)(NaN)).toBe('Invalid date');
        });
    });
    describe('getRelativeTime', () => {
        it('should return "just now" for recent timestamps', () => {
            const now = Date.now();
            expect((0, timeUtils_1.getRelativeTime)(now)).toBe('just now');
            expect((0, timeUtils_1.getRelativeTime)(now - 5000)).toBe('just now');
        });
        it('should return seconds ago', () => {
            const now = Date.now();
            expect((0, timeUtils_1.getRelativeTime)(now - 30000)).toBe('30 seconds ago');
        });
        it('should return minutes ago', () => {
            const now = Date.now();
            expect((0, timeUtils_1.getRelativeTime)(now - 60000)).toBe('1 minute ago');
            expect((0, timeUtils_1.getRelativeTime)(now - 120000)).toBe('2 minutes ago');
        });
        it('should return hours ago', () => {
            const now = Date.now();
            expect((0, timeUtils_1.getRelativeTime)(now - 3600000)).toBe('1 hour ago');
            expect((0, timeUtils_1.getRelativeTime)(now - 7200000)).toBe('2 hours ago');
        });
        it('should return days ago', () => {
            const now = Date.now();
            expect((0, timeUtils_1.getRelativeTime)(now - 86400000)).toBe('1 day ago');
            expect((0, timeUtils_1.getRelativeTime)(now - 172800000)).toBe('2 days ago');
        });
        it('should return formatted date for old timestamps', () => {
            const oldTimestamp = Date.now() - 40 * 86400000; // 40 days ago
            const result = (0, timeUtils_1.getRelativeTime)(oldTimestamp);
            expect(result).not.toContain('ago');
        });
        it('should handle future timestamps', () => {
            const future = Date.now() + 10000;
            expect((0, timeUtils_1.getRelativeTime)(future)).toBe('in the future');
        });
    });
    describe('sleep', () => {
        it('should resolve after specified duration', async () => {
            const start = Date.now();
            await (0, timeUtils_1.sleep)(100);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeGreaterThanOrEqual(90);
        });
        it('should handle zero duration', async () => {
            await expect((0, timeUtils_1.sleep)(0)).resolves.toBeUndefined();
        });
    });
});
//# sourceMappingURL=timeUtils.test.js.map