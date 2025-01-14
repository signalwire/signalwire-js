import { Store } from 'redux'
import createSagaMiddleware, {
  channel,
  multicastChannel,
  Saga,
  Task,
} from '@redux-saga/core'
import { configureStore as rtConfigureStore } from './toolkit'
import { rootReducer } from './rootReducer'
import rootSaga from './rootSaga'
import { SDKState, SessionChannel, SwEventChannel } from './interfaces'
import { connect } from './connect'
import {
  InternalUserOptions,
  SessionConstructor,
  InternalChannels,
} from '../utils/interfaces'
import { useSession } from './utils/useSession'
import { useInstanceMap } from './utils/useInstanceMap'

export interface ConfigureStoreOptions {
  userOptions: InternalUserOptions
  SessionConstructor: SessionConstructor
  runRootSaga?: boolean
  preloadedState?: Partial<SDKState>
}

export type SDKStore = ReturnType<typeof configureStore>
export type SDKRunSaga = <S extends Saga>(
  saga: S,
  params?: Parameters<S>[0]
) => Task

const configureStore = (options: ConfigureStoreOptions) => {
  const {
    userOptions,
    SessionConstructor,
    preloadedState = {},
    runRootSaga = true,
  } = options

  const sagaMiddleware = createSagaMiddleware({
    // @ts-expect-error For testing purposes only
    sagaMonitor: userOptions.sagaMonitor,
  })
  const swEventChannel: SwEventChannel = multicastChannel()
  const sessionChannel: SessionChannel = channel()
  /**
   * List of channels that are gonna be shared across all
   * sagas.
   */
  const channels: InternalChannels = {
    swEventChannel,
    sessionChannel,
  }
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
  }) as Store

  const instanceMap = useInstanceMap()

  const { initSession, getSession, sessionEmitter } = useSession({
    userOptions,
    sessionChannel,
    SessionConstructor,
  })

  const runSaga = <T>(
    saga: Saga,
    args: {
      instance: T
      runSaga: any
    }
  ) => {
    return sagaMiddleware.run(saga, {
      ...args,
      channels,
      getSession,
      instanceMap,
    })
  }

  if (runRootSaga) {
    const saga = rootSaga({
      initSession,
      sessionEmitter,
    })
    sagaMiddleware.run(saga, { userOptions, channels })
  }

  return {
    ...store,
    runSaga,
    channels,
    instanceMap,
    sessionEmitter,
  }
}

export { connect, configureStore }
export * from './actions'
export * from './utils/sagaHelpers'
export * from './toolkit'
