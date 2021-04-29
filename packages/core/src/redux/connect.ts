import { Store } from 'redux'
import { ComponentState } from './interfaces'
import { BaseComponent } from '../BaseComponent'
import { componentActions } from './features'

type ConnectEventHandler = (state: ComponentState) => any
interface Connect<T extends typeof BaseComponent> {
  onStateChangeListeners: Record<string, string | ConnectEventHandler>
  store: Store
  Component: T
}

export const connect = <T extends typeof BaseComponent>(
  options: Connect<T>
) => {
  const { onStateChangeListeners = {}, store, Component } = options
  const componentKeys = Object.keys(onStateChangeListeners)

  return (userOptions: any) => {
    console.log('userOptions ?', { ...userOptions, store })
    const instance = new Component({ ...userOptions, store })
    const cacheMap = new Map<string, any>()

    const storeUnsubscribe = store.subscribe(() => {
      const { components = {} } = store.getState()
      componentKeys.forEach((key) => {
        const current = cacheMap.get(key)
        const updatedValue = components?.[instance.id]?.[key]
        if (updatedValue !== undefined && current !== updatedValue) {
          cacheMap.set(key, updatedValue)
          const fnName = onStateChangeListeners[key]

          if (typeof fnName === 'string') {
            // FIXME: fixing TS error typing fnName properly
            // @ts-ignore
            instance[fnName](components[instance.id])
          } else {
            fnName(components[instance.id])
          }
        }
      })
    })
    store.dispatch(componentActions.update({ id: instance.id }))

    instance.destroyer = () => {
      storeUnsubscribe()
      cacheMap.clear()
    }

    return instance
  }
}
