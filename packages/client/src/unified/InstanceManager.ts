import { createSignalWireClient } from './SignalWire'
import {
  Profile,
  ManagedInstance,
  InstanceManagerContract,
  InstanceInUseError,
} from './interfaces/clientFactory'

/**
 * Manages the lifecycle of SignalWire client instances.
 * Handles creation, disposal, and tracking of active instances.
 */
export class InstanceManager implements InstanceManagerContract {
  private instances = new Map<string, ManagedInstance>()
  private profileInstances = new Map<string, string>() // profileId -> instanceId
  private accessUpdateIntervals = new Map<string, NodeJS.Timeout>()

  /**
   * Create a new client instance
   * @param profileId - Profile ID to use for the instance
   * @param profile - Profile data
   * @returns Created instance
   */
  async createInstance(
    profileId: string,
    profile: Profile
  ): Promise<ManagedInstance> {
    // Check if an instance already exists for this profile
    const existingInstanceId = this.profileInstances.get(profileId)
    if (existingInstanceId && this.instances.has(existingInstanceId)) {
      const existingInstance = this.instances.get(existingInstanceId)!
      await this.updateInstanceAccess(existingInstanceId)
      return existingInstance
    }

    // Generate unique instance ID
    const instanceId = this.generateInstanceId()

    try {
      // Create SignalWire client instance with params from profile credentials
      // Extract project from satRefreshPayload if needed
      const projectId = profile.credentials.satRefreshPayload?.project_id || 
                       profile.credentials.satRefreshPayload?.projectId ||
                       'default-project'
      
      const clientParams = {
        token: profile.credentials.satToken,
        project: projectId,
        // Additional params can be added here based on profile details
      }
      const client = await createSignalWireClient(clientParams)

      // Create managed instance
      const now = new Date()
      const managedInstance: ManagedInstance = {
        id: instanceId,
        profileId,
        client,
        createdAt: now,
        lastAccessedAt: now,
        accessCount: 1,
        isConnected: true, // Assumes connection is successful if creation succeeds
      }

      // Store instance
      this.instances.set(instanceId, managedInstance)
      this.profileInstances.set(profileId, instanceId)

      // Set up periodic access tracking updates
      this.setupAccessTracking(instanceId)

      return managedInstance
    } catch (error) {
      // Clean up on failure
      this.profileInstances.delete(profileId)
      throw new Error(
        `Failed to create instance for profile ${profileId}: ${error}`
      )
    }
  }

  /**
   * Dispose of a client instance
   * @param instanceId - Instance ID to dispose
   * @param force - Whether to force disposal
   * @returns Whether the instance was disposed
   */
  async disposeInstance(instanceId: string, force = false): Promise<boolean> {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      return false
    }

    // Check if instance is connected and force is not specified
    if (instance.isConnected && !force) {
      throw new InstanceInUseError(instanceId)
    }

    try {
      // Disconnect the client
      await instance.client.disconnect()
    } catch (error) {
      console.warn(
        `Error disconnecting client for instance ${instanceId}:`,
        error
      )
      // Continue with disposal even if disconnect fails
    }

    // Clean up tracking
    this.cleanupAccessTracking(instanceId)

    // Remove from maps
    this.instances.delete(instanceId)
    this.profileInstances.delete(instance.profileId)

    return true
  }

  /**
   * Get an existing instance
   * @param instanceId - Instance identifier
   * @returns Instance or null if not found
   */
  async getInstance(instanceId: string): Promise<ManagedInstance | null> {
    const instance = this.instances.get(instanceId)
    if (instance) {
      await this.updateInstanceAccess(instanceId)
      return instance
    }
    return null
  }

  /**
   * Get instance by profile ID
   * @param profileId - Profile identifier
   * @returns Instance or null if not found
   */
  async getInstanceByProfile(
    profileId: string
  ): Promise<ManagedInstance | null> {
    const instanceId = this.profileInstances.get(profileId)
    if (!instanceId) {
      return null
    }

    return this.getInstance(instanceId)
  }

  /**
   * List all active instances
   * @returns Array of active instances
   */
  async listInstances(): Promise<ManagedInstance[]> {
    return Array.from(this.instances.values()).sort(
      (a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime()
    )
  }

  /**
   * Update instance access tracking
   * @param instanceId - Instance identifier
   */
  async updateInstanceAccess(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      return
    }

    // Update access information
    instance.lastAccessedAt = new Date()
    instance.accessCount += 1

    // Check connection status
    // Note: This is a simplified check. In a real implementation,
    // you might want to add a method to check the actual connection status
    try {
      // Attempt to call a lightweight method to verify connection
      // For now, we'll assume the connection is alive unless proven otherwise
      instance.isConnected = true
    } catch (error) {
      instance.isConnected = false
      console.warn(`Instance ${instanceId} appears to be disconnected:`, error)
    }
  }

  /**
   * Set up periodic access tracking for an instance
   * @param instanceId - Instance identifier
   */
  private setupAccessTracking(instanceId: string): void {
    // Clear any existing interval
    this.cleanupAccessTracking(instanceId)

    // Set up new interval for periodic access updates
    const interval = setInterval(async () => {
      const instance = this.instances.get(instanceId)
      if (!instance) {
        this.cleanupAccessTracking(instanceId)
        return
      }

      // Perform lightweight connection check
      try {
        // This could be expanded to perform actual connectivity checks
        // For now, we'll just update the tracking information
        instance.lastAccessedAt = new Date()
      } catch (error) {
        console.warn(`Periodic check failed for instance ${instanceId}:`, error)
        instance.isConnected = false
      }
    }, 30000) // Check every 30 seconds

    this.accessUpdateIntervals.set(instanceId, interval)
  }

  /**
   * Clean up access tracking for an instance
   * @param instanceId - Instance identifier
   */
  private cleanupAccessTracking(instanceId: string): void {
    const interval = this.accessUpdateIntervals.get(instanceId)
    if (interval) {
      clearInterval(interval)
      this.accessUpdateIntervals.delete(instanceId)
    }
  }

  /**
   * Generate a unique instance ID
   * @returns Unique instance identifier
   */
  private generateInstanceId(): string {
    return `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Clean up all resources when the manager is being destroyed
   */
  async dispose(): Promise<void> {
    // Clean up all intervals
    for (const [instanceId] of this.accessUpdateIntervals) {
      this.cleanupAccessTracking(instanceId)
    }

    // Dispose of all instances
    const disposePromises = Array.from(this.instances.keys()).map(
      (instanceId) => this.disposeInstance(instanceId, true)
    )

    await Promise.allSettled(disposePromises)

    // Clear all maps
    this.instances.clear()
    this.profileInstances.clear()
    this.accessUpdateIntervals.clear()
  }
}
