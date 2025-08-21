import { SignalWireClient } from './index'
import { ResourceType } from './address'
import { SignalWireStorageContract } from '@signalwire/core'

/**
 * Public type for authentication credentials
 */
export interface SignalWireCredentials {
  /** The current SAT token */
  satToken: string
  /** Custom payload for refresh request */
  satRefreshPayload: Record<string, any>
  /** URL for refresh token endpoint */
  satRefreshURL: string
  /** Function to map refresh response to credentials */
  satRefreshResultMapper: (body: Record<string, any>) => {
    satToken: string
    tokenExpiry: number
    satRefreshPayload: Record<string, any>
  }
  /** Token expiry timestamp */
  tokenExpiry: number
  host: string
}

/**
 * Types of authentication profiles
 */
export enum ProfileType {
  /**
   * Static profile with credentials that are persisted to storage.
   * Typically used for subscriber authentication.
   */
  STATIC = 'static',

  /**
   * Dynamic profile that exists only in memory.
   * Used for shared resource access or temporary authentication.
   */
  DYNAMIC = 'dynamic',
}

/**
 * Authentication profile for SignalWire client instances
 */
export interface Profile {
  // Identification
  id: string // UUID v4
  type: ProfileType // 'static' | 'dynamic'

  // Credentials
  credentialsId: string // Reference to credential set
  credentials: SignalWireCredentials

  // Address information
  addressId: string // SignalWire address ID
  addressDetails?: {
    type: ResourceType
    name: string
    displayName?: string
    channels?: number
  }

  // Metadata
  createdAt: number // Unix timestamp
  updatedAt: number // Unix timestamp
  lastUsed?: number // Unix timestamp
}

/**
 * Managed client instance information
 */
export interface ManagedInstance {
  /** Unique identifier for the instance */
  id: string

  /** Profile ID used to create this instance */
  profileId: string

  /** The actual SignalWire client instance */
  client: SignalWireClient

  /** Timestamp when the instance was created */
  createdAt: Date

  /** Timestamp when the instance was last accessed */
  lastAccessedAt: Date

  /** Number of times this instance has been accessed */
  accessCount: number

  /** Whether the instance is currently connected */
  isConnected: boolean
}

/**
 * Parameters for adding profiles
 */
export interface AddProfilesParams {
  profiles: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'lastUsed' | 'addressId'>[]
}

/**
 * Parameters for removing profiles
 */
export interface RemoveProfilesParams {
  profileIds: string[]
}

/**
 * Parameters for getting a client instance
 */
export interface GetClientParams {
  /** Profile ID to use for the client. Takes priority over addressId */
  profileId?: string
  /** Address ID to find a suitable profile for. Used if profileId is not provided */
  addressId?: string
}

/**
 * Result from getting a client instance
 */
export interface GetClientResult {
  instance: ManagedInstance
  /** Whether this is a newly created instance */
  isNew: boolean
}

/**
 * Parameters for disposing a client instance
 */
export interface DisposeClientParams {
  instanceId: string
  /** Whether to force disposal even if the client is connected */
  force?: boolean
}

/**
 * Contract for the ClientFactory
 */
export interface ClientFactoryContract {
  /**
   * Initialize the factory with storage
   * @param storage - Optional storage implementation
   */
  init(storage?: SignalWireStorageContract): Promise<void>

  /**
   * Add one or more authentication profiles
   * @param params - Profiles to add
   * @returns Array of created profiles
   */
  addProfiles(params: AddProfilesParams): Promise<Profile[]>

  /**
   * Remove one or more authentication profiles
   * @param params - Profile IDs to remove
   * @returns Array of successfully removed profile IDs
   */
  removeProfiles(params: RemoveProfilesParams): Promise<string[]>

  /**
   * List all available profiles
   * @returns Array of all profiles
   */
  listProfiles(): Promise<Profile[]>

  /**
   * Get a specific profile by ID
   * @param profileId - Profile identifier
   * @returns Profile or null if not found
   */
  getProfile(profileId: string): Promise<Profile | null>

  /**
   * Get or create a client instance for a profile
   * @param params - Client request parameters
   * @returns Client instance information
   */
  getClient(params: GetClientParams): Promise<GetClientResult>

  /**
   * Dispose of a client instance
   * @param params - Disposal parameters
   * @returns Whether the instance was successfully disposed
   */
  disposeClient(params: DisposeClientParams): Promise<boolean>

  /**
   * List all active client instances
   * @returns Array of active instances
   */
  listActiveClients(): Promise<ManagedInstance[]>
}

/**
 * Contract for the ProfileManager
 */
export interface ProfileManagerContract {
  /**
   * Initialize the profile manager with storage
   * @param storage - Storage implementation
   */
  init(storage: SignalWireStorageContract): Promise<void>

  /**
   * Add a new profile
   * @param profile - Profile to add (without id, createdAt, updatedAt, lastUsed)
   * @returns Created profile ID
   */
  addProfile(
    profile: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'lastUsed'>
  ): Promise<string>

