import { SagaIterator } from '@redux-saga/core'
import { put, take, fork } from '@redux-saga/core/effects'
import type { PayloadAction } from '../../toolkit'
import { BaseSession } from '../../../BaseSession'
import { JSONRPCRequest } from '../../../utils/interfaces'
import type {
  VideoAPIEvent,
  SwEventParams,
  WebRTCMessageParams,
  SwAuthorizationStateEvent,
} from '../../../types'
import type { SessionChannel, SwEventChannel } from '../../interfaces'
import { createCatchableSaga } from '../../utils/sagaHelpers'
import { socketMessageAction } from '../../actions'
import { getLogger, isWebrtcEventType, toInternalAction } from '../../../utils'
import { sessionActions } from './sessionSlice'

type SessionSagaParams = {
  session: BaseSession
  sessionChannel: SessionChannel
  swEventChannel: SwEventChannel
}

// TODO: Move TypeGuards to its own module
const isWebrtcEvent = (e: SwEventParams): e is WebRTCMessageParams => {
  return isWebrtcEventType(e?.event_type)
}
const isVideoEvent = (e: SwEventParams): e is VideoAPIEvent => {
  return !!e?.event_type?.startsWith('video.')
}
const isSwAuthorizationStateEvent = (
  e: SwEventParams
): e is SwAuthorizationStateEvent => {
  return e?.event_type === 'signalwire.authorization.state'
}

export function* sessionChannelWatcher({
  sessionChannel,
  swEventChannel,
  session,
}: SessionSagaParams): SagaIterator {
  getLogger().debug('sessionChannelWatcher [started]')

  function* swEventWorker(broadcastParams: SwEventParams) {
    yield put(swEventChannel, toInternalAction(broadcastParams))

    if (isWebrtcEvent(broadcastParams) || isVideoEvent(broadcastParams)) {
      /**
       * Skip `webrtc.*` & `video.*` events.
       * There are custom workers handling them through `swEventChannel`
       */
      return
    }

    /**
     * After connecting to the SignalWire network, it sends the `authorization_state`
     * through the `signalwire.authorization.state` event. We store this value in
     * the browser storage for JWT and in Redux store for SAT since it is required for reconnect.
     */
    if (isSwAuthorizationStateEvent(broadcastParams)) {
      session.onSwAuthorizationState(broadcastParams.params.authorization_state)
      yield put(
        sessionActions.updateAuthorizationState(
          broadcastParams.params.authorization_state
        )
      )
      return
    }

    /**
     * Put actions with `event_type` to trigger all the children sagas
     * This should replace all the isWebrtcEvent/isVideoEvent guards below
     * since we'll move that logic on a separate package.
     *
     * TODO: We no longer need this and it can be removed
     */
    yield put({ type: broadcastParams.event_type, payload: broadcastParams })
  }

  function* sessionChannelWorker(
    action: PayloadAction<JSONRPCRequest>
  ): SagaIterator {
    if (action.type !== socketMessageAction.type) {
      yield put(action)
      return
    }
    const { method, params } = action.payload

    switch (method) {
      case 'signalwire.event':
        yield fork(swEventWorker, params as SwEventParams)
        break
      default:
        return getLogger().debug(`Unknown message: ${method}`, action)
    }
  }

  const sessionChannelWorkerCatchable = createCatchableSaga<
    PayloadAction<JSONRPCRequest>
  >(sessionChannelWorker, (error) => {
    getLogger().error('Channel Error', error)
  })

  /**
   * Make the watcher restartable
   */
  while (true) {
    try {
      while (true) {
        const action = yield take(sessionChannel)
        yield fork(sessionChannelWorkerCatchable, action)
      }
    } catch (error) {
      getLogger().error('sessionChannelWorker error:', error)
    } finally {
      getLogger().debug('sessionChannelWorker [finally]')
    }
  }
}
