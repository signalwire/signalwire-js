import { Store } from 'redux'
import { ReduxComponent } from './interfaces'
import { componentActions } from './features'
import { getComponent } from './features/component/componentSelectors'

type ConnectEventHandler = (component: ReduxComponent) => any
interface Connect<T> {
  onStateChangeListeners: Record<string, string | ConnectEventHandler>
  store: Store
  Component: new (o: any) => T
}
type ReduxComponentKeys = keyof ReduxComponent

export const connect = <T extends { id: string; destroyer: () => void }>(
  options: Connect<T>
) => {
  const { onStateChangeListeners = {}, store, Component } = options
  const componentKeys = Object.keys(
    onStateChangeListeners
  ) as ReduxComponentKeys[]

  return (userOptions: any) => {
    const instance = new Component({ ...userOptions, store })
    const cacheMap = new Map<string, any>()

    const storeUnsubscribe = store.subscribe(() => {
      const component = getComponent(store.getState(), instance.id)
      if (!component) {
        return
      }
      componentKeys.forEach((key) => {
        const current = cacheMap.get(key)
        const updatedValue = component?.[key]
        if (updatedValue !== undefined && current !== updatedValue) {
          cacheMap.set(key, updatedValue)
          const fnName = onStateChangeListeners[key]

          if (typeof fnName === 'string') {
            // FIXME: proper types for fnName
            // @ts-ignore
            instance[fnName](component)
          } else {
            fnName(component)
          }
        }
      })
    })
    store.dispatch(componentActions.upsert({ id: instance.id }))

    instance.destroyer = () => {
      storeUnsubscribe()
      cacheMap.clear()
    }

    return instance
  }
}
