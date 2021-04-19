import { take } from 'redux-saga/effects'

export function* pubSubSaga({ pubSubChannel, emitter }: any) {
  while (true) {
    const { type, payload } = yield take(pubSubChannel)

    // TODO: Emit event to outside world
    console.log('====> pubSubSaga', { type, payload })
    emitter.emit(type, payload)
  }
}
