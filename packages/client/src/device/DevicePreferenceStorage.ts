/**
 * Device Preference Storage Adapter
 * Handles persistence of device preferences with localStorage implementation
 */

import { getLogger } from '@signalwire/core'
import type { DevicePreference, DevicePreferenceStorage } from './types'

/**
 * LocalStorage implementation of DevicePreferenceStorage
 * Provides persistent storage for device preferences in the browser
 */
export class LocalStorageAdapter implements DevicePreferenceStorage {
  private readonly logger = getLogger()
  private readonly prefix: string

  /**
   * Create a new LocalStorageAdapter
   * @param prefix - Storage key prefix to avoid collisions
   */
  constructor(prefix: string = 'sw_device_prefs_') {
    this.prefix = prefix
  }

  /**
   * Save preferences to localStorage
   * @param key - Storage key (usually device type)
   * @param preferences - Array of device preferences to save
   */
  async save(key: string, preferences: DevicePreference[]): Promise<void> {
    try {
      const storageKey = this.getStorageKey(key)
      const data = JSON.stringify(preferences)
      localStorage.setItem(storageKey, data)
      this.logger.debug(`[LocalStorageAdapter] Saved preferences for ${key}`)
    } catch (error) {
      this.logger.error('[LocalStorageAdapter] Failed to save preferences:', error)
      throw new Error(`Failed to save device preferences: ${error}`)
    }
  }

  /**
   * Load preferences from localStorage
   * @param key - Storage key to load from
   * @returns Array of preferences or null if not found
   */
  async load(key: string): Promise<DevicePreference[] | null> {
    try {
      const storageKey = this.getStorageKey(key)
      const data = localStorage.getItem(storageKey)
      
      if (!data) {
        this.logger.debug(`[LocalStorageAdapter] No preferences found for ${key}`)
        return null
      }

      const preferences = JSON.parse(data) as DevicePreference[]
      this.logger.debug(`[LocalStorageAdapter] Loaded ${preferences.length} preferences for ${key}`)
      return preferences
    } catch (error) {
      this.logger.error('[LocalStorageAdapter] Failed to load preferences:', error)
      return null
    }
  }

  /**
   * Clear preferences from localStorage
   * @param key - Storage key to clear
   */
  async clear(key: string): Promise<void> {
    try {
      const storageKey = this.getStorageKey(key)
      localStorage.removeItem(storageKey)
      this.logger.debug(`[LocalStorageAdapter] Cleared preferences for ${key}`)
    } catch (error) {
      this.logger.error('[LocalStorageAdapter] Failed to clear preferences:', error)
      throw new Error(`Failed to clear device preferences: ${error}`)
    }
  }

  /**
   * Check if localStorage is available
   * @returns true if localStorage is available and functional
   */
  isAvailable(): boolean {
    try {
      const testKey = '__sw_storage_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      this.logger.warn('[LocalStorageAdapter] localStorage is not available')
      return false
    }
  }

  /**
   * Get the full storage key with prefix
   * @param key - Base key
   * @returns Prefixed storage key
   */
  private getStorageKey(key: string): string {
    return `${this.prefix}${key}`
  }
}

/**
 * In-memory storage adapter for testing or non-persistent scenarios
 */
export class MemoryStorageAdapter implements DevicePreferenceStorage {
  private readonly logger = getLogger()
  private readonly storage = new Map<string, DevicePreference[]>()

  /**
   * Save preferences to memory
   * @param key - Storage key
   * @param preferences - Array of device preferences
   */
  async save(key: string, preferences: DevicePreference[]): Promise<void> {
    this.storage.set(key, [...preferences])
    this.logger.debug(`[MemoryStorageAdapter] Saved ${preferences.length} preferences for ${key}`)
  }

  /**
   * Load preferences from memory
   * @param key - Storage key
   * @returns Array of preferences or null if not found
   */
  async load(key: string): Promise<DevicePreference[] | null> {
    const preferences = this.storage.get(key)
    if (preferences) {
      this.logger.debug(`[MemoryStorageAdapter] Loaded ${preferences.length} preferences for ${key}`)
      return [...preferences]
    }
    return null
  }

  /**
   * Clear preferences from memory
   * @param key - Storage key
   */
  async clear(key: string): Promise<void> {
    this.storage.delete(key)
    this.logger.debug(`[MemoryStorageAdapter] Cleared preferences for ${key}`)
  }

  /**
   * Always available as it's in-memory
   * @returns Always returns true
   */
  isAvailable(): boolean {
    return true
  }

  /**
   * Clear all stored preferences
   */
  clearAll(): void {
    this.storage.clear()
    this.logger.debug('[MemoryStorageAdapter] Cleared all preferences')
  }
}

/**
 * Factory function to create appropriate storage adapter
 * @param type - Type of storage adapter ('local' | 'memory')
 * @param prefix - Optional prefix for storage keys
 * @returns DevicePreferenceStorage implementation
 */
export function createStorageAdapter(
  type: 'local' | 'memory' = 'local',
  prefix?: string
): DevicePreferenceStorage {
  if (type === 'memory') {
    return new MemoryStorageAdapter()
  }

  const adapter = new LocalStorageAdapter(prefix)
  
  // Fallback to memory storage if localStorage is not available
  if (!adapter.isAvailable()) {
    getLogger().warn('[createStorageAdapter] localStorage not available, using memory storage')
    return new MemoryStorageAdapter()
  }

  return adapter
}