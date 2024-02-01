import { CallingCallDialEventParams, InstanceMap } from '@signalwire/core'
import { Call } from '../../Call'
import { Voice } from '../../Voice'

interface CallDialEventsHandlerOptions {
  payload: CallingCallDialEventParams
  instanceMap: InstanceMap
  voice: Voice
}

export function handleCallDialEvents(options: CallDialEventsHandlerOptions) {
  const { payload, instanceMap, voice } = options
  const { get } = instanceMap

  switch (payload.dial_state) {
    case 'failed': {
      // @ts-expect-error
      voice.emit('dial.failed', payload)
      return true
    }
    case 'answered': {
      const callInstance = get<Call>(payload.call.call_id)
      callInstance.setPayload(payload.call)
      // @ts-expect-error
      voice.emit('dial.answered', callInstance)
      return true
    }
    default:
      return false
  }
}
