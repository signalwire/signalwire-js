import { Store } from 'redux'
import { ReduxComponent } from './interfaces'
import { componentActions } from './features'
import { getComponent } from './features/component/componentSelectors'
import { getSession } from './features/session/sessionSelectors'
import { SessionState } from '../redux/interfaces'

type ComponentEventHandler = (component: ReduxComponent) => unknown
type SessionEventHandler = (session: SessionState) => unknown
interface Connect<T> {
  componentListeners: Record<string, string | ComponentEventHandler>
  sessionListeners?: Partial<
    Record<ReduxSessionKeys, string | SessionEventHandler>
  >
  store: Store
  Component: new (o: any) => T
}
type ReduxComponentKeys = keyof ReduxComponent
type ReduxSessionKeys = keyof SessionState

export const connect = <T extends { id: string; destroyer: () => void }>(
  options: Connect<T>
) => {
  const {
    componentListeners = {},
    sessionListeners = {},
    store,
    Component,
  } = options
  const componentKeys = Object.keys(componentListeners) as ReduxComponentKeys[]
  const sessionKeys = Object.keys(sessionListeners) as ReduxSessionKeys[]

  return (userOptions: any) => {
    const instance = new Component({ ...userOptions, store })
    const cacheMap = new Map<string, any>()

    const storeUnsubscribe = store.subscribe(() => {
      const component = getComponent(store.getState(), instance.id)
      if (!component) {
        return
      }
      componentKeys.forEach((reduxKey) => {
        const cacheKey = `${instance.id}.${reduxKey}`
        const current = cacheMap.get(cacheKey)
        const updatedValue = component?.[reduxKey]
        if (updatedValue !== undefined && current !== updatedValue) {
          cacheMap.set(cacheKey, updatedValue)
          const fnName = componentListeners[reduxKey]

          if (typeof fnName === 'string') {
            // FIXME: proper types for fnName
            // @ts-ignore
            instance[fnName](component)
          } else {
            fnName(component)
          }
        }
      })

      const session = getSession(store.getState())
      sessionKeys.forEach((reduxKey) => {
        const cacheKey = `session.${reduxKey}`
        const current = cacheMap.get(cacheKey)
        const updatedValue = session[reduxKey]

        if (updatedValue !== undefined && current !== updatedValue) {
          cacheMap.set(cacheKey, updatedValue)
          const fnName = sessionListeners[reduxKey]

          if (typeof fnName === 'string') {
            // FIXME: proper types for fnName
            // @ts-ignore
            instance[fnName](session)
          } else if (typeof fnName === 'function') {
            fnName(session)
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
