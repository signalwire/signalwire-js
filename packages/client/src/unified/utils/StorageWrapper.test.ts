import { StorageWrapper } from './StorageWrapper'
import { SignalWireStorageContract, StorageInfo } from '../interfaces/storage'

// Create a mock storage implementation
class MockStorage implements SignalWireStorageContract {
  private store = new Map<string, any>()
  private sessionStore = new Map<string, any>()

  async get<T = any>(key: string): Promise<T | null> {
    return this.store.get(key) || null
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    this.store.set(key, value)
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key)
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key)
  }

  async getMany<T = any>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>()
    for (const key of keys) {
      result.set(key, await this.get<T>(key))
    }
    return result
  }

  async setMany<T = any>(entries: Map<string, T> | Array<[string, T]>): Promise<void> {
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
    const keys = Array.from(this.store.keys())
    if (prefix) {
      return keys.filter(key => key.startsWith(prefix))
    }
    return keys
  }

  async clear(prefix?: string): Promise<void> {
    if (prefix) {
      const keysToDelete = await this.list(prefix)
      for (const key of keysToDelete) {
        this.store.delete(key)
      }
    } else {
      this.store.clear()
    }
  }

  // Session storage methods
  async getSession<T = any>(key: string): Promise<T | null> {
    return this.sessionStore.get(key) || null
  }

  async setSession<T = any>(key: string, value: T): Promise<void> {
    this.sessionStore.set(key, value)
  }

  async deleteSession(key: string): Promise<boolean> {
    return this.sessionStore.delete(key)
  }

  async hasSession(key: string): Promise<boolean> {
    return this.sessionStore.has(key)
  }

  async getManySession<T = any>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>()
    for (const key of keys) {
      result.set(key, await this.getSession<T>(key))
    }
    return result
  }

  async setManySession<T = any>(entries: Map<string, T> | Array<[string, T]>): Promise<void> {
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
    const keys = Array.from(this.sessionStore.keys())
    if (prefix) {
      return keys.filter(key => key.startsWith(prefix))
    }
    return keys
  }

  async clearSession(prefix?: string): Promise<void> {
    if (prefix) {
      const keysToDelete = await this.listSession(prefix)
      for (const key of keysToDelete) {
        this.sessionStore.delete(key)
      }
    } else {
      this.sessionStore.clear()
    }
  }

  async getStorageInfo(): Promise<StorageInfo> {
    return {
      type: 'memory',
      isAvailable: true,
      isPersistent: false,
    }
  }
}

