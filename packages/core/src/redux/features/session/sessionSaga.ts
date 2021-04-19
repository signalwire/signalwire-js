import { eventChannel, SagaIterator } from 'redux-saga'
import { call, put, take, fork } from 'redux-saga/effects'
import { PayloadAction } from '@reduxjs/toolkit'
import { Session } from '../../..'
import { JWTSession } from '../../../JWTSession'
import { VertoResult } from '../../../RPCMessages'
import {
  JSONRPCRequest,
  JSONRPCResponse,
  UserOptions,
} from '../../../utils/interfaces'
import { initSessionAction, executeAction } from '../../actions'
import { componentActions } from '../'
import { BladeMethod, VertoMethod } from '../../../utils/constants'
import { logger } from '../../../utils'

function isJSONRPCRequest(message: any): message is JSONRPCRequest {
  return message.method !== undefined
}

const initSession = (userOptions: UserOptions) => {
  console.debug('initSession', userOptions)
  return new Promise((resolve, _reject) => {
    const session = new JWTSession({
      ...userOptions,
      onReady: async () => {
        console.debug('JWTSession Ready', session)
        resolve(session)
        userOptions?.onReady?.()
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

type SessionSagaParams = {
  userOptions: UserOptions
  pubSubChannel: any
}
export function* sessionSaga(options: SessionSagaParams) {
  // TODO: Provide errors to the user in case this saga fails
  // since the SDK will be unusable at that point.
  yield take(initSessionAction.type)
  yield call(createSessionWorker, options)
}

export function* createSessionWorker({
  userOptions,
  pubSubChannel,
}: SessionSagaParams) {
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
      /**
       * Inject the protocol in case of blade.execute
       * TODO: need a better way.
       * Maybe store the protocol in the state and pass it
       * down to the component on "connect"?
       */
      if (isJSONRPCRequest(jsonrpc) && jsonrpc.method === BladeMethod.Execute) {
        jsonrpc.params!.protocol = session.relayProtocol
      }
      const response = yield call(session.execute, jsonrpc)
      console.debug('componentExecuteWorker response', componentId, response)
      yield put(
        componentActions.executeSuccess({
          componentId,
          requestId: jsonrpc.id,
          response,
        })
      )
    } catch (error) {
      console.warn('componentExecuteWorker error', componentId, error)
      yield put(
        componentActions.executeFailure({
          componentId,
          requestId: jsonrpc.id,
          action,
          error,
        })
      )
    }
  }

  function* componentListenerWorker() {
    while (true) {
      const action = yield take(executeAction.type)
      yield fork(componentExecuteWorker, action)
    }
  }

  function* vertoWorker(jsonrpc: JSONRPCRequest) {
    logger.debug('vertoWorker', jsonrpc)
    const { id, method, params = {} } = jsonrpc
    const { callID, nodeId } = params
    const _executeResult = () => {
      const msg = VertoResult(id, method as VertoMethod)
      // msg.targetNodeId = nodeId
      session.execute(msg)
    }

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
        _executeResult()
        break
      }
      case VertoMethod.Ping:
        return _executeResult()
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

        yield put(pubSubChannel, {
          type: 'room.subscribed',
          payload: params.params,
        })

        // params.params.nodeId = node_id
        // return ConferencingHandler(session, params)
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

  function* channelWorker(payload: JSONRPCRequest): SagaIterator {
    console.debug('Inbound WebSocket Message', payload)
    const { method, params } = payload

    switch (method) {
      case BladeMethod.Broadcast:
        // TODO: try/catch ?
        yield fork(bladeBroadcastWorker, params)
        break
      default:
        // yield put(action)
        return logger.warn(`Unknown message: ${method}`, payload)
    }
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
      /**
       * emit into the channelWorker
       */
      emit(payload)
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
