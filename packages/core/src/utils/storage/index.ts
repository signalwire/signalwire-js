import { mutateStorageKey, safeParseJson } from '../'
import { SignalWireStorageContract, StorageInfo } from '../../types/SignalwireStorageContract'

export { SignalWireStorageContract, StorageInfo }

// Global storage instance for SignalWire SDK
let globalStorageInstance: SignalWireStorageContract | null = null

/**
 * Set the global storage instance for the SignalWire SDK
 * @param storage - Storage instance implementing SignalWire storage contract
 */
export const setGlobalStorageInstance = (storage: SignalWireStorageContract | null): void => {
  globalStorageInstance = storage
}

/**
 * Get the global storage instance for the SignalWire SDK
 * @returns Global storage instance or null if not set
 */
export const getGlobalStorageInstance = (): SignalWireStorageContract | null => {
  return globalStorageInstance
}

const _inNode = () =>
  typeof window === 'undefined' && typeof process !== 'undefined'

const _get = async (storageType: 'localStorage' | 'sessionStorage', key: string): Promise<any> => {
  if (_inNode()) return null

  const res = window[storageType].getItem(mutateStorageKey(key))
  return safeParseJson(res)
}

const _set = async (
  storageType: 'localStorage' | 'sessionStorage',
  key: string,
  value: any
): Promise<void> => {
  if (_inNode()) return

  if (typeof value === 'object') {
    value = JSON.stringify(value)
  }
  window[storageType].setItem(mutateStorageKey(key), value)
}

const _remove = async (storageType: 'localStorage' | 'sessionStorage', key: string): Promise<void> => {
  if (_inNode()) return

  window[storageType].removeItem(mutateStorageKey(key))
}

/**
 * Get item from persistent storage - uses global storage if available, fallback to localStorage
 * @param key - Storage key
 * @returns Stored value or null
 */
export const getItem = async (key: string): Promise<any> => {
  try {
    const globalStorage = getGlobalStorageInstance()
    if (globalStorage && typeof globalStorage.get === 'function') {
      return await globalStorage.get(mutateStorageKey(key))
    }
    return await _get('localStorage', key)
  } catch (error) {
    return null
  }
}

/**
 * Set item in persistent storage - uses global storage if available, fallback to localStorage
 * @param key - Storage key
 * @param value - Value to store
 */
export const setItem = async (key: string, value: any): Promise<void> => {
  try {
    const globalStorage = getGlobalStorageInstance()
    if (globalStorage && typeof globalStorage.set === 'function') {
      await globalStorage.set(mutateStorageKey(key), value)
      return
    }
    await _set('localStorage', key, value)
  } catch (error) {
    // Silently handle errors - maintain null return pattern
  }
}

/**
 * Remove item from persistent storage - uses global storage if available, fallback to localStorage
 * @param key - Storage key
 */
export const removeItem = async (key: string): Promise<void> => {
  try {
    const globalStorage = getGlobalStorageInstance()
    if (globalStorage && typeof globalStorage.delete === 'function') {
      await globalStorage.delete(mutateStorageKey(key))
      return
    }
    await _remove('localStorage', key)
  } catch (error) {
    // Silently handle errors - maintain null return pattern
  }
}

export const localStorage = {
  getItem: (key: string): Promise<any> => _get('localStorage', key),
  setItem: (key: string, value: any): Promise<void> =>
    _set('localStorage', key, value),
  removeItem: (key: string): Promise<void> => _remove('localStorage', key),
}

export const sessionStorage = {
  getItem: (key: string): Promise<any> => _get('sessionStorage', key),
  setItem: (key: string, value: any): Promise<void> =>
    _set('sessionStorage', key, value),
  removeItem: (key: string): Promise<void> => _remove('sessionStorage', key),
}
