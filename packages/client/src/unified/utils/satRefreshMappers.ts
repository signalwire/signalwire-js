/**
 * Registry of predefined SAT refresh result mappers
 *
 * This replaces the unsafe eval() usage with a secure registry of
 * predefined mapping functions for different authentication patterns.
 */

export type SatRefreshResultMapper = (body: Record<string, any>) => {
  satToken: string
  tokenExpiry: number
  satRefreshPayload: Record<string, any>
}

/**
 * Default mapper - handles standard SignalWire token responses
 */
const defaultMapper: SatRefreshResultMapper = (body) => ({
  satToken: body.satToken || body.token,
  tokenExpiry: body.tokenExpiry || body.expires_at || Date.now() + 3600000,
  satRefreshPayload: body.satRefreshPayload || {},
})

/**
 * OAuth mapper - handles OAuth 2.0 refresh token responses
 * Maps from OAuth standard fields to SignalWire format
 */
const oauthMapper: SatRefreshResultMapper = (body) => {
  // Calculate expiry from expires_in (seconds) or created_at + expires_in
  let tokenExpiry: number

  if (body.expires_in && typeof body.expires_in === 'number') {
    // If we have created_at, use it as base, otherwise use current time
    const baseTime = body.created_at
      ? body.created_at * 1000 // Convert to milliseconds
      : Date.now()
    tokenExpiry = baseTime + body.expires_in * 1000 // Convert to milliseconds
  } else {
    // Fallback to 1 hour from now
    tokenExpiry = Date.now() + 3600000
  }

  return {
    satToken: body.access_token,
    tokenExpiry,
    satRefreshPayload: {
      refresh_token: body.refresh_token,
      grant_type: 'refresh_token',
    },
  }
}

export type RefreshMapper = 'default' | 'oauth'
/**
 * Registry of available mappers
 */
const MAPPER_REGISTRY: Record<RefreshMapper, SatRefreshResultMapper> = {
  default: defaultMapper,
  oauth: oauthMapper,
}

/**
 * Get a mapper function by name
 * @param mapperName - Name of the mapper to retrieve
 * @returns The mapper function or null if not found
 */
export function getMapper(
  mapperName: RefreshMapper
): SatRefreshResultMapper | null {
  return MAPPER_REGISTRY[mapperName] || null
}

/**
 * Get the default mapper
 * @returns The default mapper function
 */
export function getDefaultMapper(): SatRefreshResultMapper {
  return defaultMapper
}

/**
 * Get all available mapper names
 * @returns Array of available mapper names
 */
export function getAvailableMappers(): string[] {
  return Object.keys(MAPPER_REGISTRY)
}

/**
 * Check if a mapper name is valid
 * @param mapperName - Name to check
 * @returns True if the mapper exists
 */
export function isValidMapperName(mapperName: string): boolean {
  return mapperName in MAPPER_REGISTRY
}

/**
 * Resolve a satRefreshResultMapper from string mapper name
 * @param mapperName - String mapper name, or undefined for default
 * @returns A valid mapper function
 */
export function resolveSatRefreshResultMapper(
  mapperName: RefreshMapper | undefined
): SatRefreshResultMapper {
  // If no mapper name provided, use default
  if (!mapperName) {
    return getDefaultMapper()
  }

  // Try to resolve from registry
  const mapper = getMapper(mapperName)
  if (mapper) {
    return mapper
  }

  // Log warning for unknown mapper names and return default
  console.warn(`Unknown satRefreshResultMapper: "${mapperName}", using default`)
  return getDefaultMapper()
}
