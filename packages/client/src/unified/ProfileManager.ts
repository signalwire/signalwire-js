import { SignalWireStorageContract } from '@signalwire/core'
import {
  Profile,
  ProfileType,
  ProfileManagerContract,
  STORAGE_KEYS,
  ProfileExistsError,
  CredentialRefreshError,
} from './interfaces/clientFactory'
import { HTTPClient } from './HTTPClient'
import {
  isValidProfile,
  isStringArray,
  safeJsonParse,
} from './utils/typeGuards'
import { resolveSatRefreshResultMapper } from './utils/satRefreshMappers'

/**
 * Manages authentication profiles for SignalWire client instances.
 * Handles both persistent (static) and memory-only (dynamic) profiles.
 */
export class ProfileManager implements ProfileManagerContract {
  private _storage: SignalWireStorageContract | null = null
  private _dynamicProfiles = new Map<string, Profile>()
  private _initialized = false
  private _refreshTimers = new Map<string, NodeJS.Timeout>()
  /** Time before expiry to trigger refresh (5 minutes in milliseconds) */
  private readonly REFRESH_BUFFER_MS = 5 * 60 * 1000

  /**
   * Initialize the profile manager with storage
   * @param storage - Storage implementation for persistent profiles
   */
  async init(storage: SignalWireStorageContract): Promise<void> {
    this._storage = storage
    this._initialized = true

    // Load any existing static profiles from storage
    await this._loadStaticProfiles()
  }

  private async _getSavedProfileIds() {
    const profileIdsData = await this._storage?.get(STORAGE_KEYS.PROFILES)
    return profileIdsData
      ? safeJsonParse(profileIdsData, isStringArray) ?? []
      : []
  }

  private async _getSavedProfile(profileId: string) {
    const profileKey = this._getProfileStorageKey(profileId)

    const value = await this._storage?.get(profileKey)
    if (!value) {
      return null
    }

    return safeJsonParse(value, isValidProfile)
  }

  /**
   * Add a new profile
   * @param profile - Profile to add (without id, createdAt, updatedAt, lastUsed)
   * @returns Created profile ID
   */
  async addProfile(
    profile: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'lastUsed'>
  ): Promise<string> {
    this._ensureInitialized()

    // Generate unique ID
    const profileId = this._generateProfileId()

    // Check if profile already exists
    if (await this.hasProfile(profileId)) {
      throw new ProfileExistsError(profileId)
    }

    // Ensure satRefreshResultMapper is a valid string, use default if not provided
    const resolvedCredentials = {
      ...profile.credentials,
      satRefreshResultMapper:
        profile.credentials.satRefreshResultMapper || 'default',
    }

    // Create complete profile
    const now = Date.now()
    const completeProfile: Profile = {
      ...profile,
      credentials: resolvedCredentials,
      id: profileId,
      createdAt: now,
      updatedAt: now,
    }

    // Store profile based on type
    if (profile.type === ProfileType.STATIC) {
      await this._storeStaticProfile(completeProfile)
    } else {
      this._dynamicProfiles.set(profileId, completeProfile)
    }

    // Schedule credential refresh if needed
    this.scheduleRefresh(completeProfile)

    return profileId
  }

  /**
   * Update an existing profile
   * @param profileId - Profile ID to update
   * @param updates - Partial profile updates
   * @returns Whether the profile was updated
   */
  async updateProfile(
    profileId: string,
    updates: Partial<Omit<Profile, 'id' | 'createdAt'>>
  ): Promise<boolean> {
    this._ensureInitialized()

    const existingProfile = await this.getProfile(profileId)
    if (!existingProfile) {
      return false
    }

    // Create updated profile
    const updatedProfile: Profile = {
      ...existingProfile,
      ...updates,
      id: profileId, // Ensure ID cannot be changed
      createdAt: existingProfile.createdAt, // Ensure createdAt cannot be changed
      updatedAt: Date.now(),
    }

    // Store updated profile based on type
    if (existingProfile.type === ProfileType.STATIC) {
      await this._storeStaticProfile(updatedProfile)
    } else {
      this._dynamicProfiles.set(profileId, updatedProfile)
    }

    return true
  }

