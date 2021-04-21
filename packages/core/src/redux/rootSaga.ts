import { Saga, SagaIterator } from '@redux-saga/types'
import { channel } from 'redux-saga'
import { all, spawn, call } from 'redux-saga/effects'
import { sessionSaga } from './features/session/sessionSaga'
import { GetDefaultSagas } from './interfaces'
import { UserOptions } from '../utils/interfaces'
import { pubSubSaga } from './features/pubSub/pubSubSaga'

// prettier-ignore
const ROOT_SAGAS: Saga[] = []

const getDefaultSagas = () => {
  return ROOT_SAGAS
}
interface RootSagaOptions {
  sagas?: (fn: GetDefaultSagas) => Saga[]
}

export default (
  options: RootSagaOptions = { sagas: () => getDefaultSagas() }
) => {
  const sagas = options.sagas
    ? options.sagas(getDefaultSagas)
    : getDefaultSagas()

  return function* root(userOptions: UserOptions): SagaIterator {
    const pubSubChannel = yield call(channel)

    yield spawn(pubSubSaga, {
      pubSubChannel,
      emitter: userOptions.emitter,
    })

    /**
     * Start sessionSaga on its own since it waits
     * for an initSessionAction to start so doesn't
     * make sense to restart it in case of errors.
     */
    yield spawn(sessionSaga, {
      userOptions,
      pubSubChannel,
    })

    yield all(
      sagas.map((saga) =>
        spawn(function* () {
          while (true) {
            try {
              yield call(saga)
              break
            } catch (error) {
              console.warn('RootSaga catch:', error)
            }
          }
        })
      )
    )
  }
}
