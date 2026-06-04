import {
  SerializationError,
  StorageWriteError,
  DeserializationError,
  StorageReadError
} from '../core/errors';
import { DefaultLocalStorage } from '../dependencies/DefaultLocalStorage';

import type { Storage, StorageScope } from '../dependencies/interfaces';

export class StorageManager {
  constructor(private storageImpl: Storage = new DefaultLocalStorage()) {}

  /**
   * Validates that a value can be safely serialized to JSON
   * @throws SerializationError if value contains non-serializable types
   */
  private serialize(value: unknown, key?: string): string | null {
    if (value === undefined || value === null) {
      // undefined is acceptable, will be stored as null
      return null;
    }

    try {
      return JSON.stringify(value);
    } catch (e) {
      throw new SerializationError(key ?? 'unknown', e as Error);
    }
  }

  /**
   * Stores a value in storage
   * @throws InvalidStorageValueError if value contains non-serializable types
   * @throws SerializationError if JSON serialization fails
   * @throws StorageWriteError if writing to storage fails
   */
  public async setItem(
    key: string,
    value: unknown,
    scope: StorageScope = 'session'
  ): Promise<void> {
    const serialized = this.serialize(value, key);

    try {
      await this.storageImpl.setItem(key, serialized, scope);
    } catch (error) {
      throw new StorageWriteError(key, error as Error);
    }
  }

  /**
   * Retrieves a value from storage
   *
   * This method distinguishes between:
   * - Storage errors (network, permission, etc.) - these are thrown
   * - JSON parse errors - these trigger onParseError and return raw string
   * - Missing keys - returns null
   *
   * @returns The parsed value, raw string (on parse error), or null
   * @throws StorageReadError
   */
  public async getItem<T = unknown>(
    key: string,
    scope: StorageScope = 'session'
  ): Promise<T | null> {
    let item: string | null;

    try {
      item = await this.storageImpl.getItem(key, scope);
    } catch (error) {
      throw new StorageReadError(key, error as Error);
    }

    if (!item) {
      return null;
    }

    try {
      return JSON.parse(item) as T;
    } catch (error) {
      throw new DeserializationError(key, error as Error);
    }
  }

  /**
   * Removes a value from storage
   * @throws Error from underlying storage implementation
   */
  public async removeItem(key: string, scope: StorageScope = 'session'): Promise<void> {
    try {
      await this.storageImpl.removeItem(key, scope);
    } catch (error) {
      throw new StorageWriteError(key, error as Error);
    }
  }

  /**
   * Clears all SDK keys from both 'local' and 'session' scopes.
   * @throws StorageWriteError if clearing fails
   */
  public async clearAll(): Promise<void> {
    try {
      await this.storageImpl.clear('local');
      await this.storageImpl.clear('session');
    } catch (error) {
      throw new StorageWriteError('clearAll', error as Error);
    }
  }
}
