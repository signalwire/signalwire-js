/**
 * Device Preference Management Module
 * Export all device management components for the SignalWire SDK
 */

// Main DeviceManager class
export { DeviceManager } from './DeviceManager'

// Device monitoring system
export { DeviceMonitor } from './DeviceMonitor'
export type { DeviceMonitorOptions } from './DeviceMonitor'

// Storage adapters
export {
  LocalStorageAdapter,
  MemoryStorageAdapter,
  createStorageAdapter,
} from './DevicePreferenceStorage'

// Redux actions
export {
  devicePreferenceUpdateAction,
  devicePreferenceClearAction,
  deviceRecoveryTriggerAction,
  deviceChangeDetectedAction,
  deviceMonitoringStartedAction,
  deviceMonitoringStoppedAction,
  deviceUnavailableAction,
  deviceRecoverySuccessAction,
  deviceRecoveryFailureAction,
  deviceStateChangedAction,
  devicePreferencesLoadedAction,
  devicePreferencesSavedAction,
  devicePreferencesClearedAction,
  deviceEnumerationErrorAction,
} from './deviceActions'

// Type definitions
export type {
  DeviceType,
  DevicePreference,
  DeviceState,
  DeviceOptions,
  RecoveryStrategy,
  RecoveryResult,
  DevicePreferenceConfig,
  DeviceManagerEvents,
  DevicePreferenceStorage,
  DeviceManagerAPI,
  DeviceChangeEvent,
  DeviceChanges,
  DeviceMonitorEvents,
} from './types'
