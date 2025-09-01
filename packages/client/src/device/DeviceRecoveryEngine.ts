/**
 * Device Recovery Engine
 * Advanced device recovery system with multiple strategies and robust error handling
 */

import { EventEmitter, getLogger, uuid, debounce } from '@signalwire/core'
import type { BaseRoomSessionConnection } from '../BaseRoomSession'
import {
  recoveryStartedAction,
  recoveryProgressAction,
  recoverySucceededAction,
  recoveryFailedAction,
  recoveryCancelledAction,
  strategyExecutedAction,
  recoveryStatusChangedAction,
} from './deviceActions'
import type {
  DeviceType,
  DeviceState,
  DevicePreference,
  RecoveryResult,
  RecoveryAttempt,
  DeviceRecoveryEngineOptions,
  DeviceRecoveryEngineEvents,
  RecoveryStrategyDefinition,
  RecoveryStrategyResult,
} from './types'
import { RecoveryStatus } from './types'

/**
 * DeviceRecoveryEngine class
 * Provides advanced device recovery capabilities with multiple strategies,
 * debouncing, and comprehensive error handling
 */
export class DeviceRecoveryEngine extends EventEmitter<DeviceRecoveryEngineEvents> {
  private readonly logger = getLogger()
  private readonly options: Required<DeviceRecoveryEngineOptions>
  private readonly sessionConnection?: BaseRoomSessionConnection

  /**
   * Recovery tracking state
   */
  private readonly activeRecoveries = new Map<DeviceType, RecoveryAttempt>()
  private readonly recoveryQueue = new Map<DeviceType, RecoveryAttempt[]>()
  private readonly recoveryHistory: RecoveryAttempt[] = []
  private readonly recoveryStrategies = new Map<
    string,
    RecoveryStrategyDefinition
  >()

  /**
   * Debounced recovery functions per device type
   */
  private readonly debouncedRecovery = new Map<
    DeviceType,
    (
      deviceType: DeviceType,
      currentState?: DeviceState,
      preferences?: DevicePreference[]
    ) => void
  >()

  /**
   * Default configuration
   */
  private static readonly DEFAULT_OPTIONS: Required<DeviceRecoveryEngineOptions> =
    {
      debounceDelay: 500,
      maxConcurrentRecoveries: 3,
      maxRecoveryAttempts: 5,
      retryDelay: 1000,
      retryBackoff: 'exponential',
      maxRetryDelay: 30000,
      recoveryStrategies: [],
      autoRecover: true,
      trackRecoveryStatus: true,
      maxHistorySize: 100,
      debug: false,
      enumerateDevices: () => navigator.mediaDevices.enumerateDevices(),
      isDeviceAvailable: async (deviceId: string, deviceType: DeviceType) => {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const kind = DeviceRecoveryEngine.getMediaDeviceKind(deviceType)
        return devices.some(
          (device) => device.deviceId === deviceId && device.kind === kind
        )
      },
    }

  /**
   * Create a new DeviceRecoveryEngine instance
   * @param options - Configuration options
   * @param sessionConnection - Optional session connection for Redux store access
   */
  constructor(
    options?: DeviceRecoveryEngineOptions,
    sessionConnection?: BaseRoomSessionConnection
  ) {
    super()

    this.sessionConnection = sessionConnection
    this.options = this.mergeOptions(options)

    if (this.options.debug) {
      this.logger.debug(
        '[DeviceRecoveryEngine] Initialized with options:',
        this.options
      )
    }

    // Initialize default recovery strategies
    this.initializeDefaultStrategies()

    // Initialize custom strategies if provided
    if (this.options.recoveryStrategies.length > 0) {
      this.registerStrategies(this.options.recoveryStrategies)
    }

    // Set up debounced recovery functions
    this.initializeDebouncedRecovery()
  }

