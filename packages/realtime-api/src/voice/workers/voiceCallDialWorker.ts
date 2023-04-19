import {
  getLogger,
  SagaIterator,
  SDKChildWorker,
  CallingCallDialEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import type { Client } from '../../client/index'

export const voiceCallDialWorker: SDKChildWorker<
  CallingCallDialEventParams,
  Client
> = function* (options): SagaIterator {
  getLogger().trace('voiceCallDialWorker started')
  const {
    client,
    action: { payload },
    instanceMap: { get },
    initialState,
  } = options

  // Inbound calls do not have the tag
  if (payload.tag && payload.tag !== initialState.tag) return

  switch (payload.dial_state) {
    case 'failed': {
      // @ts-expect-error
      client.baseEmitter.emit('dial.failed', payload)
      break
    }
    case 'answered': {
      const callInstance = get<Call>(payload.call.call_id)
      // @ts-expect-error
      client.baseEmitter.emit('dial.answered', callInstance)
      break
    }
    default:
      break
  }

  getLogger().trace('voiceCallDialWorker ended')
}
