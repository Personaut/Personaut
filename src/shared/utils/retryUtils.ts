/**
 * Retry utility functions for handling transient failures with exponential backoff.
 *
 * Feature: agent-interaction-fixes
 * Validates: Requirements 11.2
 */

/**
 * Retry an async operation with exponential backoff.
 * 
 * @param operation - The async operation to retry
 * @param maxAttempts - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds for exponential backoff (default: 1000ms)
 * @param onRetry - Optional callback invoked before each retry with attempt number and error
 * @returns Promise that resolves with the operation result
 * @throws The last error if all retry attempts fail
 * 
 * @example
 * const result = await retryWithBackoff(
 *   async () => await saveToStorage(data),
 *   3,
 *   1000,
 *   (attempt, error) => console.log(`Retry attempt ${attempt}: ${error.message}`)
 * );
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this was the last attempt, throw the error
      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Calculate exponential backoff delay: baseDelay * 2^(attempt - 1)
      const delay = baseDelay * Math.pow(2, attempt - 1);

      // Invoke retry callback if provided
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Retry failed');
}
