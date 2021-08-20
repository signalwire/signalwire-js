import { ReduxComponent, SessionState, CustomSaga } from './interfaces'
import { SDKStore } from './'
import { componentActions } from './features'
import { getComponent } from './features/component/componentSelectors'
import { getSession } from './features/session/sessionSelectors'
import type { BaseComponent } from '../BaseComponent'

type ComponentEventHandler = (component: ReduxComponent) => unknown
type SessionEventHandler = (session: SessionState) => unknown
interface Connect<T> {
  componentListeners: Record<string, string | ComponentEventHandler>
  sessionListeners?: Partial<
    Record<ReduxSessionKeys, string | SessionEventHandler>
  >
  store: SDKStore
  Component: new (o: any) => T
  customSagas?: Array<CustomSaga<T>>
}
type ReduxComponentKeys = keyof ReduxComponent
type ReduxSessionKeys = keyof SessionState

export const connect = <T extends BaseComponent>(options: Connect<T>) => {
  const {
    componentListeners = {},
    sessionListeners = {},
    store,
    Component,
    customSagas = [],
  } = options
  const componentKeys = Object.keys(componentListeners) as ReduxComponentKeys[]
  const sessionKeys = Object.keys(sessionListeners) as ReduxSessionKeys[]

  return (userOptions: any) => {
    const instance = new Component({ ...userOptions, store })
    const cacheMap = new Map<string, any>()

    const storeUnsubscribe = store.subscribe(() => {
      const component = getComponent(store.getState(), instance.__uuid)
      if (!component) {
        return
      }
      componentKeys.forEach((reduxKey) => {
        const cacheKey = `${instance.__uuid}.${reduxKey}`
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

      // TODO: refactor this to avoid repetition with the above.
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
    store.dispatch(componentActions.upsert({ id: instance.__uuid }))

    // Run all the custom sagas
    const taskList = customSagas?.map((saga) => {
      return store.runSaga(saga, { instance, runSaga: store.runSaga })
    })

    instance.destroyer = () => {
      storeUnsubscribe()
      cacheMap.clear()

      // Cancel all the custom sagas
      if (taskList?.length) {
        taskList.forEach((task) => task.cancel())
      }
    }

    return instance
  }
}
