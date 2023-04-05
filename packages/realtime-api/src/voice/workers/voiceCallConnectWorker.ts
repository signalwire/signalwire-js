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

  const callInstance = get<Call>(payload.call_id)
  if (!callInstance) {
    throw new Error('Missing call instance for connect')
  }
  callInstance.setConnectPayload(payload)
  set<Call>(payload.call_id, callInstance)

  switch (payload.connect_state) {
    case 'connecting': {
      callInstance.baseEmitter.emit('connect.connecting', callInstance)
      break
    }
    case 'connected': {
      let peerCallInstance = get<Call>(payload.peer.call_id)
      if (!peerCallInstance) {
        peerCallInstance = createCallObject({
          store: client.store,
          // @ts-expect-error
          emitter: client.emitter,
          payload: payload.peer,
        })
      } else {
        set<Call>(payload.peer.call_id, peerCallInstance)
      }
      callInstance.peer = peerCallInstance
      peerCallInstance.peer = callInstance
      callInstance.baseEmitter.emit('connect.connected', peerCallInstance)
      break
    }
    case 'disconnected':
    case 'failed': {
      const peerCallInstance = get<Call>(payload.peer.call_id)
      callInstance.baseEmitter.emit(`connect.${payload.connect_state}`)
      callInstance.peer = undefined

      // Add a check because peer call can be removed from the instance map throgh voiceCallStateWorker
      if (peerCallInstance) {
        peerCallInstance.baseEmitter.emit(`connect.${payload.connect_state}`)
        peerCallInstance.peer = undefined
      }
      break
    }
    default:
      getLogger().warn(`Unknown connect state: "${payload.connect_state}"`)
      break
  }

  callInstance.baseEmitter.emit('call.state', callInstance)

  getLogger().trace('voiceCallConnectWorker ended')
}
