import { configureStore as rtConfigureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from '@redux-saga/core'
import { rootReducer } from './rootReducer'
import rootSaga from './rootSaga'
import { SDKState } from './interfaces'
import { connect } from './connect'
import { InternalUserOptions, SessionConstructor } from '../utils/interfaces'

interface ConfigureStoreOptions {
  userOptions: InternalUserOptions
  SessionConstructor: SessionConstructor
  runSagaMiddleware?: boolean
  preloadedState?: Partial<SDKState>
}

export type SDKStore = ReturnType<typeof configureStore>

const configureStore = (options: ConfigureStoreOptions) => {
  const {
    userOptions,
    SessionConstructor,
    preloadedState = {},
    runSagaMiddleware = true,
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

  if (runSagaMiddleware) {
    const saga = rootSaga({
      SessionConstructor,
    })
    sagaMiddleware.run(saga, userOptions)
  }

  return {
    ...store,
    runSaga: sagaMiddleware.run,
  }
}

export { connect, configureStore }
export * from './actions'
export * from './utils/sagaHelpers'
