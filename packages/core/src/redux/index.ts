import { Store, configureStore as rtConfigureStore } from '@reduxjs/toolkit'
import createSagaMiddleware, { Saga } from 'redux-saga'
import { rootReducer } from './rootReducer'
import rootSaga from './rootSaga'
import { GetDefaultSagas, SDKState } from './interfaces'

export type SDKDispatch = typeof store.dispatch
interface ConfigureStoreOptions {
  runSagaMiddleware?: boolean
  sagas?: (fn: GetDefaultSagas) => Saga[]
}

let store: Store
export const getStore = () => {
  if (store) {
    return store
  }
  store = configureStore()
  // @ts-ignore
  window['__store'] = store
  return store
}

export const configureStore = (
  preloadedState: Partial<SDKState> = {},
  options: ConfigureStoreOptions = {}
) => {
  const { runSagaMiddleware = true, sagas } = options
  const sagaMiddleware = createSagaMiddleware()

  const store = rtConfigureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      // It is preferrable to use the chainable .concat(...) and
      // .prepend(...) methods of the returned MiddlewareArray instead
      // of the array spread operator, as the latter can lose valuable
      // type information under some circumstances.
      // @see https://redux-toolkit.js.org/api/getDefaultMiddleware#intended-usage
      getDefaultMiddleware().concat(sagaMiddleware),
  })

  if (runSagaMiddleware) {
    sagaMiddleware.run(
      rootSaga({
        // In here the consumer will have the option to setup
        // different root sagas
        sagas,
      })
    )
  }

  return store
}
