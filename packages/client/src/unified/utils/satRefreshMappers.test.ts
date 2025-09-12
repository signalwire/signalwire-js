import {
  getMapper,
  getDefaultMapper,
  getAvailableMappers,
  isValidMapperName,
  resolveSatRefreshResultMapper,
} from './satRefreshMappers'

describe('satRefreshMappers', () => {
  describe('getMapper', () => {
    it('should return the default mapper', () => {
      const mapper = getMapper('default')
      expect(mapper).toBeTruthy()
      expect(typeof mapper).toBe('function')
    })

    it('should return the oauth mapper', () => {
      const mapper = getMapper('oauth')
      expect(mapper).toBeTruthy()
      expect(typeof mapper).toBe('function')
    })

    it('should return null for unknown mappers', () => {
      const mapper = getMapper('unknown')
      expect(mapper).toBeNull()
    })
  })

  describe('getDefaultMapper', () => {
    it('should return a function', () => {
      const mapper = getDefaultMapper()
      expect(typeof mapper).toBe('function')
    })

    it('should handle standard SignalWire responses', () => {
      const mapper = getDefaultMapper()
      const body = {
        satToken: 'test-token',
        tokenExpiry: 1234567890,
        satRefreshPayload: { test: true },
      }

      const result = mapper(body)
      expect(result).toEqual({
        satToken: 'test-token',
        tokenExpiry: 1234567890,
        satRefreshPayload: { test: true },
      })
    })

    it('should handle legacy token field', () => {
      const mapper = getDefaultMapper()
      const body = {
        token: 'legacy-token',
        expires_at: 9876543210,
        satRefreshPayload: {},
      }

      const result = mapper(body)
      expect(result).toEqual({
        satToken: 'legacy-token',
        tokenExpiry: 9876543210,
        satRefreshPayload: {},
      })
    })

    it('should provide default values when missing', () => {
      const mapper = getDefaultMapper()
      const body = {}
      const now = Date.now()

      const result = mapper(body)
      expect(result.satToken).toBe(undefined)
      expect(result.tokenExpiry).toBeGreaterThanOrEqual(now + 3500000) // ~1 hour
      expect(result.satRefreshPayload).toEqual({})
    })
  })

  describe('oauth mapper', () => {
    it('should handle OAuth responses with expires_in and created_at', () => {
      const mapper = getMapper('oauth')!
      const body = {
        access_token: 'eyJhbGciOiJkaXIi...',
        token_type: 'Bearer',
        expires_in: 7200,
        refresh_token: '4ZCiRTHJq5wcmcPnwi4N48-uCDQ0GrN1oUxG5hFrVZk',
        scope: 'read write',
        created_at: 1757367971,
      }

      const result = mapper(body)
      expect(result.satToken).toBe('eyJhbGciOiJkaXIi...')
      expect(result.tokenExpiry).toBe(1757367971000 + 7200000) // created_at + expires_in in ms
      expect(result.satRefreshPayload).toEqual({
        refresh_token: '4ZCiRTHJq5wcmcPnwi4N48-uCDQ0GrN1oUxG5hFrVZk',
        grant_type: 'refresh_token',
      })
    })

    it('should handle OAuth responses with expires_in but no created_at', () => {
      const mapper = getMapper('oauth')!
      const now = Date.now()
      const body = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh',
        scope: 'read',
      }

      const result = mapper(body)
      expect(result.satToken).toBe('test-token')
      expect(result.tokenExpiry).toBeGreaterThanOrEqual(now + 3500000) // ~1 hour from now
      expect(result.satRefreshPayload).toEqual({
        refresh_token: 'test-refresh',
        grant_type: 'refresh_token',
      })
    })

    it('should provide default expiry when expires_in is missing', () => {
      const mapper = getMapper('oauth')!
      const now = Date.now()
      const body = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
      }

      const result = mapper(body)
      expect(result.satToken).toBe('test-token')
      expect(result.tokenExpiry).toBeGreaterThanOrEqual(now + 3500000) // ~1 hour from now
      expect(result.satRefreshPayload).toEqual({
        refresh_token: 'test-refresh',
        grant_type: 'refresh_token',
      })
    })
  })

  describe('getAvailableMappers', () => {
    it('should return all available mapper names', () => {
      const mappers = getAvailableMappers()
      expect(mappers).toContain('default')
      expect(mappers).toContain('oauth')
      expect(mappers.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('isValidMapperName', () => {
    it('should return true for valid mapper names', () => {
      expect(isValidMapperName('default')).toBe(true)
      expect(isValidMapperName('oauth')).toBe(true)
    })

    it('should return false for invalid mapper names', () => {
      expect(isValidMapperName('unknown')).toBe(false)
      expect(isValidMapperName('')).toBe(false)
    })
  })

  describe('resolveSatRefreshResultMapper', () => {
    it('should resolve string mapper names to functions', () => {
      const result = resolveSatRefreshResultMapper('oauth')
      expect(typeof result).toBe('function')

      // Test that it works as oauth mapper
      const oauthResponse = {
        access_token: 'test-token',
        expires_in: 3600,
        refresh_token: 'refresh-token',
      }
      const mapped = result(oauthResponse)
      expect(mapped.satToken).toBe('test-token')
      expect(mapped.satRefreshPayload.refresh_token).toBe('refresh-token')
    })

    it('should return default mapper for unknown strings', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = resolveSatRefreshResultMapper('unknown-mapper')
      expect(typeof result).toBe('function')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unknown satRefreshResultMapper: "unknown-mapper", using default'
      )

      consoleSpy.mockRestore()
    })

    it('should return default mapper for undefined input', () => {
      const result = resolveSatRefreshResultMapper(undefined)
      expect(typeof result).toBe('function')
      expect(result).toBe(getDefaultMapper())
    })
  })
})
