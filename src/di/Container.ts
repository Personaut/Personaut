/**
 * Simple Dependency Injection Container
 *
 * Provides service registration and resolution for the application.
 * All services are registered as factory functions and resolved on demand.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */

export class Container {
  private services = new Map<string, () => any>();
  private singletons = new Map<string, any>();

  /**
   * Register a service with a factory function
   * @param key - Unique identifier for the service
   * @param factory - Factory function that creates the service instance
   * @param isSingleton - If true, the service will be created once and cached
   */
  register<T>(key: string, factory: () => T, isSingleton: boolean = true): void {
    this.services.set(key, factory);
    if (!isSingleton) {
      this.singletons.delete(key);
    }
  }

  /**
   * Resolve a service by its key
   * @param key - Unique identifier for the service
   * @returns The service instance
   * @throws Error if the service is not registered
   */
  resolve<T>(key: string): T {
    // Check if singleton instance exists
    if (this.singletons.has(key)) {
      return this.singletons.get(key) as T;
    }

    // Get factory function
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service "${key}" is not registered in the container`);
    }

    // Create instance
    const instance = factory();

    // Cache if singleton
    if (!this.services.has(key + '_transient')) {
      this.singletons.set(key, instance);
    }

    return instance as T;
  }

  /**
   * Check if a service is registered
   * @param key - Unique identifier for the service
   * @returns True if the service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Clear all registered services and singletons
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Get all registered service keys
   * @returns Array of service keys
   */
  getRegisteredKeys(): string[] {
    return Array.from(this.services.keys());
  }
}
