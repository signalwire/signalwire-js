/**
 * Device Manager
 * Core class for managing device preferences and state in the SignalWire SDK
 */

import { EventEmitter, getLogger } from '@signalwire/core'
import type { BaseRoomSessionConnection } from '../BaseRoomSession'
import { LocalStorageAdapter } from './DevicePreferenceStorage'
import type {
  DeviceType,
  DevicePreference,
  DeviceState,
  DeviceOptions,
  DevicePreferenceConfig,
  DeviceManagerEvents,
  DeviceManagerAPI,
  RecoveryStrategy,
  RecoveryResult,
  DevicePreferenceStorage
} from './types'

/**
 * DeviceManager class
 * Manages device preferences, state, and recovery for WebRTC media devices
 */
export class DeviceManager extends EventEmitter<DeviceManagerEvents> implements DeviceManagerAPI {
  private readonly logger = getLogger()
  private readonly roomSession: BaseRoomSessionConnection
  private readonly config: DevicePreferenceConfig
  private readonly storageAdapter: DevicePreferenceStorage

  /**
   * Device state tracking
   */
  private readonly deviceStates = new Map<DeviceType, DeviceState>()

  /**
   * Device preferences tracking
   */
  private readonly devicePreferences = new Map<DeviceType, DevicePreference[]>()

  /**
   * Monitoring state
   */
  private monitoringInterval: NodeJS.Timeout | null = null
  private isMonitoring = false
  private lastKnownDevices: MediaDeviceInfo[] = []

  /**
   * Recovery state tracking
   */
  private readonly recoveryAttempts = new Map<DeviceType, number>()
  private readonly recoveryInProgress = new Map<DeviceType, boolean>()

  /**
   * Default configuration
   */
  private static readonly DEFAULT_CONFIG: Required<DeviceOptions> = {
    autoRecover: true,
    recoveryStrategy: {
      type: 'preference',
      priorityOrder: ['preference', 'fallback', 'any'],
      notifyOnRecovery: true,
      retry: {
        maxAttempts: 3,
        delay: 1000,
        backoff: 'exponential'
      }
    },
    persistPreferences: true,
    storageKeyPrefix: 'sw_device_',
    maxRecoveryAttempts: 3,
    recoveryDelay: 1000,
    enableMonitoring: true,
    monitoringInterval: 5000
  }

  /**
   * Create a new DeviceManager instance
   * @param roomSession - The room session to manage devices for
   * @param config - Configuration options
   */
  constructor(roomSession: BaseRoomSessionConnection, config?: DevicePreferenceConfig) {
    super()
    
    this.roomSession = roomSession
    this.config = this.mergeConfig(config)
    this.storageAdapter = this.config.storageAdapter || new LocalStorageAdapter(
      this.config.global?.storageKeyPrefix || DeviceManager.DEFAULT_CONFIG.storageKeyPrefix
    )

    this.logger.debug('[DeviceManager] Initialized with config:', this.config)

    // Initialize device states
    this.initializeDeviceStates()

    // Load preferences if persistence is enabled
    if (this.shouldPersistPreferences()) {
      this.loadAllPreferences().catch(error => {
        this.logger.error('[DeviceManager] Failed to load preferences:', error)
      })
    }

    // Start monitoring if enabled
    if (this.shouldEnableMonitoring()) {
      this.startMonitoring()
    }
  }

  /**
   * Set camera device with optional preference
   * @param deviceId - Device ID to set
   * @param preference - Optional preference configuration
   */
  async setCamera(deviceId: string, preference?: Partial<DevicePreference>): Promise<void> {
    await this.setDevice('camera', deviceId, preference)
  }

  /**
   * Set microphone device with optional preference
   * @param deviceId - Device ID to set
   * @param preference - Optional preference configuration
   */
  async setMicrophone(deviceId: string, preference?: Partial<DevicePreference>): Promise<void> {
    await this.setDevice('microphone', deviceId, preference)
  }

