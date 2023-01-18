export const CALL_ID = 'callId'

/**
 * Note: ready to support RN with a "storage.native.ts" file.
 */
export const getStorage = () => {
  if (window && window.sessionStorage) {
    return window.sessionStorage
  }
  return undefined
}
