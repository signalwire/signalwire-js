/**
 * Device Preference Management Type Definitions
 * Core types for managing device preferences in the SignalWire SDK
 */

/**
 * Type of media device
 */
export type DeviceType = 'camera' | 'microphone' | 'speaker'

/**
 * Device preference configuration
 */
export interface DevicePreference {
  /**
   * Unique device identifier
   */
  deviceId: string

  /**
   * Human-readable device label
   */
  label: string

  /**
   * Priority level for this device (1 = highest priority)
   */
  priority: number

  /**
   * Whether this device should be used as fallback
   */
  isFallback?: boolean

  /**
   * Custom metadata for the device
   */
  metadata?: Record<string, unknown>
}

/**
 * Current device state
 */
export interface DeviceState {
  /**
   * Currently active device ID
   */
  deviceId: string | null

  /**
   * Whether device is available/connected
   */
  isAvailable: boolean

  /**
   * Whether device is currently in use
   */
  isActive: boolean

  /**
   * Device label if available
   */
  label?: string

  /**
   * Group ID for related devices (e.g., same physical device)
   */
  groupId?: string

  /**
   * Error state if any
   */
  error?: Error | null

  /**
   * Last update timestamp
   */
  lastUpdated: number
}

/**
 * Device options for configuration
 */
export interface DeviceOptions {
  /**
   * Enable automatic device recovery
   */
  autoRecover?: boolean

  /**
   * Recovery strategy to use
   */
  recoveryStrategy?: RecoveryStrategy

  /**
   * Enable preference persistence
   */
  persistPreferences?: boolean

  /**
   * Storage key prefix for preferences
   */
  storageKeyPrefix?: string

  /**
   * Maximum retry attempts for recovery
   */
  maxRecoveryAttempts?: number

  /**
   * Delay between recovery attempts in ms
   */
  recoveryDelay?: number

  /**
   * Enable device monitoring
   */
  enableMonitoring?: boolean

  /**
   * Monitoring interval in ms
   */
  monitoringInterval?: number
}

/**
 * Recovery strategy configuration
 */
export interface RecoveryStrategy {
  /**
   * Strategy type
   */
  type: 'automatic' | 'manual' | 'preference' | 'custom'

  /**
   * Priority order for recovery attempts
   */
  priorityOrder?: Array<'preference' | 'fallback' | 'any'>

  /**
   * Custom recovery function
   */
  customHandler?: (
    deviceType: DeviceType,
    currentState: DeviceState,
    preferences: DevicePreference[]
  ) => Promise<RecoveryResult>

  /**
   * Whether to notify on recovery
   */
  notifyOnRecovery?: boolean

  /**
   * Retry configuration
   */
  retry?: {
    maxAttempts: number
    delay: number
    backoff?: 'linear' | 'exponential'
  }
}

/**
 * Result of a recovery attempt
 */
export interface RecoveryResult {
  /**
   * Whether recovery was successful
   */
  success: boolean

  /**
   * New device ID if recovery succeeded
   */
  deviceId?: string

  /**
   * Error if recovery failed
   */
  error?: Error

  /**
   * Recovery method used
   */
  method?: 'preference' | 'fallback' | 'any' | 'custom'

  /**
   * Number of attempts made
   */
  attempts?: number

  /**
   * Time taken for recovery in ms
   */
  duration?: number
}

/**
 * Device preference configuration
 */
export interface DevicePreferenceConfig {
  /**
   * Device-specific options
   */
  camera?: DeviceOptions
  microphone?: DeviceOptions
  speaker?: DeviceOptions

  /**
   * Global options applied to all devices
   */
  global?: DeviceOptions

  /**
   * Storage adapter for preferences
   */
  storageAdapter?: DevicePreferenceStorage

  /**
   * Enable debug logging
   */
  debug?: boolean
}

/**
 * Device change event details
 */
export interface DeviceChangeEvent {
  /**
   * Type of change that occurred
   */
  type: 'added' | 'removed' | 'changed'

  /**
   * Device that was added, removed, or changed
   */
  device: MediaDeviceInfo

  /**
   * Previous device info for 'changed' events
   */
  previousDevice?: MediaDeviceInfo

  /**
   * Timestamp when the change was detected
   */
  timestamp: number
}

/**
 * Collection of device changes detected in a single scan
 */
export interface DeviceChanges {
  /**
   * Devices that were added
   */
  added: MediaDeviceInfo[]

  /**
   * Devices that were removed
   */
  removed: MediaDeviceInfo[]

