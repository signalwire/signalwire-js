import { SagaIterator, eventChannel } from '@redux-saga/core'
import { put, take, fork } from '@redux-saga/core/effects'
import type { PayloadAction } from '../../toolkit'
import { BaseSession } from '../../../BaseSession'
import { JSONRPCRequest } from '../../../utils/interfaces'
import type {
  VideoAPIEventParams,
  SwEventParams,
  WebRTCMessageParams,
  SwAuthorizationStateParams,
  MemberTalkingEventNames,
} from '../../../types'
import type {
  PubSubChannel,
  SessionChannel,
  SwEventChannel,
} from '../../interfaces'
import { createCatchableSaga } from '../../utils/sagaHelpers'
import { socketMessageAction } from '../../actions'
import { getLogger, toInternalAction } from '../../../utils'

type SessionSagaParams = {
  session: BaseSession
  sessionChannel: SessionChannel
  pubSubChannel: PubSubChannel
  swEventChannel: SwEventChannel
}

// TODO: Move TypeGuards to its own module
const isWebrtcEvent = (e: SwEventParams): e is WebRTCMessageParams => {
  return e?.event_type === 'webrtc.message'
}
const isVideoEvent = (e: SwEventParams): e is VideoAPIEventParams => {
  return !!e?.event_type?.startsWith('video.')
}
const isSwAuthorizationState = (
  e: SwEventParams
): e is SwAuthorizationStateParams => {
  return e?.event_type === 'signalwire.authorization.state'
}

export function* sessionChannelWatcher({
  sessionChannel,
  pubSubChannel,
  swEventChannel,
  session,
}: SessionSagaParams): SagaIterator {
  function* videoAPIWorker(params: VideoAPIEventParams): SagaIterator {
    switch (params.event_type) {
      case 'video.room.audience_count': {
        /** Rename event to be camelCase */
        yield put(pubSubChannel, {
          type: 'video.room.audienceCount',
          payload: params.params,
        })
        return
      }
      case 'video.member.updated': {
        /**
         * @see memberUpdatedWorker in packages/core/src/memberPosition/workers.ts
         * `video.member.updated` is handled by the
         * layoutWorker so to avoid dispatching the event
         * twice (or with incomplete data) we'll early
         * return.
         */
        return
      }
      case 'video.member.talking': {
        const { member } = params.params
        if ('talking' in member) {
          const suffix = member.talking ? 'started' : 'ended'
          yield put(pubSubChannel, {
            type: `video.member.talking.${suffix}` as MemberTalkingEventNames,
            payload: params.params,
          })
          // Keep for backwards compat.
          const deprecatedSuffix = member.talking ? 'start' : 'stop'
          yield put(pubSubChannel, {
            type: `video.member.talking.${deprecatedSuffix}` as MemberTalkingEventNames,
            payload: params.params,
          })
        }
        break
      }
    }

    // Emit on the pubSubChannel this "event_type"
    yield put(pubSubChannel, {
      type: params.event_type,
      // @ts-expect-error
      payload: params.params,
    })
  }

  function* swEventWorker(broadcastParams: SwEventParams) {
    yield put(swEventChannel, toInternalAction(broadcastParams))

    if (isWebrtcEvent(broadcastParams)) {
      /**
       * Skip `webrtc.message` events.
       * There are custom workers handling them through `swEventChannel`
       */
      return
    }
    if (isSwAuthorizationState(broadcastParams)) {
      session.onSwAuthorizationState(broadcastParams.params.authorization_state)
      return
    }
    if (isVideoEvent(broadcastParams)) {
      yield fork(videoAPIWorker, broadcastParams)
      return
    }

    /**
     * Put actions with `event_type` to trigger all the children sagas
     * This should replace all the isWebrtcEvent/isVideoEvent guards below
     * since we'll move that logic on a separate package.
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
      getLogger().debug('sessionChannelWorker finally')
    }
  }
}

export function createSessionChannel(session: BaseSession) {
  return eventChannel((emit) => {
    session.dispatch = (payload: PayloadAction<any>) => {
      emit(payload)
    }

    // this will be invoked when the saga calls `channel.close()` method
    const unsubscribe = () => {
      getLogger().debug('sessionChannel unsubscribe')
      session.disconnect()
    }

    return unsubscribe
  })
}
