import { SessionState, CustomSaga } from './interfaces'
import { SDKStore } from './'
import { getSession } from './features/session/sessionSelectors'
import type { BaseComponent } from '../BaseComponent'
import { EventEmitter } from '../utils/EventEmitter'

type SessionEventHandler = (session: SessionState) => unknown
interface Connect<T> {
  sessionListeners?: Partial<
    Record<ReduxSessionKeys, string | SessionEventHandler>
  >
  store: SDKStore
  Component: new (o: any) => T
  customSagas?: Array<CustomSaga<T>>
}
type ReduxSessionKeys = keyof SessionState

export const connect = <
  EventTypes extends EventEmitter.ValidEventTypes,
  /**
   * Class extending BaseComponent.
   */
  T extends BaseComponent<EventTypes>,
  /**
   * The type the end user will be interacting with.
   */
  TargetType
>(
  options: Connect<T>
) => {
  const { sessionListeners = {}, store, Component, customSagas = [] } = options
  const sessionKeys = Object.keys(sessionListeners) as ReduxSessionKeys[]

  return (userOptions: any): TargetType => {
    const instance = new Component({ ...userOptions, store })
    const cacheMap = new Map<string, any>()
    /**
     * Stop the execution of the redux listeners if `destroyer`
     * below was called in the meantime.
     */
    let run = true

    const storeUnsubscribe = store.subscribe(() => {
      const state = store.getState()

      const session = getSession(state)
      for (const reduxKey of sessionKeys) {
        if (run === false) {
          return
        }
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
      }
    })

    // Run all the custom sagas
    const taskList = customSagas?.map((saga) => {
      return store.runSaga(saga, { instance, runSaga: store.runSaga })
    })

    instance.destroyer = () => {
      run = false
      storeUnsubscribe()
      cacheMap.clear()

      // Cancel all the custom sagas
      if (taskList?.length) {
        taskList.forEach((task) => task.cancel())
      }
    }

    return instance as any as TargetType
  }
}
