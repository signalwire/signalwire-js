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
  createStorageAdapter
} from './DevicePreferenceStorage'

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
  DeviceMonitorEvents
} from './types'