import { configureStore as rtConfigureStore } from '@reduxjs/toolkit'
import createSagaMiddleware, { Saga } from 'redux-saga'
import { rootReducer } from './rootReducer'
import rootSaga from './rootSaga'
import { GetDefaultSagas, SDKState } from './interfaces'
import { connect } from './utils'
import { UserOptions } from '../utils/interfaces'

interface ConfigureStoreOptions {
  userOptions: UserOptions
  runSagaMiddleware?: boolean
  sagas?: (fn: GetDefaultSagas) => Saga[]
  preloadedState?: Partial<SDKState>
}

const configureStore = (options: ConfigureStoreOptions) => {
  const {
    userOptions,
    preloadedState = {},
    runSagaMiddleware = true,
    sagas,
  } = options
  const sagaMiddleware = createSagaMiddleware()

  const store = rtConfigureStore({
    devTools: userOptions?.devTools ?? true,
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

  // @ts-ignore
  window['__store'] = store

  if (runSagaMiddleware) {
    const saga = rootSaga({
      // In here the consumer will have the option to setup
      // different root sagas
      sagas,
    })
    sagaMiddleware.run(saga, userOptions)
  }

  return store
}

export { connect, configureStore }
export * from './actions'
