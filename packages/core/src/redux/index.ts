import { Store, configureStore as rtConfigureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import { rootReducer } from './rootReducer'
import rootSaga from './rootSaga'
import { SDKState } from './interfaces'

const sagaMiddleware = createSagaMiddleware()

export type SDKDispatch = typeof store.dispatch
interface ConfigureStoreOptions {
  runSagaMiddleware?: boolean
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
  const { runSagaMiddleware = true } = options

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
    sagaMiddleware.run(rootSaga)
  }

  return store
}
