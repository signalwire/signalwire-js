import { SagaIterator, eventChannel, EventChannel } from '@redux-saga/core'
import {
  call,
  put,
  take,
  fork,
  select,
  cancelled,
} from '@redux-saga/core/effects'
import type { PayloadAction } from '../../toolkit'
import { BaseSession } from '../../../BaseSession'
import { JSONRPCRequest, JSONRPCResponse } from '../../../utils/interfaces'
import type {
  VideoAPIEventParams,
  SwEventParams,
  WebRTCMessageParams,
  MemberTalkingEventNames,
} from '../../../types'
import type {
  ExecuteActionParams,
  PubSubChannel,
  SwEventChannel,
} from '../../interfaces'
import { createCatchableSaga } from '../../utils/sagaHelpers'
import { executeAction, socketMessageAction } from '../../actions'
import { componentActions } from '../'
import { RPCExecute } from '../../../RPCMessages'
import { getLogger, toInternalAction } from '../../../utils'
import { getAuthStatus } from '../session/sessionSelectors'
import { SessionAuthStatus } from '../../../utils/interfaces'

type SessionSagaParams = {
  sessionChannel: EventChannel<unknown>
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

/**
 * Watch every "executeAction" and fork the worker to send
 * a JSONRPC over the wire and then update the state
 * with "componentActions.executeSuccess" or "componentActions.executeFailure"
 * actions if a componentId is provided.
 */
export function* executeActionWatcher(session: BaseSession): SagaIterator {
  function* worker(action: PayloadAction<ExecuteActionParams>): SagaIterator {
    const authStatus: SessionAuthStatus = yield select(getAuthStatus)

    /**
     * Just a safety-guard since this code shouldn't be
     * executed when the session is not authorized.
     */
    if (authStatus !== 'authorized') {
      return
    }

    const { componentId, requestId, method, params } = action.payload
    try {
      const message = RPCExecute({
        id: requestId,
        method,
        params,
      })
      const response = yield call(session.execute, message)
      if (componentId && requestId) {
        yield put(
          componentActions.executeSuccess({
            componentId,
            requestId,
            response,
          })
        )
      }
    } catch (error) {
      getLogger().warn('worker error', componentId, JSON.stringify(error))
      if (componentId && requestId) {
        yield put(
          componentActions.executeFailure({
            componentId,
            requestId,
            action,
            error,
          })
        )
      }
    } finally {
      const isCancelled = yield cancelled()

      if (isCancelled && componentId && requestId) {
        const error: JSONRPCResponse = {
          jsonrpc: '2.0',
          id: requestId,
          error: {
            // Invalid Request
            code: -32600,
            message: 'Cancelled task',
          },
        }
        getLogger().debug('executeActionWorker cancelled', {
          requestId,
          componentId,
          error,
        })
        yield put(
          componentActions.executeFailure({
            componentId,
            requestId,
            action,
            error,
          })
        )
      }
    }
  }

  while (true) {
    const action = yield take(executeAction.type)
    yield fork(worker, action)
  }
}

export function* sessionChannelWatcher({
  sessionChannel,
  pubSubChannel,
  swEventChannel,
}: SessionSagaParams): SagaIterator {
  function* videoAPIWorker(params: VideoAPIEventParams): SagaIterator {
    switch (params.event_type) {
      case 'video.room.audience_count': {
        /** Rename event to be camelCase */
        yield put(pubSubChannel, {
          type: `video.room.audienceCount`,
          payload: params.params,
        })
        return
      }
      case 'video.member.updated': {
        /**
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
