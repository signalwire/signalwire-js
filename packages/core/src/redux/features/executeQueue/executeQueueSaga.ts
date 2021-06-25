import { SagaIterator } from 'redux-saga'
import { put, take, fork, select } from 'redux-saga/effects'
import { PayloadAction } from '@reduxjs/toolkit'
import { ExecuteActionParams } from '../../interfaces'
import { getAuthStatus } from '../session/sessionSelectors'
import { SessionAuthStatus } from '../../../utils/interfaces'
import { executeAction } from '../../actions'
import { getExecuteQueue } from './executeQueueSelectors'
import { executeQueueActions } from './executeQueueSlice'

export function* executeQueueWatcher(): SagaIterator {
  function* worker(action: PayloadAction<ExecuteActionParams>): SagaIterator {
    const authStatus: SessionAuthStatus = yield select(getAuthStatus)

    console.log('authStatus', authStatus)

    if (authStatus !== 'authorized') {
      console.log('METO EN LA QUEUE', action.payload)

      yield put(executeQueueActions.add(action.payload))
    }
  }

  while (true) {
    const action = yield take(executeAction.type)
    yield fork(worker, action)
  }
}

export function* executeQueueCallWorker(): SagaIterator {
  const { queue } = yield select(getExecuteQueue)

  console.log('-------------> queue', queue)

  for (const params of queue) {
    yield put(executeAction(params))
  }

  yield put(executeQueueActions.clean())
}
