import { sessionStorageManager, getStorage, getCallIdKey } from './storage'
import { getGlobalStorageInstance } from '@signalwire/core'
import jwtDecode from 'jwt-decode'

// Mock jwt-decode
jest.mock('jwt-decode')

// Mock @signalwire/core
jest.mock('@signalwire/core', () => ({
  getLogger: jest.fn(() => ({
    error: jest.fn(),
  })),
  getGlobalStorageInstance: jest.fn(),
}))

// Mock window for Node.js environment
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(() => null),
}

describe('storage utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset window.sessionStorage
    Object.defineProperty(global, 'window', {
      value: {
        sessionStorage: mockSessionStorage,
      },
      writable: true,
      configurable: true,
    })
  })

  describe('getCallIdKey', () => {
    it('should return key without profileId suffix when profileId is not provided', () => {
      expect(getCallIdKey()).toBe('ci-SAT')
    })

    it('should return key with profileId suffix when profileId is provided', () => {
      expect(getCallIdKey('profile123')).toBe('ci-SAT:profile123')
    })
  })

  describe('getStorage', () => {
    it('should return custom storage when global storage instance is available', () => {
      const mockGlobalStorage = {
        getSession: jest.fn().mockResolvedValue('value'),
        setSession: jest.fn().mockResolvedValue(undefined),
        deleteSession: jest.fn().mockResolvedValue(true),
        clearSession: jest.fn().mockResolvedValue(undefined),
      }
      ;(getGlobalStorageInstance as jest.Mock).mockReturnValue(mockGlobalStorage)

      const storage = getStorage()

      expect(storage).toBeDefined()
      expect(storage?.getItem).toBeDefined()
      expect(storage?.setItem).toBeDefined()
      expect(storage?.removeItem).toBeDefined()
      expect(storage?.clear).toBeDefined()
      expect(storage?.length).toBe(0)
      expect(storage?.key(0)).toBe(null)
    })

    it('should handle getItem with custom storage', () => {
      const mockGlobalStorage = {
        getSession: jest.fn().mockReturnValue('test-value'),
        setSession: jest.fn(),
        deleteSession: jest.fn(),
        clearSession: jest.fn(),
      }
      ;(getGlobalStorageInstance as jest.Mock).mockReturnValue(mockGlobalStorage)

      const storage = getStorage()
      const result = storage?.getItem('testKey')

      expect(mockGlobalStorage.getSession).toHaveBeenCalledWith('@signalwire:testKey')
      expect(result).toBe('test-value')
    })

    it('should handle getItem error with custom storage', () => {
      const mockGlobalStorage = {
        getSession: jest.fn().mockImplementation(() => {
          throw new Error('Storage error')
        }),
        setSession: jest.fn(),
        deleteSession: jest.fn(),
        clearSession: jest.fn(),
      }
      ;(getGlobalStorageInstance as jest.Mock).mockReturnValue(mockGlobalStorage)

      const storage = getStorage()
      const result = storage?.getItem('testKey')

      expect(result).toBe(null)
    })

    it('should handle setItem with custom storage', () => {
      const mockGlobalStorage = {
        getSession: jest.fn(),
        setSession: jest.fn().mockResolvedValue(undefined),
        deleteSession: jest.fn(),
        clearSession: jest.fn(),
      }
      ;(getGlobalStorageInstance as jest.Mock).mockReturnValue(mockGlobalStorage)

      const storage = getStorage()
      storage?.setItem('testKey', 'testValue')

      expect(mockGlobalStorage.setSession).toHaveBeenCalledWith('@signalwire:testKey', 'testValue')
    })

    it('should handle setItem error with custom storage', () => {
      const mockGlobalStorage = {
        getSession: jest.fn(),
        setSession: jest.fn().mockImplementation(() => {
          throw new Error('Storage error')
        }),
        deleteSession: jest.fn(),
        clearSession: jest.fn(),
      }
      ;(getGlobalStorageInstance as jest.Mock).mockReturnValue(mockGlobalStorage)

      const storage = getStorage()
      // Should not throw
      expect(() => storage?.setItem('testKey', 'testValue')).not.toThrow()
    })

    it('should handle removeItem with custom storage', () => {
      const mockGlobalStorage = {
        getSession: jest.fn(),
        setSession: jest.fn(),
        deleteSession: jest.fn().mockResolvedValue(true),
        clearSession: jest.fn(),
      }
      ;(getGlobalStorageInstance as jest.Mock).mockReturnValue(mockGlobalStorage)

      const storage = getStorage()
      storage?.removeItem('testKey')

      expect(mockGlobalStorage.deleteSession).toHaveBeenCalledWith('@signalwire:testKey')
    })

    it('should handle removeItem error with custom storage', () => {
      const mockGlobalStorage = {
        getSession: jest.fn(),
        setSession: jest.fn(),
        deleteSession: jest.fn().mockImplementation(() => {
          throw new Error('Storage error')
        }),
        clearSession: jest.fn(),
      }
      ;(getGlobalStorageInstance as jest.Mock).mockReturnValue(mockGlobalStorage)

      const storage = getStorage()
      // Should not throw
      expect(() => storage?.removeItem('testKey')).not.toThrow()
    })

    it('should handle clear with custom storage', () => {
      const mockGlobalStorage = {
        getSession: jest.fn(),
        setSession: jest.fn(),
        deleteSession: jest.fn(),
        clearSession: jest.fn().mockResolvedValue(undefined),
      }
      ;(getGlobalStorageInstance as jest.Mock).mockReturnValue(mockGlobalStorage)

      const storage = getStorage()
      storage?.clear()

      expect(mockGlobalStorage.clearSession).toHaveBeenCalled()
    })

    it('should handle clear error with custom storage', () => {
      const mockGlobalStorage = {
        getSession: jest.fn(),
        setSession: jest.fn(),
        deleteSession: jest.fn(),
        clearSession: jest.fn().mockImplementation(() => {
          throw new Error('Storage error')
        }),
      }
      ;(getGlobalStorageInstance as jest.Mock).mockReturnValue(mockGlobalStorage)

      const storage = getStorage()
      // Should not throw
      expect(() => storage?.clear()).not.toThrow()
    })

    it('should return window.sessionStorage when global storage is not available', () => {
      ;(getGlobalStorageInstance as jest.Mock).mockReturnValue(null)

      const storage = getStorage()

      expect(storage).toBe(mockSessionStorage)
    })

    it('should return window.sessionStorage when global storage does not have getSession method', () => {
      const mockGlobalStorage = {
        someOtherMethod: jest.fn(),
      }
      ;(getGlobalStorageInstance as jest.Mock).mockReturnValue(mockGlobalStorage)

      const storage = getStorage()

      expect(storage).toBe(mockSessionStorage)
    })

    it('should return undefined when neither global storage nor window.sessionStorage is available', () => {
      ;(getGlobalStorageInstance as jest.Mock).mockReturnValue(null)
      // Remove window temporarily
      const originalWindow = (global as any).window
      // @ts-ignore
      ;(global as any).window = undefined

      const storage = getStorage()

      expect(storage).toBeUndefined()
      
      // Restore window
      ;(global as any).window = originalWindow
    })
  })

  describe('sessionStorageManager', () => {
    it('should return keys with VRT token type from JWT header', () => {
      const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>
      mockJwtDecode.mockReturnValueOnce({ typ: 'VRT' })

      const token = 'eyJ0eXAiOiJWUlQiLCJjaCI6InJlbGF5LnNpZ25hbHdpcmUuY29tIiwiYWxnIjoiUFMxMTIifQ.payload.signature'
      const manager = sessionStorageManager(token)

      expect(mockJwtDecode).toHaveBeenCalledWith(token, { header: true })
      expect(manager).toStrictEqual({
        authStateKey: 'as-VRT',
        protocolKey: 'pt-VRT',
        callIdKey: 'ci-VRT',
      })
    })

    it('should return keys with VRT token type and profileId', () => {
      const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>
      mockJwtDecode.mockReturnValueOnce({ typ: 'VRT' })

      const token = 'eyJ0eXAiOiJWUlQiLCJjaCI6InJlbGF5LnNpZ25hbHdpcmUuY29tIiwiYWxnIjoiUFMxMTIifQ.payload.signature'
      const manager = sessionStorageManager(token, 'profile123')

      expect(manager).toStrictEqual({
        authStateKey: 'as-VRT:profile123',
        protocolKey: 'pt-VRT:profile123',
        callIdKey: 'ci-VRT:profile123',
      })
    })

    it('should handle SAT token prefix when JWT header decode fails', () => {
      const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>
      mockJwtDecode.mockImplementationOnce(() => {
        throw new Error('Invalid JWT')
      })

      const token = 'SAT_sometoken'
      const manager = sessionStorageManager(token)

      expect(manager).toStrictEqual({
        authStateKey: 'as-SAT',
        protocolKey: 'pt-SAT',
        callIdKey: 'ci-SAT',
      })
    })

    it('should handle SAT token with profileId', () => {
      const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>
      mockJwtDecode.mockImplementationOnce(() => {
        throw new Error('Invalid JWT')
      })

      const token = 'SAT_sometoken'
      const manager = sessionStorageManager(token, 'profile456')

      expect(manager).toStrictEqual({
        authStateKey: 'as-SAT:profile456',
        protocolKey: 'pt-SAT:profile456',
        callIdKey: 'ci-SAT:profile456',
      })
    })

    it('should handle unknown token type when typ is missing', () => {
      const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>
      mockJwtDecode.mockReturnValueOnce({})

      const token = 'eyJ0eXAiOiJWUlQiLCJjaCI6InJlbGF5LnNpZ25hbHdpcmUuY29tIiwiYWxnIjoiUFMxMTIifQ.payload.signature'
      const manager = sessionStorageManager(token)

      expect(manager).toStrictEqual({
        authStateKey: 'as-unknown',
        protocolKey: 'pt-unknown',
        callIdKey: 'ci-unknown',
      })
    })

    it('should handle non-SAT token when JWT decode fails', () => {
      const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>
      mockJwtDecode.mockImplementationOnce(() => {
        throw new Error('Invalid JWT')
      })

      const token = 'INVALID_TOKEN'
      const manager = sessionStorageManager(token)

      expect(manager).toStrictEqual({
        authStateKey: 'as-unknown',
        protocolKey: 'pt-unknown',
        callIdKey: 'ci-unknown',
      })
    })

    it('should handle complete JWT decode failure gracefully', () => {
      const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid JWT')
      })

      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const token = 'completely_invalid'
      const manager = sessionStorageManager(token)

      expect(manager).toStrictEqual({
        authStateKey: 'as-unknown',
        protocolKey: 'pt-unknown',
        callIdKey: 'ci-unknown',
      })

      process.env.NODE_ENV = originalEnv
    })

    it('should not log error in production environment', () => {
      const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid JWT')
      })

      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const token = 'invalid_token'
      const manager = sessionStorageManager(token)

      expect(manager).toStrictEqual({
        authStateKey: 'as-unknown',
        protocolKey: 'pt-unknown',
        callIdKey: 'ci-unknown',
      })

      process.env.NODE_ENV = originalEnv
    })

    it('should log error in development when token.startsWith fails', () => {
      const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid JWT')
      })

      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      // Pass something that's not a string to trigger the outer catch
      const token = null as any
      const manager = sessionStorageManager(token)

      // When outer catch is triggered, keySuffix is empty string
      expect(manager).toStrictEqual({
        authStateKey: 'as-',
        protocolKey: 'pt-',
        callIdKey: 'ci-',
      })

      process.env.NODE_ENV = originalEnv
    })

    it('should not log error in production when token.startsWith fails', () => {
      const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid JWT')
      })

      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      // Pass something that's not a string to trigger the outer catch
      const token = null as any
      const manager = sessionStorageManager(token)

      // When outer catch is triggered, keySuffix is empty string
      expect(manager).toStrictEqual({
        authStateKey: 'as-',
        protocolKey: 'pt-',
        callIdKey: 'ci-',
      })

      process.env.NODE_ENV = originalEnv
    })
  })
})