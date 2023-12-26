import { CallingCallStateEventParams } from '@signalwire/core'

interface CallStateEventsHandlerOptions {
  payload: CallingCallStateEventParams
  instance: { emit: (...param: any[]) => void }
}

export function handleCallStateEvents(options: CallStateEventsHandlerOptions) {
  const { payload, instance: callInstance } = options

  switch (payload.call_state) {
    case 'ended': {
      callInstance.emit('call.state', callInstance)
      callInstance.emit('connect.disconnected', callInstance)
      return true
    }
    default:
      callInstance.emit('call.state', callInstance)
      return false
  }
}
