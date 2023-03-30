import {
  getLogger,
  SagaIterator,
  SDKCallWorker,
  toExternalJSON,
  CallingCallDialEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import type { Client } from '../../client/index'

export const voiceCallDialWorker: SDKCallWorker<
  CallingCallDialEventParams,
  Client
> = function* (options): SagaIterator {
  getLogger().trace('voiceCallDialWorker started')
  const {
    client,
    payload,
    instanceMap: { get },
    initialState,
  } = options

  // Inbound calls do not have the tag
  if (payload.tag && payload.tag !== initialState.tag) return

  switch (payload.dial_state) {
    case 'failed': {
      // @ts-expect-error
      client.baseEmitter.emit('dial.failed', toExternalJSON(payload))
      break
    }
    case 'answered': {
      const callInstance = get(payload.call.call_id) as Call
      // @ts-expect-error
      client.baseEmitter.emit('dial.answered', callInstance)
      callInstance.baseEmitter.emit('call.state', payload.call)
      break
    }
    default:
      break
  }

  getLogger().trace('voiceCallDialWorker ended')
}
