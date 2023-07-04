import jwtDecode from 'jwt-decode'
import { getLogger } from '@signalwire/core'

/**
 * Note: ready to support RN with a "storage.native.ts" file.
 */
export const getStorage = () => {
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
    if (process.env.NODE_ENV !== 'production') {
      getLogger().error('[sessionStorageManager] error decoding JWT', token)
    }
    roomName = ''
  }

  const valid = Boolean(roomName)
  return {
    authStateKey: valid && `as-${roomName}`,
    protocolKey: valid && `pt-${roomName}`,
    callIdKey: valid && `ci-${roomName}`,
  }
}
