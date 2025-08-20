import { Profile, ProfileType } from '../interfaces/clientFactory'
import type { ResourceType } from '../interfaces/address'

/**
 * Valid resource types
 */
const VALID_RESOURCE_TYPES: ResourceType[] = [
  'app',
  'call',
  'room',
  'subscriber',
]

/**
 * Type guard to check if a value is a valid ResourceType
 * @param value - Value to check
 * @returns True if value is a valid ResourceType
 */
function isValidResourceType(value: unknown): value is ResourceType {
  return (
    typeof value === 'string' &&
    VALID_RESOURCE_TYPES.includes(value as ResourceType)
  )
}

/**
 * Type guard to check if a value is a valid Profile object
 * @param data - Unknown data to validate
 * @returns True if data is a valid Profile
 */
export function isValidProfile(data: unknown): data is Profile {
  if (!data || typeof data !== 'object') {
    return false
  }

  const profile = data as Record<string, unknown>

  // Check required fields
  if (
    typeof profile.id !== 'string' ||
    !Object.values(ProfileType).includes(profile.type as ProfileType) ||
    typeof profile.credentialsId !== 'string' ||
    typeof profile.addressId !== 'string' ||
    typeof profile.createdAt !== 'number' ||
    typeof profile.updatedAt !== 'number'
  ) {
    return false
  }

  // Check credentials object
  if (!profile.credentials || typeof profile.credentials !== 'object') {
    return false
  }

  const credentials = profile.credentials as Record<string, unknown>
  if (
    typeof credentials.satToken !== 'string' ||
    typeof credentials.tokenExpiry !== 'number' ||
    typeof credentials.satRefreshPayload !== 'object' ||
    typeof credentials.satRefreshURL !== 'string' ||
    typeof credentials.satRefreshResultMapper !== 'function'
  ) {
    return false
  }

  // Check optional fields
  if (profile.lastUsed !== undefined && typeof profile.lastUsed !== 'number') {
    return false
  }

  // Check optional addressDetails
  if (profile.addressDetails !== undefined) {
    if (typeof profile.addressDetails !== 'object') {
      return false
    }
    const addressDetails = profile.addressDetails as Record<string, unknown>
    if (
      !isValidResourceType(addressDetails.type) ||
      typeof addressDetails.name !== 'string'
    ) {
      return false
    }
    if (
      addressDetails.displayName !== undefined &&
      typeof addressDetails.displayName !== 'string'
    ) {
      return false
    }
    if (
      addressDetails.channels !== undefined &&
      typeof addressDetails.channels !== 'number'
    ) {
      return false
    }
  }

  return true
}

/**
 * Type guard to check if a value is a valid array of strings
 * @param data - Unknown data to validate
 * @returns True if data is a string array
 */
export function isStringArray(data: unknown): data is string[] {
  return Array.isArray(data) && data.every((item) => typeof item === 'string')
}

/**
 * Type guard to check if a value is a valid Address from API response
 * @param data - Unknown data to validate
 * @returns True if data has required Address properties
 */
export function isValidAddress(
  data: unknown
): data is {
  id: string
  type: ResourceType
  name: string
  display_name?: string
  channels?: Record<string, unknown>
} {
  if (!data || typeof data !== 'object') {
    return false
  }

  const address = data as Record<string, unknown>

  return (
    typeof address.id === 'string' &&
    isValidResourceType(address.type) &&
    typeof address.name === 'string'
  )
}

/**
 * Safely parse JSON with type validation
 * @param json - JSON string to parse
 * @param validator - Type guard function to validate the parsed data
 * @returns Parsed and validated data or null if invalid
 */
export function safeJsonParse<T>(
  json: string,
  validator: (data: unknown) => data is T
): T | null {
  try {
    const parsed = JSON.parse(json)
    return validator(parsed) ? parsed : null
  } catch {
    return null
  }
}
