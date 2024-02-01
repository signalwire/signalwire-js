import { CallingCallConnectEventParams, InstanceMap } from '@signalwire/core'
import { Call } from '../../Call'
import { Voice } from '../../Voice'

interface CallConnectEventsHandlerOptions {
  payload: CallingCallConnectEventParams
  instanceMap: InstanceMap
  voice: Voice
}

export function handleCallConnectEvents(
  options: CallConnectEventsHandlerOptions
) {
  const { payload, instanceMap, voice } = options
  const { get, set } = instanceMap

  const callInstance = get<Call>(payload.call_id)
  if (!callInstance) {
    throw new Error('Missing call instance for connect')
  }
  callInstance.setConnectPayload(payload)
  set<Call>(payload.call_id, callInstance)

  // TODO: The below events seems to be not documented in @RealTimeCallApiEvents. For now, ingoring TS issues

  callInstance.emit('call.state', callInstance)

  switch (payload.connect_state) {
    case 'connecting': {
      // @ts-expect-error
      callInstance.emit('connect.connecting', callInstance)
      return false
    }
    case 'connected': {
      let peerCallInstance = get<Call>(payload.peer.call_id)
      if (!peerCallInstance) {
        peerCallInstance = new Call({
          voice,
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
      return false
    }
    case 'disconnected': {
      // @ts-expect-error
      callInstance.emit('connect.disconnected')
      callInstance.peer = undefined

      const peerCallInstance = get<Call>(payload.peer.call_id)
      // Add a check because peer call can be removed from the instance map throgh voiceCallStateWorker
      if (peerCallInstance) {
        console.log('emit peer disconnected', peerCallInstance.callId)
        // @ts-expect-error
        peerCallInstance.emit('connect.disconnected')
        peerCallInstance.peer = undefined
      }
      return true
    }
    case 'failed': {
      callInstance.peer = undefined
      // @ts-expect-error
      callInstance.emit('connect.failed', payload)
      return true
    }
    default:
      // @ts-expect-error
      getLogger().warn(`Unknown connect state: "${payload.connect_state}"`)
      return false
  }
}
