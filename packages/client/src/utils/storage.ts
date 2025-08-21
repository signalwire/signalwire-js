import jwtDecode from 'jwt-decode'
import { getLogger, getGlobalStorageInstance } from '@signalwire/core'

// Helper function to mutate storage keys with prefix
const mutateStorageKey = (key: string) => `@signalwire:${key}`

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

export const sessionStorageManager = (token: string) => {
  let roomName: string = ''
  try {
    const jwtPayload = jwtDecode<{ r: string; ja: string }>(token)
    roomName = jwtPayload?.r ?? ''
  } catch (e) {
    try {
      const jwtPayload = jwtDecode<{ typ: string}>(token, {header: true})
      roomName = jwtPayload.typ || ''
    } catch {
      if (process.env.NODE_ENV !== 'production') {
        getLogger().error('[sessionStorageManager] error decoding JWT', token)
      }
      roomName = ''
    }
  }

  const valid = Boolean(roomName)
  return {
    authStateKey: valid && `as-${roomName}`,
    protocolKey: valid && `pt-${roomName}`,
    callIdKey: valid && `ci-${roomName}`,
  }
}
