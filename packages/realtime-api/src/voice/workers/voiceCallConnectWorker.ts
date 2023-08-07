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

  // TODO: The below events seems to be not documented in @RealTimeCallApiEvents. For now, ingoring TS issues

  switch (payload.connect_state) {
    case 'connecting': {
      // @ts-expect-error
      callInstance.emit('connect.connecting', callInstance)
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
      // @ts-expect-error
      callInstance.emit('connect.connected', peerCallInstance)
      break
    }
    case 'disconnected': {
      const peerCallInstance = get<Call>(payload.peer.call_id)
      // @ts-expect-error
      callInstance.emit('connect.disconnected')
      callInstance.peer = undefined

      // Add a check because peer call can be removed from the instance map throgh voiceCallStateWorker
      if (peerCallInstance) {
        // @ts-expect-error
        peerCallInstance.emit('connect.disconnected')
        peerCallInstance.peer = undefined
      }
      break
    }
    case 'failed': {
      callInstance.peer = undefined
      // @ts-expect-error
      callInstance.emit('connect.failed')
      break
    }
    default:
      // @ts-expect-error
      getLogger().warn(`Unknown connect state: "${payload.connect_state}"`)
      break
  }

  callInstance.emit('call.state', callInstance)

  getLogger().trace('voiceCallConnectWorker ended')
}
