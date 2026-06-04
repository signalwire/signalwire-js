import { StorageNotAvailableError } from '../core/errors';
import { getLogger } from '../utils/logger';

import type { Storage, StorageScope } from './interfaces';

/** Default storage implementation backed by browser `localStorage` and `sessionStorage`. */
export class DefaultLocalStorage implements Storage {
  constructor() {
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      throw new StorageNotAvailableError('localStorage');
    }
    if (typeof sessionStorage === 'undefined') {
      throw new StorageNotAvailableError('sessionStorage');
    }

    // Test if localStorage is actually accessible (some browsers block it)
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (error) {
      getLogger().error('LocalStorage is not accessible:', error);
      throw new StorageNotAvailableError('localStorage');
    }
  }

  private storage(scope: StorageScope) {
    return scope === 'local' ? localStorage : sessionStorage;
  }

  async setItem(key: string, value: string, scope: StorageScope = 'session'): Promise<void> {
    this.storage(scope).setItem(key, value);
    return Promise.resolve();
  }

  async getItem(key: string, scope: StorageScope = 'session'): Promise<string | null> {
    return Promise.resolve(this.storage(scope).getItem(key));
  }

  async removeItem(key: string, scope: StorageScope = 'session'): Promise<void> {
    this.storage(scope).removeItem(key);
    return Promise.resolve();
  }

  async clear(scope: StorageScope = 'session'): Promise<void> {
    const store = this.storage(scope);
    const keysToRemove: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key?.startsWith('sw:')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      store.removeItem(key);
    }
    return Promise.resolve();
  }
}
