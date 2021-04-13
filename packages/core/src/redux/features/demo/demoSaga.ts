import { put, takeEvery } from 'redux-saga/effects'

function* fetchUser() {
  try {
    yield put({ type: 'USER_FETCH_SUCCEEDED', user: {} })
  } catch (e) {
    yield put({ type: 'USER_FETCH_FAILED', message: e.message })
  }
}

/*
  Starts fetchUser on each dispatched `USER_FETCH_REQUESTED` action.
  Allows concurrent fetches of user.
*/
export function* demoSaga() {
  yield takeEvery('USER_FETCH_REQUESTED', fetchUser)
}

