import { CallingCallConnectEventParams } from '@signalwire/core'

interface CallConnectEventsHandlerOptions {
  payload: CallingCallConnectEventParams
  instance: { emit: (...param: any[]) => void }
}

export function handleCallConnectEvents(
  options: CallConnectEventsHandlerOptions
) {
  const { payload, instance: callInstance } = options
  
  if (!callInstance) {
    throw new Error('Missing call instance for connect')
  }

  callInstance.emit('call.state', callInstance)

  switch (payload.connect_state) {
    case 'connecting': {
      callInstance.emit('connect.connecting', callInstance)
      return false
    }
    case 'connected': {
      callInstance.emit('connect.connected')
      return false
    }
    case 'disconnected': {
      callInstance.emit('connect.disconnected')
      return true
    }
    case 'failed': {
      callInstance.emit('connect.failed', payload)
      return true
    }
    default:
      // @ts-expect-error
      getLogger().warn(`Unknown connect state: "${payload.connect_state}"`)
      return false
  }
}
