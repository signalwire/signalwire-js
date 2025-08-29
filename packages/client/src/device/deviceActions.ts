/**
 * Device Preference Management Redux Actions
 * Actions for handling device preference updates and device recovery operations
 */

import { actions } from '@signalwire/core'
import type { 
  DeviceType, 
  DevicePreference, 
  RecoveryResult, 
  RecoveryAttempt,
  RecoveryStrategyDefinition,
  RecoveryStrategyResult
} from './types'

/**
 * Action triggered when a device preference should be updated
 */
export const devicePreferenceUpdateAction = actions.createAction<{
  deviceType: DeviceType
  deviceId: string
  preference?: Partial<DevicePreference>
}>('device.preference.update')

/**
 * Action triggered when device preferences should be cleared
 */
export const devicePreferenceClearAction = actions.createAction<{
  deviceType?: DeviceType
}>('device.preference.clear')

/**
 * Action triggered when device recovery should be initiated
 */
export const deviceRecoveryTriggerAction = actions.createAction<{
  deviceType: DeviceType
  reason?: string
}>('device.recovery.trigger')

/**
 * Action triggered when device monitoring detects changes
 */
export const deviceChangeDetectedAction = actions.createAction<{
  deviceType: DeviceType
  changeType: 'added' | 'removed' | 'changed'
  deviceId: string
  deviceInfo?: MediaDeviceInfo
}>('device.change.detected')

/**
 * Action triggered when device monitoring starts
 */
export const deviceMonitoringStartedAction = actions.createAction<{
  pollingInterval: number
  nativeEventsSupported: boolean
}>('device.monitoring.started')

/**
 * Action triggered when device monitoring stops
 */
export const deviceMonitoringStoppedAction = actions.createAction<{
  reason?: string
}>('device.monitoring.stopped')

/**
 * Action triggered when a device becomes unavailable
 */
export const deviceUnavailableAction = actions.createAction<{
  deviceType: DeviceType
  deviceId: string
  reason?: string
}>('device.unavailable')

/**
 * Action triggered when device recovery completes successfully
 */
export const deviceRecoverySuccessAction = actions.createAction<{
  deviceType: DeviceType
  result: RecoveryResult
}>('device.recovery.success')

/**
 * Action triggered when device recovery fails
 */
export const deviceRecoveryFailureAction = actions.createAction<{
  deviceType: DeviceType
  error: Error
  attempts: number
}>('device.recovery.failure')

/**
 * Action triggered when device state changes
 */
export const deviceStateChangedAction = actions.createAction<{
  deviceType: DeviceType
  deviceId: string | null
  isAvailable: boolean
  isActive: boolean
  label?: string
  error?: Error | null
}>('device.state.changed')

/**
 * Action triggered when preferences are loaded from storage
 */
export const devicePreferencesLoadedAction = actions.createAction<{
  preferences: Record<DeviceType, DevicePreference[]>
}>('device.preferences.loaded')

/**
 * Action triggered when preferences are saved to storage
 */
export const devicePreferencesSavedAction = actions.createAction<{
  preferences: Record<DeviceType, DevicePreference[]>
}>('device.preferences.saved')

/**
 * Action triggered when preferences are cleared from storage
 */
export const devicePreferencesClearedAction = actions.createAction<{
  types?: DeviceType[]
}>('device.preferences.cleared')

/**
 * Action triggered when device enumeration fails during monitoring
 */
export const deviceEnumerationErrorAction = actions.createAction<{
  error: Error
  timestamp: number
}>('device.enumeration.error')

// ===== DeviceRecoveryEngine Specific Actions =====

/**
 * Action triggered when a recovery attempt starts
 */
export const recoveryStartedAction = actions.createAction<{
  attempt: RecoveryAttempt
}>('recovery.started')

/**
 * Action triggered when a recovery attempt progresses
 */
export const recoveryProgressAction = actions.createAction<{
  attempt: RecoveryAttempt
  strategy: string
  progress: number
}>('recovery.progress')

/**
 * Action triggered when a recovery attempt succeeds
 */
export const recoverySucceededAction = actions.createAction<{
  attempt: RecoveryAttempt
  result: RecoveryResult
}>('recovery.succeeded')

/**
 * Action triggered when a recovery attempt fails
 */
export const recoveryFailedAction = actions.createAction<{
  attempt: RecoveryAttempt
  error: Error
}>('recovery.failed')

/**
 * Action triggered when a recovery attempt is cancelled
 */
export const recoveryCancelledAction = actions.createAction<{
  attempt: RecoveryAttempt
  reason?: string
}>('recovery.cancelled')

/**
 * Action triggered when a recovery attempt is debounced
 */
export const recoveryDebouncedAction = actions.createAction<{
  deviceType: DeviceType
  reason: string
}>('recovery.debounced')

/**
 * Action triggered when a recovery strategy is executed
 */
export const strategyExecutedAction = actions.createAction<{
  attempt: RecoveryAttempt
  strategy: RecoveryStrategyDefinition
  result: RecoveryStrategyResult
}>('strategy.executed')

/**
 * Action triggered when recovery engine status changes
 */
export const recoveryStatusChangedAction = actions.createAction<{
  activeRecoveries: number
  queuedRecoveries: number
}>('recovery.status.changed')
