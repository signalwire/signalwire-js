/**
 * Integration test for ClientFactory API changes
 * Tests that the API signatures match the specification
 */
import { ClientFactory } from './ClientFactory'
import { ProfileType, Profile } from './interfaces/clientFactory'

describe.skip('ClientFactory API Integration', () => {
  let factory: ClientFactory

  beforeEach(async () => {
    // Reset the singleton
    const currentFactory = ClientFactory.getInstance()
    await currentFactory.dispose().catch(() => {})

    factory = ClientFactory.getInstance()
  })

  afterEach(async () => {
    await factory.dispose().catch(() => {})
  })

  it('should have correct API signatures', async () => {
    // Mock storage
    const mockStorage = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
      has: jest.fn().mockResolvedValue(false),
      getMany: jest.fn().mockResolvedValue([]),
      setMany: jest.fn().mockResolvedValue(true),
      deleteMany: jest.fn().mockResolvedValue(true),
      list: jest.fn().mockResolvedValue([]),
      clear: jest.fn().mockResolvedValue(true),
      getStorageInfo: jest.fn().mockResolvedValue({
        type: 'memory',
        isAvailable: true,
        isPersistent: false,
      }),
    }

    await factory.init(mockStorage as any)

    // Test that addProfiles returns Promise<Profile[]>
    const addProfilesResult = factory.addProfiles({
      profiles: [],
    })
    expect(addProfilesResult).toBeInstanceOf(Promise)

    // Test that getClient accepts both profileId and addressId
    const getClientMethod = factory.getClient
    expect(getClientMethod).toBeDefined()

    // Verify the parameter types by checking the function accepts the correct object shape
    // This will pass TypeScript compilation if the signatures are correct
    const validParams1: Parameters<typeof factory.getClient>[0] = {
      profileId: 'test',
      createIfNotExists: true,
    }

    const validParams2: Parameters<typeof factory.getClient>[0] = {
      addressId: 'test',
      createIfNotExists: false,
    }

    const validParams3: Parameters<typeof factory.getClient>[0] = {
      profileId: 'test',
      addressId: 'test2',
      createIfNotExists: true,
    }

    expect(validParams1).toBeDefined()
    expect(validParams2).toBeDefined()
    expect(validParams3).toBeDefined()
  })

  it('addProfiles should return Profile[] type', async () => {
    const factory = ClientFactory.getInstance()

    // Mock storage
    const mockStorage = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
      has: jest.fn().mockResolvedValue(false),
      getMany: jest.fn().mockResolvedValue([]),
      setMany: jest.fn().mockResolvedValue(true),
      deleteMany: jest.fn().mockResolvedValue(true),
      list: jest.fn().mockResolvedValue([]),
      clear: jest.fn().mockResolvedValue(true),
      getStorageInfo: jest.fn().mockResolvedValue({
        type: 'memory',
        isAvailable: true,
        isPersistent: false,
      }),
    }

    await factory.init(mockStorage as any)

    const result = await factory.addProfiles({
      profiles: [
        {
          type: ProfileType.DYNAMIC,
          credentialsId: 'test',
          credentials: {
            satToken: 'token',
            satRefreshToken: 'refresh',
            tokenExpiry: Date.now() + 3600000,
            projectId: 'project',
            spaceId: 'space',
          },
          addressId: 'address',
        },
      ],
    })

    // Verify the return type is Profile[]
    expect(Array.isArray(result)).toBe(true)
    if (result.length > 0) {
      const profile = result[0]
      // Check that it has Profile properties
      expect(profile).toHaveProperty('id')
      expect(profile).toHaveProperty('type')
      expect(profile).toHaveProperty('credentialsId')
      expect(profile).toHaveProperty('credentials')
      expect(profile).toHaveProperty('addressId')
      expect(profile).toHaveProperty('createdAt')
      expect(profile).toHaveProperty('updatedAt')
    }
  })

  it('convenience methods should have correct return types', async () => {
    // Mock storage
    const mockStorage = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
      has: jest.fn().mockResolvedValue(false),
      getMany: jest.fn().mockResolvedValue([]),
      setMany: jest.fn().mockResolvedValue(true),
      deleteMany: jest.fn().mockResolvedValue(true),
      list: jest.fn().mockResolvedValue([]),
      clear: jest.fn().mockResolvedValue(true),
      getStorageInfo: jest.fn().mockResolvedValue({
        type: 'memory',
        isAvailable: true,
        isPersistent: false,
      }),
    }

    await factory.init(mockStorage as any)

    // This test verifies the TypeScript signatures are correct
    // The actual runtime behavior is tested in the unit tests

    // Test that addDynamicProfile returns Promise<Profile>
    const dynamicResult: Promise<Profile> = factory.addDynamicProfile(
      'cred-id',
      {
        satToken: 'token',
        satRefreshToken: 'refresh',
        tokenExpiry: Date.now() + 3600000,
        projectId: 'project',
        spaceId: 'space',
      },
      'address-id'
    )
    expect(dynamicResult).toBeInstanceOf(Promise)

    // Test that addStaticProfile returns Promise<Profile>
    const staticResult: Promise<Profile> = factory.addStaticProfile(
      'cred-id-2',
      {
        satToken: 'token2',
        satRefreshToken: 'refresh2',
        tokenExpiry: Date.now() + 3600000,
        projectId: 'project2',
        spaceId: 'space2',
      },
      'address-id-2'
    )
    expect(staticResult).toBeInstanceOf(Promise)

    // The type annotations above prove that the methods return the correct types
    // If they returned Promise<string>, TypeScript would fail to compile
  })
})
