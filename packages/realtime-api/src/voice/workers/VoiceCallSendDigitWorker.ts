import {
  getLogger,
  SagaIterator,
  CallingCallSendDigitsEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'

export const voiceCallSendDigitsWorker = function* (
  options: VoiceCallWorkerParams<CallingCallSendDigitsEventParams>
): SagaIterator {
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
      // @ts-expect-error
      callInstance.emit('send_digits.finished', callInstance)
      break
    default: {
      const error = new Error(
        `[voiceCallSendDigitsWorker] unhandled state: '${payload.state}'`
      )
      // @ts-expect-error
      callInstance.emit('send_digits.failed', error)
      break
    }
  }

  getLogger().trace('voiceCallSendDigitsWorker ended')
}
