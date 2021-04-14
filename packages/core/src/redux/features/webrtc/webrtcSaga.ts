import { Action } from 'redux'
import { takeEvery, call } from 'redux-saga/effects'
import { getSession } from '../../../JWTSession'

function* worker(action: Action) {
  try {
    const session = yield call(getSession, {})
    console.warn('Worker', session, action)
  } catch (e) {}
}

export function* webrtcSaga() {
  yield takeEvery('WEBRTC', worker)
}