  /**
   * Set speaker device with optional preference
   * @param deviceId - Device ID to set
   * @param preference - Optional preference configuration
   */
  async setSpeaker(deviceId: string, preference?: Partial<DevicePreference>): Promise<void> {
    await this.setDevice('speaker', deviceId, preference)
  }

  /**
   * Get current device state
   * @param type - Device type
   * @returns Current device state or undefined
   */
  getDeviceState(type: DeviceType): DeviceState | undefined {
    return this.deviceStates.get(type)
  }

  /**
   * Get device preferences
   * @param type - Device type
   * @returns Array of device preferences
   */
  getPreferences(type: DeviceType): DevicePreference[] {
    return this.devicePreferences.get(type) || []
  }

  /**
   * Clear device preferences
   * @param type - Optional device type to clear (clears all if not specified)
   */
  async clearPreferences(type?: DeviceType): Promise<void> {
    const typesToClear = type ? [type] : Array.from(this.devicePreferences.keys())

    for (const deviceType of typesToClear) {
      this.devicePreferences.delete(deviceType)
      
      if (this.shouldPersistPreferences()) {
        await this.storageAdapter.clear(deviceType)
      }
    }

    this.emit('preferences.cleared', { types: typesToClear })
    this.logger.debug('[DeviceManager] Cleared preferences for:', typesToClear)
  }

  /**
   * Recover device to preferred or available
   * @param type - Device type to recover
   * @returns Recovery result
   */
  async recoverDevice(type: DeviceType): Promise<RecoveryResult> {
    // Check if recovery is already in progress
    if (this.recoveryInProgress.get(type)) {
      this.logger.debug(`[DeviceManager] Recovery already in progress for ${type}`)
      return {
        success: false,
        error: new Error('Recovery already in progress')
      }
    }

    this.recoveryInProgress.set(type, true)
    const startTime = Date.now()
    const currentState = this.deviceStates.get(type)
    
    this.emit('device.recovery.started', {
      type,
      currentDeviceId: currentState?.deviceId || null,
      reason: 'Manual recovery initiated'
    })

    try {
      const strategy = this.getRecoveryStrategy(type)
      const result = await this.executeRecoveryStrategy(type, strategy)

      if (result.success) {
        this.emit('device.recovery.completed', { type, result })
        this.recoveryAttempts.delete(type)
      } else {
        const attempts = (this.recoveryAttempts.get(type) || 0) + 1
        this.recoveryAttempts.set(type, attempts)
        
        this.emit('device.recovery.failed', {
          type,
          error: result.error || new Error('Recovery failed'),
          attempts
        })
      }

      return {
        ...result,
        duration: Date.now() - startTime
      }
    } finally {
      this.recoveryInProgress.set(type, false)
    }
  }

  /**
   * Start device monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      this.logger.debug('[DeviceManager] Monitoring already active')
      return
    }

    const interval = this.config.global?.monitoringInterval || 
                    DeviceManager.DEFAULT_CONFIG.monitoringInterval

    this.logger.debug(`[DeviceManager] Starting device monitoring with interval: ${interval}ms`)
    
    // Initial device scan
    this.scanDevices()

    // Set up periodic scanning
    this.monitoringInterval = setInterval(() => {
      this.scanDevices()
    }, interval)

    this.isMonitoring = true
  }

  /**
   * Stop device monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    this.isMonitoring = false
    this.logger.debug('[DeviceManager] Stopped device monitoring')
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopMonitoring()
    this.deviceStates.clear()
    this.devicePreferences.clear()
    this.recoveryAttempts.clear()
    this.recoveryInProgress.clear()
    this.removeAllListeners()
    this.logger.debug('[DeviceManager] Destroyed')
  }

  /**
   * Set a device with optional preference
   * @param type - Device type
   * @param deviceId - Device ID
   * @param preference - Optional preference configuration
   */
  private async setDevice(
    type: DeviceType,
    deviceId: string,
    preference?: Partial<DevicePreference>
  ): Promise<void> {
    this.logger.debug(`[DeviceManager] Setting ${type} to ${deviceId}`)

    // Get device info
    const deviceInfo = await this.getDeviceInfo(type, deviceId)
    if (!deviceInfo) {
      throw new Error(`Device ${deviceId} not found`)
    }

    // Update device state
    const previousState = this.deviceStates.get(type)
    const newState: DeviceState = {
      deviceId,
      isAvailable: true,
      isActive: true,
      label: deviceInfo.label,
      groupId: deviceInfo.groupId,
      error: null,
      lastUpdated: Date.now()
    }

    this.deviceStates.set(type, newState)

    // Emit state change event
    this.emit('device.state.changed', {
      type,
      state: newState,
      previous: previousState
    })

    // Update preferences if provided
    if (preference) {
      await this.updatePreference(type, deviceId, deviceInfo.label, preference)
    }

    // Apply the device to the room session
    await this.applyDevice(type, deviceId)
  }

