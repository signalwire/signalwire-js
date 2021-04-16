import { take } from 'redux-saga/effects'

export function* pubSubSaga({ pubSubChannel }: any) {
  while (true) {
    const payload = yield take(pubSubChannel)

    // TODO: Emit event to outside world
    console.log('====> pubSubSaga', payload)
  }
}