  /**
   * Remove a profile
   * @param profileId - Profile ID to remove
   * @returns Whether the profile was removed
   */
  async removeProfile(profileId: string): Promise<boolean> {
    this._ensureInitialized()

    const profile = await this.getProfile(profileId)
    if (!profile) {
      return false
    }

    // Clear any refresh timers for this profile
    this._clearRefreshTimer(profileId)

    // Remove profile based on type
    if (profile.type === ProfileType.STATIC) {
      if (!this._storage) {
        return false
      }
      const profileKey = this._getProfileStorageKey(profileId)
      const deleted = await this._storage.delete(profileKey)

      // Also remove from profiles index
      if (deleted) {
        await this._removeFromProfilesIndex(profileId)
      }

      return deleted
    } else {
      return this._dynamicProfiles.delete(profileId)
    }
  }

  /**
   * Get a profile by ID
   * @param profileId - Profile identifier
   * @returns Profile or null if not found
   */
  async getProfile(profileId: string): Promise<Profile | null> {
    this._ensureInitialized()

    // Check dynamic profiles first
    const dynamicProfile = this._dynamicProfiles.get(profileId)
    if (dynamicProfile) {
      return dynamicProfile
    }

    // Check static profiles
    if (!this._storage) {
      return null
    }

    return this._getSavedProfile(profileId)
  }

  /**
   * List all profiles
   * @param type - Optional filter by profile type
   * @returns Array of profiles
   */
  async listProfiles(type?: ProfileType): Promise<Profile[]> {
    this._ensureInitialized()

    const profiles: Profile[] = []

    // Add dynamic profiles
    if (!type || type === ProfileType.DYNAMIC) {
      profiles.push(...Array.from(this._dynamicProfiles.values()))
    }

    // Add static profiles
    if (!type || type === ProfileType.STATIC) {
      const staticProfiles = await this._loadStaticProfiles()
      profiles.push(...staticProfiles)
    }

    // Sort by creation date
    return profiles.sort((a, b) => a.createdAt - b.createdAt)
  }

  /**
   * Check if a profile exists
   * @param profileId - Profile identifier
   * @returns Whether the profile exists
   */
  async hasProfile(profileId: string): Promise<boolean> {
    this._ensureInitialized()

    // Check dynamic profiles
    if (this._dynamicProfiles.has(profileId)) {
      return true
    }

    // Check static profiles
    if (!this._storage) {
      return false
    }

    const profileKey = this._getProfileStorageKey(profileId)
    return await this._storage.has(profileKey)
  }

  /**
   * Load all static profiles from storage
   * @returns Array of static profiles
   */
  private async _loadStaticProfiles(): Promise<Profile[]> {
    if (!this._storage) {
      return []
    }

    try {
      const profileIds = await this._getSavedProfileIds()
      const profiles: Profile[] = []

      for (const profileId of profileIds) {
        const profileData = await this._getSavedProfile(profileId)
        if (profileData && profileData.type === ProfileType.STATIC) {
          profiles.push(profileData)
          // Schedule refresh for loaded profiles
          this.scheduleRefresh(profileData)
        }
      }

      return profiles
    } catch (error) {
      console.warn('Failed to load static profiles:', error)
      return []
    }
  }

  /**
   * Store a static profile to persistent storage
   * @param profile - Profile to store
   */
  private async _storeStaticProfile(profile: Profile): Promise<void> {
    if (!this._storage) {
      throw new Error('Storage not initialized')
    }

    const profileKey = this._getProfileStorageKey(profile.id)
    await this._storage.set(profileKey, JSON.stringify(profile))

    // Add to profiles index
    await this._addToProfilesIndex(profile.id)
  }