  /**
   * Update device preference
   * @param type - Device type
   * @param deviceId - Device ID
   * @param label - Device label
   * @param preference - Preference configuration
   */
  private async updatePreference(
    type: DeviceType,
    deviceId: string,
    label: string,
    preference: Partial<DevicePreference>
  ): Promise<void> {
    const preferences = this.getPreferences(type)
    const existingIndex = preferences.findIndex(p => p.deviceId === deviceId)
    
    const newPreference: DevicePreference = {
      deviceId,
      label,
      priority: preference.priority ?? (existingIndex >= 0 ? preferences[existingIndex].priority : preferences.length + 1),
      isFallback: preference.isFallback,
      metadata: preference.metadata
    }

    const previous = existingIndex >= 0 ? preferences[existingIndex] : undefined

    if (existingIndex >= 0) {
      preferences[existingIndex] = newPreference
    } else {
      preferences.push(newPreference)
    }

    // Sort by priority
    preferences.sort((a, b) => a.priority - b.priority)

    this.devicePreferences.set(type, preferences)

    // Persist if enabled
    if (this.shouldPersistPreferences()) {
      await this.storageAdapter.save(type, preferences)
      this.emit('preferences.saved', {
        preferences: Object.fromEntries(this.devicePreferences) as Record<DeviceType, DevicePreference[]>
      })
    }

    this.emit('device.preference.updated', {
      type,
      preference: newPreference,
      previous
    })
  }

  /**
   * Apply device to the room session
   * @param type - Device type
   * @param deviceId - Device ID
   */
  private async applyDevice(type: DeviceType, deviceId: string): Promise<void> {
    try {
      switch (type) {
        case 'camera':
          // updateCamera expects MediaTrackConstraints
          await this.roomSession.updateCamera({ deviceId })
          break
        case 'microphone':
          // updateMicrophone expects MediaTrackConstraints
          await this.roomSession.updateMicrophone({ deviceId })
          break
        case 'speaker':
          // updateSpeaker expects { deviceId: string }
          await this.roomSession.updateSpeaker({ deviceId })
          break
      }
      this.logger.debug(`[DeviceManager] Applied ${type} device: ${deviceId}`)
    } catch (error) {
      this.logger.error(`[DeviceManager] Failed to apply ${type} device:`, error)
      throw error
    }
  }

  /**
   * Get device information
   * @param type - Device type
   * @param deviceId - Device ID
   * @returns MediaDeviceInfo or null
   */
  private async getDeviceInfo(type: DeviceType, deviceId: string): Promise<MediaDeviceInfo | null> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const kind = this.getMediaDeviceKind(type)
    
