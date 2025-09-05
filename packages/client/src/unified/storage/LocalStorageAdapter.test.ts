/**
 * @jest-environment jsdom
 */

import { LocalStorageAdapter } from './LocalStorageAdapter'

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
    get length() {
      return Object.keys(store).length
    },
  }
}

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter
  let localStorageMock: ReturnType<typeof createStorageMock>
  let sessionStorageMock: ReturnType<typeof createStorageMock>

  beforeEach(() => {
    localStorageMock = createStorageMock()
    sessionStorageMock = createStorageMock()

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })

    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    })

    adapter = new LocalStorageAdapter()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Persistent Storage', () => {
    it('should set and get a value', async () => {
      const key = 'test-key'
      const value = { data: 'test-value' }

      await adapter.set(key, value)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify(value)
      )

      const retrieved = await adapter.get(key)
      expect(retrieved).toEqual(value)
    })

    it('should return null for non-existent key', async () => {
      const result = await adapter.get('non-existent')
      expect(result).toBeNull()
    })

    it('should delete a value', async () => {
      const key = 'test-key'
      await adapter.set(key, 'value')

      const deleted = await adapter.delete(key)
      expect(deleted).toBe(true)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(key)
    })

    it('should return false when deleting non-existent key', async () => {
      const deleted = await adapter.delete('non-existent')
      expect(deleted).toBe(false)
    })

    it('should check if key exists', async () => {
      const key = 'test-key'
      await adapter.set(key, 'value')

      const exists = await adapter.has(key)
      expect(exists).toBe(true)

      const notExists = await adapter.has('non-existent')
      expect(notExists).toBe(false)
    })

    it('should get many values', async () => {
      await adapter.set('key1', 'value1')
      await adapter.set('key2', 'value2')

      const result = await adapter.getMany(['key1', 'key2', 'key3'])
      expect(result.get('key1')).toBe('value1')
      expect(result.get('key2')).toBe('value2')
      expect(result.get('key3')).toBeNull()
    })

    it('should set many values', async () => {
      const entries = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ])

      await adapter.setMany(entries)

      expect(await adapter.get('key1')).toBe('value1')
      expect(await adapter.get('key2')).toBe('value2')
    })

    it('should delete many values', async () => {
      await adapter.set('key1', 'value1')
      await adapter.set('key2', 'value2')

      const result = await adapter.deleteMany(['key1', 'key2', 'key3'])
      expect(result.get('key1')).toBe(true)
      expect(result.get('key2')).toBe(true)
      expect(result.get('key3')).toBe(false)
    })

    it('should list keys with prefix', async () => {
      await adapter.set('prefix:key1', 'value1')
      await adapter.set('prefix:key2', 'value2')
      await adapter.set('other:key3', 'value3')

      const keys = await adapter.list('prefix:')
      expect(keys).toContain('prefix:key1')
      expect(keys).toContain('prefix:key2')
      expect(keys).not.toContain('other:key3')
    })

    it('should clear all keys', async () => {
      await adapter.set('key1', 'value1')
      await adapter.set('key2', 'value2')

      await adapter.clear()
      expect(localStorageMock.clear).toHaveBeenCalled()
    })

    it('should clear keys with prefix', async () => {
      await adapter.set('prefix:key1', 'value1')
      await adapter.set('prefix:key2', 'value2')
      await adapter.set('other:key3', 'value3')

      await adapter.clear('prefix:')

      expect(await adapter.has('prefix:key1')).toBe(false)
      expect(await adapter.has('prefix:key2')).toBe(false)
      expect(await adapter.has('other:key3')).toBe(true)
    })
  })

  describe('Session Storage', () => {
    it('should set and get session value', async () => {
      const key = 'test-key'
      const value = { data: 'test-value' }

      await adapter.setSession(key, value)
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify(value)
      )

      const retrieved = await adapter.getSession(key)
      expect(retrieved).toEqual(value)
    })

    it('should handle session storage operations', async () => {
      // Test various session storage operations
      await adapter.setSession('key1', 'value1')
      expect(await adapter.hasSession('key1')).toBe(true)

      const deleted = await adapter.deleteSession('key1')
      expect(deleted).toBe(true)
      expect(await adapter.hasSession('key1')).toBe(false)
    })
  })

  describe('Storage Info', () => {
    it('should return storage info', async () => {
      const info = await adapter.getStorageInfo()
      expect(info.type).toBe('localStorage')
      expect(info.isAvailable).toBe(true)
      expect(info.isPersistent).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle quota exceeded error', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        const error = new Error('QuotaExceededError') as any
        error.name = 'QuotaExceededError'
        error.code = DOMException.QUOTA_EXCEEDED_ERR
        Object.setPrototypeOf(error, DOMException.prototype)
        throw error
      })

      await expect(adapter.set('key', 'value')).rejects.toThrow(
        'Storage quota exceeded'
      )
    })

    it('should handle security error', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        const error = new Error('SecurityError') as any
        error.name = 'SecurityError'
        error.code = DOMException.SECURITY_ERR
        Object.setPrototypeOf(error, DOMException.prototype)
        throw error
      })

      await expect(adapter.set('key', 'value')).rejects.toThrow(
        'Security error'
      )
    })

    it('should handle unavailable storage gracefully', async () => {
      // Create a new test instance with mocked storage that throws
      const originalLocalStorage = window.localStorage
      const originalSessionStorage = window.sessionStorage

      // Temporarily make localStorage throw during access check
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('localStorage not available')
        },
        configurable: true,
      })

      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('sessionStorage not available')
        },
        configurable: true,
      })

      // Create adapter with unavailable storage
      const unavailableAdapter = new LocalStorageAdapter()

      // Restore original storage for rest of test
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
      })

      Object.defineProperty(window, 'sessionStorage', {
        value: originalSessionStorage,
        configurable: true,
      })

      // Now test the adapter behavior
      const result = await unavailableAdapter.get('key')
      expect(result).toBeNull()

      const hasKey = await unavailableAdapter.has('key')
      expect(hasKey).toBe(false)
    })
  })
})
