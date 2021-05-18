import { SagaIterator, Channel, eventChannel, EventChannel } from 'redux-saga'
import { call, put, take, fork } from 'redux-saga/effects'
import { PayloadAction } from '@reduxjs/toolkit'
import { Session } from '../../..'
import { VertoResult } from '../../../RPCMessages'
import {
  JSONRPCRequest,
  ConferenceWorkerParams,
  BladeBroadcastParams,
} from '../../../utils/interfaces'
import { ExecuteActionParams, WebRTCCall } from '../../interfaces'
import { executeAction, socketMessage } from '../../actions'
import { componentActions } from '../'
import {
  BladeMethod,
  SwWebRTCCallState,
  VertoMethod,
} from '../../../utils/constants'
import { BladeExecute } from '../../../RPCMessages'
import { logger } from '../../../utils'

type SessionSagaParams = {
  session: Session
  sessionChannel: EventChannel<unknown>
  pubSubChannel: Channel<unknown>
}

type VertoWorkerParams = {
  jsonrpc: JSONRPCRequest
  nodeId: string
}

/**
 * Watch every "executeAction" and fork the worker to send
 * a BladeExecute over the wire and then update the state
 * with "componentActions.executeSuccess" or "componentActions.executeFailure"
 * actions if a componentId is provided.
 */
