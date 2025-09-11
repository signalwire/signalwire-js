/**
 * Storage information about the underlying storage implementation
 */
export interface StorageInfo {
  type: 'localStorage' | 'sessionStorage' | 'memory' | 'custom'
  isAvailable: boolean
  isPersistent: boolean
  quotaUsed?: number
  quotaTotal?: number
}

/**
 * Contract for SignalWire storage implementations.
 * Provides both persistent and session storage capabilities.
 */
export interface SignalWireStorageContract {
  // Persistent storage methods
  /**
   * Get a value from persistent storage
   * @param key - The storage key
   * @returns The stored value or null if not found
   */
  get(key: string): Promise<string | null>

  /**
   * Set a value in persistent storage
   * @param key - The storage key
   * @param value - The value to store
   */
  set(key: string, value: string): Promise<void>

  /**
   * Delete a value from persistent storage
   * @param key - The storage key
   * @returns True if the item was deleted, false if it didn't exist
   */
  delete(key: string): Promise<boolean>

  /**
   * Check if a key exists in persistent storage
   * @param key - The storage key
   * @returns True if the key exists
   */
  has(key: string): Promise<boolean>

  /**
   * Get multiple values from persistent storage
   * @param keys - Array of storage keys
   * @returns Map of keys to values (null if not found)
   */
  getMany(keys: string[]): Promise<Map<string, string | null>>

  /**
   * Set multiple values in persistent storage
   * @param entries - Map or array of key-value pairs
   */
  setMany(
    entries: Map<string, string> | Array<[string, string]>
  ): Promise<void>

  /**
   * Delete multiple values from persistent storage
   * @param keys - Array of storage keys
   * @returns Map of keys to deletion results
   */
  deleteMany(keys: string[]): Promise<Map<string, boolean>>

  /**
   * List all keys in persistent storage
   * @param prefix - Optional prefix to filter keys
   * @returns Array of matching keys
   */
  list(prefix?: string): Promise<string[]>

  /**
   * Clear all items from persistent storage
   * @param prefix - Optional prefix to only clear matching keys
   */
  clear(prefix?: string): Promise<void>

  // Session storage methods
  /**
   * Get a value from session storage
   * @param key - The storage key
   * @returns The stored value or null if not found
   */
  getSession(key: string): Promise<string | null>

  /**
   * Set a value in session storage
   * @param key - The storage key
   * @param value - The value to store
   */
  setSession(key: string, value: string): Promise<void>

  /**
   * Delete a value from session storage
   * @param key - The storage key
   * @returns True if the item was deleted, false if it didn't exist
   */
  deleteSession(key: string): Promise<boolean>

  /**
   * Check if a key exists in session storage
   * @param key - The storage key
   * @returns True if the key exists
   */
  hasSession(key: string): Promise<boolean>

  /**
   * Get multiple values from session storage
   * @param keys - Array of storage keys
   * @returns Map of keys to values (null if not found)
   */
  getManySession(keys: string[]): Promise<Map<string, string | null>>

  /**
   * Set multiple values in session storage
   * @param entries - Map or array of key-value pairs
   */
  setManySession(
    entries: Map<string, string> | Array<[string, string]>
  ): Promise<void>

  /**
   * Delete multiple values from session storage
   * @param keys - Array of storage keys
   * @returns Map of keys to deletion results
   */
  deleteManySession(keys: string[]): Promise<Map<string, boolean>>

  /**
   * List all keys in session storage
   * @param prefix - Optional prefix to filter keys
   * @returns Array of matching keys
   */
  listSession(prefix?: string): Promise<string[]>

  /**
   * Clear all items from session storage
   * @param prefix - Optional prefix to only clear matching keys
   */
  clearSession(prefix?: string): Promise<void>

  /**
   * Get information about the storage implementation
   * @returns Storage information including type and availability
   */
  getStorageInfo(): Promise<StorageInfo>
}