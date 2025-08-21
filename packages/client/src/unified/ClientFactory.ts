import { LocalStorageAdapter } from './storage/LocalStorageAdapter'
import { SignalWireStorageContract, setGlobalStorageInstance } from '@signalwire/core'
import { ProfileManager } from './ProfileManager'
import { InstanceManager } from './InstanceManager'
import {
  Profile,
  ProfileType,
  ManagedInstance,
  ClientFactoryContract,
  AddProfilesParams,
  RemoveProfilesParams,
  GetClientParams,
  GetClientResult,
  DisposeClientParams,
  ProfileNotFoundError,
  ClientFactoryError,
  SignalWireCredentials,
} from './interfaces/clientFactory'
import { ResourceType } from './interfaces/address'

/**
 * Singleton factory for managing SignalWire client instances and authentication profiles.
 * Provides a centralized way to create, manage, and dispose of client instances.
 */
export class ClientFactory implements ClientFactoryContract {
  private static instance: ClientFactory | null = null
  private profileManager: ProfileManager
  private instanceManager: InstanceManager
  private storage: SignalWireStorageContract | null = null
  private initialized = false

  private constructor() {
    this.profileManager = new ProfileManager()
    this.instanceManager = new InstanceManager()
  }

  /**
   * Get the singleton instance of ClientFactory
   * @returns ClientFactory instance
   */
  public static getInstance(): ClientFactory {
    if (!ClientFactory.instance) {
      ClientFactory.instance = new ClientFactory()
    }
    return ClientFactory.instance
  }

  /**
   * Initialize the factory with storage
   * @param storage - Optional storage implementation (defaults to LocalStorageAdapter)
   */
  async init(storage?: SignalWireStorageContract): Promise<void> {
    if (this.initialized) {
      return
    }

    // Use provided storage or default to LocalStorageAdapter
    this.storage = storage || new LocalStorageAdapter()

    // Register the storage instance globally for the SDK
    setGlobalStorageInstance(this.storage)

    // Initialize managers
    await this.profileManager.init(this.storage)

    this.initialized = true
  }

