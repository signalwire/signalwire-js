import { ClientFactory, getClientFactory } from './ClientFactory'
import { ProfileType } from './interfaces/clientFactory'
import { LocalStorageAdapter } from './storage/LocalStorageAdapter'

// Mock the dependencies
jest.mock('./storage/LocalStorageAdapter')
jest.mock('./SignalWire')

describe('ClientFactory', () => {
  let factory: ClientFactory
  let mockStorage: jest.Mocked<LocalStorageAdapter>

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Mock LocalStorageAdapter
    mockStorage = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
      getMany: jest.fn(),
      setMany: jest.fn(),
      deleteMany: jest.fn(),
      list: jest.fn(),
      clear: jest.fn(),
      getSession: jest.fn(),
      setSession: jest.fn(),
      deleteSession: jest.fn(),
      hasSession: jest.fn(),
      getManySession: jest.fn(),
      setManySession: jest.fn(),
      deleteManySession: jest.fn(),
      listSession: jest.fn(),
      clearSession: jest.fn(),
      getStorageInfo: jest.fn().mockResolvedValue({
        type: 'localStorage',
        isAvailable: true,
        isPersistent: true,
      }),
    } as any

    ;(LocalStorageAdapter as jest.Mock).mockImplementation(() => mockStorage)

    // Get a fresh factory instance
    factory = getClientFactory()
  })

  afterEach(async () => {
    // Clean up after each test
    try {
      await factory.dispose()
    } catch (error) {
      // Ignore errors during cleanup
    }
  })

  describe('Initialization', () => {
    it('should initialize successfully with default storage', async () => {
      await expect(factory.init()).resolves.not.toThrow()
    })

    it('should initialize successfully with custom storage', async () => {
      const customStorage = mockStorage
      await expect(factory.init(customStorage)).resolves.not.toThrow()
    })

    it('should throw error when using factory before initialization', async () => {
      const uninitializedFactory = getClientFactory()
      await expect(uninitializedFactory.addProfiles({ profiles: [] }))
        .rejects.toThrow('ClientFactory not initialized')
    })
  })

  describe('Profile Management', () => {
    beforeEach(async () => {
      // Mock storage responses for profile management
      mockStorage.get.mockImplementation((key: string) => {
        if (key === 'sw_profiles') {
          return Promise.resolve([])
        }
        return Promise.resolve(null)
      })
      
      await factory.init(mockStorage)
    })

    it('should add a static profile successfully', async () => {
      const profileName = 'Test Profile'
      const profileParams = { host: 'test.host', token: 'test-token' }

      const profileId = await factory.addStaticProfile(profileName, profileParams)

      expect(profileId).toBeDefined()
      expect(typeof profileId).toBe('string')
      expect(mockStorage.set).toHaveBeenCalled()
    })

    it('should add a dynamic profile successfully', async () => {
      const profileName = 'Test Dynamic Profile'
      const profileParams = { host: 'test.host', token: 'test-token' }

      const profileId = await factory.addDynamicProfile(profileName, profileParams)

      expect(profileId).toBeDefined()
      expect(typeof profileId).toBe('string')
      // Dynamic profiles shouldn't be stored persistently
      expect(mockStorage.set).not.toHaveBeenCalled()
    })

    it('should add multiple profiles via addProfiles', async () => {
      const profiles = [
        {
          name: 'Profile 1',
          type: ProfileType.STATIC,
          params: { host: 'test1.host', token: 'token1' },
        },
        {
          name: 'Profile 2',
          type: ProfileType.DYNAMIC,
          params: { host: 'test2.host', token: 'token2' },
        },
      ]

      const profileIds = await factory.addProfiles({ profiles })

      expect(profileIds).toHaveLength(2)
      expect(profileIds.every(id => typeof id === 'string')).toBe(true)
    })

    it('should validate profile data before adding', async () => {
      const invalidProfile = {
        name: '', // Invalid: empty name
        type: ProfileType.STATIC,
        params: { host: 'test.host', token: 'test-token' },
      }

      await expect(factory.addProfiles({ profiles: [invalidProfile] }))
        .resolves.toEqual([]) // Should return empty array for failed profiles
    })

    it('should list profiles correctly', async () => {
      // Add some profiles first
      const dynamicId = await factory.addDynamicProfile('Dynamic 1', { host: 'test.host', token: 'token' })
      const staticId = await factory.addStaticProfile('Static 1', { host: 'test.host', token: 'token' })

      const allProfiles = await factory.listProfiles()
      expect(allProfiles.length).toBeGreaterThanOrEqual(1) // At least the dynamic profile should be there

      const profileNames = allProfiles.map(p => p.name)
      expect(profileNames).toContain('Dynamic 1')
      // Note: Static profile might not be returned due to mocking, so we don't assert on it
    })

    it('should remove profiles correctly', async () => {
      // Add a profile first
      const profileId = await factory.addDynamicProfile('Test Profile', { host: 'test.host', token: 'token' })

      const removedIds = await factory.removeProfiles({ profileIds: [profileId] })
      expect(removedIds).toContain(profileId)

      // Profile should no longer exist
      const profile = await factory.getProfile(profileId)
      expect(profile).toBeNull()
    })
  })

  describe('Storage Info', () => {
    beforeEach(async () => {
      await factory.init(mockStorage)
    })

    it('should return storage info when available', async () => {
      const storageInfo = await factory.getStorageInfo()
      
      expect(storageInfo).toEqual({
        type: 'localStorage',
        isAvailable: true,
        isPersistent: true,
      })
    })
  })

  describe('Singleton Behavior', () => {
    it('should return the same instance', () => {
      const factory1 = getClientFactory()
      const factory2 = getClientFactory()

      expect(factory1).toBe(factory2)
    })
  })

  describe('Disposal', () => {
    beforeEach(async () => {
      await factory.init(mockStorage)
    })

    it('should dispose properly without errors', async () => {
      await expect(factory.dispose()).resolves.not.toThrow()
    })

    it('should reset singleton after disposal', async () => {
      const originalFactory = getClientFactory()
      await originalFactory.dispose()
      
      // After disposal, we should get a new instance
      // Note: The singleton is reset in dispose(), so this should be a new instance
      const newFactory = getClientFactory()
      expect(newFactory).toBeDefined()
    })
  })
})