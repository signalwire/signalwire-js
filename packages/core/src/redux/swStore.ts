import { runSaga } from '@redux-saga/core'
import type { Task, Action, Saga } from '@redux-saga/types'
// import {
//   fork,
//   select,
//   take,
//   put,
//   all,
//   cancelled,
// } from '@redux-saga/core/effects'
import { getLogger } from '../utils'
import { SDKState } from './interfaces'
import { InternalChannels } from '../utils/interfaces'

interface CreateSwStoreParams {
  channels: InternalChannels
}

export const createSWStore = ({ channels }: CreateSwStoreParams) => {
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
  }

  const getState = () => {
    logger.warn('swStore >> getState', state)
    return state
  }

  const myIO = {
    // this will be used to orchestrate take and put Effects
    channel: channels.rootChannel,
    // this will be used to resolve put Effects
    dispatch(action: Action) {
      logger.warn('swStore >> Dispatch', action)
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
      logger.warn('swStore >> runWorker', worker, options)
      return runSaga(myIO, worker, options)
    },
    // statePut: (action: Action) => {
    //   logger.warn('swStore >> statePut', action)
    //   runSaga(myIO, function* () {
    //     yield put(action)
    //   })
    // },
    rootPut: (action: Action) => {
      logger.warn('swStore >> rootPut', action)
      channels.rootChannel.put(action)
    },
    getState,
  }
}
