import { CallingCallStateEventParams, InstanceMap } from '@signalwire/core'
import { RealTimeCallListeners } from '../../../types'
import { Call } from '../../Call'
import { Voice } from '../../Voice'

interface CallStateEventsHandlerOptions {
  payload: CallingCallStateEventParams
  voice: Voice
  instanceMap: InstanceMap
  listeners?: RealTimeCallListeners
}

export function handleCallStateEvents(options: CallStateEventsHandlerOptions) {
  const {
    payload,
    voice,
    listeners,
    instanceMap: { get, set, remove },
  } = options

  let callInstance = get<Call>(payload.call_id)
  if (!callInstance) {
    callInstance = new Call({
      voice,
      payload,
      listeners,
    })
  } else {
    callInstance.setPayload(payload)
  }
  set<Call>(payload.call_id, callInstance)

  switch (payload.call_state) {
    case 'ended': {
      callInstance.emit('call.state', callInstance)

      // Resolves the promise when user disconnects using a peer call instance
      // @ts-expect-error
      callInstance.emit('connect.disconnected', callInstance)
      remove<Call>(payload.call_id)

      return true
    }
    default:
      callInstance.emit('call.state', callInstance)
      return false
  }
}
