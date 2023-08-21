export const useInstanceMap = () => {
  // Generic map stores multiple instance
  // For eg;
  // callId => CallInstance
  // controlId => PlaybackInstance | RecordingInstance
  const instanceMap = new Map<string, unknown>()

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

  return {
    get: getInstance,
    set: setInstance,
    remove: deleteInstance,
  }
}