  /**
   * Update an existing profile
   * @param profileId - Profile ID to update
   * @param updates - Partial profile updates
   * @returns Whether the profile was updated
   */
  updateProfile(
    profileId: string,
    updates: Partial<Omit<Profile, 'id' | 'createdAt'>>
  ): Promise<boolean>

  /**
   * Remove a profile
   * @param profileId - Profile ID to remove
   * @returns Whether the profile was removed
   */
  removeProfile(profileId: string): Promise<boolean>

  /**
   * Get a profile by ID
   * @param profileId - Profile identifier
   * @returns Profile or null if not found
   */
  getProfile(profileId: string): Promise<Profile | null>

  /**
   * List all profiles
   * @param type - Optional filter by profile type
   * @returns Array of profiles
   */
  listProfiles(type?: ProfileType): Promise<Profile[]>

  /**
   * Check if a profile exists
   * @param profileId - Profile identifier
   * @returns Whether the profile exists
   */
  hasProfile(profileId: string): Promise<boolean>

  /**
   * Find a profile that has access to a specific address
   * @param addressId - Address identifier to search for
   * @returns Profile that has access or null if not found
   */
  findProfileForAddress(addressId: string): Promise<Profile | null>

  /**
   * Get all profiles associated with a credential ID
   * @param credentialId - Credential identifier
   * @returns Array of profiles with the given credential ID
   */
  getProfilesByCredentialId(credentialId: string): Promise<Profile[]>

  /**
   * Create a dynamic profile for accessing a shared resource
   * @param parentProfile - Profile to inherit credentials from
   * @param addressId - Address ID for the shared resource
   * @returns Created dynamic profile
   */
  createDynamicProfile(
    parentProfile: Profile,
    addressId: string
  ): Promise<Profile>
}

/**
 * Contract for the InstanceManager
 */
export interface InstanceManagerContract {
  /**
   * Create a new client instance
   * @param profileId - Profile ID to use for the instance
   * @param profile - Profile data
   * @returns Created instance
   */
  createInstance(profileId: string, profile: Profile): Promise<ManagedInstance>

  /**
   * Dispose of a client instance
   * @param instanceId - Instance ID to dispose
   * @param force - Whether to force disposal
   * @returns Whether the instance was disposed
   */
  disposeInstance(instanceId: string, force?: boolean): Promise<boolean>

  /**
   * Get an existing instance
   * @param instanceId - Instance identifier
   * @returns Instance or null if not found
   */
  getInstance(instanceId: string): Promise<ManagedInstance | null>

  /**
   * Get instance by profile ID
   * @param profileId - Profile identifier
   * @returns Instance or null if not found
   */
  getInstanceByProfile(profileId: string): Promise<ManagedInstance | null>

  /**
   * List all active instances
   * @returns Array of active instances
   */
  listInstances(): Promise<ManagedInstance[]>

  /**
   * Update instance access tracking
   * @param instanceId - Instance identifier
   */
  updateInstanceAccess(instanceId: string): Promise<void>
}

/**
 * Storage keys used by the ClientFactory system
 */
export const STORAGE_KEYS = {
  PROFILES: 'swcf:profiles',
  PROFILE: (id: string) => `swcf:profile:${id}`,
  CREDENTIALS: (id: string) => `swcf:cred:${id}`,
  INSTANCE_STATE: (id: string) => `swcf:instance:${id}`,
  DEVICE_REGISTRATION: 'swcf:device:registration',
  CONFIG: 'swcf:config',
} as const

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  INSTANCE_ACCESS_UPDATE_INTERVAL: 5000, // 5 seconds
  MAX_INSTANCES_PER_PROFILE: 1,
} as const

/**
 * Error types for ClientFactory operations
 */
export class ClientFactoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ClientFactoryError'
  }
}

export class ProfileNotFoundError extends ClientFactoryError {
  constructor(profileId: string) {
    super(`Profile not found: ${profileId}`, 'PROFILE_NOT_FOUND', { profileId })
  }
}

export class InstanceNotFoundError extends ClientFactoryError {
  constructor(instanceId: string) {
    super(`Instance not found: ${instanceId}`, 'INSTANCE_NOT_FOUND', {
      instanceId,
    })
  }
}

export class ProfileExistsError extends ClientFactoryError {
  constructor(profileId: string) {
    super(`Profile already exists: ${profileId}`, 'PROFILE_EXISTS', {
      profileId,
    })
  }
}

export class InstanceInUseError extends ClientFactoryError {
  constructor(instanceId: string) {
    super(
      `Instance is in use and cannot be disposed: ${instanceId}`,
      'INSTANCE_IN_USE',
      { instanceId }
    )
  }
}

export class CredentialRefreshError extends ClientFactoryError {
  constructor(profileId: string, originalError?: Error) {
    super(
      `Failed to refresh credentials for profile: ${profileId}`,
      'CREDENTIAL_REFRESH_ERROR',
      { profileId, originalError: originalError?.message }
    )
  }
}

export class CredentialExpiredError extends ClientFactoryError {
  constructor(profileId: string, expiredAt: number) {
    super(
      `Credentials expired for profile: ${profileId}`,
      'CREDENTIAL_EXPIRED',
      { profileId, expiredAt: new Date(expiredAt).toISOString() }
    )
  }
}
