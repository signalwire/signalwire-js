import { call, put, takeEvery } from 'redux-saga/effects'
import { JWTSession } from '../../../JWTSession'

function* fetchUser() {
  try {
    yield put({ type: 'USER_FETCH_SUCCEEDED', user: {} })
  } catch (e) {
    yield put({ type: 'USER_FETCH_FAILED', message: e.message })
  }
}

const initSession = (userOptions: any) => {
  return new Promise((resolve) => {
    const s = new JWTSession(userOptions)

    resolve(s)

    // TODO: enable this once we implement the EventEmitter interface
    // s.on('ready', () => {
    //   resolve(s)
    // })
    // s.on('error', () => {
    //   reject(s)
    // })
  })
}

// const ACTIONS = ['WEBRTC', 'MESSAGES']
export function* demoSaga() {
  yield takeEvery('INIT_SESSION', fetchUser)
  const session = yield call(initSession, {})

  console.log('--> Session', session)
}
