import jwtDecode from 'jwt-decode'
import { getLogger, getGlobalStorageInstance } from '@signalwire/core'
import { PREVIOUS_CALLID_STORAGE_KEY } from '../unified/utils/constants'

// Helper function to mutate storage keys with prefix
const mutateStorageKey = (key: string) => `@signalwire:${key}`

export const getCallIdKey = (profileId?: string) =>
  `${PREVIOUS_CALLID_STORAGE_KEY}${profileId ? ':'+profileId : ''}`
/**
 * Note: ready to support RN with a "storage.native.ts" file.
 */
export const getStorage = () => {
  const globalStorage = getGlobalStorageInstance()

  if (globalStorage && typeof globalStorage.getSession === 'function') {
    // Return a proxy object that mimics sessionStorage API but uses global storage session methods
    return {
      getItem: (key: string) => {
        try {
          // Convert async to sync by returning the promise result directly
          // Note: This maintains compatibility with existing sessionStorage usage
          return globalStorage.getSession(mutateStorageKey(key))
        } catch (error) {
          return null
        }
      },
      setItem: (key: string, value: any): void | Promise<void> => {
        try {
          return globalStorage.setSession(mutateStorageKey(key), value)
        } catch (error) {
          // Silently handle errors
        }
      },
      removeItem: (key: string): boolean | Promise<boolean> | void => {
        try {
          return globalStorage.deleteSession(mutateStorageKey(key))
        } catch (error) {
          // Silently handle errors
        }
      },
      clear: (): void | Promise<void> => {
        try {
          return globalStorage.clearSession()
        } catch (error) {
          // Silently handle errors
        }
      },
      length: 0, // Not implemented for custom storage
      key: () => null, // Not implemented for custom storage
    }
  }

  if (window && window.sessionStorage) {
    return window.sessionStorage
  }
  return undefined
}

export const sessionStorageManager = (token: string, profileId?: string) => {
  let keySuffix: string | false = false
  
  try {
    // First try to decode JWT header to check token type
    let tokenType = 'unknown'
    try {
      const jwtHeader = jwtDecode<{ typ?: string }>(token, { header: true })
      tokenType = jwtHeader.typ || 'unknown'
    } catch {
      // Header decode failed, try to infer from token prefix
      if (token.startsWith('SAT') || token.startsWith('PT')) {
        tokenType = 'SAT'
      }
    }
    
    if (tokenType === 'SAT') {
      // For SAT tokens, always use "SAT" as the suffix
      keySuffix = `SAT${profileId ? ':' + profileId : ''}`
    } else {
      // For other tokens (like VRT), decode payload to get the 'r' field
      const jwtPayload = jwtDecode<{ r?: string }>(token)
      keySuffix = jwtPayload.r ? `${jwtPayload.r}${profileId ? ':' + profileId : ''}` : false
    }
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      getLogger().error('[sessionStorageManager] error decoding JWT', token)
    }
    keySuffix = false
  }

  return {
    authStateKey: keySuffix ? `as-${keySuffix}` : false,
    protocolKey: keySuffix ? `pt-${keySuffix}` : false,
    callIdKey: keySuffix ? `ci-${keySuffix}` : false,
  }
}
