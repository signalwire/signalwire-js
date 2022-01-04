import { SagaIterator } from '@redux-saga/core'
import { delay, fork, put, select } from '@redux-saga/core/effects'
import { componentActions } from '..'
import { ReduxComponent } from '../../interfaces'
import { getComponentsById } from './componentSelectors'

export function* componentCleanupSaga(): SagaIterator {
  function* worker(): SagaIterator {
    const components = yield select(getComponentsById)

    let toCleanup: Array<ReduxComponent["id"]> = []
    Object.keys(components).forEach((id) => {
      if (
        components[id].responses ||
        components[id].errors
      ) {
        toCleanup.push(id)
      }
    })

    if (toCleanup.length) {
      yield put(componentActions.cleanup({
        ids: toCleanup
      }))
    }
  }

  while (true) {
    yield delay(2000)
    yield fork(worker)
  }
}