  /**
   * Add one or more authentication profiles
   * @param params - Profiles to add
   * @returns Array of created profiles
   */
  async addProfiles(params: AddProfilesParams): Promise<Profile[]> {
    this.ensureInitialized()

    const profiles: Profile[] = []
    const errors: Error[] = []

    for (const profileData of params.profiles) {
      try {
        // Validate profile data
        this.validateProfileData(profileData)

        const profileId = await this.profileManager.addProfile(profileData)

        // Fetch the created profile to return the full object
        const profile = await this.profileManager.getProfile(profileId)
        if (profile) {
          profiles.push(profile)
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)))
      }
    }

    // If some profiles failed but others succeeded, still return the successful ones
    // but log the errors
    if (errors.length > 0) {
      console.warn('Some profiles failed to be added:', errors)
    }

    return profiles
  }

  /**
   * Remove one or more authentication profiles
   * @param params - Profile IDs to remove
   * @returns Array of successfully removed profile IDs
   */
  async removeProfiles(params: RemoveProfilesParams): Promise<string[]> {
    this.ensureInitialized()

    const removedIds: string[] = []
    const errors: Error[] = []

    for (const profileId of params.profileIds) {
      try {
        // Check if there are active instances using this profile
        const instance = await this.instanceManager.getInstanceByProfile(
          profileId
        )
        if (instance) {
          // Try to dispose the instance first
          await this.instanceManager.disposeInstance(instance.id, false)
        }

        const removed = await this.profileManager.removeProfile(profileId)
        if (removed) {
          removedIds.push(profileId)
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)))
      }
    }

    if (errors.length > 0) {
      console.warn('Some profiles failed to be removed:', errors)
    }

    return removedIds
  }

  /**
   * List all available profiles
   * @returns Array of all profiles
   */
  async listProfiles(): Promise<Profile[]> {
    this.ensureInitialized()
    return this.profileManager.listProfiles()
  }

  /**
   * Get a specific profile by ID
   * @param profileId - Profile identifier
   * @returns Profile or null if not found
   */
  async getProfile(profileId: string): Promise<Profile | null> {
    this.ensureInitialized()
    return this.profileManager.getProfile(profileId)
  }

  /**
   * Get or create a client instance for a profile
   * @param params - Client request parameters
   * @returns Client instance information
   */
  async getClient(params: GetClientParams): Promise<GetClientResult> {
    this.ensureInitialized()

    const { profileId, addressId } = params

    // Determine which profile to use
    let targetProfileId: string | undefined = profileId
    let profile: Profile | null = null

    if (profileId) {
      // Priority 1: Use provided profileId
      profile = await this.profileManager.getProfile(profileId)
      if (!profile) {
        throw new ProfileNotFoundError(profileId)
      }
    } else if (addressId) {
      // Priority 2: Find profile for addressId
      profile = await this.profileManager.findProfileForAddress(addressId)
      if (!profile) {
        throw new ClientFactoryError(
          `No profile found with access to address ${addressId}`,
          'NO_PROFILE_FOR_ADDRESS',
          { addressId }
        )
      }
      targetProfileId = profile.id
    } else {
      // Neither profileId nor addressId provided
      throw new ClientFactoryError(
        'Either profileId or addressId must be provided',
        'MISSING_IDENTIFIER',
        { profileId, addressId }
      )
    }

    // Validate credentials before creating instance
    const isValid = await this.profileManager.validateCredentials(
      targetProfileId!
    )
    if (!isValid) {
      // Try to refresh credentials
      try {
        await this.profileManager.refreshCredentials(targetProfileId!)
        // Re-fetch profile after refresh
        profile = await this.profileManager.getProfile(targetProfileId!)
        if (!profile) {
          throw new ProfileNotFoundError(targetProfileId!)
        }
      } catch (error) {
        throw new ClientFactoryError(
          `Invalid or expired credentials for profile ${targetProfileId}`,
          'INVALID_CREDENTIALS',
          {
            profileId: targetProfileId,
            error: error instanceof Error ? error.message : String(error),
          }
        )
      }
    }

    // Check if instance already exists
    let instance = await this.instanceManager.getInstanceByProfile(
      targetProfileId!
    )
    let isNew = false

    if (!instance) {
      // Create new instance
      instance = await this.instanceManager.createInstance(
        targetProfileId!,
        profile
      )
      isNew = true
    }

    // Update access tracking
    await this.instanceManager.updateInstanceAccess(instance.id)

    return {
      instance,
      isNew,
    }
  }

  /**
   * Dispose of a client instance
   * @param params - Disposal parameters
   * @returns Whether the instance was successfully disposed
   */
  async disposeClient(params: DisposeClientParams): Promise<boolean> {
    this.ensureInitialized()

    const { instanceId, force = false } = params

    try {
      return await this.instanceManager.disposeInstance(instanceId, force)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new ClientFactoryError(
        `Failed to dispose instance ${instanceId}: ${error}`,
        'DISPOSE_FAILED',
        { instanceId, force }
      )
    }
  }

  /**
   * List all active client instances
   * @returns Array of active instances
   */
  async listActiveClients(): Promise<ManagedInstance[]> {
    this.ensureInitialized()
    return this.instanceManager.listInstances()
  }

  /**
   * Add a dynamic profile (memory-only, not persisted)
   * Convenience method for creating temporary authentication profiles
   * @param credentialsId - Unique identifier for credentials
   * @param credentials - Authentication credentials
   * @param addressId - SignalWire address ID
   * @param addressDetails - Optional address details
   * @returns Created profile
   */
  async addDynamicProfile(
    credentialsId: string,
    credentials: SignalWireCredentials,
    addressId: string,
    addressDetails?: {
      type: ResourceType
      name: string
      displayName?: string
      channels?: number
    }
  ): Promise<Profile> {
    const profileId = await this.profileManager.addProfile({
      type: ProfileType.DYNAMIC,
      credentialsId,
      credentials,
      addressId,
      addressDetails,
    })

    // Fetch and return the created profile
    const profile = await this.profileManager.getProfile(profileId)
    if (!profile) {
      throw new ClientFactoryError(
        `Failed to retrieve newly created dynamic profile ${profileId}`,
        'PROFILE_CREATION_ERROR',
        { profileId }
      )
    }
    return profile
  }

  /**
   * Add a static profile (persisted to storage)
   * Convenience method for creating persistent authentication profiles
   * @param credentialsId - Unique identifier for credentials
   * @param credentials - Authentication credentials
   * @param addressId - SignalWire address ID
   * @param addressDetails - Optional address details
   * @returns Created profile
   */
  async addStaticProfile(
    credentialsId: string,
    credentials: SignalWireCredentials,
    addressId: string,
    addressDetails?: {
      type: ResourceType
      name: string
      displayName?: string
      channels?: number
    }
  ): Promise<Profile> {
    const profileId = await this.profileManager.addProfile({
      type: ProfileType.STATIC,
      credentialsId,
      credentials,
      addressId,
      addressDetails,
    })

    // Fetch and return the created profile
    const profile = await this.profileManager.getProfile(profileId)
    if (!profile) {
      throw new ClientFactoryError(
        `Failed to retrieve newly created static profile ${profileId}`,
        'PROFILE_CREATION_ERROR',
        { profileId }
      )
    }
    return profile
  }

  /**
   * Get storage information
   * @returns Storage information if available
   */
  async getStorageInfo() {
    if (!this.storage) {
      return null
    }
    return this.storage.getStorageInfo()
  }

  /**
   * Dispose of all resources and reset the factory
   * This will dispose of all active instances and clear all profiles
   */
  async dispose(): Promise<void> {
    if (!this.initialized) {
      return
    }

    try {
      // Dispose of all instances
      await this.instanceManager.dispose()

      // Clear dynamic profiles (static profiles remain in storage)
      // Note: We don't clear static profiles as they should persist

      // Clear the global storage instance
      setGlobalStorageInstance(null)

      this.initialized = false
      ClientFactory.instance = null
    } catch (error) {
      console.error('Error during ClientFactory disposal:', error)
      throw error
    }
  }

  /**
   * Validate profile data before adding
   * @param profileData - Profile data to validate
   */
  private validateProfileData(
    profileData: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'lastUsed'>
  ): void {
    if (
      !profileData.credentialsId ||
      typeof profileData.credentialsId !== 'string'
    ) {
      throw new ClientFactoryError(
        'Credentials ID is required and must be a string',
        'INVALID_CREDENTIALS_ID'
      )
    }

    if (!Object.values(ProfileType).includes(profileData.type)) {
      throw new ClientFactoryError(
        'Invalid profile type',
        'INVALID_PROFILE_TYPE'
      )
    }

    if (
      !profileData.credentials ||
      typeof profileData.credentials !== 'object'
    ) {
      throw new ClientFactoryError(
        'Credentials are required and must be an object',
        'INVALID_CREDENTIALS'
      )
    }

    // Validate required credentials fields
    if (!profileData.credentials.satToken) {
      throw new ClientFactoryError(
        'Credentials must include satToken for SignalWire authentication',
        'MISSING_AUTH_PARAMS'
      )
    }
    
    // Validate refresh configuration
    if (
      !profileData.credentials.satRefreshURL ||
      !profileData.credentials.satRefreshPayload ||
      !profileData.credentials.satRefreshResultMapper
    ) {
      throw new ClientFactoryError(
        'Credentials must include satRefreshURL, satRefreshPayload, and satRefreshResultMapper for token refresh',
        'MISSING_REFRESH_PARAMS'
      )
    }

    if (!profileData.addressId || typeof profileData.addressId !== 'string') {
      throw new ClientFactoryError(
        'Address ID is required and must be a string',
        'INVALID_ADDRESS_ID'
      )
    }
  }

  /**
   * Ensure the factory is initialized
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new ClientFactoryError(
        'ClientFactory not initialized. Call init() first.',
        'NOT_INITIALIZED'
      )
    }
  }
}

/**
 * Get the singleton ClientFactory instance
 * @returns ClientFactory instance
 */
export function getClientFactory(): ClientFactory {
  return ClientFactory.getInstance()
}
