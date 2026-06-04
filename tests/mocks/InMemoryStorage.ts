import { Storage } from '../../src/dependencies/interfaces';

/**
 * In-memory storage implementation for testing
 * This provides a localStorage-like interface that works in Node.js environments
 */
export class InMemoryStorage implements Storage {
  private storage: Map<string, string> = new Map();

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null;
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  /**
   * Clear all items (useful for test cleanup)
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Get all keys (useful for debugging)
   */
  keys(): string[] {
    return Array.from(this.storage.keys());
  }

  /**
   * Get the number of items stored
   */
  get size(): number {
    return this.storage.size;
  }
}
