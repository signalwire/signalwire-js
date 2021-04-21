import { SagaIterator, Channel, EventChannel } from 'redux-saga'
import { call, put, take, fork } from 'redux-saga/effects'
import { PayloadAction } from '@reduxjs/toolkit'
import { Session } from '../../..'
import { VertoResult } from '../../../RPCMessages'
import { JSONRPCRequest } from '../../../utils/interfaces'
import { ExecuteActionParams } from '../../interfaces'
import { executeAction } from '../../actions'
import { componentActions } from '../'
import { BladeMethod, VertoMethod } from '../../../utils/constants'
import { BladeExecute } from '../../../RPCMessages'
import { logger } from '../../../utils'

type SessionSagaParams = {
  session: Session
  sessionChannel: EventChannel<unknown>
  pubSubChannel: Channel<unknown>
}

/**
 * Watch every "executeAction" and fork the worker to send
 * a BladeExecute over the wire and then update the state
 * with "componentActions.executeSuccess" or "componentActions.executeFailure"
 * actions if a componentId is provided.
 */
export function* executeActionWatcher(session: Session): SagaIterator {
  function* worker(action: PayloadAction<ExecuteActionParams>): SagaIterator {
    // TODO: make componentId and requestId optional to re-use this watcher/worker
    const { componentId, requestId, method, params } = action.payload
    try {
      const message = BladeExecute({
        id: requestId,
        protocol: session.relayProtocol,
        method,
        params,
      })
      const response = yield call(session.execute, message)
      yield put(
        componentActions.executeSuccess({
          componentId,
          requestId,
          response,
        })
      )
    } catch (error) {
      logger.warn('worker error', componentId, error)
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
  function* vertoWorker(jsonrpc: JSONRPCRequest) {
    logger.debug('vertoWorker', jsonrpc)
    const { id, method, params = {} } = jsonrpc
    const { callID, nodeId } = params

    // const attach = method === VertoMethod.Attach
    switch (method) {
      case VertoMethod.Media: {
        const component = {
          id: callID,
          state: 'early', // FIXME: Use the enum
          remoteSDP: params.sdp,
          nodeId,
        }
        yield put(componentActions.update(component))
        break
      }
      case VertoMethod.Answer: {
        const component = {
          id: callID,
          state: 'active', // FIXME: Use the enum
          nodeId,
        }
        if (params?.sdp) {
          // @ts-expect-error
          component.remoteSDP = params.sdp
        }
        yield put(componentActions.update(component))
        yield put(
          executeAction({
            componentId: '', // FIXME: remove componentId
            requestId: id, // FIXME: remove requestId
            method: 'video.message',
            params: {
              message: VertoResult(id, method),
              node_id: null,
            },
          })
        )
        break
      }
      case VertoMethod.Ping:
        yield put(
          executeAction({
            componentId: '', // FIXME: remove componentId
            requestId: id, // FIXME: remove requestId
            method: 'video.message',
            params: {
              message: VertoResult(id, method),
              node_id: null,
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
      // case VertoMethod.Event:
      // case 'webrtc.event': {
      //   const { subscribedChannel } = params
      //   if (
      //     subscribedChannel &&
      //     trigger(session.relayProtocol, params, subscribedChannel)
      //   ) {
      //     return
      //   }
      //   if (eventChannel) {
      //     const channelType = eventChannel.split('.')[0]
      //     const global = trigger(session.relayProtocol, params, channelType)
      //     const specific = trigger(session.relayProtocol, params, eventChannel)
      //     if (global || specific) {
      //       return
      //     }
      //   }
      //   params.type = Notification.Generic
      //   return trigger(SwEvent.Notification, params, session.uuid)
      // }
      case VertoMethod.Info:
        return logger.debug('Verto Info', params)
      case VertoMethod.ClientReady:
        return logger.debug('Verto ClientReady', params)
      case VertoMethod.Announce:
        return logger.debug('Verto Announce', params)
      default:
        return logger.warn(`Unknown Verto method: ${method}`, params)
    }
  }

  // FIXME: add type for params
  function* conferenceWorker(params: any) {
    switch (params.event_type) {
      case 'room.subscribed': {
        yield put(
          componentActions.update({
            id: params.params.call_id,
            roomId: params.params.room.id,
            memberId: params.params.member_id,
          })
        )
        break
      }
    }

    // Emit on the pubSubChannel this "event_type"
    yield put(pubSubChannel, {
      type: params.event_type,
      payload: params.params,
    })
  }

  // FIXME: Add types for broadcastParams
  function* bladeBroadcastWorker(broadcastParams: JSONRPCRequest['params']) {
    const { protocol, event, params } = broadcastParams || {}
    const { event_type, node_id } = params

    if (protocol !== session.relayProtocol) {
      return logger.error('Session protocol mismatch.')
    }

    switch (event) {
      case 'queuing.relay.events': {
        if (event_type === 'webrtc.message') {
          params.params.params.nodeId = node_id
          yield fork(vertoWorker, params.params)
          // VertoHandler(session, params.params)
        } else {
          logger.debug('Relay Calling event:', params)
          // session.calling.notificationHandler(params)
        }
        break
      }
      case 'conference': {
        logger.debug('Conference event:', params)
        yield fork(conferenceWorker, params)
        break
      }
      case 'queuing.relay.tasks': {
        logger.debug('Relay Task event:', params)
        // session.tasking.notificationHandler(params)
        break
      }
      case 'queuing.relay.messaging': {
        logger.debug('Relay Task event:', params)
        // session.messaging.notificationHandler(params)
        break
      }
      default:
        return logger.warn(`Unknown broadcast event: ${event}`, broadcastParams)
    }
  }

  function* sessionChannelWorker(payload: JSONRPCRequest): SagaIterator {
    console.debug('Inbound WebSocket Message', payload)
    const { method, params } = payload

    switch (method) {
      case BladeMethod.Broadcast:
        yield fork(bladeBroadcastWorker, params)
        break
      default:
        // yield put(action)
        return logger.warn(`Unknown message: ${method}`, payload)
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
      console.error('sessionChannelWorker error:', error)
    } finally {
      console.warn('sessionChannelWorker finally')
    }
  }
}
