import { SignalWireStorageContract, StorageInfo } from '@signalwire/core'

/**
 * A wrapper that adds client-specific prefixing to any storage implementation.
 * All keys are automatically prefixed with `swcf:${clientId}:` to ensure isolation
 * between different client instances.
 */
export class StorageWrapper implements SignalWireStorageContract {
  private readonly prefix: string

  /**
   * Creates a new StorageWrapper instance
   * @param storage - The underlying storage implementation (can be undefined)
   * @param clientId - The client identifier for key prefixing
   */
  constructor(
    private readonly storage: SignalWireStorageContract | undefined,
    clientId: string
  ) {
    this.prefix = `swcf:${clientId}:`
  }

  /**
   * Adds the client prefix to a key
   */
  private prefixKey(key: string): string {
    return `${this.prefix}${key}`
  }

  /**
   * Removes the client prefix from a key
   */
  private unprefixKey(key: string): string {
    if (key.startsWith(this.prefix)) {
      return key.slice(this.prefix.length)
    }
    return key
  }

  /**
   * Checks if a key has the client prefix
   */
  private hasPrefix(key: string): boolean {
    return key.startsWith(this.prefix)
  }

  // Persistent storage methods
  async get(key: string): Promise<string | null> {
    if (!this.storage) return null
    return this.storage.get(this.prefixKey(key))
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage is not available')
    }
    return this.storage.set(this.prefixKey(key), value)
  }

  async delete(key: string): Promise<boolean> {
    if (!this.storage) return false
    return this.storage.delete(this.prefixKey(key))
  }

  async has(key: string): Promise<boolean> {
    if (!this.storage) return false
    return this.storage.has(this.prefixKey(key))
  }

  async getMany(keys: string[]): Promise<Map<string, string | null>> {
    if (!this.storage) {
      const result = new Map<string, string | null>()
      keys.forEach((key) => result.set(key, null))
      return result
    }

    const prefixedKeys = keys.map((key) => this.prefixKey(key))
    const prefixedResults = await this.storage.getMany(prefixedKeys)

    const result = new Map<string, string | null>()
    prefixedResults.forEach((value, prefixedKey) => {
      const originalKey = this.unprefixKey(prefixedKey)
      const keyIndex = keys.indexOf(originalKey)
      if (keyIndex !== -1) {
        result.set(keys[keyIndex], value)
      }
    })

    // Ensure all requested keys are in the result
    for (const key of keys) {
      if (!result.has(key)) {
        result.set(key, null)
      }
    }

    return result
  }

  async setMany(
    entries: Map<string, string> | Array<[string, string]>
  ): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage is not available')
    }

    const prefixedEntries = new Map<string, string>()
    const entriesArray = entries instanceof Map ? Array.from(entries) : entries

    for (const [key, value] of entriesArray) {
      prefixedEntries.set(this.prefixKey(key), value)
    }

    return this.storage.setMany(prefixedEntries)
  }

  async deleteMany(keys: string[]): Promise<Map<string, boolean>> {
    if (!this.storage) {
      const result = new Map<string, boolean>()
      keys.forEach((key) => result.set(key, false))
      return result
    }

    const prefixedKeys = keys.map((key) => this.prefixKey(key))
    const prefixedResults = await this.storage.deleteMany(prefixedKeys)

    const result = new Map<string, boolean>()
    prefixedResults.forEach((deleted, prefixedKey) => {
      const originalKey = this.unprefixKey(prefixedKey)
      const keyIndex = keys.indexOf(originalKey)
      if (keyIndex !== -1) {
        result.set(keys[keyIndex], deleted)
      }
    })

    // Ensure all requested keys are in the result
    for (const key of keys) {
      if (!result.has(key)) {
        result.set(key, false)
      }
    }

    return result
  }

  async list(prefix?: string): Promise<string[]> {
    if (!this.storage) return []

    const fullPrefix = prefix ? this.prefixKey(prefix) : this.prefix
    const allKeys = await this.storage.list(fullPrefix)

    return allKeys
      .filter((key) => this.hasPrefix(key))
      .map((key) => this.unprefixKey(key))
  }

  async clear(prefix?: string): Promise<void> {
    if (!this.storage) return

    const fullPrefix = prefix ? this.prefixKey(prefix) : this.prefix
    return this.storage.clear(fullPrefix)
  }

  // Session storage methods
  async getSession(key: string): Promise<string | null> {
    if (!this.storage) return null
    return this.storage.getSession(this.prefixKey(key))
  }

  async setSession(key: string, value: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage is not available')
    }
    return this.storage.setSession(this.prefixKey(key), value)
  }

  async deleteSession(key: string): Promise<boolean> {
    if (!this.storage) return false
    return this.storage.deleteSession(this.prefixKey(key))
  }

  async hasSession(key: string): Promise<boolean> {
    if (!this.storage) return false
    return this.storage.hasSession(this.prefixKey(key))
  }

  async getManySession(keys: string[]): Promise<Map<string, string | null>> {
    if (!this.storage) {
      const result = new Map<string, string | null>()
      keys.forEach((key) => result.set(key, null))
      return result
    }

    const prefixedKeys = keys.map((key) => this.prefixKey(key))
    const prefixedResults = await this.storage.getManySession(prefixedKeys)

    const result = new Map<string, string | null>()
    prefixedResults.forEach((value, prefixedKey) => {
      const originalKey = this.unprefixKey(prefixedKey)
      const keyIndex = keys.indexOf(originalKey)
      if (keyIndex !== -1) {
        result.set(keys[keyIndex], value)
      }
    })

    // Ensure all requested keys are in the result
    for (const key of keys) {
      if (!result.has(key)) {
        result.set(key, null)
      }
    }

    return result
  }

  async setManySession(
    entries: Map<string, string> | Array<[string, string]>
  ): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage is not available')
    }

    const prefixedEntries = new Map<string, string>()
    const entriesArray = entries instanceof Map ? Array.from(entries) : entries

    for (const [key, value] of entriesArray) {
      prefixedEntries.set(this.prefixKey(key), value)
    }

    return this.storage.setManySession(prefixedEntries)
  }

  async deleteManySession(keys: string[]): Promise<Map<string, boolean>> {
    if (!this.storage) {
      const result = new Map<string, boolean>()
      keys.forEach((key) => result.set(key, false))
      return result
    }

    const prefixedKeys = keys.map((key) => this.prefixKey(key))
    const prefixedResults = await this.storage.deleteManySession(prefixedKeys)

    const result = new Map<string, boolean>()
    prefixedResults.forEach((deleted, prefixedKey) => {
      const originalKey = this.unprefixKey(prefixedKey)
      const keyIndex = keys.indexOf(originalKey)
      if (keyIndex !== -1) {
        result.set(keys[keyIndex], deleted)
      }
    })

    // Ensure all requested keys are in the result
    for (const key of keys) {
      if (!result.has(key)) {
        result.set(key, false)
      }
    }

    return result
  }

  async listSession(prefix?: string): Promise<string[]> {
    if (!this.storage) return []

    const fullPrefix = prefix ? this.prefixKey(prefix) : this.prefix
    const allKeys = await this.storage.listSession(fullPrefix)

    return allKeys
      .filter((key) => this.hasPrefix(key))
      .map((key) => this.unprefixKey(key))
  }

  async clearSession(prefix?: string): Promise<void> {
    if (!this.storage) return

    const fullPrefix = prefix ? this.prefixKey(prefix) : this.prefix
    return this.storage.clearSession(fullPrefix)
  }

  // Storage info
  async getStorageInfo(): Promise<StorageInfo> {
    if (!this.storage) {
      return {
        type: 'custom',
        isAvailable: false,
        isPersistent: false,
      }
    }
    return this.storage.getStorageInfo()
  }
}
