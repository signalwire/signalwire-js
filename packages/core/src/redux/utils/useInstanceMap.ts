import { InstanceMap } from '../../utils/interfaces'

export const useInstanceMap = (): InstanceMap => {
  /**
   * Generic map stores multiple instance
   * For eg;
   * callId => CallInstance
   * controlId => PlaybackInstance | RecordingInstance
   */
  const instanceMap = new Map<string, unknown>()

  const getInstance = <T extends unknown>(key: string): T => {
    return instanceMap.get(key) as T
  }

  const setInstance = <T extends unknown>(key: string, value: T) => {
    instanceMap.set(key, value)
    return instanceMap as Map<string, T>
  }

  const deleteInstance = <T extends unknown>(key: string) => {
    instanceMap.delete(key)
    return instanceMap as Map<string, T>
  }

  const getAllInstances = () => {
    return Array.from(instanceMap.entries())
  }

  const deleteAllInstances = () => {
    instanceMap.clear()
    return instanceMap
  }

  return {
    get: getInstance,
    set: setInstance,
    remove: deleteInstance,
    getAll: getAllInstances,
    deleteAll: deleteAllInstances,
  }
}
