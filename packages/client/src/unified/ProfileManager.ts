import { SignalWireStorageContract } from './interfaces/storage'
import {
  Profile,
  ProfileType,
  ProfileManagerContract,
  STORAGE_KEYS,
  DEFAULT_CONFIG,
  ProfileExistsError,
  MaxProfilesExceededError,
  CredentialRefreshError,
} from './interfaces/clientFactory'
import { HTTPClient } from './HTTPClient'
import { Address } from './interfaces/address'

/**
 * Manages authentication profiles for SignalWire client instances.
 * Handles both persistent (static) and memory-only (dynamic) profiles.
 */
export class ProfileManager implements ProfileManagerContract {
  private storage: SignalWireStorageContract | null = null
  private dynamicProfiles = new Map<string, Profile>()
  private initialized = false
  private refreshTimers = new Map<string, NodeJS.Timeout>()
  /** Time before expiry to trigger refresh (5 minutes in milliseconds) */
  private readonly REFRESH_BUFFER_MS = 5 * 60 * 1000

  /**
   * Initialize the profile manager with storage
   * @param storage - Storage implementation for persistent profiles
   */
  async init(storage: SignalWireStorageContract): Promise<void> {
    this.storage = storage
    this.initialized = true
    
    // Load any existing static profiles from storage
    await this.loadStaticProfiles()
  }

  /**
   * Add a new profile
   * @param profile - Profile to add (without id, createdAt, updatedAt, lastUsed)
   * @returns Created profile ID
   */
  async addProfile(profile: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'lastUsed'>): Promise<string> {
    this.ensureInitialized()

    // Generate unique ID
    const profileId = this.generateProfileId()
    
    // Check if profile already exists
    if (await this.hasProfile(profileId)) {
      throw new ProfileExistsError(profileId)
    }

    // Check profile limits
    await this.checkProfileLimits(profile.type)

    // Create complete profile
    const now = Date.now()
    const completeProfile: Profile = {
      ...profile,
      id: profileId,
      createdAt: now,
      updatedAt: now,
    }

    // Store profile based on type
    if (profile.type === ProfileType.STATIC) {
      await this.storeStaticProfile(completeProfile)
    } else {
      this.dynamicProfiles.set(profileId, completeProfile)
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
    this.ensureInitialized()

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
      await this.storeStaticProfile(updatedProfile)
    } else {
      this.dynamicProfiles.set(profileId, updatedProfile)
    }

    return true
  }

  /**
   * Remove a profile
   * @param profileId - Profile ID to remove
   * @returns Whether the profile was removed
   */
  async removeProfile(profileId: string): Promise<boolean> {
    this.ensureInitialized()

    const profile = await this.getProfile(profileId)
    if (!profile) {
      return false
    }

    // Clear any refresh timers for this profile
    this.clearRefreshTimer(profileId)

    // Remove profile based on type
    if (profile.type === ProfileType.STATIC) {
      if (!this.storage) {
        return false
      }
      const profileKey = this.getProfileStorageKey(profileId)
      const deleted = await this.storage.delete(profileKey)
      
      // Also remove from profiles index
      if (deleted) {
        await this.removeFromProfilesIndex(profileId)
      }
      
      return deleted
    } else {
      return this.dynamicProfiles.delete(profileId)
    }
  }

  /**
   * Get a profile by ID
   * @param profileId - Profile identifier
   * @returns Profile or null if not found
   */
  async getProfile(profileId: string): Promise<Profile | null> {
    this.ensureInitialized()

    // Check dynamic profiles first
    const dynamicProfile = this.dynamicProfiles.get(profileId)
    if (dynamicProfile) {
      return dynamicProfile
    }

    // Check static profiles
    if (!this.storage) {
      return null
    }

    const profileKey = this.getProfileStorageKey(profileId)
    return await this.storage.get<Profile>(profileKey)
  }