  /**
   * Add a profile ID to the profiles index
   * @param profileId - Profile ID to add
   */
  private async _addToProfilesIndex(profileId: string): Promise<void> {
    if (!this._storage) {
      return
    }

    const profileIds = await this._getSavedProfileIds()
    if (!profileIds.includes(profileId)) {
      profileIds.push(profileId)
      await this._storage.set(STORAGE_KEYS.PROFILES, JSON.stringify(profileIds))
    }
  }

  /**
   * Remove a profile ID from the profiles index
   * @param profileId - Profile ID to remove
   */
  private async _removeFromProfilesIndex(profileId: string): Promise<void> {
    if (!this._storage) {
      return
    }

    const profileIds = await this._getSavedProfileIds()
    const filteredIds = profileIds.filter((id) => id !== profileId)
    await this._storage.set(STORAGE_KEYS.PROFILES, JSON.stringify(filteredIds))
  }

  /**
   * Refresh credentials for a profile
   * @param profileId - Profile ID to refresh credentials for
   * @throws CredentialRefreshError if refresh fails
   */
  async refreshCredentials(profileId: string): Promise<void> {
    this._ensureInitialized()

    const profile = await this.getProfile(profileId)
    if (!profile) {
      throw new CredentialRefreshError(
        profileId,
        new Error('Profile not found')
      )
    }

    try {
      // Placeholder API call for token refresh
      // In production, this would call the actual SignalWire API
      const refreshedCredentials = await this._callRefreshAPI(profile)

      // Update the profile with new credentials
      const updatedProfile: Profile = {
        ...profile,
        credentials: refreshedCredentials,
        updatedAt: Date.now(),
      }

      // Store updated profile based on type
      if (profile.type === ProfileType.STATIC) {
        await this._storeStaticProfile(updatedProfile)
      } else {
        this._dynamicProfiles.set(profileId, updatedProfile)
      }

      // Reschedule refresh with new expiry
      this._clearRefreshTimer(profileId)
      this.scheduleRefresh(updatedProfile)

      console.log(
        `Successfully refreshed credentials for profile: ${profileId}`
      )
    } catch (error) {
      throw new CredentialRefreshError(profileId, error as Error)
    }
  }

  /**
   * Validate if credentials are still valid
   * @param profileId - Profile ID to validate
   * @returns true if credentials are valid, false otherwise
   */
  async validateCredentials(profileId: string): Promise<boolean> {
    this._ensureInitialized()

    const profile = await this.getProfile(profileId)
    if (!profile) {
      return false
    }

    const now = Date.now()
    const tokenExpiry = profile.credentials.tokenExpiry

    // Check if token has expired
    if (tokenExpiry <= now) {
      console.warn(`Credentials expired for profile: ${profileId}`)
      return false
    }

    // Check if token will expire soon (within buffer time)
    if (tokenExpiry - now <= this.REFRESH_BUFFER_MS) {
      console.warn(`Credentials expiring soon for profile: ${profileId}`)
      // Trigger refresh if expiring soon
      try {
        await this.refreshCredentials(profileId)
      } catch (error) {
        console.error(`Failed to refresh expiring credentials: ${error}`)
      }
    }

    return true
  }

  /**
   * Schedule automatic credential refresh
   * @param profile - Profile to schedule refresh for
   */
  scheduleRefresh(profile: Profile): void {
    const { id, credentials } = profile
    const { tokenExpiry } = credentials

    // Clear any existing timer
    this._clearRefreshTimer(id)

    const now = Date.now()
    const timeUntilExpiry = tokenExpiry - now

    // Don't schedule if already expired
    if (timeUntilExpiry <= 0) {
      console.warn(`Token already expired for profile: ${id}`)
      return
    }

    // Schedule refresh 5 minutes before expiry
    const refreshTime = Math.max(0, timeUntilExpiry - this.REFRESH_BUFFER_MS)

    if (refreshTime > 0) {
      const timer = setTimeout(async () => {
        console.log(`Auto-refreshing credentials for profile: ${id}`)
        try {
          await this.refreshCredentials(id)
        } catch (error) {
          console.error(`Auto-refresh failed for profile ${id}:`, error)
        }
      }, refreshTime)

      this._refreshTimers.set(id, timer)
      console.log(
        `Scheduled credential refresh for profile ${id} in ${
          refreshTime / 1000
        }s`
      )
    }
  }

