import {
  getLogger,
  SagaIterator,
  CallingCallConnectEventParams,
} from '@signalwire/core'
import { Call, createCallObject } from '../Call'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'

export const voiceCallConnectWorker = function* (
  options: VoiceCallWorkerParams<CallingCallConnectEventParams>
): SagaIterator {
  getLogger().trace('voiceCallConnectWorker started')
  const {
    instance: client,
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
        // @ts-expect-error
        peerCallInstance = createCallObject({
          store: client.store,
          connectPayload: payload,
        })
      } else {
        peerCallInstance.setConnectPayload(payload)
      }
      set<Call>(payload.peer.call_id, peerCallInstance)
      callInstance.peer = peerCallInstance
      peerCallInstance.peer = callInstance
      callInstance.baseEmitter.emit('connect.connected', peerCallInstance)
      break
    }
    case 'disconnected': {
      const peerCallInstance = get<Call>(payload.peer.call_id)
      callInstance.baseEmitter.emit('connect.disconnected')
      callInstance.peer = undefined

      // Add a check because peer call can be removed from the instance map throgh voiceCallStateWorker
      if (peerCallInstance) {
        peerCallInstance.baseEmitter.emit('connect.disconnected')
        peerCallInstance.peer = undefined
      }
      break
    }
    case 'failed': {
      callInstance.peer = undefined
      callInstance.baseEmitter.emit('connect.failed')
      break
    }
    default:
      // @ts-expect-error
      getLogger().warn(`Unknown connect state: "${payload.connect_state}"`)
      break
  }

  callInstance.baseEmitter.emit('call.state', callInstance)

  getLogger().trace('voiceCallConnectWorker ended')
}