  /**
   * Recover a device using configured strategies
   * @param deviceType - Type of device to recover
   * @param currentState - Current device state (optional)
   * @param preferences - Device preferences (optional)
   * @returns Promise resolving to recovery result
   */
  async recoverDevice(
    deviceType: DeviceType,
    currentState?: DeviceState,
    preferences?: DevicePreference[]
  ): Promise<RecoveryResult> {
    // Check if recovery is already active for this device type
    if (this.activeRecoveries.has(deviceType)) {
      const activeAttempt = this.activeRecoveries.get(deviceType)!
      this.logger.debug(
        `[DeviceRecoveryEngine] Recovery already active for ${deviceType}`,
        activeAttempt.id
      )

      return {
        success: false,
        error: new Error(`Recovery already in progress for ${deviceType}`),
        method: 'custom',
        attempts: 0,
      }
    }

    // Check recovery attempt limits
    const recentAttempts = this.getRecentAttempts(deviceType)
    if (recentAttempts.length >= this.options.maxRecoveryAttempts) {
      this.logger.warn(
        `[DeviceRecoveryEngine] Maximum recovery attempts exceeded for ${deviceType}`
      )

      return {
        success: false,
        error: new Error(
          `Maximum recovery attempts (${this.options.maxRecoveryAttempts}) exceeded`
        ),
        method: 'custom',
        attempts: recentAttempts.length,
      }
    }

    // Create recovery attempt
    const attempt = this.createRecoveryAttempt(
      deviceType,
      currentState,
      preferences
    )

    try {
      // Mark as active
      this.activeRecoveries.set(deviceType, attempt)
      this.updateRecoveryStatus(attempt, RecoveryStatus.IN_PROGRESS)

      this.emit('recovery.started', { attempt })
      this.dispatchReduxAction(recoveryStartedAction({ attempt }))

      // Get available devices
      const availableDevices = await this.getAvailableDevices()

      // Execute recovery strategies in priority order
      const result = await this.executeRecoveryStrategies(
        deviceType,
        currentState,
        preferences || [],
        availableDevices,
        attempt
      )

      // Update attempt with result
      attempt.result = result
      attempt.endTime = Date.now()

      if (result.success) {
        this.updateRecoveryStatus(attempt, RecoveryStatus.SUCCEEDED)
        this.emit('recovery.succeeded', { attempt, result })
        this.dispatchReduxAction(recoverySucceededAction({ attempt, result }))
      } else {
        this.updateRecoveryStatus(attempt, RecoveryStatus.FAILED)
        const errorEvent = {
          attempt,
          error: result.error || new Error('Recovery failed'),
        }
        this.emit('recovery.failed', errorEvent)
        this.dispatchReduxAction(recoveryFailedAction(errorEvent))
      }

      return result
    } catch (error) {
      const recoveryError =
        error instanceof Error ? error : new Error('Unknown recovery error')

      attempt.error = recoveryError
      attempt.endTime = Date.now()
      this.updateRecoveryStatus(attempt, RecoveryStatus.FAILED)

      const errorEvent = { attempt, error: recoveryError }
      this.emit('recovery.failed', errorEvent)
      this.dispatchReduxAction(recoveryFailedAction(errorEvent))

      return {
        success: false,
        error: recoveryError,
        method: 'custom',
        attempts: attempt.retryCount,
      }
    } finally {
      // Clean up active recovery
      this.activeRecoveries.delete(deviceType)
      this.addToHistory(attempt)
      this.emitStatusChange()
    }
  }

  /**
   * Try a specific recovery strategy
   * @param strategyName - Name of the strategy to try
   * @param deviceType - Device type
   * @param currentState - Current device state
   * @param preferences - Device preferences
   * @returns Promise resolving to strategy result
   */
  async tryStrategy(
    strategyName: string,
    deviceType: DeviceType,
    currentState?: DeviceState,
    preferences: DevicePreference[] = []
  ): Promise<RecoveryStrategyResult> {
    const strategy = this.recoveryStrategies.get(strategyName)
    if (!strategy) {
      throw new Error(`Recovery strategy '${strategyName}' not found`)
    }

    const availableDevices = await this.getAvailableDevices()

    // Check if strategy can handle this situation
    if (
      strategy.canHandle &&
      !strategy.canHandle(
        deviceType,
        currentState,
        preferences,
        availableDevices
      )
    ) {
      return {
        success: false,
        error: new Error(
          `Strategy '${strategyName}' cannot handle current situation`
        ),
        reason: 'Strategy not applicable',
      }
    }

    try {
      const result = await strategy.execute(
        deviceType,
        currentState,
        preferences,
        availableDevices
      )

      if (this.options.debug) {
        this.logger.debug(
          `[DeviceRecoveryEngine] Strategy '${strategyName}' result:`,
          result
        )
      }

      return result
    } catch (error) {
      const strategyError =
        error instanceof Error ? error : new Error('Strategy execution failed')

      return {
        success: false,
        error: strategyError,
        reason: 'Strategy execution error',
      }
    }
  }

