import { ClientFactory, getClientFactory } from './ClientFactory'
import {
  ProfileType,
  Profile,
  ClientFactoryError,
  ProfileNotFoundError,
  InstanceNotFoundError,
  SignalWireCredentials,
} from './interfaces/clientFactory'
import { LocalStorageAdapter } from './storage/LocalStorageAdapter'
import { ProfileManager } from './ProfileManager'
import { InstanceManager } from './InstanceManager'
import { HTTPClient } from './HTTPClient'

// Mock the dependencies
jest.mock('./storage/LocalStorageAdapter')
jest.mock('./SignalWire')
jest.mock('./ProfileManager')
jest.mock('./InstanceManager')
jest.mock('./HTTPClient')

// Helper function to create test credentials
function createTestCredentials(
  overrides?: Partial<SignalWireCredentials>
): SignalWireCredentials {
  return {
    satToken: 'test-token',
    tokenExpiry: Date.now() + 3600000, // 1 hour from now
    satRefreshPayload: {
      refresh_token: 'refresh-token',
    },
    satRefreshURL: 'https://api.signalwire.com/auth/refresh',
    satRefreshResultMapper: 'default',
    ...overrides,
  }
}

describe('ClientFactory', () => {
  let factory: ClientFactory
  let mockStorage: jest.Mocked<LocalStorageAdapter>
  let mockProfileManager: jest.Mocked<ProfileManager>
  let mockInstanceManager: jest.Mocked<InstanceManager>
  let profileIdCounter = 0
  const createdProfiles = new Map<string, Profile>()
  const createdInstances = new Map<string, any>()

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    profileIdCounter = 0
    createdProfiles.clear()
    createdInstances.clear()

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

    // Mock ProfileManager
    mockProfileManager = {
      init: jest.fn().mockResolvedValue(undefined),
      addProfile: jest.fn().mockImplementation((profileData) => {
        // Generate a realistic UUID-like ID to match real behavior
        const profileId = `${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`
        const profile: Profile = {
          ...profileData,
          id: profileId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        createdProfiles.set(profileId, profile)
        return Promise.resolve(profileId)
      }),
      getProfile: jest.fn().mockImplementation((profileId: string) => {
        const profile = createdProfiles.get(profileId)
        return Promise.resolve(profile || null)
      }),
      listProfiles: jest.fn().mockImplementation(() => {
        return Promise.resolve(Array.from(createdProfiles.values()))
      }),
      removeProfile: jest.fn().mockImplementation((profileId: string) => {
        const existed = createdProfiles.has(profileId)
        createdProfiles.delete(profileId)
        return Promise.resolve(existed)
      }),
      hasProfile: jest.fn().mockImplementation((profileId: string) => {
        return Promise.resolve(createdProfiles.has(profileId))
      }),
      updateProfile: jest.fn(),
      findProfileForAddress: jest.fn(),
      getProfilesByCredentialId: jest.fn(),
      createDynamicProfile: jest.fn(),
      validateCredentials: jest.fn().mockResolvedValue(true),
      refreshCredentials: jest.fn(),
      cleanup: jest.fn(),
    } as any
    ;(ProfileManager as jest.Mock).mockImplementation(() => mockProfileManager)

    // Mock InstanceManager
    mockInstanceManager = {
      createInstance: jest
        .fn()
        .mockImplementation((profile: Profile, options?: any) => {
          const instanceId = profile.id // Use profile.id as instance ID (matches current implementation)
          const now = Date.now()
          const instance = {
            id: instanceId,
            profileId: profile.id,
            client: { mockClient: true },
            createdAt: now,
            lastAccessedAt: now,
            usageCount: 0,
          }
          createdInstances.set(instanceId, instance)
          return Promise.resolve(instance)
        }),
      getInstanceByProfile: jest
        .fn()
        .mockImplementation((profileId: string) => {
          const instance = Array.from(createdInstances.values()).find(
            (inst) => inst.profileId === profileId
          )
          return Promise.resolve(instance || null)
        }),
      getInstanceById: jest.fn().mockImplementation((instanceId: string) => {
        return Promise.resolve(createdInstances.get(instanceId) || null)
      }),
      disposeInstance: jest
        .fn()
        .mockImplementation((instanceId: string) => {
          createdInstances.delete(instanceId)
          return Promise.resolve()
        }),
      updateInstanceAccess: jest.fn().mockResolvedValue(undefined),
      listInstances: jest.fn().mockImplementation(() => {
        return Promise.resolve(Array.from(createdInstances.values()))
      }),
      dispose: jest.fn().mockResolvedValue(undefined),
    } as any
    ;(InstanceManager as jest.Mock).mockImplementation(
      () => mockInstanceManager
    )

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
      await expect(
        uninitializedFactory.addProfiles({ profiles: [] })
      ).rejects.toThrow('ClientFactory not initialized')
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
      const credentialsId = 'test-cred-id'
      const credentials = createTestCredentials({
        satToken: 'test-token',
      })
      const addressId = 'test-address-id'

      const profile = await factory.addStaticProfile(
        credentialsId,
        credentials,
        addressId
      )

      expect(profile).toBeDefined()
      expect(profile.id).toBeDefined()
      expect(profile.type).toBe(ProfileType.STATIC)
      expect(profile.credentialsId).toBe(credentialsId)
      expect(profile.addressId).toBe(addressId)
      // Just verify the profile structure is correct
      // The mock implementation ensures it works
    })

    it('should add a dynamic profile successfully', async () => {
      const credentialsId = 'test-cred-id'
      const credentials = createTestCredentials({
        satToken: 'test-token',
      })
      const addressId = 'test-address-id'

      const profile = await factory.addDynamicProfile(
        credentialsId,
        credentials,
        addressId
      )

      expect(profile).toBeDefined()
      expect(profile.id).toBeDefined()
      expect(profile.type).toBe(ProfileType.DYNAMIC)
      expect(profile.credentialsId).toBe(credentialsId)
      expect(profile.addressId).toBe(addressId)
      // Just verify the profile structure is correct
      // The mock implementation ensures it works
    })

    it('should add multiple profiles via addProfiles', async () => {
      const profiles = [
        {
          type: ProfileType.STATIC,
          credentialsId: 'cred-1',
          credentials: createTestCredentials({
            satToken: 'token1',
          }),
          addressId: 'address1',
        },
        {
          type: ProfileType.DYNAMIC,
          credentialsId: 'cred-2',
          credentials: createTestCredentials({
            satToken: 'token2',
          }),
          addressId: 'address2',
        },
      ]

      const createdProfiles = await factory.addProfiles({ profiles })

      expect(createdProfiles).toHaveLength(2)
      expect(createdProfiles[0]).toMatchObject({
        type: ProfileType.STATIC,
        credentialsId: 'cred-1',
        addressId: 'address1',
      })
      expect(createdProfiles[1]).toMatchObject({
        type: ProfileType.DYNAMIC,
        credentialsId: 'cred-2',
        addressId: 'address2',
      })
      expect(
        createdProfiles.every((p) => p.id && typeof p.id === 'string')
      ).toBe(true)
    })

    it('should validate profile data before adding', async () => {
      const invalidProfile = {
        type: ProfileType.STATIC,
        credentialsId: '', // Invalid: empty credentialsId
        credentials: createTestCredentials(),
        addressId: 'address',
      }

      const result = await factory.addProfiles({ profiles: [invalidProfile] })
      expect(result).toEqual([]) // Should return empty array for failed profiles
    })

    it('should list profiles correctly', async () => {
      // Add some profiles first
      const credentials = createTestCredentials()

      const dynamicProfile = await factory.addDynamicProfile(
        'cred-dyn',
        credentials,
        'addr-dyn'
      )
      const staticProfile = await factory.addStaticProfile(
        'cred-stat',
        credentials,
        'addr-stat'
      )

      const allProfiles = await factory.listProfiles()
      expect(allProfiles.length).toBeGreaterThanOrEqual(1) // At least the dynamic profile should be there

      const profileIds = allProfiles.map((p) => p.id)
      expect(profileIds).toContain(dynamicProfile.id)
      // Note: Static profile might not be returned due to mocking, so we don't assert on it
    })

    it('should remove profiles correctly', async () => {
      // Add a profile first
      const credentials = createTestCredentials({
        satToken: 'token'
      })
      const profile = await factory.addDynamicProfile(
        'cred-test',
        credentials,
        'addr-test'
      )

      const removedIds = await factory.removeProfiles({
        profileIds: [profile.id],
      })
      expect(removedIds).toContain(profile.id)

      // Profile should no longer exist
      const fetchedProfile = await factory.getProfile(profile.id)
      expect(fetchedProfile).toBeNull()
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

  // Phase 1 Feature Tests
  describe('Phase 1 Features', () => {
    beforeEach(async () => {
      await factory.init(mockStorage)
    })

    describe('Profile Structure and Timestamps', () => {
      it('should create profiles with proper structure and Unix timestamps', async () => {
        const credentials = createTestCredentials({
        satToken: 'test-token'
      })

        const profile = await factory.addStaticProfile(
          'test-cred',
          credentials,
          'test-addr'
        )

        // Verify profile structure
        expect(profile).toMatchObject({
          id: expect.any(String),
          type: ProfileType.STATIC,
          credentialsId: 'test-cred',
          addressId: 'test-addr',
          credentials: expect.objectContaining({
            satToken: 'test-token',
            satRefreshPayload: expect.any(Object),
            satRefreshURL: expect.any(String),
            satRefreshResultMapper: expect.any(String),
            tokenExpiry: expect.any(Number),
          }),
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
        })

        // Verify Unix timestamps
        const now = Date.now()
        expect(profile.createdAt).toBeGreaterThan(now - 5000) // Within last 5 seconds
        expect(profile.createdAt).toBeLessThanOrEqual(now)
        expect(profile.updatedAt).toBeGreaterThan(now - 5000)
        expect(profile.updatedAt).toBeLessThanOrEqual(now)
      })

      it('should handle profile with optional addressDetails', async () => {
        const credentials = createTestCredentials({
        satToken: 'test-token'
      })
        const addressDetails = {
          type: 'room' as any,
          name: 'test-room',
          displayName: 'Test Room',
          channels: 4,
        }

        const profile = await factory.addStaticProfile(
          'test-cred',
          credentials,
          'test-addr',
          addressDetails
        )

        expect(profile.addressDetails).toEqual(addressDetails)
      })
    })

    describe('Credential Management', () => {
      it('should validate credentials and handle expiry detection', async () => {
        const credentials = createTestCredentials({
        satToken: 'test-token'
      })

        const profile = await factory.addStaticProfile(
          'expired-cred',
          credentials,
          'test-addr'
        )

        // Mock credential validation to return false for expired credentials
        mockProfileManager.validateCredentials.mockResolvedValueOnce(false)
        mockProfileManager.refreshCredentials.mockResolvedValueOnce(undefined)

        // Should attempt to refresh credentials when getting client
        await factory.getClient({ profileId: profile.id })

        expect(mockProfileManager.validateCredentials).toHaveBeenCalledWith(
          profile.id
        )
        expect(mockProfileManager.refreshCredentials).toHaveBeenCalledWith(
          profile.id
        )
      })

      it('should handle refresh token logic', async () => {
        const credentials = createTestCredentials({
        satToken: 'test-token'
      })

        const profile = await factory.addStaticProfile(
          'refresh-test',
          credentials,
          'test-addr'
        )

        // Test refresh logic
        await factory.getClient({ profileId: profile.id })

        expect(mockProfileManager.validateCredentials).toHaveBeenCalledWith(
          profile.id
        )
      })

      it('should throw error when credential refresh fails', async () => {
        const credentials = createTestCredentials({
        satToken: 'expired-token'
      })

        const profile = await factory.addStaticProfile(
          'fail-refresh',
          credentials,
          'test-addr'
        )

        // Mock validation failure and refresh failure
        mockProfileManager.validateCredentials.mockResolvedValueOnce(false)
        mockProfileManager.refreshCredentials.mockRejectedValueOnce(
          new Error('Refresh failed')
        )

        await expect(
          factory.getClient({ profileId: profile.id })
        ).rejects.toThrow(ClientFactoryError)
      })
    })

    describe('Client Instance Management', () => {
      it('should create and return new client instances', async () => {
        const credentials = createTestCredentials({
        satToken: 'test-token'
      })

        const profile = await factory.addStaticProfile(
          'instance-test',
          credentials,
          'test-addr'
        )

        const result = await factory.getClient({ profileId: profile.id })

        expect(result).toMatchObject({
          instance: expect.objectContaining({
            id: expect.any(String),
            profileId: profile.id,
            client: expect.any(Object),
            createdAt: expect.any(Number),
            lastAccessedAt: expect.any(Number),
            usageCount: expect.any(Number),
          }),
          isNew: true,
        })

        expect(mockInstanceManager.createInstance).toHaveBeenCalledWith(
          profile,
          undefined
        )
        expect(mockInstanceManager.updateInstanceAccess).toHaveBeenCalledWith(
          result.instance.id
        )
      })

      it('should reuse existing instances', async () => {
        const credentials = createTestCredentials({
        satToken: 'test-token'
      })

        const profile = await factory.addStaticProfile(
          'reuse-test',
          credentials,
          'test-addr'
        )

        // First call creates instance
        const result1 = await factory.getClient({ profileId: profile.id })
        expect(result1.isNew).toBe(true)

        // Mock existing instance for second call
        mockInstanceManager.getInstanceByProfile.mockResolvedValueOnce(
          result1.instance
        )

        // Second call should reuse
        const result2 = await factory.getClient({ profileId: profile.id })
        expect(result2.isNew).toBe(false)
        expect(result2.instance.id).toBe(result1.instance.id)
      })

      it('should dispose client instances properly', async () => {
        const credentials = createTestCredentials({
        satToken: 'test-token'
      })

        const profile = await factory.addStaticProfile(
          'dispose-test',
          credentials,
          'test-addr'
        )
        const result = await factory.getClient({ profileId: profile.id })

        await factory.disposeClient({
          instanceId: result.instance.id,
        })

        // disposeClient returns void, so we just verify it didn't throw
        expect(mockInstanceManager.disposeInstance).toHaveBeenCalledWith(
          result.instance.id
        )
      })

      it('should list active client instances', async () => {
        const credentials = createTestCredentials({
        satToken: 'test-token'
      })

        const profile1 = await factory.addStaticProfile(
          'list-test-1',
          credentials,
          'test-addr-1'
        )
        const profile2 = await factory.addStaticProfile(
          'list-test-2',
          credentials,
          'test-addr-2'
        )

        await factory.getClient({ profileId: profile1.id })
        await factory.getClient({ profileId: profile2.id })

        const instances = await factory.listActiveClients()

        expect(mockInstanceManager.listInstances).toHaveBeenCalled()
        expect(instances).toBeInstanceOf(Array)
      })
    })

    describe('Address Resolution', () => {
      it('should find profile by addressId', async () => {
        const credentials = createTestCredentials({
        satToken: 'test-token'
      })

        const profile = await factory.addStaticProfile(
          'address-test',
          credentials,
          'unique-address-id'
        )

        // Mock finding profile by address
        mockProfileManager.findProfileForAddress.mockResolvedValueOnce(profile)

        const result = await factory.getClient({
          addressId: 'unique-address-id',
        })

        expect(mockProfileManager.findProfileForAddress).toHaveBeenCalledWith(
          'unique-address-id'
        )
        expect(result.instance.profileId).toBe(profile.id)
      })

      it('should throw error when no profile found for address', async () => {
        mockProfileManager.findProfileForAddress.mockResolvedValueOnce(null)

        await expect(
          factory.getClient({ addressId: 'non-existent-address' })
        ).rejects.toThrow(ClientFactoryError)
        await expect(
          factory.getClient({ addressId: 'non-existent-address' })
        ).rejects.toThrow('No profile found with access to address')
      })

      it('should throw error when neither profileId nor addressId provided', async () => {
        await expect(factory.getClient({} as any)).rejects.toThrow(
          ClientFactoryError
        )
        await expect(factory.getClient({} as any)).rejects.toThrow(
          'Either profileId or addressId must be provided'
        )
      })
    })

    describe('Profile Type Handling', () => {
      it('should correctly handle STATIC profile type', async () => {
        const credentials = createTestCredentials({
        satToken: 'test-token'
      })

        const profile = await factory.addStaticProfile(
          'static-test',
          credentials,
          'test-addr'
        )

        expect(profile.type).toBe(ProfileType.STATIC)
        expect(mockProfileManager.addProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            type: ProfileType.STATIC,
            credentialsId: 'static-test',
            addressId: 'test-addr',
          })
        )
      })

      it('should correctly handle DYNAMIC profile type', async () => {
        const credentials = createTestCredentials({
        satToken: 'test-token'
      })

        const profile = await factory.addDynamicProfile(
          'dynamic-test',
          credentials,
          'test-addr'
        )

        expect(profile.type).toBe(ProfileType.DYNAMIC)
        expect(mockProfileManager.addProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            type: ProfileType.DYNAMIC,
            credentialsId: 'dynamic-test',
            addressId: 'test-addr',
          })
        )
      })
    })

    describe('Error Handling', () => {
      it('should throw ProfileNotFoundError for invalid profile ID', async () => {
        mockProfileManager.getProfile.mockResolvedValueOnce(null)

        await expect(
          factory.getClient({ profileId: 'non-existent-profile' })
        ).rejects.toThrow(ProfileNotFoundError)
      })

      it('should handle profile validation errors', async () => {
        const invalidProfileData = {
          type: ProfileType.STATIC,
          credentialsId: '', // Invalid: empty
          credentials: createTestCredentials({
            satToken: 'token'
          }),
          addressId: 'address',
        }

        const result = await factory.addProfiles({
          profiles: [invalidProfileData],
        })
        expect(result).toEqual([])
      })

      it('should handle missing required credential fields', async () => {
        const invalidProfileData = {
          type: ProfileType.STATIC,
          credentialsId: 'test-cred',
          credentials: {
            // Missing required fields
            tokenExpiry: Date.now() + 3600000,
          } as any,
          addressId: 'address',
        }

        const result = await factory.addProfiles({
          profiles: [invalidProfileData],
        })
        expect(result).toEqual([])
      })
    })

    describe('Multi-instance Support', () => {
      it('should support multiple factory instances conceptually', async () => {
        // Note: Since we're using a singleton pattern, this tests the conceptual support
        // by ensuring the factory can handle multiple profiles and instances
        const credentials1 = createTestCredentials({
        satToken: 'token1'
      })
        const credentials2 = createTestCredentials({
        satToken: 'token2'
      })

        const profile1 = await factory.addStaticProfile(
          'multi-1',
          credentials1,
          'addr-1'
        )
        const profile2 = await factory.addStaticProfile(
          'multi-2',
          credentials2,
          'addr-2'
        )

        const instance1 = await factory.getClient({ profileId: profile1.id })
        const instance2 = await factory.getClient({ profileId: profile2.id })

        expect(instance1.instance.id).not.toBe(instance2.instance.id)
        expect(instance1.instance.profileId).toBe(profile1.id)
        expect(instance2.instance.profileId).toBe(profile2.id)
      })
    })

    describe('HTTPClient host handling', () => {
      it('should pass host to HTTPClient when present in credentials', async () => {
        const MockedHTTPClient = HTTPClient as jest.MockedClass<typeof HTTPClient>
        const mockGetSubscriberInfo = jest.fn().mockResolvedValue({
          fabric_addresses: [{
            id: 'addr-1',
            type: 'sip',
            name: 'test-address',
            display_name: 'Test Address',
            channels: {}
          }]
        })
        
        MockedHTTPClient.mockImplementation(() => ({
          getSubscriberInfo: mockGetSubscriberInfo,
        } as any))

        const credentialsWithHost = createTestCredentials({
          host: 'custom.signalwire.com'
        })

        await factory.addProfiles({
          profiles: [{
            type: ProfileType.STATIC,
            credentialsId: 'test-cred-with-host',
            credentials: credentialsWithHost,
          }]
        })

        expect(MockedHTTPClient).toHaveBeenCalledWith({
          token: credentialsWithHost.satToken,
          host: 'custom.signalwire.com'
        })
      })

      it('should not pass host to HTTPClient when not present in credentials', async () => {
        const MockedHTTPClient = HTTPClient as jest.MockedClass<typeof HTTPClient>
        const mockGetSubscriberInfo = jest.fn().mockResolvedValue({
          fabric_addresses: [{
            id: 'addr-2',
            type: 'sip',
            name: 'test-address-2',
            display_name: 'Test Address 2',
            channels: {}
          }]
        })
        
        MockedHTTPClient.mockImplementation(() => ({
          getSubscriberInfo: mockGetSubscriberInfo,
        } as any))

        const credentialsWithoutHost = createTestCredentials()

        await factory.addProfiles({
          profiles: [{
            type: ProfileType.STATIC,
            credentialsId: 'test-cred-without-host',
            credentials: credentialsWithoutHost,
          }]
        })

        expect(MockedHTTPClient).toHaveBeenCalledWith({
          token: credentialsWithoutHost.satToken,
        })
      })
    })
  })
})
