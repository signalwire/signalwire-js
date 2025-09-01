/**
 * Custom Error Types for Device Preference Management
 * Specific error classes for better error handling and debugging
 */

import type { DeviceType } from './types'

/**
 * Base error class for device-related errors
 */
export abstract class DeviceError extends Error {
  abstract readonly code: string
  
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Error thrown when device recovery fails
 */
export class DeviceRecoveryError extends DeviceError {
  readonly code = 'DEVICE_RECOVERY_FAILED'
  
  constructor(
    message: string,
    public readonly deviceType: DeviceType,
    public readonly attemptCount: number,
    public readonly cause?: Error
  ) {
    super(message)
  }
}

/**
 * Error thrown when a device is not available
 */
export class DeviceNotAvailableError extends DeviceError {
  readonly code = 'DEVICE_NOT_AVAILABLE'
  
  constructor(
    public readonly deviceType: DeviceType,
    public readonly deviceId: string
  ) {
    super(`Device ${deviceId} of type ${deviceType} is not available`)
  }
}

/**
 * Error thrown when device enumeration fails
 */
export class DeviceEnumerationError extends DeviceError {
  readonly code = 'DEVICE_ENUMERATION_FAILED'
  
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
  }
}

/**
 * Error thrown when device storage operations fail
 */
export class DeviceStorageError extends DeviceError {
  readonly code = 'DEVICE_STORAGE_ERROR'
  
  constructor(
    message: string,
    public readonly operation: 'save' | 'load' | 'clear',
    public readonly key?: string,
    public readonly cause?: Error
  ) {
    super(message)
  }
}

/**
 * Error thrown when device permissions are denied
 */
export class DevicePermissionError extends DeviceError {
  readonly code = 'DEVICE_PERMISSION_DENIED'
  
  constructor(
    public readonly deviceType: DeviceType,
    public readonly permissionName?: string
  ) {
    super(`Permission denied for ${deviceType}`)
  }
}

/**
 * Error thrown when device configuration is invalid
 */
export class DeviceConfigurationError extends DeviceError {
  readonly code = 'DEVICE_CONFIGURATION_ERROR'
  
  constructor(
    message: string,
    public readonly invalidFields?: string[]
  ) {
    super(message)
  }
}

/**
 * Error thrown when device monitoring fails
 */
export class DeviceMonitoringError extends DeviceError {
  readonly code = 'DEVICE_MONITORING_ERROR'
  
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
  }
}

/**
 * Type guard to check if an error is a DeviceError
 */
export function isDeviceError(error: unknown): error is DeviceError {
  return error instanceof DeviceError
}

/**
 * Type guard to check if an error is a specific DeviceError type
 */
export function isDeviceErrorCode<T extends DeviceError>(
  error: unknown,
  code: string
): error is T {
  return isDeviceError(error) && error.code === code
}