export function* executeActionWatcher(session: Session): SagaIterator {
  function* worker(action: PayloadAction<ExecuteActionParams>): SagaIterator {
    const { componentId, requestId, method, params } = action.payload
    try {
      const message = BladeExecute({
        id: requestId,
        protocol: session.relayProtocol,
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
      logger.warn('worker error', componentId, error)
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
    }
  }

  while (true) {
    const action = yield take(executeAction.type)
    yield fork(worker, action)
  }
}

export function* sessionChannelWatcher({
  session,
  sessionChannel,
  pubSubChannel,
}: SessionSagaParams): SagaIterator {
  function* vertoWorker({ jsonrpc, nodeId }: VertoWorkerParams) {
    logger.debug('vertoWorker', jsonrpc, nodeId)
    const { id, method, params = {} } = jsonrpc

    switch (method) {
      case VertoMethod.Media: {
        const component = {
          id: params.callID,
          state: SwWebRTCCallState.Early,
          remoteSDP: params.sdp,
          nodeId,
        }
        yield put(componentActions.upsert(component))
        yield put(
          executeAction({
            method: 'video.message',
            params: {
              message: VertoResult(id, method),
              node_id: nodeId,
            },
          })
        )
        break
      }
      case VertoMethod.Answer: {
        const component: WebRTCCall = {
          id: params.callID,
          state: SwWebRTCCallState.Active,
          nodeId,
        }
        if (params?.sdp) {
          component.remoteSDP = params.sdp
        }
        yield put(componentActions.upsert(component))
        yield put(
          executeAction({
            method: 'video.message',
            params: {
              message: VertoResult(id, method),
              node_id: nodeId,
            },
          })
        )
        break
      }
      case VertoMethod.Bye: {
        const component: WebRTCCall = {
          id: params.callID,
          state: SwWebRTCCallState.Hangup,
          nodeId,
          byeCause: params?.cause ?? '',
          byeCauseCode: params?.causeCode ?? 0,
          redirectDestination: params?.redirectDestination,
        }
        yield put(componentActions.upsert(component))
        yield put(
          executeAction({
            method: 'video.message',
            params: {
              message: VertoResult(id, method),
              node_id: nodeId,
            },
          })
        )
        break
      }
      case VertoMethod.Ping:
        yield put(
          executeAction({
            method: 'video.message',
            params: {
              message: VertoResult(id, method),
              node_id: nodeId,
            },
          })
        )
        break
      case VertoMethod.Punt:
        // FIXME: handle session.purge
        // session.purge()
        return session.disconnect()
      // case VertoMethod.Invite: {
      //   const call = _buildCall(session, params, attach, nodeId)
      //   call.setState(State.Ringing)
      //   const msg = VertoResult(id, method)
      //   // msg.targetNodeId = nodeId
      //   return session.execute(msg)
      // }
      // case VertoMethod.Attach: {
      //   const call = _buildCall(session, params, attach, nodeId)
      //   return trigger(call.id, params, method)
      // }
      case VertoMethod.Info:
        return logger.debug('Verto Info', params)
      case VertoMethod.ClientReady:
        return logger.debug('Verto ClientReady', params)
      case VertoMethod.Announce:
        return logger.debug('Verto Announce', params)
      default:
        return logger.debug(`Unknown Verto method: ${method}`, params)
    }
  }

  function* conferenceWorker(params: ConferenceWorkerParams) {
    switch (params.event_type) {
      case 'room.subscribed': {
        yield put(
          componentActions.upsert({
            id: params.params.call_id,
            roomId: params.params.room.room_id,
            roomSessionId: params.params.room.room_session_id,
            memberId: params.params.member_id,
          })
        )
        // Rename "room.subscribed" with "room.joined" for the end-user
        yield put(pubSubChannel, {
          type: 'room.joined',
          payload: params.params,
        })
        break
      }
      case 'member.updated': {
        const {
          member: { updated = [] },
        } = params.params
        for (const key of updated) {
          yield put(pubSubChannel, {
            type: `member.updated.${key}`,
            payload: params.params,
          })
        }
        break
      }
    }

    // Emit on the pubSubChannel this "event_type"
    yield put(pubSubChannel, {
      type: params.event_type,
      payload: params.params,
    })
  }

  function* bladeBroadcastWorker(broadcastParams: BladeBroadcastParams) {
    if (broadcastParams?.protocol !== session.relayProtocol) {
      return logger.error('Session protocol mismatch.')
    }

    switch (broadcastParams.event) {
      case 'queuing.relay.events': {
        const { params } = broadcastParams || {}
        if (params.event_type === 'webrtc.message') {
          yield fork(vertoWorker, {
            jsonrpc: params.params,
            nodeId: params.node_id,
          })
        } else {
          logger.debug('Relay Calling event:', params)
          // session.calling.notificationHandler(params)
        }
        break
      }
      case 'conference': {
        logger.debug('Conference event:', broadcastParams.params)
        yield fork(conferenceWorker, broadcastParams.params)
        break
      }
      case 'queuing.relay.tasks': {
        logger.debug('Relay Task event:', broadcastParams.params)
        // session.tasking.notificationHandler(params)
        break
      }
      case 'queuing.relay.messaging': {
        logger.debug('Relay Task event:', broadcastParams.params)
        // session.messaging.notificationHandler(params)
        break
      }
      default:
        return logger.debug(
          // @ts-expect-error
          `Unknown broadcast event: ${broadcastParams.event}`,
          broadcastParams
        )
    }
  }

  function* sessionChannelWorker(
    action: PayloadAction<JSONRPCRequest>
  ): SagaIterator {
    logger.debug('Inbound WebSocket Message', action)
    if (action.type !== socketMessage.type) {
      yield put(action)
      return
    }
    const { method, params } = action.payload

    switch (method) {
      case BladeMethod.Broadcast:
        yield fork(bladeBroadcastWorker, params as BladeBroadcastParams)
        break
      default:
        return logger.debug(`Unknown message: ${method}`, action)
    }
  }

  /**
   * Make the watcher restartable
   */
  while (true) {
    try {
      while (true) {
        const action = yield take(sessionChannel)
        yield fork(sessionChannelWorker, action)
      }
    } catch (error) {
      logger.error('sessionChannelWorker error:', error)
    } finally {
      logger.warn('sessionChannelWorker finally')
    }
  }
}

export function createSessionChannel(session: Session) {
  return eventChannel((emit) => {
    session.dispatch = (payload: PayloadAction<any>) => {
      emit(payload)
    }

    // this will be invoked when the saga calls `channel.close()` method
    const unsubscribe = () => {
      logger.debug('sessionChannel unsubscribe')
      session.disconnect()
    }

    return unsubscribe
  })
}
