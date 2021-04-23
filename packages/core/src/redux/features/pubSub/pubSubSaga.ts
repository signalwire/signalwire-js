import { take } from 'redux-saga/effects'

export function* pubSubSaga({ pubSubChannel, emitter }: any) {
  while (true) {
    const { type, payload } = yield take(pubSubChannel)
    emitter.emit(type, payload)
  }
}
