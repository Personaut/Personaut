/**
 * Unit tests for ChatErrorHandler
 *
 * Tests error handling utilities, recovery strategies, and retry logic.
 *
 * Feature: chat-enhancements
 */

import {
    ChatErrorType,
    createChatError,
    logChatError,
    ErrorRecovery,
    withErrorHandling,
    withRetry,
    isDatabaseError,
    formatUserError,
} from '../ChatErrorHandler';

describe('ChatErrorHandler', () => {
    describe('createChatError', () => {
        it('should create error with default recoverable true', () => {
            const error = createChatError(
                ChatErrorType.DATABASE_ERROR,
                'Test error'
            );

            expect(error.type).toBe(ChatErrorType.DATABASE_ERROR);
            expect(error.message).toBe('Test error');
            expect(error.recoverable).toBe(true);
        });

        it('should create error with all options', () => {
            const originalError = new Error('Original');
            const error = createChatError(
                ChatErrorType.PERSONA_ERROR,
                'Persona failed',
                {
                    originalError,
                    context: { personaId: 'test' },
                    recoverable: false,
                    fallbackAction: 'Using default persona',
                }
            );

            expect(error.type).toBe(ChatErrorType.PERSONA_ERROR);
            expect(error.message).toBe('Persona failed');
            expect(error.originalError).toBe(originalError);
            expect(error.context).toEqual({ personaId: 'test' });
            expect(error.recoverable).toBe(false);
            expect(error.fallbackAction).toBe('Using default persona');
        });

        it('should handle all error types', () => {
            const errorTypes = [
                ChatErrorType.DATABASE_ERROR,
                ChatErrorType.PERSONA_ERROR,
                ChatErrorType.SESSION_ERROR,
                ChatErrorType.SETTINGS_ERROR,
                ChatErrorType.MESSAGE_ERROR,
                ChatErrorType.UNKNOWN_ERROR,
            ];

            errorTypes.forEach(type => {
                const error = createChatError(type, 'Test');
                expect(error.type).toBe(type);
            });
        });
    });

    describe('logChatError', () => {
        let consoleWarnSpy: jest.SpyInstance;
        let consoleErrorSpy: jest.SpyInstance;

        beforeEach(() => {
            consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        });

        afterEach(() => {
            consoleWarnSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        it('should log recoverable errors as warnings', () => {
            const error = createChatError(ChatErrorType.DATABASE_ERROR, 'DB failed', {
                recoverable: true,
                fallbackAction: 'Using memory',
            });

            logChatError(error);

            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        it('should log non-recoverable errors as errors', () => {
            const error = createChatError(ChatErrorType.DATABASE_ERROR, 'Critical failure', {
                recoverable: false,
            });

            logChatError(error);

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });
    });

    describe('ErrorRecovery', () => {
        describe('useMemoryOnlyMode', () => {
            it('should create database error with fallback', () => {
                const originalError = new Error('ENOENT');
                const error = ErrorRecovery.useMemoryOnlyMode(originalError);

                expect(error.type).toBe(ChatErrorType.DATABASE_ERROR);
                expect(error.recoverable).toBe(true);
                expect(error.fallbackAction).toContain('memory');
                expect(error.originalError).toBe(originalError);
            });
        });

        describe('useDefaultPersona', () => {
            it('should create persona error with default fallback', () => {
                const error = ErrorRecovery.useDefaultPersona('custom-persona');

                expect(error.type).toBe(ChatErrorType.PERSONA_ERROR);
                expect(error.recoverable).toBe(true);
                expect(error.context?.personaId).toBe('custom-persona');
                expect(error.fallbackAction).toContain('Pippet');
            });

            it('should include original error when provided', () => {
                const originalError = new Error('Not found');
                const error = ErrorRecovery.useDefaultPersona('test', originalError);

                expect(error.originalError).toBe(originalError);
            });
        });

        describe('createNewSession', () => {
            it('should create session error with fallback', () => {
                const error = ErrorRecovery.createNewSession('session_123');

                expect(error.type).toBe(ChatErrorType.SESSION_ERROR);
                expect(error.recoverable).toBe(true);
                expect(error.context?.sessionId).toBe('session_123');
            });
        });

        describe('useDefaultSettings', () => {
            it('should create settings error with fallback', () => {
                const error = ErrorRecovery.useDefaultSettings();

                expect(error.type).toBe(ChatErrorType.SETTINGS_ERROR);
                expect(error.recoverable).toBe(true);
                expect(error.fallbackAction).toContain('default');
            });
        });

        describe('skipMessagePersistence', () => {
            it('should create message error with fallback', () => {
                const error = ErrorRecovery.skipMessagePersistence();

                expect(error.type).toBe(ChatErrorType.MESSAGE_ERROR);
                expect(error.recoverable).toBe(true);
                expect(error.fallbackAction).toContain('not saved');
            });
        });
    });

    describe('withErrorHandling', () => {
        it('should return operation result on success', async () => {
            const result = await withErrorHandling(
                async () => 'success',
                'fallback'
            );

            expect(result).toBe('success');
        });

        it('should return fallback on error', async () => {
            const result = await withErrorHandling(
                async () => { throw new Error('Failed'); },
                'fallback'
            );

            expect(result).toBe('fallback');
        });

        it('should call error handler when provided', async () => {
            const errorHandler = jest.fn().mockReturnValue(
                createChatError(ChatErrorType.UNKNOWN_ERROR, 'Test')
            );

            await withErrorHandling(
                async () => { throw new Error('Failed'); },
                'fallback',
                errorHandler
            );

            expect(errorHandler).toHaveBeenCalled();
        });

        it('should handle non-Error throws', async () => {
            const result = await withErrorHandling(
                async () => { throw 'string error'; },
                'fallback'
            );

            expect(result).toBe('fallback');
        });
    });

    describe('withRetry', () => {
        it('should return result on first success', async () => {
            const operation = jest.fn().mockResolvedValue('success');

            const result = await withRetry(operation, { maxRetries: 3 });

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should retry on failure and succeed', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Fail 1'))
                .mockRejectedValueOnce(new Error('Fail 2'))
                .mockResolvedValue('success');

            const result = await withRetry(operation, {
                maxRetries: 3,
                initialDelayMs: 10,
            });

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(3);
        });

        it('should throw after max retries', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

            await expect(
                withRetry(operation, { maxRetries: 2, initialDelayMs: 10 })
            ).rejects.toThrow('Always fails');

            expect(operation).toHaveBeenCalledTimes(2);
        });

        it('should call onRetry callback', async () => {
            const onRetry = jest.fn();
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Fail'))
                .mockResolvedValue('success');

            await withRetry(operation, {
                maxRetries: 2,
                initialDelayMs: 10,
                onRetry,
            });

            expect(onRetry).toHaveBeenCalledTimes(1);
            expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
        });

        it('should use exponential backoff', async () => {
            const startTime = Date.now();
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Fail 1'))
                .mockRejectedValueOnce(new Error('Fail 2'))
                .mockResolvedValue('success');

            await withRetry(operation, {
                maxRetries: 3,
                initialDelayMs: 50,
                maxDelayMs: 200,
            });

            const elapsed = Date.now() - startTime;
            // First retry: 50ms, Second retry: 100ms = ~150ms minimum
            expect(elapsed).toBeGreaterThanOrEqual(100);
        });

        it('should handle non-Error throws', async () => {
            const operation = jest.fn().mockRejectedValue('string error');

            await expect(
                withRetry(operation, { maxRetries: 1, initialDelayMs: 10 })
            ).rejects.toBeDefined();
        });
    });

    describe('isDatabaseError', () => {
        it('should detect ENOENT errors', () => {
            expect(isDatabaseError(new Error('ENOENT: file not found'))).toBe(true);
        });

        it('should detect permission errors', () => {
            expect(isDatabaseError(new Error('Permission denied'))).toBe(true);
        });

        it('should detect database errors', () => {
            expect(isDatabaseError(new Error('Database connection failed'))).toBe(true);
        });

        it('should detect SQLite errors', () => {
            expect(isDatabaseError(new Error('SQLite error'))).toBe(true);
        });

        it('should detect JSON parse errors', () => {
            expect(isDatabaseError(new Error('JSON parse failed'))).toBe(true);
        });

        it('should not detect unrelated errors', () => {
            expect(isDatabaseError(new Error('Network timeout'))).toBe(false);
            expect(isDatabaseError(new Error('Invalid input'))).toBe(false);
        });
    });

    describe('formatUserError', () => {
        it('should format error message', () => {
            const error = createChatError(ChatErrorType.DATABASE_ERROR, 'DB failed');
            const formatted = formatUserError(error);

            expect(formatted).toBe('DB failed');
        });

        it('should include fallback action when present', () => {
            const error = createChatError(ChatErrorType.DATABASE_ERROR, 'DB failed', {
                fallbackAction: 'Using memory mode.',
            });
            const formatted = formatUserError(error);

            expect(formatted).toBe('DB failed Using memory mode.');
        });
    });
});
