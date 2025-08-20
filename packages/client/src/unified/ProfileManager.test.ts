import { ProfileManager } from './ProfileManager'
import { HTTPClient } from './HTTPClient'
import { ProfileType } from './interfaces/clientFactory'
import { SignalWireStorageContract } from './interfaces/storage'

describe('ProfileManager Credential Management', () => {
  let profileManager: ProfileManager
  let mockStorage: SignalWireStorageContract

  beforeEach(async () => {
    // Create mock storage
    mockStorage = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
      clear: jest.fn(),
    }

    profileManager = new ProfileManager()
    await profileManager.init(mockStorage)
  })

  afterEach(() => {
    // Clean up timers
    profileManager.cleanup()
    jest.clearAllTimers()
  })

  describe('refreshCredentials', () => {
    it('should refresh credentials for a valid profile', async () => {
      const mockProfile = {
        type: ProfileType.DYNAMIC,
        credentialsId: 'cred-123',
        credentials: {
          satToken: 'old-token',
          satRefreshToken: 'refresh-token',
          tokenExpiry: Date.now() + 3600000, // 1 hour from now
          projectId: 'project-123',
          spaceId: 'space-123',
        },
        addressId: 'address-123',
      }

      const profileId = await profileManager.addProfile(mockProfile)
      
      // Refresh credentials
      await profileManager.refreshCredentials(profileId)
      
      // Get updated profile
      const updatedProfile = await profileManager.getProfile(profileId)
      
      expect(updatedProfile).toBeTruthy()
      expect(updatedProfile?.credentials.satToken).toContain('refreshed_token_')
      expect(updatedProfile?.credentials.tokenExpiry).toBeGreaterThan(Date.now())
    })

    it('should throw error when refreshing non-existent profile', async () => {
      await expect(profileManager.refreshCredentials('non-existent')).rejects.toThrow('Failed to refresh credentials')
    })
  })

  describe('validateCredentials', () => {
    it('should return true for valid credentials', async () => {
      const mockProfile = {
        type: ProfileType.DYNAMIC,
        credentialsId: 'cred-123',
        credentials: {
          satToken: 'token',
          satRefreshToken: 'refresh-token',
          tokenExpiry: Date.now() + 3600000, // 1 hour from now
          projectId: 'project-123',
          spaceId: 'space-123',
        },
        addressId: 'address-123',
      }

      const profileId = await profileManager.addProfile(mockProfile)
      const isValid = await profileManager.validateCredentials(profileId)
      
      expect(isValid).toBe(true)
    })

    it('should return false for expired credentials', async () => {
      const mockProfile = {
        type: ProfileType.DYNAMIC,
        credentialsId: 'cred-123',
        credentials: {
          satToken: 'token',
          satRefreshToken: 'refresh-token',
          tokenExpiry: Date.now() - 1000, // Already expired
          projectId: 'project-123',
          spaceId: 'space-123',
        },
        addressId: 'address-123',
      }

      const profileId = await profileManager.addProfile(mockProfile)
      const isValid = await profileManager.validateCredentials(profileId)
      
      expect(isValid).toBe(false)
    })

    it('should return false for non-existent profile', async () => {
      const isValid = await profileManager.validateCredentials('non-existent')
      expect(isValid).toBe(false)
    })
  })

  describe('scheduleRefresh', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should schedule refresh before token expiry', async () => {
      const consoleSpy = jest.spyOn(console, 'log')
      
      const mockProfile = {
        type: ProfileType.DYNAMIC,
        credentialsId: 'cred-123',
        credentials: {
          satToken: 'token',
          satRefreshToken: 'refresh-token',
          tokenExpiry: Date.now() + 600000, // 10 minutes from now
          projectId: 'project-123',
          spaceId: 'space-123',
        },
        addressId: 'address-123',
      }

      const profileId = await profileManager.addProfile(mockProfile)
      
      // Check that refresh was scheduled (5 minutes before expiry = 300000ms)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`Scheduled credential refresh for profile ${profileId}`))
      consoleSpy.mockRestore()
    })

    it('should not schedule refresh for expired token', async () => {
      const mockProfile = {
        type: ProfileType.DYNAMIC,
        credentialsId: 'cred-123',
        credentials: {
          satToken: 'token',
          satRefreshToken: 'refresh-token',
          tokenExpiry: Date.now() - 1000, // Already expired
          projectId: 'project-123',
          spaceId: 'space-123',
        },
        addressId: 'address-123',
      }

      const consoleSpy = jest.spyOn(console, 'warn')
      await profileManager.addProfile(mockProfile)
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Token already expired'))
      consoleSpy.mockRestore()
    })
  })

  describe('cleanup', () => {
    it('should clear all timers and resources', async () => {
      const mockProfile = {
        type: ProfileType.DYNAMIC,
        credentialsId: 'cred-123',
        credentials: {
          satToken: 'token',
          satRefreshToken: 'refresh-token',
          tokenExpiry: Date.now() + 3600000,
          projectId: 'project-123',
          spaceId: 'space-123',
        },
        addressId: 'address-123',
      }

      await profileManager.addProfile(mockProfile)
      
      const consoleSpy = jest.spyOn(console, 'log')
      profileManager.cleanup()
      
      expect(consoleSpy).toHaveBeenCalledWith('ProfileManager cleanup completed')
      consoleSpy.mockRestore()
      
      // After cleanup, operations should throw
      await expect(profileManager.getProfile('any-id')).rejects.toThrow('ProfileManager not initialized')
    })
  })
  
  describe('Address Resolution', () => {
    let profileManager: ProfileManager
    let mockStorage: SignalWireStorageContract
    
    beforeEach(async () => {
      profileManager = new ProfileManager()
      const storageData: Record<string, any> = {}
      mockStorage = {
        get: jest.fn().mockImplementation(async (key: string) => {
          if (key === 'swcf:profiles') {
            return Object.keys(storageData)
              .filter(k => k.startsWith('swcf:profile:'))
              .map(k => k.replace('swcf:profile:', ''))
          }
          return storageData[key] || null
        }),
        set: jest.fn().mockImplementation(async (key: string, value: any) => {
          storageData[key] = value
          return true
        }),
        delete: jest.fn().mockImplementation(async (key: string) => {
          if (storageData[key]) {
            delete storageData[key]
            return true
          }
          return false
        }),
        has: jest.fn().mockImplementation(async (key: string) => {
          return key in storageData
        }),
        getInfo: jest.fn().mockResolvedValue({
          type: 'memory',
          version: '1.0.0',
          description: 'Test Storage',
        }),
      }
      await profileManager.init(mockStorage)
    })
    
    afterEach(() => {
      profileManager.cleanup()
      jest.clearAllMocks()
      jest.restoreAllMocks()
    })
    
    it('should find profile by direct address match', async () => {
      const profile = {
        type: ProfileType.STATIC,
        credentialsId: 'cred-1',
        credentials: {
          satToken: 'token-123',
          satRefreshToken: 'refresh-123',
          tokenExpiry: Date.now() + 3600000,
          projectId: 'proj-1',
          spaceId: 'space-1',
        },
        addressId: 'address-123',
      }
      
      const profileId = await profileManager.addProfile(profile)
      const foundProfile = await profileManager.findProfileForAddress('address-123')
      
      expect(foundProfile).not.toBeNull()
      expect(foundProfile?.addressId).toBe('address-123')
      expect(foundProfile?.id).toBe(profileId)
    })
    
    it('should create dynamic profile for shared resource', async () => {
      // Mock HTTPClient methods
      const mockGetSubscriberInfo = jest.fn().mockResolvedValue({
        fabric_addresses: [
          { id: 'shared-address-123', name: 'shared-resource', type: 'room' },
        ],
      })
      
      const mockGetAddress = jest.fn().mockResolvedValue({
        id: 'shared-address-123',
        name: 'shared-resource',
        display_name: 'Shared Resource',
        type: 'room',
        channels: { audio: 'enabled', video: 'enabled' },
      })
      
      jest.spyOn(HTTPClient.prototype, 'getSubscriberInfo').mockImplementation(mockGetSubscriberInfo)
      jest.spyOn(HTTPClient.prototype, 'getAddress').mockImplementation(mockGetAddress)
      
      const profile = {
        type: ProfileType.STATIC,
        credentialsId: 'cred-1',
        credentials: {
          satToken: 'token-123',
          satRefreshToken: 'refresh-123',
          tokenExpiry: Date.now() + 3600000,
          projectId: 'proj-1',
          spaceId: 'space-1',
        },
        addressId: 'primary-address-123',
      }
      
      await profileManager.addProfile(profile)
      const foundProfile = await profileManager.findProfileForAddress('shared-address-123')
      
      expect(foundProfile).not.toBeNull()
      expect(foundProfile?.type).toBe(ProfileType.DYNAMIC)
      expect(foundProfile?.addressId).toBe('shared-address-123')
      expect(foundProfile?.credentialsId).toBe('cred-1')
      expect(foundProfile?.id).toContain('dynamic_')
      
      // Verify dynamic profile is in memory but not persisted
      const dynamicProfiles = await profileManager.listProfiles(ProfileType.DYNAMIC)
      expect(dynamicProfiles).toHaveLength(1)
      expect(mockStorage.set).not.toHaveBeenCalledWith(
        expect.stringContaining('dynamic_'),
        expect.anything()
      )
    })
    
    it('should return null when no profile has access', async () => {
      const mockGetSubscriberInfo = jest.fn().mockResolvedValue({
        fabric_addresses: [],
      })
      
      jest.spyOn(HTTPClient.prototype, 'getSubscriberInfo').mockImplementation(mockGetSubscriberInfo)
      
      const profile = {
        type: ProfileType.STATIC,
        credentialsId: 'cred-1',
        credentials: {
          satToken: 'token-123',
          satRefreshToken: 'refresh-123',
          tokenExpiry: Date.now() + 3600000,
          projectId: 'proj-1',
          spaceId: 'space-1',
        },
        addressId: 'address-123',
      }
      
      await profileManager.addProfile(profile)
      const foundProfile = await profileManager.findProfileForAddress('non-existent-address')
      
      expect(foundProfile).toBeNull()
    })
    
    it('should get profiles by credential ID', async () => {
      const profile1 = {
        type: ProfileType.STATIC,
        credentialsId: 'shared-cred-1',
        credentials: {
          satToken: 'token-123',
          satRefreshToken: 'refresh-123',
          tokenExpiry: Date.now() + 3600000,
          projectId: 'proj-1',
          spaceId: 'space-1',
        },
        addressId: 'address-1',
      }
      
      const profile2 = {
        type: ProfileType.STATIC,
        credentialsId: 'shared-cred-1',
        credentials: {
          satToken: 'token-123',
          satRefreshToken: 'refresh-123',
          tokenExpiry: Date.now() + 3600000,
          projectId: 'proj-1',
          spaceId: 'space-1',
        },
        addressId: 'address-2',
      }
      
      const profile3 = {
        type: ProfileType.STATIC,
        credentialsId: 'different-cred',
        credentials: {
          satToken: 'token-456',
          satRefreshToken: 'refresh-456',
          tokenExpiry: Date.now() + 3600000,
          projectId: 'proj-2',
          spaceId: 'space-2',
        },
        addressId: 'address-3',
      }
      
      await profileManager.addProfile(profile1)
      await profileManager.addProfile(profile2)
      await profileManager.addProfile(profile3)
      
      const profiles = await profileManager.getProfilesByCredentialId('shared-cred-1')
      
      expect(profiles).toHaveLength(2)
      expect(profiles.every(p => p.credentialsId === 'shared-cred-1')).toBe(true)
    })
    
    it('should reuse existing dynamic profile for same address', async () => {
      const mockGetSubscriberInfo = jest.fn().mockResolvedValue({
        fabric_addresses: [
          { id: 'shared-address-123', name: 'shared-resource', type: 'room' },
        ],
      })
      
      const mockGetAddress = jest.fn().mockResolvedValue({
        id: 'shared-address-123',
        name: 'shared-resource',
        display_name: 'Shared Resource',
        type: 'room',
        channels: { audio: 'enabled', video: 'enabled' },
      })
      
      jest.spyOn(HTTPClient.prototype, 'getSubscriberInfo').mockImplementation(mockGetSubscriberInfo)
      jest.spyOn(HTTPClient.prototype, 'getAddress').mockImplementation(mockGetAddress)
      
      const profile = {
        type: ProfileType.STATIC,
        credentialsId: 'cred-1',
        credentials: {
          satToken: 'token-123',
          satRefreshToken: 'refresh-123',
          tokenExpiry: Date.now() + 3600000,
          projectId: 'proj-1',
          spaceId: 'space-1',
        },
        addressId: 'primary-address-123',
      }
      
      await profileManager.addProfile(profile)
      
      // First call creates dynamic profile
      const foundProfile1 = await profileManager.findProfileForAddress('shared-address-123')
      expect(foundProfile1?.type).toBe(ProfileType.DYNAMIC)
      
      // Second call should reuse the same dynamic profile
      const foundProfile2 = await profileManager.findProfileForAddress('shared-address-123')
      expect(foundProfile2?.id).toBe(foundProfile1?.id)
      
      // Should only have one dynamic profile
      const dynamicProfiles = await profileManager.listProfiles(ProfileType.DYNAMIC)
      expect(dynamicProfiles).toHaveLength(1)
    })
  })
})