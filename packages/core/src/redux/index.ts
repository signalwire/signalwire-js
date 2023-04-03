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
import {
  MapToPubSubShape,
  PubSubChannel,
  SDKState,
  SessionChannel,
  SwEventChannel,
} from './interfaces'
import { connect } from './connect'
import {
  InternalUserOptions,
  SessionConstructor,
  InternalChannels,
} from '../utils/interfaces'
import { BaseSession } from '../BaseSession'
import { getLogger } from '../utils'
import { SwEventParams } from '..'

export interface ConfigureStoreOptions {
  userOptions: InternalUserOptions
  SessionConstructor: SessionConstructor
  runSagaMiddleware?: boolean
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
    runSagaMiddleware = true,
  } = options
  const sagaMiddleware = createSagaMiddleware()
  const pubSubChannel: PubSubChannel = multicastChannel()
  const swEventChannel: SwEventChannel = multicastChannel()
  const sessionChannel: SessionChannel = channel()
  /**
   * List of channels that are gonna be shared across all
   * sagas.
   */
  const channels: InternalChannels = {
    pubSubChannel,
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

  let session: BaseSession
  const initSession = () => {
    session = new SessionConstructor({
      ...userOptions,
      sessionChannel,
    })
    return session
  }

  const getSession = () => {
    if (!session) {
      getLogger().warn('Custom worker started without the session')
    }
    return session
  }

  // Generic map stores multiple instance
  // For eg;
  // callId => CallInstance
  // controlId => PlaybackInstance | RecordingInstance
  const instanceMap = new Map<string, unknown>()

  const getInstance = <T extends unknown>(key: string): T => {
    return instanceMap.get(key) as T
  }

  const setInstance = <T extends unknown>(key: string, value: T) => {
    instanceMap.set(key, value)
    return instanceMap
  }

  const deleteInstance = (key: string) => {
    instanceMap.delete(key)
    return instanceMap
  }

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
      instanceMap: {
        get: getInstance,
        set: setInstance,
        remove: deleteInstance,
      },
    })
  }

  if (runSagaMiddleware) {
    const saga = rootSaga({
      initSession,
    })
    sagaMiddleware.run(saga, { userOptions, channels })
  }

  return {
    ...store,
    runSaga,
    channels,
    putOnSwEventChannel: (arg: MapToPubSubShape<SwEventParams>) => {
      swEventChannel.put(arg)
    },
  }
}

export { connect, configureStore }
export * from './actions'
export * from './utils/sagaHelpers'
export * from './toolkit'