  /**
   * Devices that were changed (label or other properties)
   */
  changed: Array<{
    current: MediaDeviceInfo
    previous: MediaDeviceInfo
  }>

  /**
   * Timestamp when changes were detected
   */
  timestamp: number
}

/**
 * Events emitted by DeviceMonitor
 */
export interface DeviceMonitorEvents {
  /**
   * Emitted when device changes are detected
   */
  'device.change': DeviceChanges

  /**
   * Emitted when a specific device is added
   */
  'device.added': DeviceChangeEvent

  /**
   * Emitted when a specific device is removed
   */
  'device.removed': DeviceChangeEvent

  /**
   * Emitted when a specific device is changed
   */
  'device.changed': DeviceChangeEvent

  /**
   * Emitted when monitoring starts
   */
  'monitor.started': {
    pollingInterval: number
    nativeEventsSupported: boolean
  }

  /**
   * Emitted when monitoring stops
   */
  'monitor.stopped': {
    reason?: string
  }

  /**
   * Emitted when device enumeration fails
   */
  'monitor.error': {
    error: Error
    timestamp: number
  }
}

/**
 * Events emitted by DeviceManager
 */
export interface DeviceManagerEvents {
  /**
   * Emitted when a device preference is updated
   */
  'device.preference.updated': {
    type: DeviceType
    preference: DevicePreference
    previous?: DevicePreference
  }

  /**
   * Emitted when device state changes
   */
  'device.state.changed': {
    type: DeviceType
    state: DeviceState
    previous?: DeviceState
  }

  /**
   * Emitted when a device becomes unavailable
   */
  'device.unavailable': {
    type: DeviceType
    deviceId: string
    reason?: string
  }

  /**
   * Emitted when device recovery is initiated
   */
  'device.recovery.started': {
    type: DeviceType
    currentDeviceId: string | null
    reason: string
  }

  /**
   * Emitted when device recovery completes
   */
  'device.recovery.completed': {
    type: DeviceType
    result: RecoveryResult
  }

  /**
   * Emitted when device recovery fails
   */
  'device.recovery.failed': {
    type: DeviceType
    error: Error
    attempts: number
  }

  /**
   * Emitted when preferences are loaded from storage
   */
  'preferences.loaded': {
    preferences: Record<DeviceType, DevicePreference[]>
  }

  /**
   * Emitted when preferences are saved to storage
   */
  'preferences.saved': {
    preferences: Record<DeviceType, DevicePreference[]>
  }

  /**
   * Emitted when preferences are cleared
   */
  'preferences.cleared': {
    types?: DeviceType[]
  }

  /**
   * Emitted when device monitoring detects changes
   */
  'device.monitor.change': {
    added: MediaDeviceInfo[]
    removed: MediaDeviceInfo[]
  }

  /**
   * Emitted when the device monitor starts
   */
  'device.monitor.started': {
    pollingInterval: number
    nativeEventsSupported: boolean
  }

  /**
   * Emitted when the device monitor stops
   */
  'device.monitor.stopped': {
    reason?: string
  }
}

/**
 * Storage adapter interface for device preferences
 */
export interface DevicePreferenceStorage {
  /**
   * Save preferences to storage
   */
  save(key: string, preferences: DevicePreference[]): Promise<void>

  /**
   * Load preferences from storage
   */
  load(key: string): Promise<DevicePreference[] | null>

  /**
   * Clear preferences from storage
   */
  clear(key: string): Promise<void>

  /**
   * Check if storage is available
   */
  isAvailable(): boolean
}

/**
 * Device manager API interface
 */
export interface DeviceManagerAPI {
  /**
   * Set camera device with optional preference
   */
  setCamera(deviceId: string, preference?: Partial<DevicePreference>): Promise<void>

  /**
   * Set microphone device with optional preference
   */
  setMicrophone(deviceId: string, preference?: Partial<DevicePreference>): Promise<void>

  /**
   * Set speaker device with optional preference
   */
  setSpeaker(deviceId: string, preference?: Partial<DevicePreference>): Promise<void>

  /**
   * Get current device state
   */
  getDeviceState(type: DeviceType): DeviceState | undefined

  /**
   * Get device preferences
   */
  getPreferences(type: DeviceType): DevicePreference[]

  /**
   * Clear device preferences
   */
  clearPreferences(type?: DeviceType): Promise<void>

  /**
   * Recover device to preferred or available
   */
  recoverDevice(type: DeviceType): Promise<RecoveryResult>

  /**
   * Start device monitoring
   */
  startMonitoring(): void

  /**
   * Stop device monitoring
   */
  stopMonitoring(): void
}