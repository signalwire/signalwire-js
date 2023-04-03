import { runSaga } from '@redux-saga/core'
import type { Task, Saga } from '@redux-saga/types'
import { getLogger } from '../utils'
import { SDKState } from './interfaces'
import { InternalChannels } from '../utils/interfaces'
import { AnyAction } from './toolkit'

interface CreateSwStoreParams {
  channels: InternalChannels
  preloadedState: Partial<SDKState>
}

export const createSWStore = ({
  channels,
  preloadedState,
}: CreateSwStoreParams) => {
  const logger = getLogger()
  let rootTask: Task
  const state: SDKState = {
    components: {
      byId: {},
    },
    session: {
      protocol: '',
      iceServers: [],
      authStatus: 'unknown',
      authState: undefined,
      authError: undefined,
      authCount: 0,
    },
    ...preloadedState,
  }

  const getState = () => {
    logger.warn('swStore >> getState', state)
    return state
  }

  const myIO = {
    // this will be used to orchestrate take and put Effects
    channel: channels.rootChannel,
    // this will be used to resolve put Effects
    dispatch(action: AnyAction) {
      logger.warn('swStore >> Dispatch', action)

      // Process the action within reducers
      switch (action.type) {
        case 'session/connected':
          state.session = {
            ...state.session,
            authStatus: 'authorized',
            authState: action.payload?.authorization,
            authCount: state.session.authCount + 1,
            protocol: action.payload?.protocol ?? '',
            iceServers: action.payload?.ice_servers ?? [],
          }
          break
        case 'components/upsert':
          if (action.payload.id in state.components.byId) {
            state.components = {
              ...state,
              byId: {
                ...state.components.byId,
                [action.payload.id]: {
                  ...state.components.byId[action.payload.id],
                  ...action.payload,
                },
              },
            }
          } else {
            state.components = {
              ...state,
              byId: {
                ...state.components.byId,
                [action.payload.id]: action.payload,
              },
            }
          }
          break
        default:
          getLogger().warn('Unhandled dispatch', action.type)
      }

      channels.rootChannel.put(action)
      // runSaga(myIO, function* () {
      //   yield put(channels.rootChannel, action)
      // })

      return action
    },
    // this will be used to resolve select Effects
    getState,
  }

  return {
    init: () => {
      logger.warn('swStore >> Init Store?')
    },
    start: (rootSaga: Saga, options: any) => {
      logger.warn('swStore >> Start')
      rootTask = runSaga(myIO, rootSaga, options)
      return rootTask
    },
    stop: () => {
      rootTask.cancel()
    },
    runWorker: (worker: Saga, options: any) => {
      // logger.warn('swStore >> runWorker', worker, options)
      return runSaga(myIO, worker, options)
    },
    dispatch: (action: AnyAction) => myIO.dispatch(action),
    rootPut: (action: AnyAction) => {
      logger.warn('swStore >> rootPut', action)
      channels.rootChannel.put(action)
    },
    getState,
  }
}
