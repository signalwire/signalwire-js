import {
  getLogger,
  SagaIterator,
  SDKCallWorker,
  CallingCallConnectEventParams,
} from '@signalwire/core'
import { Call, createCallObject } from '../Call'
import type { Client } from '../../client/index'

export const voiceCallConnectWorker: SDKCallWorker<
  CallingCallConnectEventParams,
  Client
> = function* (options): SagaIterator {
  getLogger().trace('voiceCallConnectWorker started')
  const {
    client,
    payload,
    instanceMap: { get, set },
  } = options

  const callInstance = get(payload.call_id) as Call
  callInstance.setConnectPayload(payload)
  set(payload.call_id, callInstance)

  switch (payload.connect_state) {
    case 'connecting': {
      callInstance.baseEmitter.emit('connect.connecting', callInstance)
      break
    }
    case 'connected': {
      let peerCallInstance = get(payload.peer.call_id) as Call
      if (!peerCallInstance) {
        peerCallInstance = createCallObject({
          store: client.store,
          // @ts-expect-error
          emitter: client.emitter,
          payload: payload.peer,
        })
      } else {
        set(payload.peer.call_id, peerCallInstance)
      }
      callInstance.peer = peerCallInstance
      peerCallInstance.peer = callInstance
      callInstance.baseEmitter.emit('connect.connected', peerCallInstance)
      break
    }
    case 'disconnected':
    case 'failed': {
      const peerCallInstance = get(payload.peer.call_id) as Call
      callInstance.baseEmitter.emit(
        `connect.${payload.connect_state}`,
        peerCallInstance
      )
      callInstance.peer = peerCallInstance

      // Add a check because peer call can be removed from the instance map throgh voiceCallStateWorker
      if (peerCallInstance) {
        peerCallInstance.baseEmitter.emit(
          `connect.${payload.connect_state}`,
          peerCallInstance
        )
        peerCallInstance.peer = callInstance
      }
      break
    }
    default:
      break
  }

  callInstance.baseEmitter.emit('call.state', callInstance)

  getLogger().trace('voiceCallConnectWorker ended')
}
