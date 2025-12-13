/**
 * Unit tests for ErrorSanitizer
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.2, 8.4
 */

import { ErrorSanitizer } from './ErrorSanitizer';

describe('ErrorSanitizer', () => {
  let sanitizer: ErrorSanitizer;

  beforeEach(() => {
    sanitizer = new ErrorSanitizer();
  });

  describe('sanitize', () => {
    it('should sanitize error messages with file paths', () => {
      const error = 'Error at /home/user/project/secret.txt';
      const result = sanitizer.sanitize(error);

      expect(result.userMessage).not.toContain('/home/user/project');
      expect(result.containedSensitiveInfo).toBe(true);
    });

    it('should sanitize error messages with API keys', () => {
      const error = 'Authentication failed with key sk-1234567890abcdefghijklmnop';
      const result = sanitizer.sanitize(error);

      expect(result.userMessage).not.toContain('sk-1234567890abcdefghijklmnop');
      expect(result.containedSensitiveInfo).toBe(true);
    });

    it('should preserve safe error messages', () => {
      const error = 'Invalid input provided';
      const result = sanitizer.sanitize(error);

      expect(result.containedSensitiveInfo).toBe(false);
      expect(result.userMessage.length).toBeGreaterThan(0);
    });

    it('should include detailed info in log message', () => {
      const error = 'Test error';
      const result = sanitizer.sanitize(error, 'test-context');

      expect(result.logMessage).toContain('Test error');
      expect(result.logMessage).toContain('test-context');
      expect(result.logMessage).toContain('Timestamp:');
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      const result = sanitizer.sanitize(error);

      expect(result.originalMessage).toBe('Test error');
      expect(result.logMessage).toContain('Stack:');
    });
  });

  describe('classifyError', () => {
    it('should classify user errors', () => {
      expect(sanitizer.classifyError('Invalid input')).toBe('user');
      expect(sanitizer.classifyError('Validation failed')).toBe('user');
      expect(sanitizer.classifyError('Not found')).toBe('user');
    });

    it('should classify security errors', () => {
      expect(sanitizer.classifyError('Injection detected')).toBe('security');
      expect(sanitizer.classifyError('Request blocked')).toBe('security');
      expect(sanitizer.classifyError('Rate limit exceeded')).toBe('security');
    });

    it('should default to system errors', () => {
      expect(sanitizer.classifyError('Database connection failed')).toBe('system');
      expect(sanitizer.classifyError('Unknown error')).toBe('system');
    });
  });

  describe('containsSensitiveInfo', () => {
    it('should detect file paths', () => {
      expect(sanitizer.containsSensitiveInfo('/home/user/file.txt')).toBe(true);
      expect(sanitizer.containsSensitiveInfo('C:\\Users\\John\\file.txt')).toBe(true);
    });

    it('should detect API keys', () => {
      expect(sanitizer.containsSensitiveInfo('AKIAIOSFODNN7EXAMPLE')).toBe(true);
      expect(sanitizer.containsSensitiveInfo('sk-1234567890abcdefghijklmnop')).toBe(true);
    });

    it('should not flag safe content', () => {
      expect(sanitizer.containsSensitiveInfo('Hello World')).toBe(false);
      expect(sanitizer.containsSensitiveInfo('Error: Invalid input')).toBe(false);
    });
  });

  describe('containsStackTrace', () => {
    it('should detect stack traces', () => {
      const stackTrace = `Error: Test
    at Object.<anonymous> (/home/user/file.ts:42:15)
    at Module._compile (internal/modules/cjs/loader.js:1085:14)`;

      expect(sanitizer.containsStackTrace(stackTrace)).toBe(true);
    });

    it('should not flag safe content', () => {
      expect(sanitizer.containsStackTrace('Hello World')).toBe(false);
    });
  });

  describe('removeStackTrace', () => {
    it('should remove stack trace lines', () => {
      const errorWithStack = `Error: Test
    at Object.<anonymous> (/home/user/file.ts:42:15)
    at Module._compile (internal/modules/cjs/loader.js:1085:14)`;

      const sanitized = sanitizer.removeStackTrace(errorWithStack);

      expect(sanitized).not.toContain('at Object.<anonymous>');
      expect(sanitized).not.toContain('at Module._compile');
    });
  });

  describe('removeSensitiveInfo', () => {
    it('should replace sensitive info with [REDACTED]', () => {
      const message = 'Error at /home/user/secret.txt';
      const sanitized = sanitizer.removeSensitiveInfo(message);

      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('/home/user/secret.txt');
    });
  });
});
