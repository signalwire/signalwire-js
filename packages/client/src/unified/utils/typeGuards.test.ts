import {
  isValidProfile,
  isStringArray,
  isValidAddress,
  safeJsonParse,
} from './typeGuards'
import { ProfileType } from '../interfaces/clientFactory'
import type { ResourceType } from '../interfaces/address'

describe('TypeGuards', () => {
  describe('isValidProfile', () => {
    const validProfile = {
      id: 'test-profile-id',
      type: ProfileType.STATIC,
      credentialsId: 'test-cred-id',
      credentials: {
        satToken: 'sat-token',
        tokenExpiry: Date.now() + 3600000,
        satRefreshPayload: {
          refresh_token: 'refresh-token',
        },
        satRefreshURL: 'https://api.signalwire.com/auth/refresh',
        satRefreshResultMapper: (body: Record<string, any>) => ({
          satToken: body.access_token || 'token',
          tokenExpiry: body.expires_at || Date.now() + 3600000,
          satRefreshPayload: body.refresh_payload || {}
        }),
      },
      addressId: 'address-id',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    it('should return true for valid profile', () => {
      expect(isValidProfile(validProfile)).toBe(true)
    })

    it('should return true for valid profile with optional fields', () => {
      const profileWithOptionals = {
        ...validProfile,
        lastUsed: Date.now(),
        addressDetails: {
          type: 'room' as ResourceType,
          name: 'test-room',
          displayName: 'Test Room',
          channels: 4,
        },
      }

      expect(isValidProfile(profileWithOptionals)).toBe(true)
    })

    it('should return false for null or undefined', () => {
      expect(isValidProfile(null)).toBe(false)
      expect(isValidProfile(undefined)).toBe(false)
    })

    it('should return false for non-object values', () => {
      expect(isValidProfile('string')).toBe(false)
      expect(isValidProfile(123)).toBe(false)
      expect(isValidProfile(true)).toBe(false)
      expect(isValidProfile([])).toBe(false)
    })

    it('should return false for missing required fields', () => {
      // Missing id
      const missingId = { ...validProfile }
      delete (missingId as any).id
      expect(isValidProfile(missingId)).toBe(false)

      // Missing type
      const missingType = { ...validProfile }
      delete (missingType as any).type
      expect(isValidProfile(missingType)).toBe(false)

      // Missing credentialsId
      const missingCredId = { ...validProfile }
      delete (missingCredId as any).credentialsId
      expect(isValidProfile(missingCredId)).toBe(false)

      // Missing addressId
      const missingAddrId = { ...validProfile }
      delete (missingAddrId as any).addressId
      expect(isValidProfile(missingAddrId)).toBe(false)

      // Missing createdAt
      const missingCreatedAt = { ...validProfile }
      delete (missingCreatedAt as any).createdAt
      expect(isValidProfile(missingCreatedAt)).toBe(false)

      // Missing updatedAt
      const missingUpdatedAt = { ...validProfile }
      delete (missingUpdatedAt as any).updatedAt
      expect(isValidProfile(missingUpdatedAt)).toBe(false)
    })

    it('should return false for invalid field types', () => {
      // Invalid id type
      expect(
        isValidProfile({
          ...validProfile,
          id: 123,
        })
      ).toBe(false)

      // Invalid type
      expect(
        isValidProfile({
          ...validProfile,
          type: 'invalid-type',
        })
      ).toBe(false)

      // Invalid credentialsId type
      expect(
        isValidProfile({
          ...validProfile,
          credentialsId: 123,
        })
      ).toBe(false)

      // Invalid addressId type
      expect(
        isValidProfile({
          ...validProfile,
          addressId: null,
        })
      ).toBe(false)

      // Invalid createdAt type
      expect(
        isValidProfile({
          ...validProfile,
          createdAt: 'invalid-date',
        })
      ).toBe(false)

      // Invalid updatedAt type
      expect(
        isValidProfile({
          ...validProfile,
          updatedAt: new Date(),
        })
      ).toBe(false)
    })

    it('should return false for missing credentials object', () => {
      const missingCredentials = { ...validProfile }
      delete (missingCredentials as any).credentials
      expect(isValidProfile(missingCredentials)).toBe(false)
    })

    it('should return false for invalid credentials object', () => {
      // Credentials not an object
      expect(
        isValidProfile({
          ...validProfile,
          credentials: 'not-an-object',
        })
      ).toBe(false)

      // Missing satToken
      expect(
        isValidProfile({
          ...validProfile,
          credentials: {
            ...validProfile.credentials,
            satToken: undefined,
          },
        })
      ).toBe(false)

      // Invalid satToken type
      expect(
        isValidProfile({
          ...validProfile,
          credentials: {
            ...validProfile.credentials,
            satToken: 123,
          },
        })
      ).toBe(false)

      // Missing satRefreshPayload
      expect(
        isValidProfile({
          ...validProfile,
          credentials: {
            ...validProfile.credentials,
            satRefreshPayload: undefined,
          },
        })
      ).toBe(false)

      // Invalid tokenExpiry type
      expect(
        isValidProfile({
          ...validProfile,
          credentials: {
            ...validProfile.credentials,
            tokenExpiry: 'invalid-expiry',
          },
        })
      ).toBe(false)

      // Missing satRefreshURL
      expect(
        isValidProfile({
          ...validProfile,
          credentials: {
            ...validProfile.credentials,
            satRefreshURL: undefined,
          },
        })
      ).toBe(false)

      // Missing satRefreshResultMapper
      expect(
        isValidProfile({
          ...validProfile,
          credentials: {
            ...validProfile.credentials,
            satRefreshResultMapper: undefined,
          },
        })
      ).toBe(false)
    })

    it('should return false for invalid optional lastUsed field', () => {
      expect(
        isValidProfile({
          ...validProfile,
          lastUsed: 'invalid-timestamp',
        })
      ).toBe(false)
    })

    it('should return false for invalid addressDetails object', () => {
      // addressDetails not an object
      expect(
        isValidProfile({
          ...validProfile,
          addressDetails: 'not-an-object',
        })
      ).toBe(false)

      // Invalid type in addressDetails
      expect(
        isValidProfile({
          ...validProfile,
          addressDetails: {
            type: 'invalid-resource-type',
            name: 'test-name',
          },
        })
      ).toBe(false)

      // Missing name in addressDetails
      expect(
        isValidProfile({
          ...validProfile,
          addressDetails: {
            type: 'room' as ResourceType,
          },
        })
      ).toBe(false)

      // Invalid name type in addressDetails
      expect(
        isValidProfile({
          ...validProfile,
          addressDetails: {
            type: 'room' as ResourceType,
            name: 123,
          },
        })
      ).toBe(false)

      // Invalid displayName type
      expect(
        isValidProfile({
          ...validProfile,
          addressDetails: {
            type: 'room' as ResourceType,
            name: 'test-name',
            displayName: 123,
          },
        })
      ).toBe(false)

      // Invalid channels type
      expect(
        isValidProfile({
          ...validProfile,
          addressDetails: {
            type: 'room' as ResourceType,
            name: 'test-name',
            channels: 'invalid-channels',
          },
        })
      ).toBe(false)
    })

    it('should handle ProfileType enum values correctly', () => {
      expect(
        isValidProfile({
          ...validProfile,
          type: ProfileType.STATIC,
        })
      ).toBe(true)

      expect(
        isValidProfile({
          ...validProfile,
          type: ProfileType.DYNAMIC,
        })
      ).toBe(true)
    })
  })

  describe('isStringArray', () => {
    it('should return true for valid string arrays', () => {
      expect(isStringArray([])).toBe(true)
      expect(isStringArray(['string1'])).toBe(true)
      expect(isStringArray(['string1', 'string2', 'string3'])).toBe(true)
      expect(isStringArray([''])).toBe(true) // Empty strings are still strings
    })

    it('should return false for non-arrays', () => {
      expect(isStringArray(null)).toBe(false)
      expect(isStringArray(undefined)).toBe(false)
      expect(isStringArray('string')).toBe(false)
      expect(isStringArray(123)).toBe(false)
      expect(isStringArray({})).toBe(false)
    })

    it('should return false for arrays with non-string elements', () => {
      expect(isStringArray([123])).toBe(false)
      expect(isStringArray(['string', 123])).toBe(false)
      expect(isStringArray([null])).toBe(false)
      expect(isStringArray([undefined])).toBe(false)
      expect(isStringArray([{}])).toBe(false)
      expect(isStringArray([[]])).toBe(false)
      expect(isStringArray(['string', null, 'string'])).toBe(false)
    })

    it('should handle mixed type arrays correctly', () => {
      expect(isStringArray(['string', true])).toBe(false)
      expect(isStringArray(['string', 0])).toBe(false)
      expect(isStringArray(['string', {}])).toBe(false)
    })
  })

  describe('isValidAddress', () => {
    const validAddress = {
      id: 'address-id',
      type: 'room' as ResourceType,
      name: 'address-name',
    }

    it('should return true for valid address', () => {
      expect(isValidAddress(validAddress)).toBe(true)
    })

    it('should return true for valid address with optional fields', () => {
      const addressWithOptionals = {
        ...validAddress,
        display_name: 'Display Name',
        channels: { audio: 'enabled', video: 'enabled' },
      }

      expect(isValidAddress(addressWithOptionals)).toBe(true)
    })

    it('should return false for null or undefined', () => {
      expect(isValidAddress(null)).toBe(false)
      expect(isValidAddress(undefined)).toBe(false)
    })

    it('should return false for non-object values', () => {
      expect(isValidAddress('string')).toBe(false)
      expect(isValidAddress(123)).toBe(false)
      expect(isValidAddress(true)).toBe(false)
      expect(isValidAddress([])).toBe(false)
    })

    it('should return false for missing required fields', () => {
      // Missing id
      const missingId = { ...validAddress }
      delete (missingId as any).id
      expect(isValidAddress(missingId)).toBe(false)

      // Missing type
      const missingType = { ...validAddress }
      delete (missingType as any).type
      expect(isValidAddress(missingType)).toBe(false)

      // Missing name
      const missingName = { ...validAddress }
      delete (missingName as any).name
      expect(isValidAddress(missingName)).toBe(false)
    })

    it('should return false for invalid field types', () => {
      // Invalid id type
      expect(
        isValidAddress({
          ...validAddress,
          id: 123,
        })
      ).toBe(false)

      // Invalid type
      expect(
        isValidAddress({
          ...validAddress,
          type: 'invalid-type',
        })
      ).toBe(false)

      // Invalid name type
      expect(
        isValidAddress({
          ...validAddress,
          name: 123,
        })
      ).toBe(false)
    })

    it('should handle all valid ResourceType values', () => {
      const resourceTypes: ResourceType[] = [
        'app',
        'call',
        'room',
        'subscriber',
      ]

      resourceTypes.forEach((type) => {
        expect(
          isValidAddress({
            ...validAddress,
            type,
          })
        ).toBe(true)
      })
    })
  })

  describe('safeJsonParse', () => {
    it('should parse and validate valid JSON', () => {
      const validData = { test: 'data', number: 123 }
      const json = JSON.stringify(validData)

      const validator = (data: unknown): data is typeof validData => {
        return (
          typeof data === 'object' &&
          data !== null &&
          typeof (data as any).test === 'string' &&
          typeof (data as any).number === 'number'
        )
      }

      const result = safeJsonParse(json, validator)
      expect(result).toEqual(validData)
    })

    it('should return null for invalid JSON syntax', () => {
      const invalidJson = '{ invalid json'
      const validator = (data: unknown): data is any => true

      const result = safeJsonParse(invalidJson, validator)
      expect(result).toBeNull()
    })

    it('should return null when validator fails', () => {
      const data = { test: 'data' }
      const json = JSON.stringify(data)

      // Validator that always returns false
      const failingValidator = (data: unknown): data is any => false

      const result = safeJsonParse(json, failingValidator)
      expect(result).toBeNull()
    })

    it('should work with isValidProfile validator', () => {
      // Note: Functions cannot be serialized to JSON, so this test
      // validates that safeJsonParse correctly returns null for
      // profiles that lose their function properties during serialization
      const validProfile = {
        id: 'test-profile-id',
        type: ProfileType.STATIC,
        credentialsId: 'test-cred-id',
        credentials: {
          satToken: 'sat-token',
          tokenExpiry: Date.now() + 3600000,
          satRefreshPayload: {
            refresh_token: 'refresh-token',
          },
          satRefreshURL: 'https://api.signalwire.com/auth/refresh',
          satRefreshResultMapper: (body: Record<string, any>) => ({
            satToken: body.access_token || 'token',
            tokenExpiry: body.expires_at || Date.now() + 3600000,
            satRefreshPayload: body.refresh_payload || {}
          }),
        },
        addressId: 'address-id',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // When serialized to JSON, the function will be lost
      const json = JSON.stringify(validProfile)
      const result = safeJsonParse(json, isValidProfile)

      // The result should be null because the function is lost during serialization
      expect(result).toBeNull()
    })

    it('should work with isStringArray validator', () => {
      const validArray = ['string1', 'string2', 'string3']
      const json = JSON.stringify(validArray)

      const result = safeJsonParse(json, isStringArray)
      expect(result).toEqual(validArray)
    })

    it('should return null for valid JSON that fails validation', () => {
      const invalidProfile = {
        id: 123, // Invalid: should be string
        type: 'invalid-type',
      }

      const json = JSON.stringify(invalidProfile)
      const result = safeJsonParse(json, isValidProfile)

      expect(result).toBeNull()
    })

    it('should handle empty objects and arrays', () => {
      expect(
        safeJsonParse('{}', (data): data is object => typeof data === 'object')
      ).toEqual({})
      expect(safeJsonParse('[]', Array.isArray)).toEqual([])
    })

    it('should handle primitive values', () => {
      expect(
        safeJsonParse(
          '"string"',
          (data): data is string => typeof data === 'string'
        )
      ).toBe('string')
      expect(
        safeJsonParse('123', (data): data is number => typeof data === 'number')
      ).toBe(123)
      expect(
        safeJsonParse(
          'true',
          (data): data is boolean => typeof data === 'boolean'
        )
      ).toBe(true)
      expect(safeJsonParse('null', (data): data is null => data === null)).toBe(
        null
      )
    })

    it('should handle complex nested validation', () => {
      const complexData = {
        users: [
          { name: 'User1', age: 25 },
          { name: 'User2', age: 30 },
        ],
        metadata: {
          count: 2,
          active: true,
        },
      }

      const complexValidator = (data: unknown): data is typeof complexData => {
        if (typeof data !== 'object' || data === null) return false
        const obj = data as any

        return (
          Array.isArray(obj.users) &&
          obj.users.every(
            (user: any) =>
              typeof user.name === 'string' && typeof user.age === 'number'
          ) &&
          typeof obj.metadata === 'object' &&
          typeof obj.metadata.count === 'number' &&
          typeof obj.metadata.active === 'boolean'
        )
      }

      const json = JSON.stringify(complexData)
      const result = safeJsonParse(json, complexValidator)

      expect(result).toEqual(complexData)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle circular references in validation gracefully', () => {
      // Note: JSON.parse would fail on circular references anyway,
      // but this tests the validator doesn't crash
      const validator = (data: unknown): data is any => {
        try {
          // This validator attempts to access properties that might cause issues
          return typeof data === 'object' && data !== null
        } catch {
          return false
        }
      }

      const result = safeJsonParse('{"valid": "object"}', validator)
      expect(result).toEqual({ valid: 'object' })
    })

    it('should handle very large objects within JSON parse limits', () => {
      const largeObject = {
        data: Array(1000)
          .fill(0)
          .map((_, i) => ({ id: i, name: `item-${i}` })),
      }

      const validator = (data: unknown): data is typeof largeObject => {
        return (
          typeof data === 'object' &&
          data !== null &&
          Array.isArray((data as any).data) &&
          (data as any).data.length === 1000
        )
      }

      const json = JSON.stringify(largeObject)
      const result = safeJsonParse(json, validator)

      expect(result).toEqual(largeObject)
      expect(result?.data).toHaveLength(1000)
    })

    it('should handle unicode and special characters', () => {
      const unicodeData = {
        emoji: '🚀',
        chinese: '你好',
        special: 'Special chars: !@#$%^&*()',
        quotes: 'String with "quotes" and \'apostrophes\'',
      }

      const validator = (data: unknown): data is typeof unicodeData => {
        return (
          typeof data === 'object' &&
          data !== null &&
          typeof (data as any).emoji === 'string' &&
          typeof (data as any).chinese === 'string'
        )
      }

      const json = JSON.stringify(unicodeData)
      const result = safeJsonParse(json, validator)

      expect(result).toEqual(unicodeData)
    })
  })
})