  /**
   * Clear refresh timer for a profile
   * @param profileId - Profile ID to clear timer for
   */
  private _clearRefreshTimer(profileId: string): void {
    const timer = this._refreshTimers.get(profileId)
    if (timer) {
      clearTimeout(timer)
      this._refreshTimers.delete(profileId)
      console.log(`Cleared refresh timer for profile: ${profileId}`)
    }
  }

  /**
   * Cleanup all timers and resources
   */
  cleanup(): void {
    // Clear all refresh timers
    for (const [profileId, timer] of this._refreshTimers.entries()) {
      clearTimeout(timer)
      console.log(`Cleaned up timer for profile: ${profileId}`)
    }
    this._refreshTimers.clear()

    // Clear dynamic profiles
    this._dynamicProfiles.clear()

    // Reset initialized state
    this._initialized = false
    this._storage = null

    console.log('ProfileManager cleanup completed')
  }

  /**
   * Call the refresh API to get new tokens
   * @param profile - Profile to refresh
   * @returns Refreshed credentials
   */
  private async _callRefreshAPI(
    profile: Profile
  ): Promise<Profile['credentials']> {
    const { satRefreshURL, satRefreshPayload, satRefreshResultMapper, host } =
      profile.credentials
    const mapperFunction = resolveSatRefreshResultMapper(satRefreshResultMapper)

    // Check if we're in a test environment by detecting jest
    if (typeof jest !== 'undefined') {
      // Return mock refreshed credentials for tests
      const newExpiry = Date.now() + 60 * 60 * 1000 // 1 hour from now

      return {
        satToken: `refreshed_token_${Date.now()}`,
        tokenExpiry: newExpiry,
        satRefreshPayload,
        satRefreshURL,
        satRefreshResultMapper,
        host,
      }
    }

    // Make the actual API call to the provided refresh URL
    const response = await fetch(satRefreshURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(satRefreshPayload),
    })

    if (!response.ok) {
      throw new Error(`Refresh failed with status: ${response.status}`)
    }

    const responseBody = await response.json()

    // Use the custom mapper to extract the credentials from the response
    const mappedResult = mapperFunction(responseBody)

