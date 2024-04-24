export const useInstanceMap = () => {
  // Generic map stores multiple instance
  // For eg;
  // callId => CallInstance
  // controlId => PlaybackInstance | RecordingInstance
  let instanceMap = new Map<string, unknown>()

  const getInstance = <T extends unknown>(key: string): T => {
    return instanceMap.get(key) as T
  }

  const setInstance = <T extends unknown>(key: string, value: T) => {
    instanceMap.set(key, value)
    return instanceMap
  }

  const deleteInstance = (key: string) => {
    instanceMap.delete(key)
    return instanceMap
  }

  const getAllInstances = () => {
    return Array.from(instanceMap.entries())
  }

  const deletaAll = () => {
    instanceMap = new Map<string, unknown>()
  }

  return {
    get: getInstance,
    set: setInstance,
    remove: deleteInstance,
    getAll: getAllInstances,
    deletaAll: deletaAll
  }
}
