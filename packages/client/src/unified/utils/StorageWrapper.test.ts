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

  async setMany<T = any>(
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
    const keys = Array.from(this.store.keys())
    if (prefix) {
      return keys.filter((key) => key.startsWith(prefix))
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

  async getManySession<T = any>(
    keys: string[]
  ): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>()
    for (const key of keys) {
      result.set(key, await this.getSession<T>(key))
    }
    return result
  }

  async setManySession<T = any>(
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
    const keys = Array.from(this.sessionStore.keys())
    if (prefix) {
      return keys.filter((key) => key.startsWith(prefix))
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
      await expect(wrapperNoStorage.set('key', 'value')).rejects.toThrow(
        'Storage is not available'
      )
      await expect(wrapperNoStorage.setSession('key', 'value')).rejects.toThrow(
        'Storage is not available'
      )
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

  describe('Phase 1: Storage Key Schema', () => {
    describe('Key Format Validation', () => {
      it('should use swcf: prefix for all keys', async () => {
        await wrapper.set('test-key', 'test-value')

        const allKeys = await mockStorage.list()
        const swcfKeys = allKeys.filter((key) => key.startsWith('swcf:'))

        expect(swcfKeys.length).toBeGreaterThan(0)
        expect(allKeys.every((key) => key.includes('swcf:'))).toBe(true)
      })

      it('should follow swcf:clientId:key pattern', async () => {
        const testKey = 'my-test-key'
        await wrapper.set(testKey, 'value')

        const expectedKey = `swcf:${clientId}:${testKey}`
        expect(await mockStorage.has(expectedKey)).toBe(true)
      })

      it('should handle complex key names with special characters', async () => {
        const complexKey = 'profile:user-123:credentials:refresh-token'
        await wrapper.set(complexKey, 'token-value')

        const expectedKey = `swcf:${clientId}:${complexKey}`
        expect(await mockStorage.has(expectedKey)).toBe(true)
        expect(await wrapper.get(complexKey)).toBe('token-value')
      })

      it('should handle nested key structures', async () => {
        const nestedKeys = [
          'profiles:static:profile-1',
          'profiles:dynamic:temp-profile',
          'credentials:user-123:sat-token',
          'credentials:user-123:refresh-token',
        ]

        for (const key of nestedKeys) {
          await wrapper.set(key, `value-for-${key}`)
        }

        for (const key of nestedKeys) {
          const expectedKey = `swcf:${clientId}:${key}`
          expect(await mockStorage.has(expectedKey)).toBe(true)
          expect(await wrapper.get(key)).toBe(`value-for-${key}`)
        }
      })
    })

    describe('Profile Storage Keys', () => {
      it('should store profiles with consistent key pattern', async () => {
        const profileId = 'profile-123'
        const profileData = {
          id: profileId,
          type: 'STATIC',
          credentialsId: 'cred-123',
          addressId: 'addr-123',
        }

        await wrapper.set(`profiles:${profileId}`, profileData)

        const expectedKey = `swcf:${clientId}:profiles:${profileId}`
        expect(await mockStorage.has(expectedKey)).toBe(true)

        const retrieved = await wrapper.get(`profiles:${profileId}`)
        expect(retrieved).toEqual(profileData)
      })

      it('should support profile list operations', async () => {
        const profiles = [
          { id: 'profile-1', type: 'STATIC' },
          { id: 'profile-2', type: 'DYNAMIC' },
          { id: 'profile-3', type: 'STATIC' },
        ]

        for (const profile of profiles) {
          await wrapper.set(`profiles:${profile.id}`, profile)
        }

        const profileKeys = await wrapper.list('profiles:')
        expect(profileKeys).toHaveLength(3)
        expect(profileKeys).toContain('profiles:profile-1')
        expect(profileKeys).toContain('profiles:profile-2')
        expect(profileKeys).toContain('profiles:profile-3')
      })

      it('should clear profile data with prefix', async () => {
        await wrapper.set('profiles:profile-1', { id: 'profile-1' })
        await wrapper.set('profiles:profile-2', { id: 'profile-2' })
        await wrapper.set('other:data', 'should-remain')

        await wrapper.clear('profiles:')

        expect(await wrapper.has('profiles:profile-1')).toBe(false)
        expect(await wrapper.has('profiles:profile-2')).toBe(false)
        expect(await wrapper.has('other:data')).toBe(true)
      })
    })

    describe('Credential Storage Keys', () => {
      it('should store credentials with structured keys', async () => {
        const credentialsId = 'cred-123'
        const credentials = {
          satToken: 'sat-token-value',
          satRefreshToken: 'refresh-token-value',
          tokenExpiry: Date.now() + 3600000,
          projectId: 'project-123',
          spaceId: 'space-123',
        }

        await wrapper.set(`credentials:${credentialsId}`, credentials)

        const expectedKey = `swcf:${clientId}:credentials:${credentialsId}`
        expect(await mockStorage.has(expectedKey)).toBe(true)

        const retrieved = await wrapper.get(`credentials:${credentialsId}`)
        expect(retrieved).toEqual(credentials)
      })

      it('should support individual credential field access', async () => {
        const credentialsId = 'cred-456'

        await wrapper.set(
          `credentials:${credentialsId}:satToken`,
          'token-value'
        )
        await wrapper.set(
          `credentials:${credentialsId}:tokenExpiry`,
          1234567890
        )

        expect(await wrapper.get(`credentials:${credentialsId}:satToken`)).toBe(
          'token-value'
        )
        expect(
          await wrapper.get(`credentials:${credentialsId}:tokenExpiry`)
        ).toBe(1234567890)
      })

      it('should list credential-related keys', async () => {
        const credId1 = 'cred-001'
        const credId2 = 'cred-002'

        await wrapper.set(`credentials:${credId1}`, { token: 'value1' })
        await wrapper.set(`credentials:${credId2}`, { token: 'value2' })
        await wrapper.set(`credentials:${credId1}:refresh`, 'refresh1')

        const credentialKeys = await wrapper.list('credentials:')
        expect(credentialKeys).toContain(`credentials:${credId1}`)
        expect(credentialKeys).toContain(`credentials:${credId2}`)
        expect(credentialKeys).toContain(`credentials:${credId1}:refresh`)
      })
    })

    describe('Key Generation Functions', () => {
      it('should generate consistent keys across operations', async () => {
        const baseKey = 'test-consistency'

        // Store value
        await wrapper.set(baseKey, 'original-value')

        // Update value
        await wrapper.set(baseKey, 'updated-value')

        // Verify same key is used
        expect(await wrapper.get(baseKey)).toBe('updated-value')

        // Check only one key exists in storage
        const allKeys = await mockStorage.list()
        const matchingKeys = allKeys.filter((key) => key.includes(baseKey))
        expect(matchingKeys).toHaveLength(1)
      })

      it('should handle empty client ID gracefully', async () => {
        const emptyClientWrapper = new StorageWrapper(mockStorage, '')
        await emptyClientWrapper.set('test-key', 'test-value')

        const expectedKey = 'swcf::test-key'
        expect(await mockStorage.has(expectedKey)).toBe(true)
      })

      it('should handle special characters in client ID', async () => {
        const specialClientId = 'client-123@domain.com'
        const specialWrapper = new StorageWrapper(mockStorage, specialClientId)

        await specialWrapper.set('test-key', 'test-value')

        const expectedKey = `swcf:${specialClientId}:test-key`
        expect(await mockStorage.has(expectedKey)).toBe(true)
        expect(await specialWrapper.get('test-key')).toBe('test-value')
      })

      it('should maintain key isolation between different client IDs', async () => {
        const client1Wrapper = new StorageWrapper(mockStorage, 'client-1')
        const client2Wrapper = new StorageWrapper(mockStorage, 'client-2')

        await client1Wrapper.set('shared-key', 'client-1-value')
        await client2Wrapper.set('shared-key', 'client-2-value')

        expect(await client1Wrapper.get('shared-key')).toBe('client-1-value')
        expect(await client2Wrapper.get('shared-key')).toBe('client-2-value')

        // Verify both keys exist in storage
        const allKeys = await mockStorage.list()
        const sharedKeys = allKeys.filter((key) => key.includes('shared-key'))
        expect(sharedKeys).toHaveLength(2)
      })
    })

    describe('Backward Compatibility', () => {
      it('should not conflict with legacy storage patterns', async () => {
        // Simulate legacy keys that might exist
        await mockStorage.set('legacy:profile:123', 'legacy-data')
        await mockStorage.set('sw:old-format:data', 'old-data')

        // New format should coexist
        await wrapper.set('profile:123', 'new-data')

        expect(await mockStorage.get('legacy:profile:123')).toBe('legacy-data')
        expect(await mockStorage.get('sw:old-format:data')).toBe('old-data')
        expect(await wrapper.get('profile:123')).toBe('new-data')

        // Listing should only return new format keys for wrapper
        const wrapperKeys = await wrapper.list()
        expect(wrapperKeys).toContain('profile:123')
        expect(wrapperKeys).not.toContain('legacy:profile:123')
        expect(wrapperKeys).not.toContain('sw:old-format:data')
      })

      it('should handle migration from old key formats', async () => {
        // Simulate old format data
        const oldKey = 'old-profile-data'
        const oldData = { id: 'old-profile', type: 'STATIC' }
        await mockStorage.set(oldKey, oldData)

        // Migration would involve reading old data and storing in new format
        const migratedData = await mockStorage.get(oldKey)
        await wrapper.set('profiles:migrated-profile', migratedData)

        // Verify new format works
        expect(await wrapper.get('profiles:migrated-profile')).toEqual(oldData)

        // Old key should still exist (not automatically cleaned up)
        expect(await mockStorage.has(oldKey)).toBe(true)
      })
    })

    describe('Performance and Efficiency', () => {
      it('should handle large numbers of keys efficiently', async () => {
        const keyCount = 100
        const keys: string[] = []

        // Create many keys
        for (let i = 0; i < keyCount; i++) {
          const key = `bulk-key-${i}`
          keys.push(key)
          await wrapper.set(key, `value-${i}`)
        }

        // Verify all keys exist
        const results = await wrapper.getMany(keys)
        expect(results.size).toBe(keyCount)

        for (let i = 0; i < keyCount; i++) {
          expect(results.get(`bulk-key-${i}`)).toBe(`value-${i}`)
        }
      })

      it('should handle batch operations with consistent prefixing', async () => {
        const batchData = new Map([
          ['batch:item-1', 'value-1'],
          ['batch:item-2', 'value-2'],
          ['batch:item-3', 'value-3'],
        ])

        await wrapper.setMany(batchData)

        // Verify all keys use correct prefix
        for (const [key] of batchData) {
          const expectedStorageKey = `swcf:${clientId}:${key}`
          expect(await mockStorage.has(expectedStorageKey)).toBe(true)
        }

        // Verify batch retrieval works
        const retrieved = await wrapper.getMany(Array.from(batchData.keys()))
        expect(retrieved.size).toBe(3)
        for (const [key, value] of batchData) {
          expect(retrieved.get(key)).toBe(value)
        }
      })
    })
  })
})
