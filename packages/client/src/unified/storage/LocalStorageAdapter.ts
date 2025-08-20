import { SignalWireStorageContract, StorageInfo } from '../interfaces/storage'

/**
 * Browser-based storage adapter using localStorage and sessionStorage
 */
export class LocalStorageAdapter implements SignalWireStorageContract {
  private readonly isLocalStorageAvailable: boolean
  private readonly isSessionStorageAvailable: boolean

  constructor() {
    this.isLocalStorageAvailable = this.checkStorageAvailability('localStorage')
    this.isSessionStorageAvailable =
      this.checkStorageAvailability('sessionStorage')
  }

  private checkStorageAvailability(
    type: 'localStorage' | 'sessionStorage'
  ): boolean {
    try {
      const storage = window[type]
      const testKey = '__sw_storage_test__'
      storage.setItem(testKey, 'test')
      storage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  private serialize<T>(value: T): string {
    try {
      return JSON.stringify(value)
    } catch (error) {
      throw new Error(`Failed to serialize value: ${error}`)
    }
  }

  private deserialize<T>(value: string | null): T | null {
    if (value === null) return null
    try {
      return JSON.parse(value) as T
    } catch {
      // If parsing fails, return the raw string as T
      return value as unknown as T
    }
  }

  private handleStorageError(error: unknown, operation: string): never {
    if (error instanceof DOMException) {
      if (error.name === 'QuotaExceededError') {
        throw new Error(`Storage quota exceeded during ${operation}`)
      }
      if (error.name === 'SecurityError') {
        throw new Error(
          `Security error during ${operation}: Storage access denied`
        )
      }
    }
    throw new Error(`Storage operation failed during ${operation}: ${error}`)
  }

  // Persistent storage methods
  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.isLocalStorageAvailable) {
      return null
    }
    try {
      const value = localStorage.getItem(key)
      return this.deserialize<T>(value)
    } catch (error) {
      this.handleStorageError(error, 'get')
    }
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    if (!this.isLocalStorageAvailable) {
      throw new Error('localStorage is not available')
    }
    try {
      const serialized = this.serialize(value)
      localStorage.setItem(key, serialized)
    } catch (error) {
      this.handleStorageError(error, 'set')
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isLocalStorageAvailable) {
      return false
    }
    try {
      const exists = localStorage.getItem(key) !== null
      if (exists) {
        localStorage.removeItem(key)
      }
      return exists
    } catch (error) {
      this.handleStorageError(error, 'delete')
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.isLocalStorageAvailable) {
      return false
    }
    try {
      return localStorage.getItem(key) !== null
    } catch (error) {
      this.handleStorageError(error, 'has')
    }
  }

  async getMany<T = unknown>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>()
    for (const key of keys) {
      result.set(key, await this.get<T>(key))
    }
    return result
  }

  async setMany<T = unknown>(
    entries: Map<string, T> | Array<[string, T]>
  ): Promise<void> {
    const entriesArray = entries instanceof Map ? Array.from(entries) : entries
    for (const [key, value] of entriesArray) {
      await this.set(key, value)
    }
  }

  async deleteMany(keys: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>()
    for (const key of keys) {
      result.set(key, await this.delete(key))
    }
    return result
  }

  async list(prefix?: string): Promise<string[]> {
    if (!this.isLocalStorageAvailable) {
      return []
    }
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (!prefix || key.startsWith(prefix))) {
          keys.push(key)
        }
      }
      return keys
    } catch (error) {
      this.handleStorageError(error, 'list')
    }
  }

  async clear(prefix?: string): Promise<void> {
    if (!this.isLocalStorageAvailable) {
      return
    }
    try {
      if (prefix) {
        const keysToDelete = await this.list(prefix)
        for (const key of keysToDelete) {
          localStorage.removeItem(key)
        }
      } else {
        localStorage.clear()
      }
    } catch (error) {
      this.handleStorageError(error, 'clear')
    }
  }

  // Session storage methods
  async getSession<T = unknown>(key: string): Promise<T | null> {
    if (!this.isSessionStorageAvailable) {
      return null
    }
    try {
      const value = sessionStorage.getItem(key)
      return this.deserialize<T>(value)
    } catch (error) {
      this.handleStorageError(error, 'getSession')
    }
  }

  async setSession<T = unknown>(key: string, value: T): Promise<void> {
    if (!this.isSessionStorageAvailable) {
      throw new Error('sessionStorage is not available')
    }
    try {
      const serialized = this.serialize(value)
      sessionStorage.setItem(key, serialized)
    } catch (error) {
      this.handleStorageError(error, 'setSession')
    }
  }

  async deleteSession(key: string): Promise<boolean> {
    if (!this.isSessionStorageAvailable) {
      return false
    }
    try {
      const exists = sessionStorage.getItem(key) !== null
      if (exists) {
        sessionStorage.removeItem(key)
      }
      return exists
    } catch (error) {
      this.handleStorageError(error, 'deleteSession')
    }
  }

  async hasSession(key: string): Promise<boolean> {
    if (!this.isSessionStorageAvailable) {
      return false
    }
    try {
      return sessionStorage.getItem(key) !== null
    } catch (error) {
      this.handleStorageError(error, 'hasSession')
    }
  }

  async getManySession<T = unknown>(
    keys: string[]
  ): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>()
    for (const key of keys) {
      result.set(key, await this.getSession<T>(key))
    }
    return result
  }

  async setManySession<T = unknown>(
    entries: Map<string, T> | Array<[string, T]>
  ): Promise<void> {
    const entriesArray = entries instanceof Map ? Array.from(entries) : entries
    for (const [key, value] of entriesArray) {
      await this.setSession(key, value)
    }
  }

  async deleteManySession(keys: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>()
    for (const key of keys) {
      result.set(key, await this.deleteSession(key))
    }
    return result
  }

  async listSession(prefix?: string): Promise<string[]> {
    if (!this.isSessionStorageAvailable) {
      return []
    }
    try {
      const keys: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (!prefix || key.startsWith(prefix))) {
          keys.push(key)
        }
      }
      return keys
    } catch (error) {
      this.handleStorageError(error, 'listSession')
    }
  }

  async clearSession(prefix?: string): Promise<void> {
    if (!this.isSessionStorageAvailable) {
      return
    }
    try {
      if (prefix) {
        const keysToDelete = await this.listSession(prefix)
        for (const key of keysToDelete) {
          sessionStorage.removeItem(key)
        }
      } else {
        sessionStorage.clear()
      }
    } catch (error) {
      this.handleStorageError(error, 'clearSession')
    }
  }

  // Storage info
  async getStorageInfo(): Promise<StorageInfo> {
    const info: StorageInfo = {
      type: 'localStorage',
      isAvailable:
        this.isLocalStorageAvailable || this.isSessionStorageAvailable,
      isPersistent: this.isLocalStorageAvailable,
    }

    // Try to estimate storage quota if available
    if (
      'navigator' in globalThis &&
      'storage' in navigator &&
      'estimate' in navigator.storage
    ) {
      try {
        const estimate = await navigator.storage.estimate()
        if (estimate.usage !== undefined) {
          info.quotaUsed = estimate.usage
        }
        if (estimate.quota !== undefined) {
          info.quotaTotal = estimate.quota
        }
      } catch {
        // Ignore errors in getting storage estimate
      }
    }

    return info
  }
}
