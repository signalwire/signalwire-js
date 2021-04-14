import { Saga } from '@redux-saga/types'
import { all, spawn, call } from 'redux-saga/effects'
import { demoSaga } from './features/demo/demoSaga'
import { GetDefaultSagas } from './interfaces'

// prettier-ignore
const ROOT_SAGAS = [
  demoSaga,
];

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

  return function* root() {
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
