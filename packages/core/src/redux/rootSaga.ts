import { Saga } from '@redux-saga/types'
import { all, spawn, call } from 'redux-saga/effects'
import { sessionSaga } from './features/session/sessionSaga'
import { GetDefaultSagas } from './interfaces'
import { UserOptions } from '../utils/interfaces'

// prettier-ignore
const ROOT_SAGAS: Saga[] = []

const getDefaultSagas = () => {
  return ROOT_SAGAS
}
interface RooSagasOptions {
  sagas?: (fn: GetDefaultSagas) => Saga[]
}

export default (
  options: RooSagasOptions = { sagas: () => getDefaultSagas() }
) => {
  const sagas = options.sagas
    ? options.sagas(getDefaultSagas)
    : getDefaultSagas()

  return function* root(userOptions: UserOptions) {
    /**
     * Start sessionSaga on its own since it waits
     * for an initSessionAction to start so doesn't
     * make sense to restart it in case of errors.
     */
    yield spawn(sessionSaga, {
      userOptions,
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