    return devices.find(device => 
      device.deviceId === deviceId && device.kind === kind
    ) || null
  }

  /**
   * Get MediaDeviceKind for DeviceType
   * @param type - Device type
   * @returns MediaDeviceKind string
   */
  private getMediaDeviceKind(type: DeviceType): MediaDeviceKind {
    switch (type) {
      case 'camera':
        return 'videoinput'
      case 'microphone':
        return 'audioinput'
      case 'speaker':
        return 'audiooutput'
    }
  }

  /**
   * Initialize device states
   */
  private initializeDeviceStates(): void {
    const types: DeviceType[] = ['camera', 'microphone', 'speaker']
    
    for (const type of types) {
      this.deviceStates.set(type, {
        deviceId: null,
        isAvailable: false,
        isActive: false,
        error: null,
        lastUpdated: Date.now()
      })
    }
  }

  /**
   * Load all preferences from storage
   */
  private async loadAllPreferences(): Promise<void> {
    const types: DeviceType[] = ['camera', 'microphone', 'speaker']
    const loadedPreferences: Record<string, DevicePreference[]> = {}

    for (const type of types) {
      const preferences = await this.storageAdapter.load(type)
      if (preferences) {
        this.devicePreferences.set(type, preferences)
        loadedPreferences[type] = preferences
      }
    }

    if (Object.keys(loadedPreferences).length > 0) {
      this.emit('preferences.loaded', {
        preferences: loadedPreferences as Record<DeviceType, DevicePreference[]>
      })
      this.logger.debug('[DeviceManager] Loaded preferences:', loadedPreferences)
    }
  }

  /**
   * Scan for device changes
   */
  private async scanDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const added: MediaDeviceInfo[] = []
      const removed: MediaDeviceInfo[] = []

      // Find added devices
      for (const device of devices) {
        if (!this.lastKnownDevices.find(d => d.deviceId === device.deviceId)) {
          added.push(device)
        }
      }

      // Find removed devices
      for (const device of this.lastKnownDevices) {
        if (!devices.find(d => d.deviceId === device.deviceId)) {
          removed.push(device)
        }
      }

      // Update last known devices
      this.lastKnownDevices = devices

      // Emit change event if there are changes
      if (added.length > 0 || removed.length > 0) {
        this.emit('device.monitor.change', { added, removed })
        this.logger.debug('[DeviceManager] Device changes detected:', { added, removed })

        // Check if current devices are still available
        await this.checkCurrentDeviceAvailability(removed)
      }
    } catch (error) {
      this.logger.error('[DeviceManager] Failed to scan devices:', error)
    }
  }

  /**
   * Check if current devices are still available
   * @param removedDevices - List of removed devices
   */
  private async checkCurrentDeviceAvailability(removedDevices: MediaDeviceInfo[]): Promise<void> {
    const types: DeviceType[] = ['camera', 'microphone', 'speaker']

    for (const type of types) {
      const state = this.deviceStates.get(type)
      if (!state || !state.deviceId) continue

      const kind = this.getMediaDeviceKind(type)
      const wasRemoved = removedDevices.find(d => 
        d.deviceId === state.deviceId && d.kind === kind
      )

      if (wasRemoved) {
        // Update state to unavailable
        state.isAvailable = false
        state.error = new Error('Device disconnected')
        state.lastUpdated = Date.now()
        this.deviceStates.set(type, state)

        // Emit unavailable event
        this.emit('device.unavailable', {
          type,
          deviceId: state.deviceId,
          reason: 'Device disconnected'
        })

        // Trigger recovery if enabled
        if (this.shouldAutoRecover(type)) {
          this.logger.debug(`[DeviceManager] Triggering auto-recovery for ${type}`)
          this.recoverDevice(type).catch(error => {
            this.logger.error(`[DeviceManager] Auto-recovery failed for ${type}:`, error)
          })
        }
      }
    }
  }

  /**
   * Get recovery strategy for device type
   * @param type - Device type
   * @returns Recovery strategy
   */
  private getRecoveryStrategy(type: DeviceType): RecoveryStrategy {
    const deviceConfig = this.config[type]
    const globalConfig = this.config.global

    return deviceConfig?.recoveryStrategy || 
           globalConfig?.recoveryStrategy || 
           DeviceManager.DEFAULT_CONFIG.recoveryStrategy
  }

  /**
   * Execute recovery strategy
   * @param type - Device type
   * @param strategy - Recovery strategy
   * @returns Recovery result
   */
  private async executeRecoveryStrategy(
    type: DeviceType,
    strategy: RecoveryStrategy
  ): Promise<RecoveryResult> {
    const currentState = this.deviceStates.get(type)
    const preferences = this.getPreferences(type)

    // Custom handler
    if (strategy.type === 'custom' && strategy.customHandler) {
      return await strategy.customHandler(type, currentState!, preferences)
    }

    // Standard recovery flow
    const priorityOrder = strategy.priorityOrder || ['preference', 'fallback', 'any']
    
    for (const method of priorityOrder) {
      const result = await this.tryRecoveryMethod(type, method, preferences)
      if (result.success) {
        return { ...result, method }
      }
    }

    return {
      success: false,
      error: new Error('All recovery methods failed')
    }
  }

  /**
   * Try a specific recovery method
   * @param type - Device type
   * @param method - Recovery method
   * @param preferences - Device preferences
   * @returns Recovery result
   */
  private async tryRecoveryMethod(
    type: DeviceType,
    method: 'preference' | 'fallback' | 'any',
    preferences: DevicePreference[]
  ): Promise<RecoveryResult> {
    try {
      let deviceId: string | null = null

      switch (method) {
        case 'preference':
          // Try preferences in priority order
          for (const pref of preferences) {
            if (!pref.isFallback && await this.isDeviceAvailable(type, pref.deviceId)) {
              deviceId = pref.deviceId
              break
            }
          }
          break

        case 'fallback':
          // Try fallback devices
          for (const pref of preferences) {
            if (pref.isFallback && await this.isDeviceAvailable(type, pref.deviceId)) {
              deviceId = pref.deviceId
              break
            }
          }
          break

        case 'any':
          // Try any available device
          const devices = await navigator.mediaDevices.enumerateDevices()
          const kind = this.getMediaDeviceKind(type)
          const availableDevice = devices.find(d => d.kind === kind && d.deviceId)
          deviceId = availableDevice?.deviceId || null
          break
      }

      if (deviceId) {
        await this.applyDevice(type, deviceId)
        
        // Update state
        const deviceInfo = await this.getDeviceInfo(type, deviceId)
        this.deviceStates.set(type, {
          deviceId,
          isAvailable: true,
          isActive: true,
          label: deviceInfo?.label,
          groupId: deviceInfo?.groupId,
          error: null,
          lastUpdated: Date.now()
        })

        return { success: true, deviceId }
      }

      return { success: false }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error(String(error))
      }
    }
  }

  /**
   * Check if a device is available
   * @param type - Device type
   * @param deviceId - Device ID
   * @returns true if device is available
   */
  private async isDeviceAvailable(type: DeviceType, deviceId: string): Promise<boolean> {
    const deviceInfo = await this.getDeviceInfo(type, deviceId)
    return deviceInfo !== null
  }

  /**
   * Merge configuration with defaults
   * @param config - User configuration
   * @returns Merged configuration
   */
  private mergeConfig(config?: DevicePreferenceConfig): DevicePreferenceConfig {
    return {
      ...config,
      global: {
        ...DeviceManager.DEFAULT_CONFIG,
        ...config?.global
      }
    }
  }

  /**
   * Check if preferences should be persisted
   * @returns true if persistence is enabled
   */
  private shouldPersistPreferences(): boolean {
    return this.config.global?.persistPreferences !== false
  }

  /**
   * Check if monitoring should be enabled
   * @returns true if monitoring is enabled
   */
  private shouldEnableMonitoring(): boolean {
    return this.config.global?.enableMonitoring !== false
  }

  /**
   * Check if auto-recovery is enabled for device type
   * @param type - Device type
   * @returns true if auto-recovery is enabled
   */
  private shouldAutoRecover(type: DeviceType): boolean {
    const deviceConfig = this.config[type]
    const globalConfig = this.config.global
    
    return deviceConfig?.autoRecover !== false && 
           globalConfig?.autoRecover !== false
  }
}