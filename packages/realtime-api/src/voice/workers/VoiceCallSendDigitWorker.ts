import {
  getLogger,
  SagaIterator,
  SDKCallWorker,
  CallingCallSendDigitsEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import type { Client } from '../../client/index'

export const voiceCallSendDigitsWorker: SDKCallWorker<
  CallingCallSendDigitsEventParams,
  Client
> = function* (options): SagaIterator {
  getLogger().trace('voiceCallSendDigitsWorker started')
  const {
    payload,
    instanceMap: { get },
  } = options

  const callInstance = get<Call>(payload.call_id)
  if (!callInstance) {
    throw new Error('Missing call instance for send digits')
  }

  switch (payload.state) {
    case 'finished':
      callInstance.baseEmitter.emit('send_digits.finished', callInstance)
      break
    default: {
      const error = new Error(
        `[voiceCallSendDigitsWorker] unhandled state: '${payload.state}'`
      )
      callInstance.baseEmitter.emit('send_digits.failed', error)
      break
    }
  }

  getLogger().trace('voiceCallSendDigitsWorker ended')
}
