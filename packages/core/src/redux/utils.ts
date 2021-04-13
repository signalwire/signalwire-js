import { getStore } from './index'

export const connect = (mapState: any, componentKlass: any) => {
  const store = getStore()
  const { onStateChangeListeners = {} } = mapState
  const componentKeys = Object.keys(onStateChangeListeners)

  return (userOptions: any) => {
    const instance = new componentKlass({ ...userOptions, store })
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
