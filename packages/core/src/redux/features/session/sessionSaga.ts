import { eventChannel, SagaIterator } from 'redux-saga'
import { call, put, take, fork } from 'redux-saga/effects'
import { PayloadAction } from '@reduxjs/toolkit'
import { Session } from '../../..'
import { JWTSession } from '../../../JWTSession'
import { JSONRPCRequest, JSONRPCResponse } from '../../../utils/interfaces'
import { initSessionAction } from '../../actions'
import { componentActions } from '../../slices'

const initSession = (userOptions: any) => {
  console.debug('initSession', userOptions)
  return new Promise((resolve, _reject) => {
    const session = new JWTSession({
      ...userOptions,
      onReady: () => {
        console.debug('JWTSession Ready', session)
        resolve(session)
      },
    })

    session.connect()

    // s.on('ready', () => {
    //   resolve(s)
    // })
    // s.on('error', () => {
    //   reject(s)
    // })
  })
}

export function* sessionSaga() {
  const action = yield take(initSessionAction.type)
  yield call(createSessionWorker, action.payload)
}

const ACTIONS = ['WEBRTC', 'MESSAGES']

export function* createSessionWorker(userOptions: any) {
  console.debug('Creating Session', userOptions)
  const session = yield call(initSession, userOptions)
  console.debug('Session:', session)
  const sessionChannel = yield call(createSessionChannel, session)
  // TODO: invoke sessionChannel.close on session destroy

  function* componentExecuteWorker(
    action: PayloadAction<{
      componentId: string
      jsonrpc: JSONRPCRequest | JSONRPCResponse
    }>
  ) {
    const { componentId, jsonrpc } = action.payload
    try {
      const response = yield call(session.execute, jsonrpc)
      console.debug('componentExecuteWorker response', componentId, response)
      yield put(componentActions.executeSuccess({ componentId, response }))
    } catch (error) {
      console.warn('componentExecuteWorker error', componentId, error)
      yield put(componentActions.executeFailure({ componentId, action, error }))
    }
  }

  function* componentListenerWorker() {
    while (true) {
      const action = yield take(ACTIONS)
      yield fork(componentExecuteWorker, action)
    }
  }

  function* channelWorker(action: PayloadAction<any>): SagaIterator {
    console.debug('Inbound WS Action', action)
    /**
     * Apply custom login or, by default, relay the action to redux
     */

    // action => participant.joined
    // action => participant.left

    yield put(action)
  }

  // Fork componentListenerWorker to handle actions from components
  yield fork(componentListenerWorker)

  /**
   * Make the sessionChannel watcher restartable
   */
  while (true) {
    try {
      while (true) {
        const action = yield take(sessionChannel)
        yield fork(channelWorker, action)
      }
    } catch (error) {
      console.error('channelWorker error:', error)
    } finally {
      console.warn('channelWorker finally')
    }
  }
}

function createSessionChannel(session: Session) {
  return eventChannel((emit) => {
    // TODO: Replace eventHandler with .on() notation ?
    session.eventHandler = (payload: any) => {
      console.debug('Custom eventHandler', payload)
      emit({ type: 'INBOUND_EVENT', payload })
    }

    // the subscriber must return an unsubscribe function
    // this will be invoked when the saga calls `channel.close` method
    const unsubscribe = () => {
      console.debug('Session Channel unsubscribe')
      session.disconnect()
    }

    return unsubscribe
  })
}
