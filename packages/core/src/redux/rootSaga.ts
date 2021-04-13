import { all, spawn, call } from 'redux-saga/effects'
import { demoSaga } from './features/demo/demoSaga'

// prettier-ignore
const ROOT_SAGAS = [
  demoSaga,
]

export default function* root(sagas = ROOT_SAGAS) {
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
