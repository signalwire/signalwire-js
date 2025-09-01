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
  setCamera(
    deviceId: string,
    preference?: Partial<DevicePreference>
  ): Promise<void>

  /**
   * Set microphone device with optional preference
   */
  setMicrophone(
    deviceId: string,
    preference?: Partial<DevicePreference>
  ): Promise<void>

  /**
   * Set speaker device with optional preference
   */
  setSpeaker(
    deviceId: string,
    preference?: Partial<DevicePreference>
  ): Promise<void>

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

/**
 * Recovery attempt information
 */
export interface RecoveryAttempt {
  /**
   * Unique identifier for this recovery attempt
   */
  id: string

  /**
   * Device type being recovered
   */
  deviceType: DeviceType

  /**
   * Strategy used for recovery
   */
  strategy: string

  /**
   * Timestamp when recovery was started
   */
  startTime: number

  /**
   * Timestamp when recovery was completed (if completed)
   */
  endTime?: number

  /**
   * Current status of the recovery attempt
   */
  status: RecoveryStatus

  /**
   * Result of the recovery attempt (if completed)
   */
  result?: RecoveryResult

  /**
   * Error that occurred during recovery (if failed)
   */
  error?: Error

  /**
   * Number of retry attempts made
   */
  retryCount: number

  /**
   * Additional metadata about the recovery attempt
   */
  metadata?: Record<string, unknown>
}

/**
 * Recovery status enumeration
 */
export enum RecoveryStatus {
  /** Recovery attempt is pending/queued */
  PENDING = 'pending',
  /** Recovery attempt is currently in progress */
  IN_PROGRESS = 'in_progress',
  /** Recovery attempt completed successfully */
  SUCCEEDED = 'succeeded',
  /** Recovery attempt failed */
  FAILED = 'failed',
  /** Recovery attempt was cancelled */
  CANCELLED = 'cancelled',
  /** Recovery attempt was debounced/skipped */
  DEBOUNCED = 'debounced',
}

/**
 * Device Recovery Engine configuration options
 */
export interface DeviceRecoveryEngineOptions {
  /**
   * Debounce delay for recovery attempts in milliseconds (default: 500)
   */
  debounceDelay?: number

  /**
   * Maximum number of concurrent recovery attempts (default: 3)
   */
  maxConcurrentRecoveries?: number

  /**
   * Maximum number of recovery attempts per device (default: 5)
   */
  maxRecoveryAttempts?: number

  /**
   * Base delay between retry attempts in milliseconds (default: 1000)
   */
  retryDelay?: number

  /**
   * Retry backoff strategy (default: 'exponential')
   */
  retryBackoff?: 'linear' | 'exponential' | 'fixed'

  /**
   * Maximum retry delay in milliseconds (default: 30000)
   */
  maxRetryDelay?: number

  /**
   * Recovery strategies to use in priority order
   */
  recoveryStrategies?: RecoveryStrategyDefinition[]

  /**
   * Enable automatic recovery on device disconnection (default: true)
   */
  autoRecover?: boolean

  /**
   * Enable recovery status tracking (default: true)
   */
  trackRecoveryStatus?: boolean

  /**
   * Recovery attempt history size (default: 100)
   */
  maxHistorySize?: number

  /**
   * Enable debug logging (default: false)
   */
  debug?: boolean

  /**
   * Custom device enumeration function
   */
  enumerateDevices?: () => Promise<MediaDeviceInfo[]>

  /**
   * Custom device availability checker
   */
  isDeviceAvailable?: (
    deviceId: string,
    deviceType: DeviceType
  ) => Promise<boolean>
}

/**
 * Recovery strategy definition
 */
export interface RecoveryStrategyDefinition {
  /**
   * Unique name for this strategy
   */
  name: string

  /**
   * Priority level (lower numbers = higher priority)
   */
  priority: number

  /**
   * Description of what this strategy does
   */
  description?: string

  /**
   * Function that implements the recovery strategy
   */
  execute: (
    deviceType: DeviceType,
    currentState: DeviceState | undefined,
    preferences: DevicePreference[],
    availableDevices: MediaDeviceInfo[]
  ) => Promise<RecoveryStrategyResult>

  /**
   * Function to determine if this strategy should be used
   */
  canHandle?: (
    deviceType: DeviceType,
    currentState: DeviceState | undefined,
    preferences: DevicePreference[],
    availableDevices: MediaDeviceInfo[]
  ) => boolean

  /**
   * Strategy-specific configuration
   */
  config?: Record<string, unknown>
}

/**
 * Result of a recovery strategy execution
 */
export interface RecoveryStrategyResult {
  /**
   * Whether the strategy succeeded in finding a device
   */
  success: boolean

  /**
   * Device ID to use (if successful)
   */
  deviceId?: string

  /**
   * Device info for the selected device
   */
  deviceInfo?: MediaDeviceInfo

  /**
   * Error that occurred (if failed)
   */
  error?: Error

  /**
   * Reason for the result
   */
  reason?: string

  /**
   * Confidence score for this result (0-1)
   */
  confidence?: number

  /**
   * Additional metadata about the result
   */
  metadata?: Record<string, unknown>
}

/**
 * Events emitted by DeviceRecoveryEngine
 */
export interface DeviceRecoveryEngineEvents {
  /**
   * Emitted when a recovery attempt starts
   */
  'recovery.started': {
    attempt: RecoveryAttempt
  }

  /**
   * Emitted when a recovery attempt progresses
   */
  'recovery.progress': {
    attempt: RecoveryAttempt
    strategy: string
    progress: number
  }

  /**
   * Emitted when a recovery attempt succeeds
   */
  'recovery.succeeded': {
    attempt: RecoveryAttempt
    result: RecoveryResult
  }

  /**
   * Emitted when a recovery attempt fails
   */
  'recovery.failed': {
    attempt: RecoveryAttempt
    error: Error
  }

  /**
   * Emitted when a recovery attempt is cancelled
   */
  'recovery.cancelled': {
    attempt: RecoveryAttempt
    reason?: string
  }

  /**
   * Emitted when a recovery attempt is debounced
   */
  'recovery.debounced': {
    deviceType: DeviceType
    reason: string
  }

  /**
   * Emitted when a recovery strategy is executed
   */
  'strategy.executed': {
    attempt: RecoveryAttempt
    strategy: RecoveryStrategyDefinition
    result: RecoveryStrategyResult
  }

  /**
   * Emitted when recovery engine status changes
   */
  'status.changed': {
    activeRecoveries: number
    queuedRecoveries: number
  }
}
