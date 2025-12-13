"use strict";
/**
 * Unit tests for InputValidator
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1, 8.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
const InputValidator_1 = require("./InputValidator");
describe('InputValidator', () => {
    let validator;
    beforeEach(() => {
        validator = new InputValidator_1.InputValidator();
    });
    describe('validateInput', () => {
        it('should accept valid text input', () => {
            const result = validator.validateInput('Hello World');
            expect(result.valid).toBe(true);
            expect(result.sanitizedValue).toBeDefined();
        });
        it('should reject input exceeding maximum length', () => {
            const longInput = 'a'.repeat(10001);
            const result = validator.validateInput(longInput);
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('maximum length');
        });
        it('should reject empty required input', () => {
            const result = validator.validateInput('', { required: true });
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('required');
        });
        it('should validate URL type correctly', () => {
            const validUrl = validator.validateInput('https://example.com', { type: 'url' });
            const invalidUrl = validator.validateInput('not-a-url', { type: 'url' });
            expect(validUrl.valid).toBe(true);
            expect(invalidUrl.valid).toBe(false);
        });
        it('should validate email type correctly', () => {
            const validEmail = validator.validateInput('user@example.com', { type: 'email' });
            const invalidEmail = validator.validateInput('not-an-email', { type: 'email' });
            expect(validEmail.valid).toBe(true);
            expect(invalidEmail.valid).toBe(false);
        });
    });
    describe('sanitizeInput', () => {
        it('should remove null bytes', () => {
            const input = 'hello\0world';
            const sanitized = validator.sanitizeInput(input);
            expect(sanitized).not.toContain('\0');
        });
        it('should strip HTML tags when configured', () => {
            const input = '<script>alert("xss")</script>Hello';
            const sanitized = validator.sanitizeInput(input);
            expect(sanitized).not.toContain('<script');
        });
    });
    describe('sanitizeResponse', () => {
        it('should remove script tags', () => {
            const response = 'Hello <script>alert("xss")</script> World';
            const sanitized = validator.sanitizeResponse(response);
            expect(sanitized).not.toContain('<script');
            expect(sanitized).not.toContain('</script>');
        });
        it('should remove event handlers', () => {
            const response = '<div onclick="alert(1)">Click me</div>';
            const sanitized = validator.sanitizeResponse(response);
            expect(sanitized.toLowerCase()).not.toContain('onclick=');
        });
    });
    describe('sanitizeMarkdown', () => {
        it('should remove javascript: URLs from links', () => {
            const markdown = '[click](javascript:alert(1))';
            const sanitized = validator.sanitizeMarkdown(markdown);
            expect(sanitized).not.toContain('javascript:');
        });
        it('should preserve safe markdown formatting', () => {
            const markdown = '**bold** and *italic*';
            const sanitized = validator.sanitizeMarkdown(markdown);
            expect(sanitized).toContain('**');
            expect(sanitized).toContain('*');
        });
    });
    describe('containsXss', () => {
        it('should detect XSS patterns', () => {
            expect(validator.containsXss('<script>alert(1)</script>')).toBe(true);
            expect(validator.containsXss('<img src=x onerror=alert(1)>')).toBe(true);
            expect(validator.containsXss('Hello World')).toBe(false);
        });
    });
    describe('validateContentLength', () => {
        it('should accept content within limit', () => {
            const result = validator.validateContentLength('Hello World');
            expect(result.valid).toBe(true);
        });
        it('should reject content exceeding limit', () => {
            const testValidator = new InputValidator_1.InputValidator({ maxContentLength: 100 });
            const longContent = 'a'.repeat(101);
            const result = testValidator.validateContentLength(longContent);
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('maximum size');
        });
    });
});
//# sourceMappingURL=InputValidator.test.js.map