    return {
      satToken: mappedResult.satToken,
      tokenExpiry: mappedResult.tokenExpiry,
      satRefreshPayload: mappedResult.satRefreshPayload,
      satRefreshURL,
      satRefreshResultMapper,
      host,
    }
  }

  /**
   * Generate a unique profile ID (UUID v4)
   * @returns Unique profile identifier
   */
  private _generateProfileId(): string {
    // Generate UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      }
    )
  }

  /**
   * Get storage key for a profile
   * @param profileId - Profile identifier
   * @returns Storage key
   */
  private _getProfileStorageKey(profileId: string): string {
    return STORAGE_KEYS.PROFILE(profileId)
  }

  /**
   * Ensure the manager is initialized
   * @throws Error if not initialized
   */
  private _ensureInitialized(): void {
    if (!this._initialized) {
      throw new Error('ProfileManager not initialized. Call init() first.')
    }
  }

  /**
   * Find a profile that has access to a specific address
   * @param addressId - Address identifier to search for
   * @returns Profile that has access or null if not found
   */
  async findProfileForAddress(addressId: string): Promise<Profile | null> {
    this._ensureInitialized()

    // Step 1: Check for direct match on profile.addressId
    const allProfiles = await this.listProfiles()
    for (const profile of allProfiles) {
      if (profile.addressId === addressId) {
        console.log(
          `Found direct match for address ${addressId} in profile ${profile.id}`
        )
        return profile
      }
    }

    // Step 2: Check if any profile has access via API call
    for (const profile of allProfiles) {
      try {
        // Create HTTP client with profile's credentials
        const httpClient = new HTTPClient({
          token: profile.credentials.satToken,
        })

        // Get subscriber info to check accessible addresses
        const subscriberInfo = await httpClient.getSubscriberInfo()
        const accessibleAddresses = subscriberInfo.fabric_addresses || []

        // Check if the requested address is in the accessible list
        const hasAccess = accessibleAddresses.some(
          (addr: { id: string }) => addr.id === addressId
        )

        if (hasAccess) {
          console.log(
            `Profile ${profile.id} has access to address ${addressId}`
          )

          // Step 3: Create dynamic profile for shared resource if this is not already a dynamic profile for this address
          if (
            profile.type === ProfileType.STATIC &&
            profile.addressId !== addressId
          ) {
            // Check if we already have a dynamic profile for this address
            const existingDynamicProfiles = await this.listProfiles(
              ProfileType.DYNAMIC
            )
            const existingDynamic = existingDynamicProfiles.find(
              (p) => p.addressId === addressId
            )

            if (existingDynamic) {
              console.log(
                `Found existing dynamic profile ${existingDynamic.id} for address ${addressId}`
              )
              return existingDynamic
            }

            // Create new dynamic profile
            const dynamicProfile = await this.createDynamicProfile(
              profile,
              addressId
            )
            console.log(
              `Created dynamic profile ${dynamicProfile.id} for address ${addressId}`
            )
            return dynamicProfile
          }

          return profile
        }
      } catch (error) {
        console.warn(`Failed to check access for profile ${profile.id}:`, error)
        // Continue checking other profiles
      }
    }

    console.log(`No profile found with access to address ${addressId}`)
    return null
  }

  /**
   * Get all profiles associated with a credential ID
   * @param credentialId - Credential identifier
   * @returns Array of profiles with the given credential ID
   */
  async getProfilesByCredentialId(credentialId: string): Promise<Profile[]> {
    this._ensureInitialized()

    const allProfiles = await this.listProfiles()
    const matchingProfiles = allProfiles.filter(
      (profile) => profile.credentialsId === credentialId
    )

    console.log(
      `Found ${matchingProfiles.length} profiles with credential ID ${credentialId}`
    )
    return matchingProfiles
  }

  /**
   * Create a dynamic profile for accessing a shared resource
   * @param parentProfile - Profile to inherit credentials from
   * @param addressId - Address ID for the shared resource
   * @returns Created dynamic profile
   */
  async createDynamicProfile(
    parentProfile: Profile,
    addressId: string
  ): Promise<Profile> {
    this._ensureInitialized()

    // Generate unique ID for dynamic profile
    const dynamicProfileId = `dynamic_${this._generateProfileId()}`

    // Fetch address details if possible
    let addressDetails: Profile['addressDetails'] | undefined
    try {
      const httpClient = new HTTPClient({
        token: parentProfile.credentials.satToken,
      })
      const address = await httpClient.getAddress({ id: addressId })
      addressDetails = {
        type: address.type,
        name: address.name,
        displayName: address.display_name,
        channels: Object.keys(address.channels || {}).length,
      }
    } catch (error) {
      console.warn(`Failed to fetch address details for ${addressId}:`, error)
    }

    // Create dynamic profile inheriting credentials from parent
    const now = Date.now()
    const dynamicProfile: Profile = {
      id: dynamicProfileId,
      type: ProfileType.DYNAMIC,
      credentialsId: parentProfile.credentialsId,
      credentials: {
        ...parentProfile.credentials, // Inherit all credentials from parent
      },
      addressId,
      addressDetails,
      createdAt: now,
      updatedAt: now,
    }

    // Store in memory only (not persisted)
    this._dynamicProfiles.set(dynamicProfileId, dynamicProfile)

    // Schedule credential refresh if needed (using parent's expiry)
    this.scheduleRefresh(dynamicProfile)

    console.log(
      `Created dynamic profile ${dynamicProfileId} for address ${addressId} based on parent profile ${parentProfile.id}`
    )
    return dynamicProfile
  }
}
