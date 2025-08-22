/**
 * Type Guards for Device Preference Management
 * Runtime type checking utilities for safer type assertions
 */

import type {
  DevicePreference,
  DeviceState,
  DeviceType,
  RecoveryResult,
  RecoveryStrategy,
} from './types'

/**
 * Check if a value is a valid DeviceType
 */
export function isDeviceType(value: unknown): value is DeviceType {
  return (
    typeof value === 'string' &&
    ['camera', 'microphone', 'speaker'].includes(value)
  )
}

/**
 * Check if an object is a valid DevicePreference
 */
export function isDevicePreference(obj: unknown): obj is DevicePreference {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const candidate = obj as Record<string, unknown>
  
  return (
    typeof candidate.deviceId === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.priority === 'number' &&
    candidate.priority > 0 &&
    (candidate.isFallback === undefined || typeof candidate.isFallback === 'boolean') &&
    (candidate.metadata === undefined || typeof candidate.metadata === 'object')
  )
}

/**
 * Check if an array contains valid DevicePreferences
 */
export function isDevicePreferenceArray(value: unknown): value is DevicePreference[] {
  return (
    Array.isArray(value) &&
    value.every(item => isDevicePreference(item))
  )
}

/**
 * Check if an object is a valid DeviceState
 */
export function isDeviceState(obj: unknown): obj is DeviceState {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const candidate = obj as Record<string, unknown>
  
  return (
    (candidate.deviceId === null || typeof candidate.deviceId === 'string') &&
    typeof candidate.isAvailable === 'boolean' &&
    typeof candidate.isActive === 'boolean' &&
    typeof candidate.lastUpdated === 'number' &&
    (candidate.label === undefined || typeof candidate.label === 'string') &&
    (candidate.groupId === undefined || typeof candidate.groupId === 'string') &&
    (candidate.error === undefined || candidate.error === null || candidate.error instanceof Error)
  )
}

/**
 * Check if an object is a valid RecoveryResult
 */
export function isRecoveryResult(obj: unknown): obj is RecoveryResult {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const candidate = obj as Record<string, unknown>
  
  return (
    typeof candidate.success === 'boolean' &&
    (candidate.deviceId === undefined || typeof candidate.deviceId === 'string') &&
    (candidate.error === undefined || candidate.error instanceof Error) &&
    (candidate.method === undefined || 
      ['preference', 'fallback', 'any', 'custom'].includes(candidate.method as string)) &&
    (candidate.attempts === undefined || typeof candidate.attempts === 'number') &&
    (candidate.duration === undefined || typeof candidate.duration === 'number')
  )
}

/**
 * Check if an object is a valid RecoveryStrategy
 */
export function isRecoveryStrategy(obj: unknown): obj is RecoveryStrategy {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const candidate = obj as Record<string, unknown>
  
  return (
    typeof candidate.type === 'string' &&
    ['automatic', 'manual', 'preference', 'custom'].includes(candidate.type) &&
    (candidate.priorityOrder === undefined ||
      (Array.isArray(candidate.priorityOrder) &&
        candidate.priorityOrder.every(
          item => ['preference', 'fallback', 'any'].includes(item as string)
        ))) &&
    (candidate.customHandler === undefined || typeof candidate.customHandler === 'function') &&
    (candidate.notifyOnRecovery === undefined || typeof candidate.notifyOnRecovery === 'boolean') &&
    (candidate.retry === undefined ||
      (typeof candidate.retry === 'object' &&
        candidate.retry !== null &&
        typeof (candidate.retry as any).maxAttempts === 'number' &&
        typeof (candidate.retry as any).delay === 'number'))
  )
}

/**
 * Type guard for MediaDeviceInfo
 */
export function isMediaDeviceInfo(obj: unknown): obj is MediaDeviceInfo {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const candidate = obj as Record<string, unknown>
  
  return (
    typeof candidate.deviceId === 'string' &&
    typeof candidate.kind === 'string' &&
    ['videoinput', 'audioinput', 'audiooutput'].includes(candidate.kind) &&
    typeof candidate.label === 'string' &&
    typeof candidate.groupId === 'string'
  )
}

/**
 * Safely parse JSON with type validation
 */
export function safeParseJSON<T>(
  json: string,
  validator: (value: unknown) => value is T
): T | null {
  try {
    const parsed = JSON.parse(json)
    return validator(parsed) ? parsed : null
  } catch {
    return null
  }
}