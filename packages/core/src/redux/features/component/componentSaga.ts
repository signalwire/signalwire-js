import { SagaIterator } from '@redux-saga/core'
import { delay, fork, put, select } from '@redux-saga/core/effects'
import { componentActions } from '..'
import { getComponentsToCleanup } from './componentSelectors'

export function* componentCleanupSaga(): SagaIterator {
  function* worker(): SagaIterator {
    const toCleanup = yield select(getComponentsToCleanup)

    if (toCleanup.length) {
      yield put(
        componentActions.cleanup({
          ids: toCleanup,
        })
      )
    }
  }

  while (true) {
    yield delay(2000)
    yield fork(worker)
  }
}