  /**
   * Get list of available devices
   * @returns Promise resolving to array of MediaDeviceInfo
   */
  async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
    try {
      return await this.options.enumerateDevices()
    } catch (error) {
      this.logger.error(
        '[DeviceRecoveryEngine] Failed to enumerate devices:',
        error
      )
      throw new Error('Failed to enumerate devices')
    }
  }

  /**
   * Register a custom recovery strategy
   * @param strategy - Strategy definition
   */
  registerStrategy(strategy: RecoveryStrategyDefinition): void {
    this.recoveryStrategies.set(strategy.name, strategy)

    if (this.options.debug) {
      this.logger.debug(
        `[DeviceRecoveryEngine] Registered strategy: ${strategy.name}`
      )
    }
  }

  /**
   * Register multiple recovery strategies
   * @param strategies - Array of strategy definitions
   */
  registerStrategies(strategies: RecoveryStrategyDefinition[]): void {
    strategies.forEach((strategy) => this.registerStrategy(strategy))
  }

  /**
   * Remove a recovery strategy
   * @param strategyName - Name of strategy to remove
   */
  unregisterStrategy(strategyName: string): void {
    this.recoveryStrategies.delete(strategyName)

    if (this.options.debug) {
      this.logger.debug(
        `[DeviceRecoveryEngine] Unregistered strategy: ${strategyName}`
      )
    }
  }

  /**
   * Get recovery attempt history
   * @param deviceType - Optional device type filter
   * @returns Array of recovery attempts
   */
  getRecoveryHistory(deviceType?: DeviceType): RecoveryAttempt[] {
    if (deviceType) {
      return this.recoveryHistory.filter(
        (attempt) => attempt.deviceType === deviceType
      )
    }
    return [...this.recoveryHistory]
  }

  /**
   * Get current recovery status
   * @returns Object with active and queued recovery counts
   */
  getRecoveryStatus(): { activeRecoveries: number; queuedRecoveries: number } {
    const queuedCount = Array.from(this.recoveryQueue.values()).reduce(
      (total, queue) => total + queue.length,
      0
    )

    return {
      activeRecoveries: this.activeRecoveries.size,
      queuedRecoveries: queuedCount,
    }
  }

  /**
   * Cancel an active recovery attempt
   * @param deviceType - Device type to cancel recovery for
   * @param reason - Optional cancellation reason
   */
  cancelRecovery(deviceType: DeviceType, reason = 'Cancelled by user'): void {
    const activeAttempt = this.activeRecoveries.get(deviceType)
    if (activeAttempt) {
      activeAttempt.endTime = Date.now()
      this.updateRecoveryStatus(activeAttempt, RecoveryStatus.CANCELLED)

      this.activeRecoveries.delete(deviceType)
      this.addToHistory(activeAttempt)

      const cancelEvent = { attempt: activeAttempt, reason }
      this.emit('recovery.cancelled', cancelEvent)
      this.dispatchReduxAction(recoveryCancelledAction(cancelEvent))
      this.emitStatusChange()

      if (this.options.debug) {
        this.logger.debug(
          `[DeviceRecoveryEngine] Cancelled recovery for ${deviceType}:`,
          reason
        )
      }
    }
  }

  /**
   * Clear recovery history
   * @param deviceType - Optional device type to clear (clears all if not specified)
   */
  clearHistory(deviceType?: DeviceType): void {
    if (deviceType) {
      const filteredHistory = this.recoveryHistory.filter(
        (attempt) => attempt.deviceType !== deviceType
      )
      this.recoveryHistory.splice(
        0,
        this.recoveryHistory.length,
        ...filteredHistory
      )
    } else {
      this.recoveryHistory.splice(0, this.recoveryHistory.length)
    }

    if (this.options.debug) {
      this.logger.debug(
        `[DeviceRecoveryEngine] Cleared recovery history${
          deviceType ? ` for ${deviceType}` : ''
        }`
      )
    }
  }

  /**
   * Destroy the recovery engine and clean up resources
   */
  destroy(): void {
    // Cancel all active recoveries
    Array.from(this.activeRecoveries.keys()).forEach((deviceType) => {
      this.cancelRecovery(deviceType, 'Engine destroyed')
    })

    // Clear all state
    this.recoveryQueue.clear()
    this.recoveryHistory.splice(0, this.recoveryHistory.length)
    this.recoveryStrategies.clear()
    this.debouncedRecovery.clear()

    // Remove all listeners
    this.removeAllListeners()

    this.logger.debug('[DeviceRecoveryEngine] Destroyed')
  }

  /**
   * Merge provided options with defaults
   * @param options - User-provided options
   * @returns Merged options
   */
  private mergeOptions(
    options?: DeviceRecoveryEngineOptions
  ): Required<DeviceRecoveryEngineOptions> {
    return {
      ...DeviceRecoveryEngine.DEFAULT_OPTIONS,
      ...options,
    }
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultStrategies(): void {
    // Exact ID Match Strategy
    this.registerStrategy({
      name: 'exact-id-match',
      priority: 1,
      description:
        'Try to find a device with the exact same ID as previously used',
      execute: async (
        deviceType,
        currentState,
        _preferences,
        availableDevices
      ) => {
        if (!currentState?.deviceId) {
          return {
            success: false,
            reason: 'No previous device ID available',
            confidence: 0,
          }
        }

        const device = availableDevices.find(
          (d) =>
            d.deviceId === currentState.deviceId &&
            d.kind === DeviceRecoveryEngine.getMediaDeviceKind(deviceType)
        )

        if (device) {
          return {
            success: true,
            deviceId: device.deviceId,
            deviceInfo: device,
            reason: 'Found exact device ID match',
            confidence: 1.0,
          }
        }

        return {
          success: false,
          reason: 'Exact device ID not found',
          confidence: 0,
        }
      },
      canHandle: (_deviceType, currentState) => !!currentState?.deviceId,
    })

    // Label Match Strategy
    this.registerStrategy({
      name: 'label-match',
      priority: 2,
      description:
        'Try to find a device with the same label as previously used',
      execute: async (
        deviceType,
        currentState,
        preferences,
        availableDevices
      ) => {
        const targetLabel =
          currentState?.label ||
          preferences.find((p) => p.priority === 1)?.label

        if (!targetLabel) {
          return {
            success: false,
            reason: 'No target label available',
            confidence: 0,
          }
        }

        const kind = DeviceRecoveryEngine.getMediaDeviceKind(deviceType)
        const matchingDevices = availableDevices.filter(
          (d) => d.kind === kind && d.label === targetLabel
        )

        if (matchingDevices.length > 0) {
          // Prefer the first matching device
          const device = matchingDevices[0]
          return {
            success: true,
            deviceId: device.deviceId,
            deviceInfo: device,
            reason: 'Found device with matching label',
            confidence: 0.8,
          }
        }

        return {
          success: false,
          reason: 'No device found with matching label',
          confidence: 0,
        }
      },
      canHandle: (_deviceType, currentState, preferences) =>
        !!(
          currentState?.label ||
          preferences.find((p) => p.priority === 1)?.label
        ),
    })

    // Same-Type Fallback Strategy
    this.registerStrategy({
      name: 'same-type-fallback',
      priority: 3,
      description:
        'Try to find any available device of the same type from preferences',
      execute: async (
        deviceType,
        _currentState,
        preferences,
        availableDevices
      ) => {
        const kind = DeviceRecoveryEngine.getMediaDeviceKind(deviceType)
        const devicesOfType = availableDevices.filter((d) => d.kind === kind)

        if (devicesOfType.length === 0) {
          return {
            success: false,
            reason: 'No devices of this type available',
            confidence: 0,
          }
        }

        // Try preferences first
        for (const pref of preferences.sort(
          (a, b) => a.priority - b.priority
        )) {
          const device = devicesOfType.find((d) => d.deviceId === pref.deviceId)
          if (device) {
            return {
              success: true,
              deviceId: device.deviceId,
              deviceInfo: device,
              reason: 'Found available device from preferences',
              confidence: 0.6,
            }
          }
        }

        // If no preferences match, use first available device
        const device = devicesOfType[0]
        return {
          success: true,
          deviceId: device.deviceId,
          deviceInfo: device,
          reason: 'Using first available device of same type',
          confidence: 0.4,
        }
      },
      canHandle: (
        deviceType,
        _currentState,
        _preferences,
        availableDevices
      ) => {
        const kind = DeviceRecoveryEngine.getMediaDeviceKind(deviceType)
        return availableDevices.some((d) => d.kind === kind)
      },
    })

    // OS Default Strategy
    this.registerStrategy({
      name: 'os-default',
      priority: 4,
      description: 'Use the OS default device (device with empty deviceId)',
      execute: async (
        deviceType,
        _currentState,
        _preferences,
        availableDevices
      ) => {
        const kind = DeviceRecoveryEngine.getMediaDeviceKind(deviceType)

        // Look for default device (empty deviceId)
        const defaultDevice = availableDevices.find(
          (d) =>
            d.kind === kind && (d.deviceId === '' || d.deviceId === 'default')
        )

        if (defaultDevice) {
          return {
            success: true,
            deviceId: defaultDevice.deviceId,
            deviceInfo: defaultDevice,
            reason: 'Using OS default device',
            confidence: 0.3,
          }
        }

        // Fallback to first device of type
        const firstDevice = availableDevices.find((d) => d.kind === kind)
        if (firstDevice) {
          return {
            success: true,
            deviceId: firstDevice.deviceId,
            deviceInfo: firstDevice,
            reason: 'Using first available device as default',
            confidence: 0.2,
          }
        }

        return {
          success: false,
          reason: 'No default device available',
          confidence: 0,
        }
      },
      canHandle: (
        deviceType,
        _currentState,
        _preferences,
        availableDevices
      ) => {
        const kind = DeviceRecoveryEngine.getMediaDeviceKind(deviceType)
        return availableDevices.some((d) => d.kind === kind)
      },
    })
  }

  /**
   * Initialize debounced recovery functions for each device type
   */
  private initializeDebouncedRecovery(): void {
    const deviceTypes: DeviceType[] = ['camera', 'microphone', 'speaker']

    deviceTypes.forEach((deviceType) => {
      const debouncedFn = debounce(
        async (
          type: DeviceType,
          currentState?: DeviceState,
          preferences?: DevicePreference[]
        ) => {
          try {
            await this.recoverDevice(type, currentState, preferences)
          } catch (error) {
            this.logger.error(
              `[DeviceRecoveryEngine] Debounced recovery failed for ${type}:`,
              error
            )
          }
        },
        this.options.debounceDelay
      )

      this.debouncedRecovery.set(deviceType, debouncedFn)
    })
  }

  /**
   * Execute recovery strategies in priority order
   * @param deviceType - Device type
   * @param currentState - Current device state
   * @param preferences - Device preferences
   * @param availableDevices - Available devices
   * @param attempt - Recovery attempt
   * @returns Promise resolving to recovery result
   */
  private async executeRecoveryStrategies(
    deviceType: DeviceType,
    currentState: DeviceState | undefined,
    preferences: DevicePreference[],
    availableDevices: MediaDeviceInfo[],
    attempt: RecoveryAttempt
  ): Promise<RecoveryResult> {
    // Get strategies sorted by priority
    const strategies = Array.from(this.recoveryStrategies.values()).sort(
      (a, b) => a.priority - b.priority
    )

    for (const strategy of strategies) {
      // Check if strategy can handle this situation
      if (
        strategy.canHandle &&
        !strategy.canHandle(
          deviceType,
          currentState,
          preferences,
          availableDevices
        )
      ) {
        continue
      }

      try {
        const progressEvent = {
          attempt,
          strategy: strategy.name,
          progress: 0.5,
        }
        this.emit('recovery.progress', progressEvent)
        this.dispatchReduxAction(recoveryProgressAction(progressEvent))

        const result = await strategy.execute(
          deviceType,
          currentState,
          preferences,
          availableDevices
        )

        const strategyEvent = {
          attempt,
          strategy,
          result,
        }
        this.emit('strategy.executed', strategyEvent)
        this.dispatchReduxAction(strategyExecutedAction(strategyEvent))

        if (result.success && result.deviceId) {
          // Verify device is still available
          const isAvailable = await this.options.isDeviceAvailable(
            result.deviceId,
            deviceType
          )

          if (isAvailable) {
            return {
              success: true,
              deviceId: result.deviceId,
              method: this.getRecoveryMethod(strategy.name),
              attempts: attempt.retryCount + 1,
              duration: Date.now() - attempt.startTime,
            }
          } else {
            if (this.options.debug) {
              this.logger.debug(
                `[DeviceRecoveryEngine] Device ${result.deviceId} not available, trying next strategy`
              )
            }
          }
        }
      } catch (error) {
        if (this.options.debug) {
          this.logger.debug(
            `[DeviceRecoveryEngine] Strategy '${strategy.name}' failed:`,
            error
          )
        }

        const strategyFailureEvent = {
          attempt,
          strategy,
          result: {
            success: false,
            error:
              error instanceof Error
                ? error
                : new Error('Strategy execution failed'),
          },
        }
        this.emit('strategy.executed', strategyFailureEvent)
        this.dispatchReduxAction(strategyExecutedAction(strategyFailureEvent))
      }
    }

    return {
      success: false,
      error: new Error('All recovery strategies failed'),
      method: 'custom',
      attempts: attempt.retryCount + 1,
      duration: Date.now() - attempt.startTime,
    }
  }

  /**
   * Create a new recovery attempt
   * @param deviceType - Device type
   * @param currentState - Current device state
   * @param preferences - Device preferences
   * @returns Recovery attempt object
   */
  private createRecoveryAttempt(
    deviceType: DeviceType,
    currentState?: DeviceState,
    preferences?: DevicePreference[]
  ): RecoveryAttempt {
    return {
      id: uuid(),
      deviceType,
      strategy: 'multiple',
      startTime: Date.now(),
      status: RecoveryStatus.PENDING,
      retryCount: 0,
      metadata: {
        currentState: currentState ? { ...currentState } : undefined,
        preferences: preferences ? [...preferences] : undefined,
      },
    }
  }

  /**
   * Update recovery attempt status
   * @param attempt - Recovery attempt
   * @param status - New status
   */
  private updateRecoveryStatus(
    attempt: RecoveryAttempt,
    status: RecoveryStatus
  ): void {
    attempt.status = status

    if (this.options.trackRecoveryStatus) {
      if (this.options.debug) {
        this.logger.debug(
          `[DeviceRecoveryEngine] Recovery ${attempt.id} status: ${status}`
        )
      }
    }
  }

  /**
   * Add recovery attempt to history
   * @param attempt - Recovery attempt
   */
  private addToHistory(attempt: RecoveryAttempt): void {
    this.recoveryHistory.push(attempt)

    // Maintain history size limit
    if (this.recoveryHistory.length > this.options.maxHistorySize) {
      this.recoveryHistory.splice(
        0,
        this.recoveryHistory.length - this.options.maxHistorySize
      )
    }
  }

  /**
   * Get recent recovery attempts for a device type
   * @param deviceType - Device type
   * @returns Array of recent recovery attempts
   */
  private getRecentAttempts(deviceType: DeviceType): RecoveryAttempt[] {
    const now = Date.now()
    const timeLimit = 5 * 60 * 1000 // 5 minutes

    return this.recoveryHistory.filter(
      (attempt) =>
        attempt.deviceType === deviceType && now - attempt.startTime < timeLimit
    )
  }

  /**
   * Emit status change event
   */
  private emitStatusChange(): void {
    const status = this.getRecoveryStatus()
    this.emit('status.changed', status)
    this.dispatchReduxAction(recoveryStatusChangedAction(status))
  }

  /**
   * Get recovery method type from strategy name
   * @param strategyName - Strategy name
   * @returns Recovery method type
   */
  private getRecoveryMethod(
    strategyName: string
  ): 'preference' | 'fallback' | 'any' | 'custom' {
    switch (strategyName) {
      case 'exact-id-match':
      case 'label-match':
        return 'preference'
      case 'same-type-fallback':
        return 'fallback'
      case 'os-default':
        return 'any'
      default:
        return 'custom'
    }
  }

  /**
   * Get MediaDeviceKind for DeviceType
   * @param type - Device type
   * @returns MediaDeviceKind string
   */
  private static getMediaDeviceKind(type: DeviceType): MediaDeviceKind {
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
   * Helper method to dispatch Redux actions safely
   * @param action - Redux action to dispatch
   */
  private dispatchReduxAction(action: any): void {
    try {
      if (this.sessionConnection?.store?.dispatch) {
        this.sessionConnection.store.dispatch(action)
      } else {
        if (this.options.debug) {
          this.logger.debug(
            '[DeviceRecoveryEngine] Redux store not available, skipping action dispatch:',
            action.type
          )
        }
      }
    } catch (error) {
      this.logger.error(
        '[DeviceRecoveryEngine] Failed to dispatch Redux action:',
        error
      )
    }
  }
}