  /**
   * List all profiles
   * @param type - Optional filter by profile type
   * @returns Array of profiles
   */
  async listProfiles(type?: ProfileType): Promise<Profile[]> {
    this.ensureInitialized()

    const profiles: Profile[] = []

    // Add dynamic profiles
    if (!type || type === ProfileType.DYNAMIC) {
      profiles.push(...Array.from(this.dynamicProfiles.values()))
    }

    // Add static profiles
    if (!type || type === ProfileType.STATIC) {
      const staticProfiles = await this.loadStaticProfiles()
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
    this.ensureInitialized()

    // Check dynamic profiles
    if (this.dynamicProfiles.has(profileId)) {
      return true
    }

    // Check static profiles
    if (!this.storage) {
      return false
    }

    const profileKey = this.getProfileStorageKey(profileId)
    return await this.storage.has(profileKey)
  }

  /**
   * Load all static profiles from storage
   * @returns Array of static profiles
   */
  private async loadStaticProfiles(): Promise<Profile[]> {
    if (!this.storage) {
      return []
    }

    try {
      const profileIds = await this.storage.get<string[]>(STORAGE_KEYS.PROFILES) || []
      const profiles: Profile[] = []

      for (const profileId of profileIds) {
        const profileKey = this.getProfileStorageKey(profileId)
        const profile = await this.storage.get<Profile>(profileKey)
        if (profile && profile.type === ProfileType.STATIC) {
          profiles.push(profile)
          // Schedule refresh for loaded profiles
          this.scheduleRefresh(profile)
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
  private async storeStaticProfile(profile: Profile): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized')
    }

    const profileKey = this.getProfileStorageKey(profile.id)
    await this.storage.set(profileKey, profile)
    
    // Add to profiles index
    await this.addToProfilesIndex(profile.id)
  }

  /**
   * Add a profile ID to the profiles index
   * @param profileId - Profile ID to add
   */
  private async addToProfilesIndex(profileId: string): Promise<void> {
    if (!this.storage) {
      return
    }

    const profileIds = await this.storage.get<string[]>(STORAGE_KEYS.PROFILES) || []
    if (!profileIds.includes(profileId)) {
      profileIds.push(profileId)
      await this.storage.set(STORAGE_KEYS.PROFILES, profileIds)
    }
  }

  /**
   * Remove a profile ID from the profiles index
   * @param profileId - Profile ID to remove
   */
  private async removeFromProfilesIndex(profileId: string): Promise<void> {
    if (!this.storage) {
      return
    }

    const profileIds = await this.storage.get<string[]>(STORAGE_KEYS.PROFILES) || []
    const filteredIds = profileIds.filter(id => id !== profileId)
    await this.storage.set(STORAGE_KEYS.PROFILES, filteredIds)
  }

  /**
   * Refresh credentials for a profile
   * @param profileId - Profile ID to refresh credentials for
   * @throws CredentialRefreshError if refresh fails
   */
  async refreshCredentials(profileId: string): Promise<void> {
    this.ensureInitialized()

    const profile = await this.getProfile(profileId)
    if (!profile) {
      throw new CredentialRefreshError(profileId, new Error('Profile not found'))
    }

    try {
      // Placeholder API call for token refresh
      // In production, this would call the actual SignalWire API
      const refreshedCredentials = await this.callRefreshAPI(profile)
      
      // Update the profile with new credentials
      const updatedProfile: Profile = {
        ...profile,
        credentials: refreshedCredentials,
        updatedAt: Date.now(),
      }

      // Store updated profile based on type
      if (profile.type === ProfileType.STATIC) {
        await this.storeStaticProfile(updatedProfile)
      } else {
        this.dynamicProfiles.set(profileId, updatedProfile)
      }

      // Reschedule refresh with new expiry
      this.clearRefreshTimer(profileId)
      this.scheduleRefresh(updatedProfile)

      console.log(`Successfully refreshed credentials for profile: ${profileId}`)
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
    this.ensureInitialized()

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
    this.clearRefreshTimer(id)

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

      this.refreshTimers.set(id, timer)
      console.log(`Scheduled credential refresh for profile ${id} in ${refreshTime / 1000}s`)
    }
  }

  /**
   * Clear refresh timer for a profile
   * @param profileId - Profile ID to clear timer for
   */
  private clearRefreshTimer(profileId: string): void {
    const timer = this.refreshTimers.get(profileId)
    if (timer) {
      clearTimeout(timer)
      this.refreshTimers.delete(profileId)
      console.log(`Cleared refresh timer for profile: ${profileId}`)
    }
  }

  /**
   * Cleanup all timers and resources
   */
  cleanup(): void {
    // Clear all refresh timers
    for (const [profileId, timer] of this.refreshTimers.entries()) {
      clearTimeout(timer)
      console.log(`Cleaned up timer for profile: ${profileId}`)
    }
    this.refreshTimers.clear()
    
    // Clear dynamic profiles
    this.dynamicProfiles.clear()
    
    // Reset initialized state
    this.initialized = false
    this.storage = null
    
    console.log('ProfileManager cleanup completed')
  }

  /**
   * Placeholder for actual API call to refresh tokens
   * @param profile - Profile to refresh
   * @returns Refreshed credentials
   */
  private async callRefreshAPI(profile: Profile): Promise<Profile['credentials']> {
    // This is a placeholder implementation
    // In production, this would make an actual API call to SignalWire
    // to exchange the refresh token for new access tokens
    
    const { satRefreshToken, projectId, spaceId } = profile.credentials
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // TODO: Replace with actual API call
    // Example:
    // const response = await fetch('https://api.signalwire.com/auth/refresh', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     refresh_token: satRefreshToken,
    //     project_id: projectId,
    //     space_id: spaceId,
    //   }),
    // })
    // const data = await response.json()
    
    // For now, return mock refreshed credentials
    const newExpiry = Date.now() + (60 * 60 * 1000) // 1 hour from now
    
    return {
      satToken: `refreshed_token_${Date.now()}`, // Mock new token
      satRefreshToken: satRefreshToken, // Refresh token typically stays the same
      tokenExpiry: newExpiry,
      projectId,
      spaceId,
    }
  }

  /**
   * Check if adding a profile would exceed limits
   * @param type - Profile type to check
   */
  private async checkProfileLimits(type: ProfileType): Promise<void> {
    const existingProfiles = await this.listProfiles(type)
    const maxProfiles = type === ProfileType.STATIC 
      ? DEFAULT_CONFIG.MAX_STATIC_PROFILES 
      : DEFAULT_CONFIG.MAX_DYNAMIC_PROFILES

    if (existingProfiles.length >= maxProfiles) {
      throw new MaxProfilesExceededError(type, maxProfiles)
    }
  }

  /**
   * Generate a unique profile ID (UUID v4)
   * @returns Unique profile identifier
   */
  private generateProfileId(): string {
    // Generate UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Get storage key for a profile
   * @param profileId - Profile identifier
   * @returns Storage key
   */
  private getProfileStorageKey(profileId: string): string {
    return STORAGE_KEYS.PROFILE(profileId)
  }

  /**
   * Ensure the manager is initialized
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('ProfileManager not initialized. Call init() first.')
    }
  }

  /**
   * Find a profile that has access to a specific address
   * @param addressId - Address identifier to search for
   * @returns Profile that has access or null if not found
   */
  async findProfileForAddress(addressId: string): Promise<Profile | null> {
    this.ensureInitialized()

    // Step 1: Check for direct match on profile.addressId
    const allProfiles = await this.listProfiles()
    for (const profile of allProfiles) {
      if (profile.addressId === addressId) {
        console.log(`Found direct match for address ${addressId} in profile ${profile.id}`)
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
        const hasAccess = accessibleAddresses.some((addr: Address) => addr.id === addressId)
        
        if (hasAccess) {
          console.log(`Profile ${profile.id} has access to address ${addressId}`)
          
          // Step 3: Create dynamic profile for shared resource if this is not already a dynamic profile for this address
          if (profile.type === ProfileType.STATIC && profile.addressId !== addressId) {
            // Check if we already have a dynamic profile for this address
            const existingDynamicProfiles = await this.listProfiles(ProfileType.DYNAMIC)
            const existingDynamic = existingDynamicProfiles.find(p => p.addressId === addressId)
            
            if (existingDynamic) {
              console.log(`Found existing dynamic profile ${existingDynamic.id} for address ${addressId}`)
              return existingDynamic
            }
            
            // Create new dynamic profile
            const dynamicProfile = await this.createDynamicProfile(profile, addressId)
            console.log(`Created dynamic profile ${dynamicProfile.id} for address ${addressId}`)
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
    this.ensureInitialized()

    const allProfiles = await this.listProfiles()
    const matchingProfiles = allProfiles.filter(
      profile => profile.credentialsId === credentialId
    )

    console.log(`Found ${matchingProfiles.length} profiles with credential ID ${credentialId}`)
    return matchingProfiles
  }

  /**
   * Create a dynamic profile for accessing a shared resource
   * @param parentProfile - Profile to inherit credentials from
   * @param addressId - Address ID for the shared resource
   * @returns Created dynamic profile
   */
  async createDynamicProfile(parentProfile: Profile, addressId: string): Promise<Profile> {
    this.ensureInitialized()

    // Generate unique ID for dynamic profile
    const dynamicProfileId = `dynamic_${this.generateProfileId()}`

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
    this.dynamicProfiles.set(dynamicProfileId, dynamicProfile)

    // Schedule credential refresh if needed (using parent's expiry)
    this.scheduleRefresh(dynamicProfile)

    console.log(`Created dynamic profile ${dynamicProfileId} for address ${addressId} based on parent profile ${parentProfile.id}`)
    return dynamicProfile
  }
}