describe('StorageWrapper', () => {
  let mockStorage: MockStorage
  let wrapper: StorageWrapper
  const clientId = 'test-client-123'

  beforeEach(() => {
    mockStorage = new MockStorage()
    wrapper = new StorageWrapper(mockStorage, clientId)
  })

  describe('Key Prefixing', () => {
    it('should prefix keys with client ID', async () => {
      await wrapper.set('myKey', 'myValue')
      
      // Check that the underlying storage has the prefixed key
      const prefixedKey = `swcf:${clientId}:myKey`
      expect(await mockStorage.has(prefixedKey)).toBe(true)
      expect(await mockStorage.get(prefixedKey)).toBe('myValue')
    })

    it('should retrieve values with automatic unprefixing', async () => {
      const prefixedKey = `swcf:${clientId}:myKey`
      await mockStorage.set(prefixedKey, 'myValue')
      
      const value = await wrapper.get('myKey')
      expect(value).toBe('myValue')
    })

    it('should handle complex objects', async () => {
      const complexObject = {
        id: 123,
        name: 'Test',
        nested: {
          prop: 'value',
        },
      }
      
      await wrapper.set('complex', complexObject)
      const retrieved = await wrapper.get('complex')
      expect(retrieved).toEqual(complexObject)
    })
  })

  describe('Batch Operations', () => {
    it('should handle getMany with prefixing', async () => {
      await wrapper.set('key1', 'value1')
      await wrapper.set('key2', 'value2')
      
      const result = await wrapper.getMany(['key1', 'key2', 'key3'])
      expect(result.get('key1')).toBe('value1')
      expect(result.get('key2')).toBe('value2')
      expect(result.get('key3')).toBeNull()
    })

    it('should handle setMany with prefixing', async () => {
      const entries = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ])
      
      await wrapper.setMany(entries)
      
      expect(await wrapper.get('key1')).toBe('value1')
      expect(await wrapper.get('key2')).toBe('value2')
    })

    it('should handle deleteMany with prefixing', async () => {
      await wrapper.set('key1', 'value1')
      await wrapper.set('key2', 'value2')
      
      const result = await wrapper.deleteMany(['key1', 'key2', 'key3'])
      expect(result.get('key1')).toBe(true)
      expect(result.get('key2')).toBe(true)
      expect(result.get('key3')).toBe(false)
      
      expect(await wrapper.has('key1')).toBe(false)
      expect(await wrapper.has('key2')).toBe(false)
    })
  })

  describe('List Operations', () => {
    it('should list only keys with client prefix', async () => {
      // Set some keys through wrapper
      await wrapper.set('key1', 'value1')
      await wrapper.set('key2', 'value2')
      
      // Set some keys directly without prefix (simulating other clients)
      await mockStorage.set('other:key3', 'value3')
      await mockStorage.set('swcf:other-client:key4', 'value4')
      
      const keys = await wrapper.list()
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).not.toContain('other:key3')
      expect(keys).not.toContain('swcf:other-client:key4')
    })

    it('should list keys with additional prefix filter', async () => {
      await wrapper.set('user:1', 'Alice')
      await wrapper.set('user:2', 'Bob')
      await wrapper.set('config:theme', 'dark')
      
      const userKeys = await wrapper.list('user:')
      expect(userKeys).toContain('user:1')
      expect(userKeys).toContain('user:2')
      expect(userKeys).not.toContain('config:theme')
    })
  })

  describe('Clear Operations', () => {
    it('should clear only client-prefixed keys', async () => {
      await wrapper.set('key1', 'value1')
      await wrapper.set('key2', 'value2')
      await mockStorage.set('other:key3', 'value3')
      
      await wrapper.clear()
      
      expect(await wrapper.has('key1')).toBe(false)
      expect(await wrapper.has('key2')).toBe(false)
      expect(await mockStorage.has('other:key3')).toBe(true)
    })

    it('should clear with prefix filter', async () => {
      await wrapper.set('temp:1', 'data1')
      await wrapper.set('temp:2', 'data2')
      await wrapper.set('permanent:1', 'important')
      
      await wrapper.clear('temp:')
      
      expect(await wrapper.has('temp:1')).toBe(false)
      expect(await wrapper.has('temp:2')).toBe(false)
      expect(await wrapper.has('permanent:1')).toBe(true)
    })
  })

  describe('Session Storage', () => {
    it('should handle session storage with prefixing', async () => {
      await wrapper.setSession('sessionKey', 'sessionValue')
      
      const prefixedKey = `swcf:${clientId}:sessionKey`
      expect(await mockStorage.hasSession(prefixedKey)).toBe(true)
      
      const value = await wrapper.getSession('sessionKey')
      expect(value).toBe('sessionValue')
    })

    it('should handle batch session operations', async () => {
      const entries = new Map([
        ['sess1', 'value1'],
        ['sess2', 'value2'],
      ])
      
      await wrapper.setManySession(entries)
      
      const result = await wrapper.getManySession(['sess1', 'sess2', 'sess3'])
      expect(result.get('sess1')).toBe('value1')
      expect(result.get('sess2')).toBe('value2')
      expect(result.get('sess3')).toBeNull()
    })
  })

  describe('Undefined Storage Handling', () => {
    it('should handle undefined storage gracefully', async () => {
      const wrapperNoStorage = new StorageWrapper(undefined, clientId)
      
      // Get operations should return null
      expect(await wrapperNoStorage.get('key')).toBeNull()
      expect(await wrapperNoStorage.getSession('key')).toBeNull()
      
      // Has operations should return false
      expect(await wrapperNoStorage.has('key')).toBe(false)
      expect(await wrapperNoStorage.hasSession('key')).toBe(false)
      
      // Delete operations should return false
      expect(await wrapperNoStorage.delete('key')).toBe(false)
      expect(await wrapperNoStorage.deleteSession('key')).toBe(false)
      
      // List operations should return empty arrays
      expect(await wrapperNoStorage.list()).toEqual([])
      expect(await wrapperNoStorage.listSession()).toEqual([])
      
      // Set operations should throw
      await expect(wrapperNoStorage.set('key', 'value')).rejects.toThrow('Storage is not available')
      await expect(wrapperNoStorage.setSession('key', 'value')).rejects.toThrow('Storage is not available')
    })

    it('should return unavailable storage info when storage is undefined', async () => {
      const wrapperNoStorage = new StorageWrapper(undefined, clientId)
      const info = await wrapperNoStorage.getStorageInfo()
      
      expect(info.type).toBe('custom')
      expect(info.isAvailable).toBe(false)
      expect(info.isPersistent).toBe(false)
    })
  })

  describe('Storage Info', () => {
    it('should pass through storage info from underlying storage', async () => {
      const info = await wrapper.getStorageInfo()
      expect(info.type).toBe('memory')
      expect(info.isAvailable).toBe(true)
      expect(info.isPersistent).toBe(false)
    })
  })
})