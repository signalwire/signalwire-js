export const connect = (options: any) => {
  const { onStateChangeListeners = {}, store, Component } = options
  const componentKeys = Object.keys(onStateChangeListeners)

  return (userOptions: any) => {
    const instance = new Component({ ...userOptions, store })
    const cacheMap = new Map<string, any>()
    // const _unsubscribe = store.subscribe(() => {
    store.subscribe(() => {
      const { components = {} } = store.getState()
      componentKeys.forEach((key) => {
        const current = cacheMap.get(key)
        const updatedValue = components[instance.id][key]
        if (current !== updatedValue) {
          cacheMap.set(key, updatedValue)
          const fnName = onStateChangeListeners[key]
          instance[fnName](components[instance.id])
        }
      })
    })

    // TODO: automatically attach unsubscribe to the object destroy
    // TODO: remove instance.id from cacheMap

    return instance
  }
}
