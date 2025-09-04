import { createSignalWireClient } from './SignalWire'
import {
  Profile,
  ManagedInstance,
  InstanceManagerContract,
  GetClientParamsOptions,
} from './interfaces/clientFactory'

/**
 * Manages the lifecycle of SignalWire client instances.
 * Handles creation, disposal, and tracking of active instances.
 */
export class InstanceManager implements InstanceManagerContract {
  private instances = new Map<string, ManagedInstance>()

  /**
   * Create a new client instance
   * @param profileId - Profile ID to use for the instance
   * @param profile - Profile data
   * @returns Created instance
   */
  async createInstance(
    profile: Profile,
    options: GetClientParamsOptions
  ): Promise<ManagedInstance> {
    // instance ID should be same as profile Id
    const instanceId = profile.id

    // Check if an instance already exists for this profile
    if (this.instances.has(instanceId)) {
      const existingInstance = await this.getInstance(instanceId)
      return existingInstance!
    }

    try {
      const clientParams = {
        token: profile.credentials.satToken,
        host: profile.credentials.host,
        profileId: profile.id,
        shouldDisconnect: () => {
          const managed = this.instances.get(instanceId)
          if ((managed?.usageCount ?? 0) > 1) {
            // prevent the WebSocket disconnection if the instance is used by other
            return false
          }
          this.disposeInstance(managed!.id)
          return true
        },
        ...options,
      }
      const client = await createSignalWireClient(clientParams)

      // Create managed instance
      const now = new Date()
      const managedInstance: ManagedInstance = {
        id: instanceId,
        profileId: profile.id,
        client,
        createdAt: now,
        lastAccessedAt: now,
        usageCount: 0,
      }

      // Store instance
      this.instances.set(instanceId, managedInstance)

      // Access tracking setup removed - not implemented yet

      return managedInstance
    } catch (error) {
      throw new Error(
        `Failed to create instance for profile ${profile.id}: ${error}`
      )
    }
  }

  /**
   * Dispose of a client instance
   * @param instanceId - Instance ID to dispose
   * @returns Whether the instance was disposed
   */
  async disposeInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      return
    }

    // Access tracking cleanup removed - not implemented yet

    // Remove from maps
    this.instances.delete(instanceId)

    return
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
    return this.getInstance(profileId)
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
    instance.usageCount += 1
  }

  /**
   * Clean up all resources when the manager is being destroyed
   */
  async dispose(): Promise<void> {
    // Dispose of all instances
    const disposePromises = Array.from(this.instances.keys()).map(
      (instanceId) => this.disposeInstance(instanceId)
    )

    await Promise.allSettled(disposePromises)

    // Clear all maps
    this.instances.clear()
  }
}
