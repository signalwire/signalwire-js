import { SagaIterator } from '@redux-saga/core'
import { delay, fork, put } from '@redux-saga/core/effects'
import { componentActions } from '..'

export function* componentCleanupSaga(): SagaIterator {
  function* worker(): SagaIterator {
    yield put(componentActions.cleanup())
  }

  while (true) {
    yield delay(2000)
    yield fork(worker)
  }
}
